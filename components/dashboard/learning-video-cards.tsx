import Image from "next/image";
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
        <div className="space-y-3">
            {videos.map((video) => (
                <a
                    key={video.bvid}
                    href={`https://www.bilibili.com/video/${video.bvid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-3 transition hover:border-emerald-300/20 hover:bg-emerald-300/5 cursor-pointer"
                >
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                        {video.coverUrl ? (
                            <Image
                                src={video.coverUrl}
                                alt={video.title}
                                fill
                                sizes="128px"
                                className="object-cover"
                            />
                        ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white transition group-hover:text-emerald-200">
                                {video.title}
                            </h3>
                            <p className="mt-1 truncate text-xs text-slate-400">
                                {video.creatorName} · {formatDateTime(video.publishAt, "yyyy/MM/dd")}
                            </p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                {formatCompactNumber(video.play)} 播放
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                {formatPercent(video.engagementRate)} 互动率
                            </span>
                            {video.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </a>
            ))}
        </div>
    );
}
