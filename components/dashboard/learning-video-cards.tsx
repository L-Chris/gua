import Image from "next/image";
import { ExternalLink, Sparkles } from "lucide-react";
import type { LearningVideo } from "@/lib/insights";
import {
    formatCompactNumber,
    formatDateTime,
    formatPercent,
} from "@/lib/format";

export function LearningVideoCards({ videos }: { videos: LearningVideo[] }) {
    if (videos.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                同步后会在这里给出学习样本。
            </div>
        );
    }

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            {videos.map((video) => (
                <article
                    key={video.bvid}
                    className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-[0_18px_60px_rgba(15,23,42,0.18)]"
                >
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        {video.coverUrl ? (
                            <Image
                                src={video.coverUrl}
                                alt={video.title}
                                fill
                                sizes="(min-width: 1280px) 40vw, 100vw"
                                className="object-cover opacity-80"
                            />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                            <div>
                                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    灵感样本
                                </p>
                                <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-white">
                                    {video.title}
                                </h3>
                            </div>
                            <a
                                href={`https://www.bilibili.com/video/${video.bvid}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white transition hover:bg-black/50"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                {video.creatorName}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                {formatCompactNumber(video.play)} 播放
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                {formatPercent(video.engagementRate)} 互动率
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                {formatDateTime(video.publishAt, "yyyy-MM-dd")}
                            </span>
                        </div>
                        <p className="text-sm leading-6 text-slate-300">
                            {video.reason}
                        </p>
                        {video.subtitleExcerpt ? (
                            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
                                “{video.subtitleExcerpt}”
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                            {video.sourceKeywords.slice(0, 3).map((keyword) => (
                                <span
                                    key={keyword}
                                    className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-cyan-100"
                                >
                                    关键词：{keyword}
                                </span>
                            ))}
                            {video.tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}
