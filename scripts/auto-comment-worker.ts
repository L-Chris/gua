import { prisma } from "../lib/prisma";
import { bilibiliApiBaseUrl } from "../lib/config";

const COMMENT_TEXT =
    process.env.AUTO_COMMENT_TEXT ??
    `做了一个华强买瓜素材雷达，自动收录B站所有华强买瓜二创，支持按播放量/互动率/UP主筛选，还能看AI字幕。做二创找灵感可以看看 \u{1F449}
官网：https://gua.rethinkos.com
仓库：https://github.com/L-Chris/gua`;

const COMMENT_BATCH = Number.parseInt(process.env.AUTO_COMMENT_BATCH ?? "", 10) || 10;

function toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function msUntilNext9AM() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
}

async function sendComment(aid: string, text: string): Promise<boolean> {
    const url = `${bilibiliApiBaseUrl}/api/comment/send`;
    const body = JSON.stringify({ text, oid: Number(aid) });

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as { success_toast?: string; message?: string };
    if (!data.success_toast) {
        throw new Error(data.message ?? "send_comment failed");
    }

    return true;
}

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function runAutoComment() {
    if (stopping) return;

    const startedAt = new Date();
    console.info(`[auto-comment] starting batch=${COMMENT_BATCH}`);

    const videos = await prisma.video.findMany({
        where: { hasPromoComment: false, aid: { not: null } },
        orderBy: { publishAt: "desc" },
        take: COMMENT_BATCH,
        select: { id: true, bvid: true, aid: true, cleanTitle: true },
    });

    if (videos.length === 0) {
        console.info("[auto-comment] no unprocessed videos, skipping");
    } else {
        let successCount = 0;
        let failCount = 0;

        for (const video of videos) {
            try {
                await sendComment(video.aid!, COMMENT_TEXT);
                await prisma.video.update({
                    where: { id: video.id },
                    data: { hasPromoComment: true },
                });
                successCount += 1;
                console.info(`[auto-comment] sent ${video.bvid} "${video.cleanTitle}"`);
            } catch (error) {
                failCount += 1;
                console.warn(`[auto-comment] failed ${video.bvid}`, error);
            }

            // Bilibili rate limit: wait 30s between comments
            if (videos.indexOf(video) < videos.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 30000));
            }
        }

        await prisma.syncRun.create({
            data: {
                type: "auto_comment",
                status: failCount === 0 ? "success" : "partial",
                keywords: [],
                pageSize: 0,
                fetchedCount: videos.length,
                createdCount: successCount,
                updatedCount: failCount,
                message: `处理 ${videos.length} 条视频，成功 ${successCount} 条，失败 ${failCount} 条`,
                startedAt,
                finishedAt: new Date(),
            },
        });

        console.info(`[auto-comment] done success=${successCount} failed=${failCount}`);
    }

    if (!stopping) {
        const delay = msUntilNext9AM();
        const delayMinutes = Math.round(delay / 60000);
        console.info(`[auto-comment] next run in ${delayMinutes}m`);
        timer = setTimeout(runAutoComment, delay);
    }
}

async function shutdown(signal: string) {
    console.info(`[auto-comment] received ${signal}, shutting down`);
    stopping = true;
    if (timer) clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

const delay = msUntilNext9AM();
const delayMinutes = Math.round(delay / 60000);

console.info(`[auto-comment] started schedule=daily_9am(next=${delayMinutes}m) batch=${COMMENT_BATCH}`);
timer = setTimeout(runAutoComment, delay);
