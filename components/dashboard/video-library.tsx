"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { DashboardVideo } from "@/lib/insights";
import type {
    LibrarySort,
    TagStatusFilter,
    VideoLibraryPage,
} from "@/lib/video-library-query";
import { VideoTable } from "@/components/dashboard/video-table";
import { aiAutoTag, applyAiTags } from "@/app/actions/ai-tag";

type TagRecord = { id: string; name: string };

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type VideoLibraryProps = {
    creators: CreatorFilter[];
    initialPage: VideoLibraryPage;
    allTags: TagRecord[];
};

export function VideoLibrary({ creators, initialPage, allTags }: VideoLibraryProps) {
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
    const [selectedBvids, setSelectedBvids] = useState<Set<string>>(new Set());
    const [aiTagging, setAiTagging] = useState(false);
    const [singleAiTagBvid, setSingleAiTagBvid] = useState<string | null>(null);
    const [aiPreview, setAiPreview] = useState<{ bvid: string; tagId: string; tagName: string }[] | null>(null);
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

    function handleToggleSelect(bvid: string) {
        setSelectedBvids((prev) => {
            const next = new Set(prev);
            if (next.has(bvid)) {
                next.delete(bvid);
            } else {
                next.add(bvid);
            }
            return next;
        });
    }

    async function handleAiTagClick() {
        const bvidsToTag = [...selectedBvids];
        if (bvidsToTag.length === 0) return;

        setAiTagging(true);
        try {
            const result = await aiAutoTag(bvidsToTag);
            setSelectedBvids(new Set());
            if (result.preview.length > 0) {
                setAiPreview(result.preview);
            }
        } finally {
            setAiTagging(false);
        }
    }

    async function handleConfirmAiTags() {
        if (!aiPreview) return;
        const preview = aiPreview;
        setAiPreview(null);

        await applyAiTags(preview);
        setVideos((prev) =>
            prev.map((video) => {
                const item = preview.find((t) => t.bvid === video.bvid);
                if (!item) return video;
                const alreadyHasTag = video.videoTags.some((vt) => vt.tag.id === item.tagId);
                if (alreadyHasTag) return video;
                return {
                    ...video,
                    videoTags: [
                        ...video.videoTags,
                        { source: "ai", tag: { id: item.tagId, name: item.tagName } },
                    ],
                };
            }),
        );
    }

    async function handleSingleAiTag(bvid: string) {
        setSingleAiTagBvid(bvid);
        try {
            const result = await aiAutoTag([bvid]);
            if (result.preview.length > 0) {
                setAiPreview(result.preview);
            }
        } finally {
            setSingleAiTagBvid(null);
        }
    }

    function handleToggleTag(bvid: string, tagId: string, tagName: string) {
        setVideos((prev) =>
            prev.map((video) => {
                if (video.bvid !== bvid) {
                    return video;
                }

                const existingIndex = video.videoTags.findIndex((vt) => vt.tag.id === tagId);
                const nextVideoTags =
                    existingIndex === -1
                        ? [...video.videoTags, { source: "manual", tag: { id: tagId, name: tagName } }]
                        : video.videoTags.filter((vt) => vt.tag.id !== tagId);

                return { ...video, videoTags: nextVideoTags };
            }),
        );
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
                        {selectedBvids.size > 0 ? ` · 已选 ${selectedBvids.size} 个` : ""}
                    </p>
                    {selectedBvids.size > 0 ? (
                        <button
                            type="button"
                            disabled={aiTagging}
                            onClick={handleAiTagClick}
                            className="rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-300/20 disabled:opacity-50"
                        >
                            {aiTagging ? "AI 打标签中..." : `✨ AI 打标签 (${selectedBvids.size})`}
                        </button>
                    ) : null}
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
                        <option value="ai">AI 标注</option>
                    </select>
                </div>
            </div>

            <VideoTable videos={videos} allTags={allTags} onToggleTag={handleToggleTag} selectedBvids={selectedBvids} onToggleSelect={handleToggleSelect} onSingleAiTag={handleSingleAiTag} singleAiTagBvid={singleAiTagBvid} />

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

            {aiPreview ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAiPreview(null)}>
                    <div
                        className="mx-4 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-white">AI 标注建议</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            AI 为 {aiPreview.length} 个视频推荐了以下标签，请确认是否标注
                        </p>
                        <div className="mt-4 max-h-72 overflow-auto space-y-3">
                            {aiPreview.map((item) => {
                                const video = videos.find((v) => v.bvid === item.bvid);
                                return (
                                    <a
                                        key={item.bvid}
                                        href={`https://www.bilibili.com/video/${item.bvid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                                    >
                                        {video?.coverUrl ? (
                                            <Image
                                                src={video.coverUrl}
                                                alt={video.cleanTitle}
                                                width={80}
                                                height={50}
                                                className="h-12 w-20 shrink-0 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="h-12 w-20 shrink-0 rounded-lg bg-slate-800" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-white">
                                                {video?.cleanTitle ?? item.bvid}
                                            </p>
                                            <span className="mt-1 inline-block rounded-full border border-pink-300/20 bg-pink-300/10 px-2 py-0.5 text-xs text-pink-100">
                                                {item.tagName}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setAiPreview((prev) =>
                                                    prev ? prev.filter((p) => p.bvid !== item.bvid) : null,
                                                );
                                            }}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-500 transition hover:border-red-300/30 hover:text-red-300"
                                        >
                                            ×
                                        </button>
                                    </a>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setAiPreview(null)}
                                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAiTags}
                                className="flex-1 rounded-2xl bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
                            >
                                确认标注
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
