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
        select: {
            id: true,
            videoTags: {
                select: { id: true },
            },
        },
    });

    if (!video) {
        throw new Error("Video not found");
    }

    const hasTag = video.videoTags.some((tag) => tag.id === tagId);

    if (hasTag) {
        await prisma.video.update({
            where: { bvid },
            data: {
                videoTags: {
                    disconnect: { id: tagId },
                },
            },
        });
    } else {
        await prisma.video.update({
            where: { bvid },
            data: {
                videoTags: {
                    connect: { id: tagId },
                },
            },
        });
    }
}
