"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DurationBucket } from "@/lib/insights";

export function DurationDistributionChart({ data }: { data: DurationBucket[] }) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-slate-400">暂无时长分布数据。</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} width={32} />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: "16px",
              color: "#e2e8f0",
            }}
            formatter={(value: number) => [`${value} 条`, "视频数"]}
            labelFormatter={(label) => `区间：${label}`}
          />
          <Bar dataKey="count" fill="#60a5fa" radius={[10, 10, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
