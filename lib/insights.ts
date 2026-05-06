export type CreatorSummary = {
  faceUrl: string | null;
  latestPublishAt: Date;
  mid: string;
  name: string;
  totalPlay: number;
  videoCount: number;
  averageEngagementRate: number;
};

export type DashboardVideo = {
  bvid: string;
  cleanTitle: string;
  coverUrl: string | null;
  creator: {
    faceUrl: string | null;
    mid: string;
    name: string;
  };
  durationSeconds: number;
  engagementRate: number;
  favorite: number;
  hasSubtitle: boolean;
  like: number;
  play: number;
  publishAt: Date;
  reply: number;
  share: number;
  sourceKeywords: unknown;
  subtitle: string | null;
  tags: unknown;
  title: string;
  typeName: string | null;
  videoTags: { id: string; name: string }[];
};

export type TagSummary = {
  count: number;
  label: string;
};

export type TrendPoint = {
  label: string;
  month: string;
  totalPlay: number;
  videoCount: number;
};

export type DurationBucket = {
  count: number;
  label: string;
};

export type LearningVideo = {
  bvid: string;
  coverUrl: string | null;
  creatorName: string;
  engagementRate: number;
  ideaScore: number;
  play: number;
  publishAt: Date;
  reason: string;
  sourceKeywords: string[];
  subtitleExcerpt: string | null;
  tags: string[];
  title: string;
};

export type DashboardInsights = {
  durationBuckets: DurationBucket[];
  learningVideos: LearningVideo[];
  recentVideos: DashboardVideo[];
  topCreators: CreatorSummary[];
  topTags: TagSummary[];
  uploadTrend: TrendPoint[];
  totals: {
    averageEngagementRate: number;
    averageDurationSeconds: number;
    subtitleCoverage: number;
    totalCreators: number;
    totalPlay: number;
    totalVideos: number;
  };
};

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function subtitleExcerpt(subtitle: string | null) {
  if (!subtitle) return null;
  const collapsed = subtitle.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > 92 ? `${collapsed.slice(0, 92)}…` : collapsed;
}

function learningReason(video: DashboardVideo) {
  const reasons: string[] = [];
  const tags = toStringArray(video.tags);

  if (video.engagementRate >= 0.12) reasons.push("互动率高");
  if (video.share >= 300) reasons.push("转发意愿强");
  if (video.hasSubtitle) reasons.push("带 AI 字幕");
  if (tags.length > 0) reasons.push(`标签清晰：${tags.slice(0, 2).join(" / ")}`);
  if (reasons.length === 0) reasons.push("适合观察标题与节奏设计");

  return reasons.join(" · ");
}

function ideaScore(video: DashboardVideo) {
  const interactionWeight =
    video.like * 1 + video.favorite * 1.4 + video.share * 2.2 + video.reply * 0.8;
  const normalized = interactionWeight / Math.max(video.play, 1);
  return normalized * 1000 + Math.min(video.play / 20000, 80) + (video.hasSubtitle ? 12 : 0);
}

export function buildDashboardInsights(videos: DashboardVideo[]): DashboardInsights {
  const totalVideos = videos.length;
  const totalPlay = videos.reduce((sum, video) => sum + video.play, 0);
  const subtitleCoverage =
    totalVideos === 0 ? 0 : videos.filter((video) => video.hasSubtitle).length / totalVideos;
  const averageDurationSeconds = average(videos.map((video) => video.durationSeconds));
  const averageEngagementRate = average(videos.map((video) => video.engagementRate));

  const creatorMap = new Map<string, CreatorSummary>();
  for (const video of videos) {
    const current = creatorMap.get(video.creator.mid);
    if (current) {
      current.videoCount += 1;
      current.totalPlay += video.play;
      current.averageEngagementRate =
        (current.averageEngagementRate * (current.videoCount - 1) + video.engagementRate) /
        current.videoCount;
      if (video.publishAt > current.latestPublishAt) {
        current.latestPublishAt = video.publishAt;
      }
    } else {
      creatorMap.set(video.creator.mid, {
        faceUrl: video.creator.faceUrl,
        latestPublishAt: video.publishAt,
        mid: video.creator.mid,
        name: video.creator.name,
        totalPlay: video.play,
        videoCount: 1,
        averageEngagementRate: video.engagementRate,
      });
    }
  }

  const topCreators = [...creatorMap.values()]
    .sort((left, right) => {
      if (right.totalPlay !== left.totalPlay) {
        return right.totalPlay - left.totalPlay;
      }
      return right.videoCount - left.videoCount;
    })
    .slice(0, 8);

  const trendMap = new Map<string, TrendPoint>();
  for (const video of videos) {
    const month = `${video.publishAt.getFullYear()}-${String(video.publishAt.getMonth() + 1).padStart(2, "0")}`;
    const label = `${video.publishAt.getFullYear()} / ${String(video.publishAt.getMonth() + 1).padStart(2, "0")}`;
    const current = trendMap.get(month);
    if (current) {
      current.videoCount += 1;
      current.totalPlay += video.play;
    } else {
      trendMap.set(month, {
        label,
        month,
        totalPlay: video.play,
        videoCount: 1,
      });
    }
  }

  const uploadTrend = [...trendMap.values()].sort((left, right) => left.month.localeCompare(right.month)).slice(-12);

  const durationBuckets: DurationBucket[] = [
    { label: "0-60 秒", count: 0 },
    { label: "1-3 分钟", count: 0 },
    { label: "3-5 分钟", count: 0 },
    { label: "5-10 分钟", count: 0 },
    { label: "10 分钟+", count: 0 },
  ];

  for (const video of videos) {
    if (video.durationSeconds <= 60) {
      durationBuckets[0].count += 1;
    } else if (video.durationSeconds <= 180) {
      durationBuckets[1].count += 1;
    } else if (video.durationSeconds <= 300) {
      durationBuckets[2].count += 1;
    } else if (video.durationSeconds <= 600) {
      durationBuckets[3].count += 1;
    } else {
      durationBuckets[4].count += 1;
    }
  }

  const tagMap = new Map<string, number>();
  for (const video of videos) {
    for (const tag of toStringArray(video.tags)) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 16)
    .map(([label, count]) => ({ label, count }));

  const learningVideos = [...videos]
    .sort((left, right) => right.play - left.play)
    .slice(0, 6)
    .map((video) => ({
      bvid: video.bvid,
      coverUrl: video.coverUrl,
      creatorName: video.creator.name,
      engagementRate: video.engagementRate,
      ideaScore: ideaScore(video),
      play: video.play,
      publishAt: video.publishAt,
      reason: learningReason(video),
      sourceKeywords: toStringArray(video.sourceKeywords),
      subtitleExcerpt: subtitleExcerpt(video.subtitle),
      tags: toStringArray(video.tags),
      title: video.cleanTitle || video.title,
    }));

  const recentVideos = [...videos]
    .sort((left, right) => right.publishAt.getTime() - left.publishAt.getTime())
    .slice(0, 18);

  return {
    durationBuckets,
    learningVideos,
    recentVideos,
    topCreators,
    topTags,
    uploadTrend,
    totals: {
      averageDurationSeconds,
      averageEngagementRate,
      subtitleCoverage,
      totalCreators: creatorMap.size,
      totalPlay,
      totalVideos,
    },
  };
}

export function jsonStringArray(value: unknown) {
  return toStringArray(value);
}
