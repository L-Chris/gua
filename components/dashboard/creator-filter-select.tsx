"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type CreatorFilterSelectProps = {
    creators: CreatorFilter[];
    selectedCreatorMid?: string;
};

export function CreatorFilterSelect({
    creators,
    selectedCreatorMid,
}: CreatorFilterSelectProps) {
    const router = useRouter();
    const [keyword, setKeyword] = useState("");

    const filteredCreators = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        if (!normalizedKeyword) {
            return creators;
        }

        return creators.filter((creator) =>
            creator.name.toLowerCase().includes(normalizedKeyword) ||
            creator.mid.toLowerCase().includes(normalizedKeyword),
        );
    }, [creators, keyword]);

    function handleChange(value: string) {
        if (!value) {
            router.push("/");
            return;
        }

        const params = new URLSearchParams({ creatorMid: value });
        router.push(`/?${params.toString()}`);
    }

    return (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
            <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索 UP 主"
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40"
            />
            <select
                value={selectedCreatorMid ?? ""}
                onChange={(event) => handleChange(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
            >
                <option value="">全部 UP 主 · {creators.length}</option>
                {filteredCreators.map((creator) => (
                    <option key={creator.mid} value={creator.mid}>
                        {creator.name} · {creator.videoCount}
                    </option>
                ))}
            </select>
        </div>
    );
}
