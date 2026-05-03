import type { TagSummary } from "@/lib/insights";

export function TopTagList({ tags }: { tags: TagSummary[] }) {
    if (tags.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                暂无标签统计。
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3">
            {tags.map((tag, index) => (
                <div
                    key={tag.label}
                    className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-4 py-2 text-sm text-amber-100"
                >
                    <span className="font-semibold">#{tag.label}</span>
                    <span className="ml-2 text-amber-200/80">{tag.count}</span>
                    {index < 3 ? (
                        <span className="ml-2 text-[11px] uppercase tracking-[0.2em] text-amber-200/70">
                            hot
                        </span>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
