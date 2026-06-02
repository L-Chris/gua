"use client";

import dynamic from "next/dynamic";

const VideoLibrary = dynamic(
    () => import("@/components/dashboard/video-library").then((mod) => mod.VideoLibrary),
    {
        ssr: false,
        loading: () => (
            <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                素材库加载中...
            </div>
        ),
    },
);

export function DeferredVideoLibrary() {
    return <VideoLibrary />;
}
