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
    const video = await prisma.video.findUnique({
        where: { bvid },
        select: { id: true },
    });

    if (!video) {
        throw new Error("Video not found");
    }

    const existing = await prisma.videoTag.findUnique({
        where: { videoId_tagId: { videoId: video.id, tagId } },
    });

    if (existing) {
        await prisma.videoTag.delete({
            where: { videoId_tagId: { videoId: video.id, tagId } },
        });
    } else {
        await prisma.videoTag.create({
            data: {
                video: { connect: { bvid } },
                tag: { connect: { id: tagId } },
                source: "manual",
            },
        });
    }
}
