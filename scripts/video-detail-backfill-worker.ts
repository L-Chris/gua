import { backfillVideoDetails } from "../lib/video-detail-backfill";
import { prisma } from "../lib/prisma";

function toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const enabled = process.env.VIDEO_DETAIL_BACKFILL_ENABLED === "true";
const intervalMinutes = toPositiveInt(process.env.VIDEO_DETAIL_BACKFILL_INTERVAL_MINUTES, 120);
const batchSize = toPositiveInt(process.env.VIDEO_DETAIL_BACKFILL_BATCH_SIZE, 10);
const initialDelaySeconds = toPositiveInt(process.env.VIDEO_DETAIL_BACKFILL_INITIAL_DELAY_SECONDS, 30);
const intervalMs = intervalMinutes * 60 * 1000;

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function runOnce() {
    if (stopping) {
        return;
    }

    try {
        console.info("[video-detail-backfill-worker] tick");
        const result = await backfillVideoDetails(batchSize);
        console.info(
            `[video-detail-backfill-worker] processed=${result.processed} updated=${result.updated} errors=${result.errors}`,
        );
    } catch (error) {
        console.warn("[video-detail-backfill-worker] tick failed", error);
    } finally {
        if (!stopping) {
            timer = setTimeout(runOnce, intervalMs);
        }
    }
}

async function shutdown(signal: string) {
    console.info(`[video-detail-backfill-worker] received ${signal}, shutting down`);
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

if (!enabled) {
    console.info(
        "[video-detail-backfill-worker] disabled (set VIDEO_DETAIL_BACKFILL_ENABLED=true to enable)",
    );
    process.exit(0);
}

console.info(
    `[video-detail-backfill-worker] started interval=${intervalMinutes}m batchSize=${batchSize} initialDelay=${initialDelaySeconds}s`,
);

timer = setTimeout(runOnce, initialDelaySeconds * 1000);
