"use server";

import { prisma } from "@/lib/prisma";

export async function getAllTags() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });

    return tags;
}

export async function toggleVideoTag(bvid: string, tagId: string) {
    const existing = await prisma.videoTag.findUnique({
        where: { videoId_tagId: { videoId: bvid, tagId } },
    });

    if (existing) {
        await prisma.videoTag.delete({
            where: { videoId_tagId: { videoId: bvid, tagId } },
        });
    } else {
        await prisma.videoTag.create({
            data: {
                videoId: bvid,
                tagId,
                source: "manual",
            },
        });
    }
}
