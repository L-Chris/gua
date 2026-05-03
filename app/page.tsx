import Link from "next/link";
import {
    BarChart3,
    Captions,
    Clock3,
    Film,
    PlayCircle,
    Sparkles,
    Users,
} from "lucide-react";
import { syncVideoLibraryAction } from "@/app/actions/sync";
import { DurationDistributionChart } from "@/components/charts/duration-distribution-chart";
import { UploadTrendChart } from "@/components/charts/upload-trend-chart";
import { LearningVideoCards } from "@/components/dashboard/learning-video-cards";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SyncSubmitButton } from "@/components/dashboard/sync-submit-button";
import { TopCreatorList } from "@/components/dashboard/top-creator-list";
import { TopTagList } from "@/components/dashboard/top-tag-list";
import { VideoTable } from "@/components/dashboard/video-table";
import { defaultSyncKeywords } from "@/lib/config";
import {
    formatCompactNumber,
    formatDateTime,
    formatDurationFromSeconds,
    formatPercent,
} from "@/lib/format";
import { buildDashboardInsights } from "@/lib/insights";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function syncStatusLabel(status: string | null | undefined) {
    if (!status) return "尚未同步";
    if (status === "success") return "同步成功";
    if (status === "failed") return "同步失败";
    if (status === "running") return "同步中";
    return status;
}

export default async function Home() {
    const [videos, lastSync] = await Promise.all([
        prisma.video.findMany({
            orderBy: [{ publishAt: "desc" }],
            include: {
                creator: {
                    select: {
                        faceUrl: true,
                        mid: true,
                        name: true,
                    },
                },
            },
        }),
        prisma.syncRun.findFirst({
            orderBy: { startedAt: "desc" },
        }),
    ]);

    const insights = buildDashboardInsights(videos);

    return (
        <main className="px-4 py-6 md:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur md:p-8">
                    <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                                HuaQiang Idea Radar
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                                华强买瓜素材雷达
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                                面向华强买瓜相关视频 Up 主的灵感站。你可以直接看
                                B
                                站样本库里的投稿趋势、常见标签、高表现样本和最近更新，快速判断还能往哪种方向做二创。
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                                {defaultSyncKeywords.map((keyword) => (
                                    <span
                                        key={keyword}
                                        className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    数据源：bilibili-mcp · 8012
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    本地数据库：MySQL
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    视图：趋势 / 标签 / 样本 / 素材库
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 rounded-4xl border border-white/10 bg-slate-950/50 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-300">
                                        最新同步
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-white">
                                        {syncStatusLabel(lastSync?.status)}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        {lastSync
                                            ? `${formatDateTime(lastSync.finishedAt ?? lastSync.startedAt)} · ${lastSync.message ?? "已更新素材库"}`
                                            : "当前还没有样本数据，先抓一轮默认关键词即可开始分析。"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                                    默认 {defaultSyncKeywords.length} 组关键词
                                </div>
                            </div>

                            <form action={syncVideoLibraryAction}>
                                <SyncSubmitButton />
                            </form>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                        AI 字幕抓取
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                        默认只给时长 15
                                        分钟以内、且还没抓过字幕的样本补字幕，避免同步太慢。
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                        适合用途
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                        找近期变体、看热门标签、挑选可拆解标题与节奏样本。
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/videos"
                                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200 transition hover:text-emerald-100"
                            >
                                查看完整素材库
                                <span aria-hidden>→</span>
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        accentClassName="bg-emerald-300/10 text-emerald-100"
                        hint={
                            insights.totals.totalVideos > 0
                                ? `最近同步：${formatDateTime(lastSync?.startedAt ?? new Date())}`
                                : "等待首次同步"
                        }
                        icon={<Film className="h-5 w-5" />}
                        label="收录视频"
                        value={String(insights.totals.totalVideos)}
                    />
                    <MetricCard
                        accentClassName="bg-sky-300/10 text-sky-100"
                        hint="按素材库内的去重作者统计"
                        icon={<Users className="h-5 w-5" />}
                        label="UP 主数量"
                        value={String(insights.totals.totalCreators)}
                    />
                    <MetricCard
                        accentClassName="bg-amber-300/10 text-amber-100"
                        hint="越大说明梗的覆盖面越广"
                        icon={<PlayCircle className="h-5 w-5" />}
                        label="累计播放"
                        value={formatCompactNumber(insights.totals.totalPlay)}
                    />
                    <MetricCard
                        accentClassName="bg-fuchsia-300/10 text-fuchsia-100"
                        hint={`平均时长 ${formatDurationFromSeconds(Math.round(insights.totals.averageDurationSeconds))}`}
                        icon={<Captions className="h-5 w-5" />}
                        label="AI 字幕覆盖"
                        value={formatPercent(insights.totals.subtitleCoverage)}
                    />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-emerald-200">
                                    趋势总览
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-white">
                                    月度投稿与播放走势
                                </h2>
                            </div>
                            <BarChart3 className="h-5 w-5 text-emerald-200" />
                        </div>
                        <p className="mb-4 text-sm leading-6 text-slate-400">
                            柱状图看投稿量，折线看总播放。适合判断这个梗最近是在升温、横盘，还是靠单条爆款拉动。
                        </p>
                        <UploadTrendChart data={insights.uploadTrend} />
                    </div>

                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-sky-200">
                                    结构观察
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-white">
                                    时长分布
                                </h2>
                            </div>
                            <Clock3 className="h-5 w-5 text-sky-200" />
                        </div>
                        <p className="mb-4 text-sm leading-6 text-slate-400">
                            看大家更偏向短平快梗、3
                            分钟以内小剧场，还是更长的剧情混剪与设定展开。
                        </p>
                        <DurationDistributionChart
                            data={insights.durationBuckets}
                        />
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5">
                            <p className="text-sm font-medium text-amber-200">
                                标签灵感
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                最常出现的创作标签
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                这里优先看“鬼畜 / 体育 / 动漫 / 配音 / 刘华强 /
                                征服”这类标签组合，能快速反推当前流行的混搭方向。
                            </p>
                        </div>
                        <TopTagList tags={insights.topTags} />
                    </div>

                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5">
                            <p className="text-sm font-medium text-cyan-200">
                                作者分布
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                高覆盖 Up 主
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                榜单按总播放优先，其次看样本数。适合你直接去观察这些作者的标题模板、镜头节奏和联动对象。
                            </p>
                        </div>
                        <TopCreatorList creators={insights.topCreators} />
                    </div>
                </section>

                <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-fuchsia-200">
                                学习样本
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                优先拆解这些视频
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                综合互动率、传播意愿、标签清晰度和字幕可读性，自动挑出一批更适合拿来学习结构的素材。
                            </p>
                        </div>
                        <Sparkles className="h-5 w-5 text-fuchsia-200" />
                    </div>
                    <LearningVideoCards videos={insights.learningVideos} />
                </section>

                <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-sm font-medium text-emerald-200">
                                最近收录
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                最新素材样本
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                先看最新稿件的标题变化，再去判断这个梗最近是不是开始迁移到别的分区或玩法。
                            </p>
                        </div>
                        <Link
                            href="/videos"
                            className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100"
                        >
                            打开完整素材库 →
                        </Link>
                    </div>
                    <VideoTable videos={insights.recentVideos.slice(0, 10)} />
                </section>
            </div>
        </main>
    );
}
