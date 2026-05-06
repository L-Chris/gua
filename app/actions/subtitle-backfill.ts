"use server";

import { backfillMissingSubtitles } from "@/lib/subtitle-backfill";

export async function triggerSubtitleBackfill() {
    await backfillMissingSubtitles();
}
