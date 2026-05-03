import { bilibiliApiBaseUrl } from "@/lib/config";

export type BilibiliSearchItem = {
  aid?: number;
  author?: string;
  bvid: string;
  danmaku?: number;
  description?: string;
  duration?: string;
  favorites?: number;
  like?: number;
  mid?: number;
  pic?: string;
  play?: number;
  pubdate?: string;
  review?: number;
  tag?: string;
  title?: string;
  typename?: string;
  upic?: string;
};

export type BilibiliSearchResponse = {
  keyword: string;
  page: number;
  page_size: number;
  total: number;
  items: BilibiliSearchItem[];
};

export type BilibiliVideoInfo = {
  aid?: number;
  bvid: string;
  desc?: string;
  duration?: number;
  owner?: {
    face?: string;
    mid?: number;
    name?: string;
  };
  pic?: string;
  pubdate?: number;
  stat?: {
    coin?: number;
    danmaku?: number;
    favorite?: number;
    like?: number;
    reply?: number;
    share?: number;
    view?: number;
  };
  subtitle?: {
    list?: Array<{
      lan?: string;
      subtitle_url?: string;
    }>;
  };
  title?: string;
  tname?: string;
};

type SubtitleResponse = {
  bvid?: string;
  subtitle?: unknown;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${bilibiliApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bilibili MCP 请求失败: ${response.status} ${response.statusText} ${text}`);
  }

  return (await response.json()) as T;
}

export async function searchVideos(keyword: string, page = 1, pageSize = 10) {
  const query = new URLSearchParams({
    keyword,
    page: String(page),
    page_size: String(pageSize),
  });

  return requestJson<BilibiliSearchResponse>(`/api/video/search?${query.toString()}`);
}

export async function getVideoInfo(bvid: string) {
  return requestJson<BilibiliVideoInfo>(`/api/video/info/${encodeURIComponent(bvid)}`);
}

export async function getVideoSubtitle(bvid: string) {
  const data = await requestJson<SubtitleResponse>(`/api/video/subtitle/${encodeURIComponent(bvid)}`);

  if (typeof data.subtitle === "string") {
    const cleaned = data.subtitle.trim();
    return cleaned.length > 0 && cleaned !== "没有找到AI生成的中文字幕" ? cleaned : null;
  }

  if (data.subtitle && typeof data.subtitle === "object") {
    const serialized = JSON.stringify(data.subtitle);
    return serialized === "{}" ? null : serialized;
  }

  return null;
}

export function stripHtml(input: string | undefined | null) {
  return (input ?? "").replace(/<[^>]+>/g, "").trim();
}

export function normalizeImageUrl(url: string | undefined | null) {
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

export function parseDurationToSeconds(duration: string | number | undefined | null) {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return duration;
  }

  if (!duration) {
    return 0;
  }

  const segments = String(duration)
    .split(":")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));

  if (segments.length === 0) {
    return 0;
  }

  if (segments.length === 3) {
    return segments[0] * 3600 + segments[1] * 60 + segments[2];
  }

  if (segments.length === 2) {
    return segments[0] * 60 + segments[1];
  }

  return segments[0];
}

export function normalizeTagList(rawTag: string | undefined | null) {
  return (rawTag ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSearchDate(value: string | undefined | null) {
  if (!value) {
    return new Date();
  }

  const candidate = new Date(value.replace(/\//g, "-"));
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}
