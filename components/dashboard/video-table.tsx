"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { jsonStringArray, type DashboardVideo } from "@/lib/insights";
import {
    formatCompactNumber,
    formatDateTime,
    formatDurationFromSeconds,
    formatPercent,
} from "@/lib/format";
import { toggleVideoTag } from "@/app/actions/tags";

type TagRecord = { id: string; name: string };

export function VideoTable({
    videos,
    allTags,
    onToggleTag,
}: {
    videos: DashboardVideo[];
    allTags: TagRecord[];
    onToggleTag: (bvid: string, tagId: string, tagName: string) => void;
}) {
    const [openBvid, setOpenBvid] = useState<string | null>(null);
    const [pendingBvid, setPendingBvid] = useState<string | null>(null);

    useEffect(() => {
        if (!openBvid) {
            return;
        }

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement | null;
            const isInsideCurrentDropdown = target?.closest(
                `[data-tag-dropdown-bvid="${openBvid}"]`,
            );

            if (!isInsideCurrentDropdown) {
                setOpenBvid(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openBvid]);

    if (videos.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                暂无视频数据。
            </div>
        );
    }

    async function handleToggleTag(bvid: string, tagId: string, tagName: string) {
        setPendingBvid(bvid);
        try {
            await toggleVideoTag(bvid, tagId);
            onToggleTag(bvid, tagId, tagName);
            setOpenBvid(null);
        } catch (error) {
            console.error("toggleVideoTag failed", error);
        } finally {
            setPendingBvid(null);
        }
    }

    return (
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50">
            <div className="hidden grid-cols-[minmax(0,2.8fr)_1fr_1fr_0.9fr] gap-4 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-slate-500 lg:grid">
                <span>视频</span>
                <span>播放 / 互动</span>
                <span>标签</span>
                <span>时间</span>
            </div>
            <div>
                {videos.map((video) => {
                    const tags = jsonStringArray(video.tags).slice(0, 3);

                    return (
                        <div
                            key={video.bvid}
                            className="grid gap-4 border-b border-white/8 px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,2.8fr)_1fr_1fr_0.9fr] lg:items-center"
                        >
                            <div className="flex gap-4">
                                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                                    {video.coverUrl ? (
                                        <Image
                                            src={video.coverUrl}
                                            alt={video.cleanTitle}
                                            fill
                                            sizes="128px"
                                            className="object-cover"
                                        />
                                    ) : null}
                                </div>
                                <div className="min-w-0">
                                    <a
                                        href={`https://www.bilibili.com/video/${video.bvid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="line-clamp-2 text-base font-semibold text-white transition hover:text-emerald-200"
                                    >
                                        {video.cleanTitle}
                                    </a>
                                    <p className="mt-2 text-sm text-slate-300">
                                        {video.creator.name}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                            BV：{video.bvid}
                                        </span>
                                        {video.typeName ? (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                                {video.typeName}
                                            </span>
                                        ) : null}
                                        {video.hasSubtitle ? (
                                            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                                                AI 字幕
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-300">
                                <p>{formatCompactNumber(video.play)} 播放</p>
                                <p className="mt-1">
                                    {formatCompactNumber(video.like)} 点赞 ·{" "}
                                    {formatPercent(video.engagementRate)} 互动率
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {formatCompactNumber(video.share)} 转发 ·{" "}
                                    {formatCompactNumber(video.reply)} 评论
                                </p>
                            </div>
                            <div className="flex flex-wrap items-start gap-2 text-xs text-slate-300">
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2.5 py-1 text-amber-100"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                    {video.videoTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            disabled={pendingBvid === video.bvid}
                                            onClick={() => handleToggleTag(video.bvid, tag.id, tag.name)}
                                            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100 transition hover:bg-cyan-300/20"
                                        >
                                            {tag.name} ×
                                        </button>
                                    ))}
                                </div>
                                <div className="relative" data-tag-dropdown-bvid={video.bvid}>
                                    <button
                                        type="button"
                                        disabled={pendingBvid === video.bvid}
                                        onClick={() =>
                                            setOpenBvid(openBvid === video.bvid ? null : video.bvid)
                                        }
                                        className="rounded-full border border-dashed border-white/20 bg-white/5 px-2.5 py-1 text-slate-400 transition hover:border-white/30 hover:text-white"
                                    >
                                        + 标签
                                    </button>
                                    {openBvid === video.bvid ? (
                                        <div className="absolute right-0 z-20 mt-1 max-h-48 w-44 overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">
                                            {allTags
                                                .filter(
                                                    (tag) =>
                                                        !video.videoTags.some((vt) => vt.id === tag.id),
                                                )
                                                .map((tag) => (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleTag(video.bvid, tag.id, tag.name)
                                                        }
                                                        className="block w-full rounded-xl px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/10"
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            {allTags.filter(
                                                (tag) => !video.videoTags.some((vt) => vt.id === tag.id),
                                            ).length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-slate-500">
                                                    没有更多标签
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="text-sm text-slate-300">
                                <p>
                                    {formatDateTime(
                                        video.publishAt,
                                        "yyyy-MM-dd",
                                    )}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    时长{" "}
                                    {formatDurationFromSeconds(
                                        video.durationSeconds,
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
