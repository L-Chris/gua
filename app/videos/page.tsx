import Link from "next/link";
import { ArrowLeft, Database, Layers3 } from "lucide-react";
import { VideoTable } from "@/components/dashboard/video-table";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
    const [videos, latestSync] = await Promise.all([
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

    return (
        <main className="px-4 py-6 md:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="rounded-4xl border border-white/10 bg-white/5 p-6 md:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm text-emerald-200 transition hover:text-emerald-100"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                返回概览页
                            </Link>
                            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                                Video Library
                            </p>
                            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                                完整素材库
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                                这里展示当前本地数据库里收录的全部样本。你可以按发布时间快速扫一遍最近变化，也可以直接点进原视频继续拆标题、脚本和镜头节奏。
                            </p>
                        </div>
                        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Database className="h-4 w-4" />
                                    样本总量
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {videos.length}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Layers3 className="h-4 w-4" />
                                    最后同步
                                </div>
                                <p className="mt-2 text-sm font-medium text-white">
                                    {latestSync
                                        ? formatDateTime(
                                              latestSync.finishedAt ??
                                                  latestSync.startedAt,
                                          )
                                        : "尚未同步"}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <VideoTable videos={videos} />
            </div>
        </main>
    );
}
