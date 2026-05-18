import { Prisma } from "@prisma/client";
import { jsonStringArray, type DashboardVideo } from "@/lib/insights";
import { prisma } from "@/lib/prisma";

export const videoLibraryPageSize = 20;

export type LibrarySort = "playDesc" | "publishAtDesc";
export type TagStatusFilter = "all" | "ai" | "manual" | "untagged";

export type VideoLibraryQueryOptions = {
    creatorMid?: string;
    page?: number;
    pageSize?: number;
    sort?: LibrarySort;
    tagKeyword?: string;
    tagStatus?: TagStatusFilter;
    titleKeyword?: string;
};

export type VideoLibraryPage = {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    videos: DashboardVideo[];
};

export const dashboardVideoSelect = {
    bvid: true,
    cleanTitle: true,
    coverUrl: true,
    creator: {
        select: {
            faceUrl: true,
            mid: true,
            name: true,
        },
    },
    durationSeconds: true,
    engagementRate: true,
    favorite: true,
    hasSubtitle: true,
    like: true,
    play: true,
    publishAt: true,
    reply: true,
    share: true,
    sourceKeywords: true,
    tags: true,
    title: true,
    typeName: true,
    videoTags: {
        select: {
            source: true,
            tag: { select: { id: true, name: true } },
        },
    },
} satisfies Prisma.VideoSelect;

function normalizeKeyword(value: string | undefined) {
    return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

function normalizePage(value: number | undefined) {
    return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

function normalizePageSize(value: number | undefined) {
    if (!Number.isFinite(value) || !value || value <= 0) {
        return videoLibraryPageSize;
    }

    return Math.min(Math.floor(value), 100);
}

function buildWhere(options: VideoLibraryQueryOptions) {
    const where: Prisma.VideoWhereInput = {};
    const titleKeyword = options.titleKeyword?.trim();

    if (options.creatorMid?.trim()) {
        where.creator = { mid: options.creatorMid.trim() };
    }

    if (titleKeyword) {
        where.OR = [
            { cleanTitle: { contains: titleKeyword } },
            { title: { contains: titleKeyword } },
            { bvid: { contains: titleKeyword } },
        ];
    }

    if (options.tagStatus === "untagged") {
        where.videoTags = { none: {} };
    } else if (options.tagStatus === "ai" || options.tagStatus === "manual") {
        where.videoTags = { some: { source: options.tagStatus } };
    }

    return where;
}

function orderBy(sort: LibrarySort | undefined): Prisma.VideoOrderByWithRelationInput[] {
    if (sort === "publishAtDesc") {
        return [{ publishAt: "desc" }];
    }

    return [{ play: "desc" }, { publishAt: "desc" }];
}

function matchesTagKeyword(video: DashboardVideo, keyword: string) {
    if (!keyword) {
        return true;
    }

    const sourceTags = jsonStringArray(video.tags);
    const customTags = video.videoTags.map((vt) => vt.tag.name);
    return [...sourceTags, ...customTags].some((tag) =>
        normalizeKeyword(tag).includes(keyword),
    );
}

export async function getVideoLibraryPage(
    options: VideoLibraryQueryOptions = {},
): Promise<VideoLibraryPage> {
    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize);
    const tagKeyword = normalizeKeyword(options.tagKeyword);
    const where = buildWhere(options);

    if (tagKeyword) {
        const matchedVideos = (
            await prisma.video.findMany({
                orderBy: orderBy(options.sort),
                select: dashboardVideoSelect,
                where,
            })
        ).filter((video) => matchesTagKeyword(video, tagKeyword));
        const totalCount = matchedVideos.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        const currentPage = Math.min(page, totalPages);

        return {
            page: currentPage,
            pageSize,
            totalCount,
            totalPages,
            videos: matchedVideos.slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize,
            ),
        };
    }

    const totalCount = await prisma.video.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(page, totalPages);
    const videos = await prisma.video.findMany({
        orderBy: orderBy(options.sort),
        select: dashboardVideoSelect,
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        where,
    });

    return {
        page: currentPage,
        pageSize,
        totalCount,
        totalPages,
        videos,
    };
}
