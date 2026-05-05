function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitKeywords(value: string | undefined) {
  return (value ?? "华强买瓜")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const bilibiliApiBaseUrl = (process.env.BILIBILI_API_BASE_URL ?? "http://127.0.0.1:8012").replace(
  /\/$/,
  "",
);

export const defaultSyncKeywords = splitKeywords(process.env.BILIBILI_SYNC_KEYWORDS);
export const defaultSyncPages = toPositiveInt(process.env.BILIBILI_SYNC_PAGES, 50);
export const defaultSyncPageSize = toPositiveInt(process.env.BILIBILI_SYNC_PAGE_SIZE, 20);
