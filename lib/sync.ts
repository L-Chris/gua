import { Prisma } from "@prisma/client";
import {
    getVideoInfo,
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
    defaultSyncKeywords,
    defaultSyncPageSize,
    defaultSyncPages,
} from "@/lib/config";
import { formatDurationFromSeconds } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { bilibiliQueue } from "@/lib/queue";

let syncRunning = false;
const interactiveVideoTagId = "10500";
const humanVocaloidTagId = "10600";

export type SyncOptions = {
    keywords?: string[];
    pageSize?: number;
    pages?: number;
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

function hasRequiredTag(tags: string[]) {
    return tags.some((tag) => tag.includes("华强买瓜") || tag.includes("买瓜"));
}

function hasRequiredSyncTag(rawTag: string | undefined | null) {
    return hasRequiredTag(normalizeTagList(rawTag));
}



async function syncCandidateVideo(bvid: string, candidate: CandidateVideo) {
    const info = (await bilibiliQueue.add(() =>
        getVideoInfo(bvid),
    )) as BilibiliVideoInfo;
    const existing = await prisma.video.findUnique({
        where: { bvid },
        select: {
            bvid: true,
            hasSubtitle: true,
            sourceKeywords: true,
            subtitle: true,
            tags: true,
            videoTags: {
                select: { id: true },
            },
        },
    });
    const ownerMid = String(info.owner?.mid ?? candidate.item.mid ?? bvid);
    const ownerName =
        info.owner?.name?.trim() || candidate.item.author?.trim() || "未知 UP";
    const existingSubtitle = existing?.subtitle ?? null;
    const durationSeconds =
        info.duration && info.duration > 0
            ? info.duration
            : parseDurationToSeconds(candidate.item.duration);

    const creator = await prisma.creator.upsert({
        where: { mid: ownerMid },
        update: {
            faceUrl: normalizeImageUrl(info.owner?.face ?? candidate.item.upic),
            name: ownerName,
        },
        create: {
            faceUrl: normalizeImageUrl(info.owner?.face ?? candidate.item.upic),
            mid: ownerMid,
            name: ownerName,
        },
    });

    const mergedKeywords = uniqueStrings([
        ...jsonStringArray(existing?.sourceKeywords),
        ...candidate.keywords,
    ]);
    const sourceTags = normalizeTagList(candidate.item.tag);
    const mergedTags = uniqueStrings([
        ...jsonStringArray(existing?.tags),
        ...sourceTags,
    ]);
    const existingVideoTagIds = new Set(existing?.videoTags.map((tag) => tag.id) ?? []);
    const play = info.stat?.view ?? candidate.item.play ?? 0;
    const like = info.stat?.like ?? candidate.item.like ?? 0;
    const favorite = info.stat?.favorite ?? candidate.item.favorites ?? 0;
    const share = info.stat?.share ?? 0;
    const reply = info.stat?.reply ?? candidate.item.review ?? 0;
    const videoTitle = stripHtml(info.title ?? candidate.item.title) || bvid;
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
                info.desc?.trim() || candidate.item.description?.trim() || null,
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
            hasSubtitle: Boolean(existingSubtitle),
            lastSyncedAt: new Date(),
            like,
            play,
            publishAt,
            rawInfo: toJsonValue(info),
            rawSearch: toJsonValue(candidate.item),
            reply,
            share,
            sourceKeywords: toJsonValue(mergedKeywords),
            subtitle: existingSubtitle,
            tags: toJsonValue(mergedTags),
            title: info.title?.trim() || stripHtml(candidate.item.title) || videoTitle,
            typeName: info.tname?.trim() || candidate.item.typename?.trim() || null,
        },
        update: {
            aid: rawAid === null ? null : String(rawAid),
            cleanTitle: videoTitle,
            coverUrl: normalizeImageUrl(info.pic ?? candidate.item.pic),
            creatorId: creator.id,
            description:
                info.desc?.trim() || candidate.item.description?.trim() || null,
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
            hasSubtitle: Boolean(existingSubtitle ?? existing?.hasSubtitle),
            lastSyncedAt: new Date(),
            like,
            play,
            publishAt,
            rawInfo: toJsonValue(info),
            rawSearch: toJsonValue(candidate.item),
            reply,
            share,
            sourceKeywords: toJsonValue(mergedKeywords),
            subtitle: existingSubtitle ?? existing?.subtitle ?? null,
            tags: toJsonValue(mergedTags),
            title: info.title?.trim() || stripHtml(candidate.item.title) || videoTitle,
            typeName: info.tname?.trim() || candidate.item.typename?.trim() || null,
        },
    });

    if (
        info.rights?.is_stein_gate === 1 &&
        !existingVideoTagIds.has(interactiveVideoTagId)
    ) {
        await prisma.video.update({
            where: { bvid },
            data: {
                videoTags: {
                    connect: { id: interactiveVideoTagId },
                },
            },
        });
        existingVideoTagIds.add(interactiveVideoTagId);
    }

    if (
        sourceTags.some((tag) => tag.includes("人力VOCALOID")) &&
        !existingVideoTagIds.has(humanVocaloidTagId)
    ) {
        await prisma.video.update({
            where: { bvid },
            data: {
                videoTags: {
                    connect: { id: humanVocaloidTagId },
                },
            },
        });
    }

    return existing ? "updated" : "created";
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
    const syncRun = await prisma.syncRun.create({
        data: {
            keywords: toJsonValue(keywords),
            pageSize,
            pages,
            status: "running",
        },
    });

    try {
        const seenBvids = new Set<string>();
        let fetchedCount = 0;
        let dedupedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const subtitleCount = 0;

        for (const keyword of keywords) {
            for (let page = 1; page <= pages; page += 1) {
                const response = (await bilibiliQueue.add(() =>
                    searchVideos(keyword, page, pageSize),
                )) as BilibiliSearchResponse;
                fetchedCount += response.items.length;

                for (const item of response.items) {
                    if (!item.bvid || !hasRequiredSyncTag(item.tag)) {
                        continue;
                    }

                    if (seenBvids.has(item.bvid)) {
                        continue;
                    }

                    seenBvids.add(item.bvid);
                    dedupedCount += 1;

                    const alreadyExists = await prisma.video.findUnique({
                        where: { bvid: item.bvid },
                        select: { bvid: true },
                    });

                    if (alreadyExists) {
                        skippedCount += 1;
                        continue;
                    }

                    const result = await syncCandidateVideo(item.bvid, {
                        item,
                        keywords: new Set([keyword]),
                    });

                    if (result === "created") {
                        createdCount += 1;
                    } else {
                        updatedCount += 1;
                    }
                }
            }
        }

        await prisma.syncRun.update({
            where: { id: syncRun.id },
            data: {
                createdCount,
                fetchedCount,
                finishedAt: new Date(),
                message: `本次共处理 ${dedupedCount} 条符合标签条件的去重候选视频（新建 ${createdCount}，跳过 ${skippedCount}）。`,
                status: "success",
                subtitleCount,
                updatedCount,
            },
        });

        syncRunning = false;
        return {
            createdCount,
            dedupedCount,
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
