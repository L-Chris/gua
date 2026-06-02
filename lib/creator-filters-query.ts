import { prisma } from "@/lib/prisma";

export type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

export async function getCreatorFilters(): Promise<CreatorFilter[]> {
    const groups = await prisma.video.groupBy({
        by: ["creatorId"],
        _count: { _all: true },
        orderBy: [{ _count: { creatorId: "desc" } }],
    });

    const creators = await prisma.creator.findMany({
        where: { id: { in: groups.map((group) => group.creatorId) } },
        select: {
            id: true,
            mid: true,
            name: true,
        },
    });
    const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

    return groups.flatMap((group) => {
        const creator = creatorById.get(group.creatorId);
        if (!creator) {
            return [];
        }

        return [{
            mid: creator.mid,
            name: creator.name,
            videoCount: group._count._all,
        }];
    });
}
