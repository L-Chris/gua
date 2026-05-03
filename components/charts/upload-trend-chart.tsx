"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/insights";

export function UploadTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-slate-400">先同步一批视频后再看趋势。</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={24}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            width={32}
          />
          <YAxis
            yAxisId="right"
            axisLine={false}
            orientation="right"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value: number) => `${Math.round(value / 10000)}w`}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: "16px",
              color: "#e2e8f0",
            }}
            formatter={(value: number, name: string) => {
              if (name === "videoCount") return [`${value} 条`, "投稿量"];
              return [value.toLocaleString("zh-CN"), "总播放"];
            }}
            labelFormatter={(label) => `月份：${label}`}
          />
          <Bar dataKey="videoCount" yAxisId="left" fill="#34d399" radius={[10, 10, 0, 0]} maxBarSize={36} />
          <Line
            dataKey="totalPlay"
            dot={{ fill: "#fbbf24", r: 3 }}
            stroke="#fbbf24"
            strokeWidth={3}
            type="monotone"
            yAxisId="right"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
