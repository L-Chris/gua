"use client";

import { Captions, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubtitleBackfillButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            data-umami-event="dashboard_click_subtitle_backfill"
            data-umami-event-module="dashboard"
            data-umami-event-action="subtitle_backfill"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-300/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Captions className="h-4 w-4" />}
            {pending ? "正在补全字幕…" : "补全 AI 字幕"}
        </button>
    );
}
