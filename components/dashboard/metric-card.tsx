import clsx from "clsx";
import type { ReactNode } from "react";

export function MetricCard({
    accentClassName,
    hint,
    icon,
    label,
    value,
}: {
    accentClassName?: string;
    hint: string;
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-300">{label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                        {value}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-slate-400">
                        {hint}
                    </p>
                </div>
                <div
                    className={clsx(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white",
                        accentClassName,
                    )}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}
