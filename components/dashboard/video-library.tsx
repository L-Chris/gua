"use client";

import { useMemo, useState } from "react";
import { jsonStringArray, type DashboardVideo } from "@/lib/insights";
import { VideoTable } from "@/components/dashboard/video-table";
import { aiAutoTag } from "@/app/actions/ai-tag";

type TagRecord = { id: string; name: string };

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type LibrarySort = "playDesc" | "publishAtDesc";
type TagStatusFilter = "all" | "ai" | "manual" | "untagged";

type VideoLibraryProps = {
    creators: CreatorFilter[];
    videos: DashboardVideo[];
    allTags: TagRecord[];
};

const pageSize = 20;

function normalizeKeyword(value: string) {
    return value.replace(/\s+/g, "").trim().toLowerCase();
}

export function VideoLibrary({ creators, videos: initialVideos, allTags }: VideoLibraryProps) {
    const [videos, setVideos] = useState(initialVideos);
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
        const normalizedTitleKeyword = normalizeKeyword(titleKeyword);
        const normalizedTagKeyword = normalizeKeyword(tagKeyword);

        const matchedVideos = videos.filter((video) => {
            if (selectedCreatorMid && video.creator.mid !== selectedCreatorMid) {
                return false;
            }

            if (normalizedTitleKeyword) {
                const cleanTitle = normalizeKeyword(video.cleanTitle);
                const rawTitle = normalizeKeyword(video.title);
                const bvid = normalizeKeyword(video.bvid);
                const titleMatched =
                    cleanTitle.includes(normalizedTitleKeyword) ||
                    rawTitle.includes(normalizedTitleKeyword) ||
                    bvid.includes(normalizedTitleKeyword);
                if (!titleMatched) {
                    return false;
                }
            }

            if (normalizedTagKeyword) {
                const sourceTags = jsonStringArray(video.tags);
                const customTags = video.videoTags.map((vt) => vt.tag.name);
                const allTagNames = [...sourceTags, ...customTags];
                const tagMatched = allTagNames.some((tag) =>
                    normalizeKeyword(tag).includes(normalizedTagKeyword),
                );

                if (!tagMatched) {
                    return false;
                }
            }

            if (tagStatus !== "all") {
                if (tagStatus === "untagged" && video.videoTags.length > 0) {
                    return false;
                }
                if (tagStatus === "ai" && !video.videoTags.some((vt) => vt.source === "ai")) {
                    return false;
                }
                if (tagStatus === "manual" && !video.videoTags.some((vt) => vt.source === "manual")) {
                    return false;
                }
            }

            return true;
        });

        return [...matchedVideos].sort((left, right) => {
            if (librarySort === "playDesc") {
                return right.play - left.play;
            }

            return new Date(right.publishAt).getTime() - new Date(left.publishAt).getTime();
        });
    }, [videos, selectedCreatorMid, titleKeyword, tagKeyword, librarySort, tagStatus]);

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
        if (bvidsToTag.length === 0) {
            return;
        }

        setAiTagging(true);
        try {
            const result = await aiAutoTag(bvidsToTag);
            setSelectedBvids(new Set());

            if (result.appliedTags.length > 0) {
                setVideos((prev) =>
                    prev.map((video) => {
                        const applied = result.appliedTags.find(
                            (t) => t.bvid === video.bvid,
                        );
                        if (!applied) {
                            return video;
                        }

                        const alreadyHasTag = video.videoTags.some(
                            (vt) => vt.tag.id === applied.tagId,
                        );
                        if (alreadyHasTag) {
                            return video;
                        }

                        return {
                            ...video,
                            videoTags: [
                                ...video.videoTags,
                                { source: "ai", tag: { id: applied.tagId, name: applied.tagName } },
                            ],
                        };
                    }),
                );
            }
        } finally {
            setAiTagging(false);
        }
    }

    async function handleSingleAiTag(bvid: string) {
        setSingleAiTagBvid(bvid);
        try {
            const result = await aiAutoTag([bvid]);
            if (result.appliedTags.length > 0) {
                const applied = result.appliedTags[0];
                setVideos((prev) =>
                    prev.map((video) => {
                        if (video.bvid !== bvid) return video;

                        const alreadyHasTag = video.videoTags.some(
                            (vt) => vt.tag.id === applied.tagId,
                        );
                        if (alreadyHasTag) return video;

                        return {
                            ...video,
                            videoTags: [
                                ...video.videoTags,
                                { source: "ai", tag: { id: applied.tagId, name: applied.tagName } },
                            ],
                        };
                    }),
                );
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
                        当前显示第 {currentPage} / {totalPages} 页，{pagedVideos.length} / {filteredVideos.length} 条
                        {titleKeyword.trim() || tagKeyword.trim()
                            ? ` · 标题过滤: ${titleKeyword.trim() || "无"} · 标签过滤: ${tagKeyword.trim() || "无"}`
                            : ""}
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

            <VideoTable videos={pagedVideos} allTags={allTags} onToggleTag={handleToggleTag} selectedBvids={selectedBvids} onToggleSelect={handleToggleSelect} onSingleAiTag={handleSingleAiTag} singleAiTagBvid={singleAiTagBvid} />

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
                <span className="text-slate-500">每页 {pageSize} 条</span>
            </div>
        </div>
    );
}
