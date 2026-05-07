import { Prisma } from "@prisma/client";
import { getVideoInfo, normalizeImageUrl, type BilibiliVideoInfo } from "@/lib/bilibili";
import { prisma } from "@/lib/prisma";
import { bilibiliQueue } from "@/lib/queue";

const interactiveVideoTagId = "10500";
const humanVocaloidTagId = "10600";

export type BackfillResult = {
    processed: number;
    updated: number;
    errors: number;
};

function toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? null));
}

function jsonStringArray(value: unknown) {
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

export async function backfillVideoDetails(batchSize = 10): Promise<BackfillResult> {
    const videos = await prisma.video.findMany({
        where: { rawInfo: { equals: Prisma.JsonNull } },
        select: {
            bvid: true,
            tags: true,
            play: true,
            like: true,
            favorite: true,
            reply: true,
            videoTags: { select: { tagId: true } },
        },
        take: batchSize,
        orderBy: { firstSeenAt: "asc" },
    });

    if (videos.length === 0) {
        return { processed: 0, updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    for (const video of videos) {
        try {
            const info = (await bilibiliQueue.add(() =>
                getVideoInfo(video.bvid),
            )) as BilibiliVideoInfo;

            const share = info.stat?.share ?? 0;
            const play = info.stat?.view ?? video.play;
            const like = info.stat?.like ?? video.like;
            const favorite = info.stat?.favorite ?? video.favorite;
            const reply = info.stat?.reply ?? video.reply;
            const engagementRate =
                (like + favorite + share + reply) / Math.max(play, 1);

            const updateData: Record<string, unknown> = {
                engagementRate,
                favorite,
                lastSyncedAt: new Date(),
                like,
                play,
                rawInfo: toJsonValue(info),
                reply,
                share,
            };

            if (info.duration && info.duration > 0) {
                updateData.durationSeconds = info.duration;
            }

            if (info.title?.trim()) {
                updateData.title = info.title.trim();
                updateData.cleanTitle = info.title.trim();
            }

            if (info.pic) {
                updateData.coverUrl = normalizeImageUrl(info.pic);
            }

            if (info.pubdate) {
                updateData.publishAt = new Date(info.pubdate * 1000);
            }

            if (info.tname?.trim()) {
                updateData.typeName = info.tname.trim();
            }

            if (info.desc?.trim()) {
                updateData.description = info.desc.trim();
            }

            if (info.aid) {
                updateData.aid = String(info.aid);
            }

            if (info.owner?.mid) {
                await prisma.creator.upsert({
                    where: { mid: String(info.owner.mid) },
                    update: {
                        faceUrl: normalizeImageUrl(info.owner.face),
                        name: info.owner.name?.trim() || "未知 UP",
                    },
                    create: {
                        faceUrl: normalizeImageUrl(info.owner.face),
                        mid: String(info.owner.mid),
                        name: info.owner.name?.trim() || "未知 UP",
                    },
                });
            }

            await prisma.video.update({
                where: { bvid: video.bvid },
                data: updateData,
            });

            // Auto-tagging (migrated from sync)
            const existingTagIds = new Set(video.videoTags.map((vt) => vt.tagId));

            if (
                info.rights?.is_stein_gate === 1 &&
                !existingTagIds.has(interactiveVideoTagId)
            ) {
                await prisma.videoTag.create({
                    data: {
                        video: { connect: { bvid: video.bvid } },
                        tag: { connect: { id: interactiveVideoTagId } },
                        source: "auto",
                    },
                });
            }

            const sourceTags = jsonStringArray(video.tags);
            if (
                sourceTags.some((tag) => tag.includes("人力VOCALOID")) &&
                !existingTagIds.has(humanVocaloidTagId)
            ) {
                await prisma.videoTag.create({
                    data: {
                        video: { connect: { bvid: video.bvid } },
                        tag: { connect: { id: humanVocaloidTagId } },
                        source: "auto",
                    },
                });
            }

            updated++;
        } catch (error) {
            console.warn(
                `[video-detail-backfill] failed for ${video.bvid}`,
                error,
            );
            errors++;
        }
    }

    return {
        processed: videos.length,
        updated,
        errors,
    };
}
