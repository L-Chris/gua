import { syncVideoLibrary } from "../lib/sync";
import { backfillMissingSubtitles } from "../lib/subtitle-backfill";
import { prisma } from "../lib/prisma";

function toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function msUntilNextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
}

function currentQuarterRange() {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const startMonth = (quarter - 1) * 3;
    const endMonth = quarter * 3; // next quarter's first month = this quarter's end month
    const pad = (n: number) => String(n).padStart(2, "0");
    const timeStart = `${year}-${pad(startMonth + 1)}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const timeEnd = `${year}-${pad(endMonth)}-${pad(lastDay)}`;
    return { timeStart, timeEnd };
}

const subtitleBatchSize = toPositiveInt(process.env.DAILY_SUBTITLE_BATCH_SIZE, 200);

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function runDaily() {
    if (stopping) return;

    try {
        const { timeStart, timeEnd } = currentQuarterRange();
        console.info(`[daily-sync-worker] starting video sync ${timeStart} ~ ${timeEnd}`);
        const result = await syncVideoLibrary({ timeStart, timeEnd });
        console.info(
            `[daily-sync-worker] video sync done created=${result.createdCount} updated=${result.updatedCount} fetched=${result.fetchedCount} deduped=${result.dedupedCount}`,
        );

        console.info("[daily-sync-worker] starting subtitle backfill");
        const subtitleResult = await backfillMissingSubtitles(subtitleBatchSize);
        console.info(
            `[daily-sync-worker] subtitle backfill done found=${subtitleResult.foundCount} subtitle=${subtitleResult.subtitleCount} failed=${subtitleResult.failedCount}`,
        );
    } catch (error) {
        console.warn("[daily-sync-worker] daily run failed", error);
    } finally {
        if (!stopping) {
            timer = setTimeout(runDaily, msUntilNextMidnight());
        }
    }
}

async function shutdown(signal: string) {
    console.info(`[daily-sync-worker] received ${signal}, shutting down`);
    stopping = true;

    if (timer) clearTimeout(timer);

    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

const delayMinutes = Math.round(msUntilNextMidnight() / 60000);

console.info(
    `[daily-sync-worker] started schedule=midnight_daily(next=${delayMinutes}m) subtitleBatch=${subtitleBatchSize}`,
);

timer = setTimeout(runDaily, msUntilNextMidnight());
