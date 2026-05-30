import Image from "next/image";
import Link from "next/link";
import type { CreatorSummary } from "@/lib/insights";
import {
    formatCompactNumber,
    formatDateTime,
    formatPercent,
} from "@/lib/format";

export function TopCreatorList({ creators }: { creators: CreatorSummary[] }) {
    if (creators.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                暂无 UP 主榜单。
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {creators.map((creator, index) => (
                <div
                    key={creator.mid}
                    className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                        {String(index + 1).padStart(2, "0")}
                    </div>
                    <Link
                        href={`https://space.bilibili.com/${creator.mid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                        {creator.faceUrl ? (
                            <Image
                                src={creator.faceUrl}
                                alt={creator.name}
                                width={44}
                                height={44}
                                className="h-11 w-11 rounded-2xl object-cover"
                            />
                        ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-sm text-slate-300">
                                {creator.name.slice(0, 1)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                                {creator.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                最近发布：
                                {formatDateTime(creator.latestPublishAt, "yyyy/MM/dd")}
                            </p>
                        </div>
                    </Link>
                    <div className="text-right text-xs text-slate-300">
                        <p>{creator.videoCount} 条样本</p>
                        <p>{formatCompactNumber(creator.totalPlay)} 播放</p>
                        <p>
                            {formatPercent(creator.averageEngagementRate)}{" "}
                            互动率
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
