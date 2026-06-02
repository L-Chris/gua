"use client";

import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SyncSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      data-umami-event="dashboard_click_sync_latest"
      data-umami-event-module="dashboard"
      data-umami-event-action="sync_latest"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
      {pending ? "正在同步 B 站样本…" : "抓取最新样本"}
    </button>
  );
}
