import { syncVideoLibrary } from "../lib/sync";
import { backfillMissingSubtitles } from "../lib/subtitle-backfill";
import { prisma } from "../lib/prisma";

function toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const initialDelayMinutes = toPositiveInt(process.env.DAILY_SYNC_INITIAL_DELAY_MINUTES, 5);
const subtitleBatchSize = toPositiveInt(process.env.DAILY_SUBTITLE_BATCH_SIZE, 200);
const intervalHours = 24;
const intervalMs = intervalHours * 60 * 60 * 1000;

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function runOnce() {
    if (stopping) {
        return;
    }

    try {
        console.info("[daily-sync-worker] starting video sync");
        const result = await syncVideoLibrary();
        console.info(
            `[daily-sync-worker] video sync done created=${result.createdCount} updated=${result.updatedCount} fetched=${result.fetchedCount} deduped=${result.dedupedCount}`,
        );

        console.info("[daily-sync-worker] starting subtitle backfill");
        const subtitleResult = await backfillMissingSubtitles(subtitleBatchSize);
        console.info(
            `[daily-sync-worker] subtitle backfill done found=${subtitleResult.foundCount} subtitle=${subtitleResult.subtitleCount} failed=${subtitleResult.failedCount}`,
        );
    } catch (error) {
        console.warn("[daily-sync-worker] run failed", error);
    } finally {
        if (!stopping) {
            timer = setTimeout(runOnce, intervalMs);
        }
    }
}

async function shutdown(signal: string) {
    console.info(`[daily-sync-worker] received ${signal}, shutting down`);
    stopping = true;

    if (timer) {
        clearTimeout(timer);
    }

    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

console.info(
    `[daily-sync-worker] started initialDelay=${initialDelayMinutes}m interval=${intervalHours}h subtitleBatch=${subtitleBatchSize}`,
);

timer = setTimeout(runOnce, initialDelayMinutes * 60 * 1000);
