"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackUmamiEvent } from "@/lib/umami-events";

type CreatorFilter = {
    mid: string;
    name: string;
    videoCount: number;
};

type CreatorFilterSelectProps = {
    creators: CreatorFilter[];
    selectedCreatorMid?: string;
    selectedLibrarySort: "publishAtDesc" | "playDesc";
};

export function CreatorFilterSelect({
    creators,
    selectedCreatorMid,
    selectedLibrarySort,
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

    function pushFilters(creatorMid: string | undefined, librarySort: "publishAtDesc" | "playDesc") {
        trackUmamiEvent("dashboard_filter_creator", {
            creator_selected: Boolean(creatorMid),
            module: "dashboard_filters",
            sort: librarySort,
        });

        const params = new URLSearchParams();

        if (creatorMid) {
            params.set("creatorMid", creatorMid);
        }

        if (librarySort !== "publishAtDesc") {
            params.set("librarySort", librarySort);
        }

        const query = params.toString();
        router.push(query ? `/?${query}` : "/");
    }

    return (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_minmax(180px,220px)]">
            <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value) {
                        trackUmamiEvent("dashboard_search_creator", {
                            keyword_length: value.length,
                            module: "dashboard_filters",
                        });
                    }
                }}
                placeholder="搜索 UP 主"
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/40"
            />
            <select
                value={selectedCreatorMid ?? ""}
                onChange={(event) => pushFilters(event.target.value || undefined, selectedLibrarySort)}
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
                value={selectedLibrarySort}
                onChange={(event) =>
                    pushFilters(
                        selectedCreatorMid,
                        event.target.value === "playDesc" ? "playDesc" : "publishAtDesc",
                    )
                }
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
            >
                <option value="publishAtDesc">最新发布</option>
                <option value="playDesc">播放量降序</option>
            </select>
        </div>
    );
}
