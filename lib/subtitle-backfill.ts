import { getVideoSubtitle } from "@/lib/bilibili";
import { prisma } from "@/lib/prisma";
import { bilibiliQueue } from "@/lib/queue";

let subtitleBackfillRunning = false;

export type SubtitleBackfillSummary = {
    failedCount: number;
    foundCount: number;
    subtitleCount: number;
};

export async function backfillMissingSubtitles(): Promise<SubtitleBackfillSummary> {
    if (subtitleBackfillRunning) {
        console.info("[subtitle-backfill] previous job is still running, skip this tick");
        return {
            failedCount: 0,
            foundCount: 0,
            subtitleCount: 0,
        };
    }

    subtitleBackfillRunning = true;

    try {
        const videos = await prisma.video.findMany({
            where: {
                durationSeconds: {
                    lt: 15 * 60,
                },
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
        });

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

        console.info(
            `[subtitle-backfill] complete found=${videos.length} subtitle=${subtitleCount} failed=${failedCount}`,
        );

        return {
            failedCount,
            foundCount: videos.length,
            subtitleCount,
        };
    } finally {
        subtitleBackfillRunning = false;
    }
}
