"use server";

import OpenAI from "openai";
import S from "fluent-json-schema";
import { prisma } from "@/lib/prisma";

const aiEndpoint = process.env.AI_API_ENDPOINT ?? "https://chat.rethinkos.com";
const aiModel = process.env.AI_MODEL ?? "deepseek-web/base_think";
const aiApiKey = process.env.AI_API_KEY ?? "";

function getClient() {
    return new OpenAI({
        apiKey: aiApiKey,
        baseURL: `${aiEndpoint}/v1`,
        timeout: 600000,
    });
}

type TagSuggestion = {
    tagId: string;
    tagName: string;
    reason: string;
};

type AppliedTag = {
    bvid: string;
    tagId: string;
    tagName: string;
};

export async function aiAutoTag(bvids: string[]): Promise<{
    taggedCount: number;
    skippedCount: number;
    appliedTags: AppliedTag[];
}> {
    if (bvids.length === 0) {
        return { taggedCount: 0, skippedCount: 0, appliedTags: [] };
    }

    const [existingTags, allTaggedVideos, targetVideos] = await Promise.all([
        prisma.tag.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        }),
        prisma.video.findMany({
            where: {
                videoTags: { some: {} },
            },
            select: {
                bvid: true,
                cleanTitle: true,
                description: true,
                subtitle: true,
                tags: true,
                videoTags: {
                    select: {
                        source: true,
                        tag: { select: { id: true, name: true } },
                    },
                },
            },
        }),
        prisma.video.findMany({
            where: {
                bvid: { in: bvids },
            },
            select: {
                bvid: true,
                cleanTitle: true,
                description: true,
                subtitle: true,
                tags: true,
                videoTags: {
                    select: {
                        source: true,
                        tag: { select: { id: true, name: true } },
                    },
                },
            },
        }),
    ]);

    const taggedByTag = new Map<string, typeof allTaggedVideos>();
    for (const video of allTaggedVideos) {
        if (bvids.includes(video.bvid)) continue;
        for (const vt of video.videoTags) {
            const bucket = taggedByTag.get(vt.tag.id) ?? [];
            if (bucket.length < 10) {
                bucket.push(video);
                taggedByTag.set(vt.tag.id, bucket);
            }
        }
    }

    const sampleBvids = new Set<string>();
    const taggedExamples: Array<{
        title: string;
        description: string | null;
        subtitle: string | null;
        tags: string[];
    }> = [];

    for (const bucket of taggedByTag.values()) {
        for (const video of bucket) {
            if (sampleBvids.has(video.bvid)) continue;
            sampleBvids.add(video.bvid);
            taggedExamples.push({
                title: video.cleanTitle,
                description: video.description,
                subtitle: video.subtitle,
                tags: video.videoTags.map((vt) => vt.tag.name),
            });
        }
    }

    const tagList = existingTags.map((t) => `${t.id}:${t.name}`).join(", ");

    const prompt = [
        "你是一个视频内容分析助手。以下是已经人工标注过的视频样本，每个样本包含标题、简介、字幕和人工标签：",
        "",
        JSON.stringify(taggedExamples, null, 2),
        "",
        "---",
        "可用标签列表（ID:标签名）：",
        tagList,
        "---",
        "请为以下目标视频推荐最合适的一个标签。只能从可用标签中严格选择一个。",
        "",
        targetVideos
            .map(
                (v) =>
                    [
                        `- bvid: ${v.bvid}`,
                        `  标题: ${v.cleanTitle}`,
                        `  简介: ${v.description ?? ""}`,
                        `  字幕: ${v.subtitle ?? ""}`,
                        `  已打标签: ${v.videoTags.map((vt) => vt.tag.name).join(", ") || "无"}`,
                    ].join("\n"),
            )
            .join("\n\n"),
    ].join("\n");

    const client = getClient();
    const completion = await client.chat.completions.create({
        model: aiModel,
        messages: [
            {
                role: "system",
                content:
                    "你是视频标签助手。根据视频标题、简介、字幕、源标签，参考已标注样本，为每个视频推荐最合适的一个标签。",
            },
            { role: "user", content: prompt },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "video_tag_suggestions",
                schema: S.object()
                    .prop(
                        "suggestions",
                        S.array().items(
                            S.object()
                                .prop("bvid", S.string().required())
                                .prop(
                                    "suggestion",
                                    S.object()
                                        .prop("tagId", S.string().required())
                                        .prop("tagName", S.string().required())
                                        .prop("reason", S.string().required()),
                                ).required(),
                        ),
                    ).required()
                    .valueOf() as Record<string, unknown>,
            },
        },
        stream: false,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as {
        suggestions: Array<{
            bvid: string;
            suggestion: TagSuggestion;
        }>;
    };

    let taggedCount = 0;
    let skippedCount = 0;
    const appliedTags: AppliedTag[] = [];

    for (const item of parsed.suggestions) {
        if (!bvids.includes(item.bvid)) {
            continue;
        }

        const { tagId } = item.suggestion;

        if (!existingTags.some((t) => t.id === tagId)) {
            skippedCount += 1;
            continue;
        }

        await prisma.videoTag.upsert({
            where: {
                videoId_tagId: {
                    videoId: item.bvid,
                    tagId,
                },
            },
            create: {
                videoId: item.bvid,
                tagId,
                source: "ai",
            },
            update: {},
        });

        taggedCount += 1;
        appliedTags.push({
            bvid: item.bvid,
            tagId,
            tagName: item.suggestion.tagName,
        });
    }

    return { taggedCount, skippedCount, appliedTags };
}
