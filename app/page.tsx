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
import { TaggedVideoDistributionChart } from "@/components/charts/tagged-video-distribution-chart";
import { UploadTrendChart } from "@/components/charts/upload-trend-chart";
import { LearningVideoCards } from "@/components/dashboard/learning-video-cards";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SyncSubmitButton } from "@/components/dashboard/sync-submit-button";
import { SubtitleBackfillButton } from "@/components/dashboard/subtitle-backfill-button";
import { TopCreatorList } from "@/components/dashboard/top-creator-list";
import { TopTagList } from "@/components/dashboard/top-tag-list";
import { VideoLibrary } from "@/components/dashboard/video-library";
import { triggerSubtitleBackfill } from "@/app/actions/subtitle-backfill";
import { getAllTags } from "@/app/actions/tags";
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
    const [videos, lastSync, allTags] = await Promise.all([
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
                videoTags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        }),
        prisma.syncRun.findFirst({
            orderBy: { startedAt: "desc" },
        }),
        getAllTags(),
    ]);

    const insights = buildDashboardInsights(videos);
    const creatorFilters = [...videos.reduce((map, video) => {
        const current = map.get(video.creator.mid);
        if (current) {
            current.videoCount += 1;
        } else {
            map.set(video.creator.mid, {
                faceUrl: video.creator.faceUrl,
                mid: video.creator.mid,
                name: video.creator.name,
                videoCount: 1,
            });
        }
        return map;
    }, new Map<string, { faceUrl: string | null; mid: string; name: string; videoCount: number }>()).values()].sort(
        (left, right) => right.videoCount - left.videoCount || left.name.localeCompare(right.name),
    );
    return (
        <main className="px-4 py-6 md:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur md:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                                HuaQiang Idea Radar
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                                华强买瓜素材雷达
                            </h1>
                        </div>

                        <div className="flex min-w-72 flex-col gap-4 rounded-4xl border border-white/10 bg-slate-950/50 p-5">
                            <div>
                                <p className="text-sm font-medium text-slate-300">
                                    最新同步
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {syncStatusLabel(lastSync?.status)}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    {lastSync
                                        ? formatDateTime(lastSync.finishedAt ?? lastSync.startedAt)
                                        : "尚未同步"}
                                </p>
                            </div>

                            <form action={syncVideoLibraryAction}>
                                <SyncSubmitButton />
                            </form>
                            <form action={triggerSubtitleBackfill}>
                                <SubtitleBackfillButton />
                            </form>
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

                <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-violet-200">
                                标签标注分布
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                已打标签 / 未打标签视频数
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                用于快速查看素材库中已经做过人工标签标注的视频数量，以及尚未标注的视频数量。
                            </p>
                        </div>
                    </div>
                    <TaggedVideoDistributionChart data={insights.taggedVideoBuckets} />
                </section>

                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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

                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-fuchsia-200">
                                    学习样本
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-white">
                                    优先拆解这些视频
                                </h2>
                            </div>
                            <Sparkles className="h-5 w-5 text-fuchsia-200" />
                        </div>
                        <LearningVideoCards videos={insights.learningVideos} />
                    </div>
                </section>

                <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
                    <VideoLibrary creators={creatorFilters} videos={videos} allTags={allTags} />
                </section>

                <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
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
                </section>
            </div>
        </main>
    );
}
