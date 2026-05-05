import { Prisma } from "@prisma/client";
import {
    getVideoInfo,
    getVideoSubtitle,
    normalizeImageUrl,
    normalizeTagList,
    parseDurationToSeconds,
    parseSearchDate,
    searchVideos,
    stripHtml,
    type BilibiliSearchItem,
    type BilibiliSearchResponse,
    type BilibiliVideoInfo,
} from "@/lib/bilibili";
import {
    defaultSubtitleLimit,
    defaultSyncKeywords,
    defaultSyncPageSize,
    defaultSyncPages,
} from "@/lib/config";
import { formatDurationFromSeconds } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { bilibiliQueue } from "@/lib/queue";

let syncRunning = false;

export type SyncOptions = {
    keywords?: string[];
    pageSize?: number;
    pages?: number;
    subtitleLimit?: number;
};

export type SyncSummary = {
    createdCount: number;
    dedupedCount: number;
    fetchedCount: number;
    pages: number;
    pageSize: number;
    subtitleCount: number;
    syncRunId: string;
    updatedCount: number;
    keywords: string[];
};

type CandidateVideo = {
    item: BilibiliSearchItem;
    keywords: Set<string>;
};

function uniqueStrings(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function jsonStringArray(value: Prisma.JsonValue | null | undefined) {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }

    return [];
}

function toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function calculateEngagementRate(
    play: number,
    like: number,
    favorite: number,
    share: number,
    reply: number,
) {
    const total = like + favorite + share + reply;
    return total / Math.max(play, 1);
}

function chooseBetterCandidate(
    current: BilibiliSearchItem,
    next: BilibiliSearchItem,
) {
    return (next.play ?? 0) > (current.play ?? 0) ? next : current;
}

