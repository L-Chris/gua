import { backfillMissingSubtitles } from "../lib/subtitle-backfill";
import { prisma } from "../lib/prisma";

function toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const intervalMinutes = toPositiveInt(process.env.SUBTITLE_BACKFILL_INTERVAL_MINUTES, 360);
const initialDelaySeconds = toPositiveInt(process.env.SUBTITLE_BACKFILL_INITIAL_DELAY_SECONDS, 60);
const intervalMs = intervalMinutes * 60 * 1000;

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function runOnce() {
    if (stopping) {
        return;
    }

    try {
        console.info("[subtitle-backfill-worker] tick");
        await backfillMissingSubtitles();
    } catch (error) {
        console.warn("[subtitle-backfill-worker] tick failed", error);
    } finally {
        if (!stopping) {
            timer = setTimeout(runOnce, intervalMs);
        }
    }
}

async function shutdown(signal: string) {
    console.info(`[subtitle-backfill-worker] received ${signal}, shutting down`);
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
    `[subtitle-backfill-worker] started interval=${intervalMinutes}m initialDelay=${initialDelaySeconds}s`,
);

timer = setTimeout(runOnce, initialDelaySeconds * 1000);
