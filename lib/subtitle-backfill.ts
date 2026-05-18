import { getVideoSubtitle } from "@/lib/bilibili";
import { prisma } from "@/lib/prisma";
import { bilibiliQueue } from "@/lib/queue";

let subtitleBackfillRunning = false;

export type SubtitleBackfillSummary = {
    failedCount: number;
    foundCount: number;
    subtitleCount: number;
    syncRunId: string | null;
};

export class VideoNotFoundError extends Error {
    constructor(bvid: string) {
        super(`视频 ${bvid} 未入库`);
        this.name = "VideoNotFoundError";
    }
}

export type SubtitleRefreshResult = {
    bvid: string;
    hasSubtitle: boolean;
    subtitle: string | null;
    subtitleLength: number;
};

function toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? null));
}

export async function refreshVideoSubtitleByBvid(
    bvid: string,
): Promise<SubtitleRefreshResult> {
    const normalizedBvid = bvid.trim();
    const video = await prisma.video.findUnique({
        where: { bvid: normalizedBvid },
        select: { bvid: true },
    });

    if (!video) {
        throw new VideoNotFoundError(normalizedBvid);
    }

    const subtitle = (await bilibiliQueue.add(() =>
        getVideoSubtitle(normalizedBvid),
    )) as string | null;

    await prisma.video.update({
        where: { bvid: normalizedBvid },
        data: {
            hasSubtitle: Boolean(subtitle),
            lastSyncedAt: new Date(),
            subtitle,
        },
    });

    return {
        bvid: normalizedBvid,
        hasSubtitle: Boolean(subtitle),
        subtitle,
        subtitleLength: subtitle?.length ?? 0,
    };
}

export async function backfillMissingSubtitles(maxVideos?: number): Promise<SubtitleBackfillSummary> {
    if (subtitleBackfillRunning) {
        console.info("[subtitle-backfill] previous job is still running, skip this tick");
        return {
            failedCount: 0,
            foundCount: 0,
            subtitleCount: 0,
            syncRunId: null,
        };
    }

    subtitleBackfillRunning = true;

    const syncRun = await prisma.syncRun.create({
        data: {
            type: "subtitle_backfill",
            status: "running",
            keywords: toJsonValue([]),
            pageSize: 0,
            pages: 0,
        },
    });

    try {
        const queryOptions: Record<string, unknown> = {
            where: {
                durationSeconds: { lt: 15 * 60 },
                OR: [
                    { hasSubtitle: false },
                    { subtitle: null },
                ],
            },
            orderBy: [
                { play: "desc" },
                { publishAt: "desc" },
            ],
            select: {
                bvid: true,
                title: true,
            },
        };

        if (maxVideos && maxVideos > 0) {
            queryOptions.take = maxVideos;
        }

        const videos = await prisma.video.findMany(queryOptions as Parameters<typeof prisma.video.findMany>[0]);

        let failedCount = 0;
        let subtitleCount = 0;

        console.info(`[subtitle-backfill] found ${videos.length} videos without subtitles under 15 minutes`);

        for (const video of videos) {
            try {
                console.info(`[subtitle-backfill] fetching subtitle for ${video.bvid} ${video.title}`);
                const subtitle = (await bilibiliQueue.add(() =>
                    getVideoSubtitle(video.bvid),
                )) as string | null;

                if (!subtitle) {
                    console.info(`[subtitle-backfill] no subtitle generated for ${video.bvid}`);
                    continue;
                }

                await prisma.video.update({
                    where: { bvid: video.bvid },
                    data: {
                        hasSubtitle: true,
                        subtitle,
                        lastSyncedAt: new Date(),
                    },
                });

                subtitleCount += 1;
                console.info(`[subtitle-backfill] subtitle saved for ${video.bvid}`);
            } catch (error) {
                failedCount += 1;
                console.warn(`[subtitle-backfill] failed for ${video.bvid}`, error);
            }
        }

        const message = `共处理 ${videos.length} 个候选视频，成功获取 ${subtitleCount} 条字幕，失败 ${failedCount} 条`;

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                fetchedCount: videos.length,
                createdCount: subtitleCount,
                updatedCount: 0,
                subtitleCount,
                finishedAt: new Date(),
                status: "success",
                message,
            },
        });

        console.info(
            `[subtitle-backfill] complete found=${videos.length} subtitle=${subtitleCount} failed=${failedCount}`,
        );

        return {
            failedCount,
            foundCount: videos.length,
            subtitleCount,
            syncRunId: syncRun.id,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                finishedAt: new Date(),
                message,
                status: "failed",
            },
        });
        throw error;
    } finally {
        subtitleBackfillRunning = false;
    }
}