export async function syncVideoLibrary(
    options: SyncOptions = {},
): Promise<SyncSummary> {
    if (syncRunning) {
        throw new Error("同步任务正在执行中，请稍后再试");
    }
    syncRunning = true;
    const keywords = uniqueStrings(
        options.keywords?.length ? options.keywords : defaultSyncKeywords,
    );
    const pages =
        options.pages && options.pages > 0 ? options.pages : defaultSyncPages;
    const pageSize =
        options.pageSize && options.pageSize > 0
            ? options.pageSize
            : defaultSyncPageSize;
    const subtitleLimit =
        options.subtitleLimit !== undefined && options.subtitleLimit >= 0
            ? options.subtitleLimit
            : defaultSubtitleLimit;

    const syncRun = await prisma.syncRun.create({
        data: {
            keywords: toJsonValue(keywords),
            pageSize,
            pages,
            status: "running",
        },
    });

    try {
        const candidates = new Map<string, CandidateVideo>();
        let fetchedCount = 0;

        for (const keyword of keywords) {
            for (let page = 1; page <= pages; page += 1) {
                const response = (await bilibiliQueue.add(() =>
                    searchVideos(keyword, page, pageSize),
                )) as BilibiliSearchResponse;
                fetchedCount += response.items.length;

                for (const item of response.items) {
                    if (!item.bvid) {
                        continue;
                    }

                    const existing = candidates.get(item.bvid);
                    if (existing) {
                        existing.item = chooseBetterCandidate(
                            existing.item,
                            item,
                        );
                        existing.keywords.add(keyword);
                    } else {
                        candidates.set(item.bvid, {
                            item,
                            keywords: new Set([keyword]),
                        });
                    }
                }
            }
        }

        const bvids = [...candidates.keys()];
        const existingVideos =
            bvids.length === 0
                ? []
                : await prisma.video.findMany({
                      where: {
                          bvid: {
                              in: bvids,
                          },
                      },
                      select: {
                          bvid: true,
                          hasSubtitle: true,
                          sourceKeywords: true,
                          subtitle: true,
                          tags: true,
                      },
                  });

        const existingMap = new Map(
            existingVideos.map((video) => [video.bvid, video]),
        );

        let createdCount = 0;
        let updatedCount = 0;
        let subtitleCount = 0;

        for (const [bvid, candidate] of candidates) {
            const info = (await bilibiliQueue.add(() =>
                getVideoInfo(bvid),
            )) as BilibiliVideoInfo;
            const ownerMid = String(
                info.owner?.mid ?? candidate.item.mid ?? bvid,
            );
            const ownerName =
                info.owner?.name?.trim() ||
                candidate.item.author?.trim() ||
                "未知 UP";
            const existing = existingMap.get(bvid);

            let subtitle = existing?.subtitle ?? null;
            const durationSeconds =
                info.duration && info.duration > 0
                    ? info.duration
                    : parseDurationToSeconds(candidate.item.duration);

            if (
                !subtitle &&
                subtitleCount < subtitleLimit &&
                durationSeconds <= 15 * 60
            ) {
                try {
                    subtitle = (await bilibiliQueue.add(() =>
                        getVideoSubtitle(bvid),
                    )) as string | null;
                    if (subtitle) {
                        subtitleCount += 1;
                    }
                } catch (error) {
                    console.warn(`subtitle sync failed for ${bvid}`, error);
                }
            }

            const creator = await prisma.creator.upsert({
                where: { mid: ownerMid },
                update: {
                    faceUrl: normalizeImageUrl(
                        info.owner?.face ?? candidate.item.upic,
                    ),
                    name: ownerName,
                },
                create: {
                    faceUrl: normalizeImageUrl(
                        info.owner?.face ?? candidate.item.upic,
                    ),
                    mid: ownerMid,
                    name: ownerName,
                },
            });

            const mergedKeywords = uniqueStrings([
                ...jsonStringArray(existing?.sourceKeywords),
                ...candidate.keywords,
            ]);
            const mergedTags = uniqueStrings([
                ...jsonStringArray(existing?.tags),
                ...normalizeTagList(candidate.item.tag),
            ]);
            const play = info.stat?.view ?? candidate.item.play ?? 0;
            const like = info.stat?.like ?? candidate.item.like ?? 0;
            const favorite =
                info.stat?.favorite ?? candidate.item.favorites ?? 0;
            const share = info.stat?.share ?? 0;
            const reply = info.stat?.reply ?? candidate.item.review ?? 0;
            const videoTitle =
                stripHtml(info.title ?? candidate.item.title) || bvid;
            const rawAid = info.aid ?? candidate.item.aid ?? null;
            const publishAt = info.pubdate
                ? new Date(info.pubdate * 1000)
                : parseSearchDate(candidate.item.pubdate);

            await prisma.video.upsert({
                where: { bvid },
                create: {
                    aid: rawAid === null ? null : String(rawAid),
                    bvid,
                    cleanTitle: videoTitle,
                    coverUrl: normalizeImageUrl(info.pic ?? candidate.item.pic),
                    creatorId: creator.id,
                    description:
                        info.desc?.trim() ||
                        candidate.item.description?.trim() ||
                        null,
                    durationLabel:
                        candidate.item.duration ||
                        formatDurationFromSeconds(durationSeconds),
                    durationSeconds,
                    engagementRate: calculateEngagementRate(
                        play,
                        like,
                        favorite,
                        share,
                        reply,
                    ),
                    favorite,
                    hasSubtitle: Boolean(subtitle),
                    lastSyncedAt: new Date(),
                    like,
                    play,
                    publishAt,
                    rawInfo: toJsonValue(info),
                    rawSearch: toJsonValue(candidate.item),
                    reply,
                    share,
                    sourceKeywords: toJsonValue(mergedKeywords),
                    subtitle,
                    tags: toJsonValue(mergedTags),
                    title:
                        info.title?.trim() ||
                        stripHtml(candidate.item.title) ||
                        videoTitle,
                    typeName:
                        info.tname?.trim() ||
                        candidate.item.typename?.trim() ||
                        null,
                },
                update: {
                    aid: rawAid === null ? null : String(rawAid),
                    cleanTitle: videoTitle,
                    coverUrl: normalizeImageUrl(info.pic ?? candidate.item.pic),
                    creatorId: creator.id,
                    description:
                        info.desc?.trim() ||
                        candidate.item.description?.trim() ||
                        null,
                    durationLabel:
                        candidate.item.duration ||
                        formatDurationFromSeconds(durationSeconds),
                    durationSeconds,
                    engagementRate: calculateEngagementRate(
                        play,
                        like,
                        favorite,
                        share,
                        reply,
                    ),
                    favorite,
                    hasSubtitle: Boolean(subtitle ?? existing?.hasSubtitle),
                    lastSyncedAt: new Date(),
                    like,
                    play,
                    publishAt,
                    rawInfo: toJsonValue(info),
                    rawSearch: toJsonValue(candidate.item),
                    reply,
                    share,
                    sourceKeywords: toJsonValue(mergedKeywords),
                    subtitle: subtitle ?? existing?.subtitle ?? null,
                    tags: toJsonValue(mergedTags),
                    title:
                        info.title?.trim() ||
                        stripHtml(candidate.item.title) ||
                        videoTitle,
                    typeName:
                        info.tname?.trim() ||
                        candidate.item.typename?.trim() ||
                        null,
                },
            });

            if (existing) {
                updatedCount += 1;
            } else {
                createdCount += 1;
            }
        }

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                createdCount,
                fetchedCount,
                finishedAt: new Date(),
                message: `本次共处理 ${candidates.size} 条去重后的候选视频。`,
                status: "success",
                subtitleCount,
                updatedCount,
            },
        });

        syncRunning = false;
        return {
            createdCount,
            dedupedCount: candidates.size,
            fetchedCount,
            keywords,
            pageSize,
            pages,
            subtitleCount,
            syncRunId: syncRun.id,
            updatedCount,
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
        syncRunning = false;
        throw error;
    }
}
