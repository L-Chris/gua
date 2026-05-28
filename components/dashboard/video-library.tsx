"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardVideo } from "@/lib/insights";
import type {
    LibrarySort,
    TagStatusFilter,
    VideoLibraryPage,
} from "@/lib/video-library-query";
import { VideoTable } from "@/components/dashboard/video-table";

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type VideoLibraryProps = {
    creators: CreatorFilter[];
    initialPage: VideoLibraryPage;
};

export function VideoLibrary({ creators, initialPage }: VideoLibraryProps) {
    const [videos, setVideos] = useState<DashboardVideo[]>(initialPage.videos);
    const [totalCount, setTotalCount] = useState(initialPage.totalCount);
    const [totalPages, setTotalPages] = useState(initialPage.totalPages);
    const [loading, setLoading] = useState(false);
    const [creatorKeyword, setCreatorKeyword] = useState("");
    const [titleKeyword, setTitleKeyword] = useState("");
    const [tagKeyword, setTagKeyword] = useState("");
    const [selectedCreatorMid, setSelectedCreatorMid] = useState("");
    const [librarySort, setLibrarySort] = useState<LibrarySort>("playDesc");
    const [tagStatus, setTagStatus] = useState<TagStatusFilter>("all");
    const [page, setPage] = useState(1);
    const initialFetchSkipped = useRef(false);

    const filteredCreators = useMemo(() => {
        const keyword = creatorKeyword.trim().toLowerCase();
        if (!keyword) {
            return creators;
        }

        return creators.filter((creator) =>
            creator.name.toLowerCase().includes(keyword) ||
            creator.mid.toLowerCase().includes(keyword),
        );
    }, [creators, creatorKeyword]);

    const currentPage = Math.min(page, totalPages);

    useEffect(() => {
        if (!initialFetchSkipped.current) {
            initialFetchSkipped.current = true;
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            page: String(page),
            sort: librarySort,
            tagStatus,
        });

        if (selectedCreatorMid) params.set("creator", selectedCreatorMid);
        if (titleKeyword.trim()) params.set("title", titleKeyword.trim());
        if (tagKeyword.trim()) params.set("tag", tagKeyword.trim());

        setLoading(true);
        fetch(`/api/videos?${params.toString()}`, {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("视频分页加载失败");
                }
                return response.json() as Promise<VideoLibraryPage>;
            })
            .then((result) => {
                setVideos(result.videos);
                setTotalCount(result.totalCount);
                setTotalPages(result.totalPages);
                if (result.page !== page) {
                    setPage(result.page);
                }
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                console.error("load video page failed", error);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [librarySort, page, selectedCreatorMid, tagKeyword, tagStatus, titleKeyword]);

    function handleCreatorChange(value: string) {
        setSelectedCreatorMid(value);
        setPage(1);
    }

    function handleSortChange(value: string) {
        setLibrarySort(value === "playDesc" ? "playDesc" : "publishAtDesc");
        setPage(1);
    }

    function handleTagStatusChange(value: string) {
        setTagStatus(value as TagStatusFilter);
        setPage(1);
    }

    return (
        <div>
            <div className="mb-5 flex flex-col gap-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-200">
                            完整素材库
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold text-white">
                            全部素材样本
                        </h2>
                    </div>
                    <p className="text-sm text-slate-400">
                        当前显示第 {currentPage} / {totalPages} 页，{videos.length} / {totalCount} 条
                        {titleKeyword.trim() || tagKeyword.trim()
                            ? ` · 标题过滤: ${titleKeyword.trim() || "无"} · 标签过滤: ${tagKeyword.trim() || "无"}`
                            : ""}
                        {loading ? " · 加载中..." : ""}
                    </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(200px,280px)_minmax(160px,200px)_minmax(160px,200px)]">
                    <input
                        type="search"
                        value={creatorKeyword}
                        onChange={(event) => setCreatorKeyword(event.target.value)}
                        placeholder="搜索 UP 主"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40"
                    />
                    <input
                        type="search"
                        value={titleKeyword}
                        onChange={(event) => {
                            setTitleKeyword(event.target.value);
                            setPage(1);
                        }}
                        placeholder="按标题过滤"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40"
                    />
                    <input
                        type="search"
                        value={tagKeyword}
                        onChange={(event) => {
                            setTagKeyword(event.target.value);
                            setPage(1);
                        }}
                        placeholder="按标签过滤"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40"
                    />
                    <select
                        value={selectedCreatorMid}
                        onChange={(event) => handleCreatorChange(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
                    >
                        <option value="">全部 UP 主 · {creators.length}</option>
                        {filteredCreators.map((creator) => (
                            <option key={creator.mid} value={creator.mid}>
                                {creator.name} · {creator.videoCount}
                            </option>
                        ))}
                    </select>
                    <select
                        value={librarySort}
                        onChange={(event) => handleSortChange(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
                    >
                        <option value="playDesc">播放量降序</option>
                        <option value="publishAtDesc">最新发布</option>
                    </select>
                    <select
                        value={tagStatus}
                        onChange={(event) => handleTagStatusChange(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
                    >
                        <option value="all">全部标签状态</option>
                        <option value="untagged">未打标签</option>
                        <option value="manual">人工标注</option>
                    </select>
                </div>
            </div>

            <VideoTable videos={videos} />

            <div className="mt-5 flex flex-col items-center gap-2 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((value) => Math.max(value - 1, 1))}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:text-white disabled:border-white/5 disabled:bg-white/2 disabled:text-slate-600"
                    >
                        上一页
                    </button>

                    <span className="text-slate-400">
                        第 {currentPage} / {totalPages} 页
                    </span>

                    <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:text-white disabled:border-white/5 disabled:bg-white/2 disabled:text-slate-600"
                    >
                        下一页
                    </button>
                </div>
                <span className="text-slate-500">每页 {initialPage.pageSize} 条</span>
            </div>

        </div>
    );
}
