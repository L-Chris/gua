import {
    BarChart3,
    Clock3,
    Sparkles,
    Users,
} from "lucide-react";
import { DurationDistributionChart } from "@/components/charts/duration-distribution-chart";
import { UploadTrendChart } from "@/components/charts/upload-trend-chart";
import { LearningVideoCards } from "@/components/dashboard/learning-video-cards";
import { TopCreatorList } from "@/components/dashboard/top-creator-list";
import { VideoLibrary } from "@/components/dashboard/video-library";
import { buildDashboardInsights } from "@/lib/insights";
import { prisma } from "@/lib/prisma";
import {
    dashboardVideoSelect,
    getVideoLibraryPage,
} from "@/lib/video-library-query";

export const dynamic = "force-dynamic";

export default async function Home() {
    const [videos, initialLibraryPage] = await Promise.all([
        prisma.video.findMany({
            orderBy: [{ publishAt: "desc" }],
            select: dashboardVideoSelect,
        }),
        getVideoLibraryPage(),
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
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                                HuaQiang Idea Radar
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                                华强买瓜素材雷达
                            </h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-right text-sm text-slate-300">
                            <Users className="h-4 w-4 text-sky-300" />
                            <div>
                                <p className="font-medium text-white">{insights.totals.totalVideos} 个视频素材</p>
                                <p className="text-xs text-slate-400">{insights.totals.totalCreators} 位 UP 主</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-emerald-200">
                                    趋势总览
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-white">
                                    季度投稿与播放走势
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

                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
                        <div className="mb-5">
                            <p className="text-sm font-medium text-cyan-200">
                                作者榜单
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-white">
                                高覆盖 Up 主
                            </h2>
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
                    <VideoLibrary
                        creators={creatorFilters}
                        initialPage={initialLibraryPage}
                    />
                </section>
            </div>
        </main>
    );
}
