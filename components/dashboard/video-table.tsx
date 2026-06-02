"use client";

import { useState } from "react";
import Image from "next/image";
import { jsonStringArray, type DashboardVideo } from "@/lib/insights";
import {
    formatCompactNumber,
    formatDateTime,
    formatDurationFromSeconds,
    formatPercent,
} from "@/lib/format";
import { trackUmamiEvent } from "@/lib/umami-events";

export function VideoTable({ videos }: { videos: DashboardVideo[] }) {
    const [subtitleBvid, setSubtitleBvid] = useState<string | null>(null);
    const [subtitleByBvid, setSubtitleByBvid] = useState<Record<string, string | null>>({});
    const [subtitleLoadingBvid, setSubtitleLoadingBvid] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (videos.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                暂无视频数据。
            </div>
        );
    }

    return (
        <div className="rounded-[28px] border border-white/10 bg-slate-950/50">
            <div className="hidden grid-cols-[minmax(0,2.8fr)_1fr_1fr_0.9fr_80px] gap-4 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-slate-500 lg:grid">
                <span>视频</span>
                <span>播放 / 互动</span>
                <span>标签</span>
                <span>时间</span>
                <span>操作</span>
            </div>
            <div>
                {videos.map((video) => {
                    const tags = jsonStringArray(video.tags).slice(0, 3);

                    return (
                        <div
                            key={video.bvid}
                            className="grid gap-4 border-b border-white/8 px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,2.8fr)_1fr_1fr_0.9fr_80px] lg:items-center"
                        >
                            <div className="flex gap-4">
                                <a
                                    href={`https://www.bilibili.com/video/${video.bvid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-umami-event="video_open_bilibili"
                                    data-umami-event-module="video_table"
                                    data-umami-event-source="cover"
                                    data-umami-event-bvid={video.bvid}
                                    data-umami-event-type={video.typeName ?? ""}
                                    className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-900 cursor-pointer"
                                >
                                    {video.coverUrl ? (
                                        <Image
                                            src={video.coverUrl}
                                            alt={video.cleanTitle}
                                            fill
                                            sizes="128px"
                                            className="object-cover"
                                        />
                                    ) : null}
                                </a>
                                <div className="min-w-0">
                                    <a
                                        href={`https://www.bilibili.com/video/${video.bvid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        data-umami-event="video_open_bilibili"
                                        data-umami-event-module="video_table"
                                        data-umami-event-source="title"
                                        data-umami-event-bvid={video.bvid}
                                        data-umami-event-type={video.typeName ?? ""}
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
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2.5 py-1 text-amber-100"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                                {video.videoTags.map((vt) => (
                                    <span
                                        key={vt.tag.id}
                                        className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100"
                                    >
                                        {vt.tag.name}
                                    </span>
                                ))}
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
                            <div className="flex items-center">
                                {video.hasSubtitle ? (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            trackUmamiEvent("video_open_subtitle", {
                                                bvid: video.bvid,
                                                module: "video_table",
                                            });
                                            setSubtitleBvid(video.bvid);
                                            setCopied(false);
                                            if (!(video.bvid in subtitleByBvid)) {
                                                setSubtitleLoadingBvid(video.bvid);
                                                try {
                                                    const response = await fetch(`/api/videos/${encodeURIComponent(video.bvid)}/subtitle`);
                                                    if (!response.ok) {
                                                        throw new Error("字幕加载失败");
                                                    }
                                                    const result = await response.json() as { subtitle: string | null };
                                                    setSubtitleByBvid((current) => ({
                                                        ...current,
                                                        [video.bvid]: result.subtitle,
                                                    }));
                                                } catch (error) {
                                                    console.error("load subtitle failed", error);
                                                    setSubtitleByBvid((current) => ({
                                                        ...current,
                                                        [video.bvid]: null,
                                                    }));
                                                } finally {
                                                    setSubtitleLoadingBvid(null);
                                                }
                                            }
                                        }}
                                        className="cursor-pointer rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-300/20"
                                    >
                                        字幕
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            {subtitleBvid ? (() => {
                const video = videos.find((v) => v.bvid === subtitleBvid);
                if (!video) return null;
                const subtitle = subtitleByBvid[video.bvid] ?? null;
                const isSubtitleLoading = subtitleLoadingBvid === video.bvid;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSubtitleBvid(null)}>
                        <div
                            className="mx-4 flex w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
                            style={{ maxHeight: "80vh" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-semibold text-white">字幕内容</h3>
                                    <p className="mt-1 truncate text-sm text-slate-400">{video.cleanTitle}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (subtitle) {
                                                navigator.clipboard.writeText(subtitle);
                                                trackUmamiEvent("video_copy_subtitle", {
                                                    bvid: video.bvid,
                                                    module: "subtitle_modal",
                                                });
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/20"
                                    >
                                        {copied ? "已复制" : "复制字幕"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSubtitleBvid(null)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:text-white"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-auto p-6">
                                {isSubtitleLoading ? (
                                    <p className="text-sm text-slate-400">字幕加载中...</p>
                                ) : subtitle ? (
                                    <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{subtitle}</pre>
                                ) : (
                                    <p className="text-sm text-slate-500">暂无字幕内容。</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })() : null}
        </div>
    );
}
