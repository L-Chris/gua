import {
    getVideoLibraryPage,
    type LibrarySort,
    type TagStatusFilter,
} from "@/lib/video-library-query";

function parsePositiveInt(value: string | null) {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseSort(value: string | null): LibrarySort {
    return value === "publishAtDesc" ? "publishAtDesc" : "playDesc";
}

function parseTagStatus(value: string | null): TagStatusFilter {
    if (value === "ai" || value === "manual" || value === "untagged") {
        return value;
    }

    return "all";
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const result = await getVideoLibraryPage({
        creatorMid: searchParams.get("creator") || undefined,
        page: parsePositiveInt(searchParams.get("page")),
        pageSize: parsePositiveInt(searchParams.get("pageSize")),
        sort: parseSort(searchParams.get("sort")),
        tagKeyword: searchParams.get("tag") || undefined,
        tagStatus: parseTagStatus(searchParams.get("tagStatus")),
        titleKeyword: searchParams.get("title") || undefined,
    });

    return Response.json(result);
}
