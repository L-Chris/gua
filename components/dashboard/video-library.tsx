"use client";

import { useMemo, useState } from "react";
import type { DashboardVideo } from "@/lib/insights";
import { VideoTable } from "@/components/dashboard/video-table";

type TagRecord = { id: string; name: string };

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type LibrarySort = "playDesc" | "publishAtDesc";

type VideoLibraryProps = {
    creators: CreatorFilter[];
    videos: DashboardVideo[];
    allTags: TagRecord[];
};

const pageSize = 20;

export function VideoLibrary({ creators, videos: initialVideos, allTags }: VideoLibraryProps) {
    const [videos, setVideos] = useState(initialVideos);
    const [creatorKeyword, setCreatorKeyword] = useState("");
    const [selectedCreatorMid, setSelectedCreatorMid] = useState("");
    const [librarySort, setLibrarySort] = useState<LibrarySort>("playDesc");
    const [page, setPage] = useState(1);

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

    const filteredVideos = useMemo(() => {
        const matchedVideos = selectedCreatorMid
            ? videos.filter((video) => video.creator.mid === selectedCreatorMid)
            : videos;

        return [...matchedVideos].sort((left, right) => {
            if (librarySort === "playDesc") {
                return right.play - left.play;
            }

            return new Date(right.publishAt).getTime() - new Date(left.publishAt).getTime();
        });
    }, [videos, selectedCreatorMid, librarySort]);

    const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedVideos = filteredVideos.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    function handleCreatorChange(value: string) {
        setSelectedCreatorMid(value);
        setPage(1);
    }

    function handleSortChange(value: string) {
        setLibrarySort(value === "playDesc" ? "playDesc" : "publishAtDesc");
        setPage(1);
    }

    function handleToggleTag(bvid: string, tagId: string, tagName: string) {
        setVideos((prev) =>
            prev.map((video) => {
                if (video.bvid !== bvid) {
                    return video;
                }

                const existingIndex = video.videoTags.findIndex((t) => t.id === tagId);
                const nextVideoTags =
                    existingIndex === -1
                        ? [...video.videoTags, { id: tagId, name: tagName }]
                        : video.videoTags.filter((t) => t.id !== tagId);

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
                        当前显示第 {currentPage} / {totalPages} 页，{pagedVideos.length} / {filteredVideos.length} 条
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_minmax(180px,220px)]">
                    <input
                        type="search"
                        value={creatorKeyword}
                        onChange={(event) => setCreatorKeyword(event.target.value)}
                        placeholder="搜索 UP 主"
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
                </div>
            </div>

            <VideoTable videos={pagedVideos} allTags={allTags} onToggleTag={handleToggleTag} />

            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-300">
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:text-white disabled:border-white/5 disabled:bg-white/2 disabled:text-slate-600"
                >
                    上一页
                </button>

                <span className="text-slate-400">每页 {pageSize} 条</span>

                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:text-white disabled:border-white/5 disabled:bg-white/2 disabled:text-slate-600"
                >
                    下一页
                </button>
            </div>
        </div>
    );
}
