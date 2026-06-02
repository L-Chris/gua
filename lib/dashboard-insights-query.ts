import type {
    CreatorSummary,
    DashboardInsights,
    DashboardVideo,
    DurationBucket,
    LearningVideo,
    TrendPoint,
} from "@/lib/insights";
import { jsonStringArray } from "@/lib/insights";
import { prisma } from "@/lib/prisma";

type TrendRow = {
    label: string;
    periodKey: string;
    totalPlay: bigint | number | null;
    videoCount: bigint | number;
};

type DurationRow = {
    count: bigint | number;
    sortOrder: bigint | number;
    label: string;
};

function toNumber(value: bigint | number | null | undefined) {
    return Number(value ?? 0);
}

function learningReason(video: Pick<DashboardVideo, "engagementRate" | "hasSubtitle" | "share" | "tags">) {
    const reasons: string[] = [];
    const tags = jsonStringArray(video.tags);

    if (video.engagementRate >= 0.12) reasons.push("互动率高");
    if (video.share >= 300) reasons.push("转发意愿强");
    if (video.hasSubtitle) reasons.push("带 AI 字幕");
    if (tags.length > 0) reasons.push(`标签清晰：${tags.slice(0, 2).join(" / ")}`);
    if (reasons.length === 0) reasons.push("适合观察标题与节奏设计");

    return reasons.join(" · ");
}

function ideaScore(video: Pick<DashboardVideo, "favorite" | "hasSubtitle" | "like" | "play" | "reply" | "share">) {
    const interactionWeight =
        video.like * 1 + video.favorite * 1.4 + video.share * 2.2 + video.reply * 0.8;
    const normalized = interactionWeight / Math.max(video.play, 1);
    return normalized * 1000 + Math.min(video.play / 20000, 80) + (video.hasSubtitle ? 12 : 0);
}

export async function getDashboardInsights(): Promise<DashboardInsights> {
    const [
        videoAggregate,
        totalCreators,
        subtitleCount,
        topCreatorGroups,
        uploadTrendRows,
        durationRows,
        learningVideoRows,
    ] = await Promise.all([
        prisma.video.aggregate({
            _avg: {
                durationSeconds: true,
                engagementRate: true,
            },
            _count: true,
            _sum: {
                play: true,
            },
        }),
        prisma.creator.count(),
        prisma.video.count({ where: { hasSubtitle: true } }),
        prisma.video.groupBy({
            by: ["creatorId"],
            _avg: { engagementRate: true },
            _count: { _all: true },
            _max: { publishAt: true },
            _sum: { play: true },
            orderBy: [{ _sum: { play: "desc" } }],
            take: 8,
        }),
        prisma.$queryRaw<TrendRow[]>`
            select
                concat(publishYear, ' Q', publishQuarter) as label,
                concat(publishYear, '-Q', publishQuarter) as periodKey,
                sum(play) as totalPlay,
                count(*) as videoCount
            from (
                select
                    year(publishAt) as publishYear,
                    quarter(publishAt) as publishQuarter,
                    play
                from Video
            ) as videoPeriods
            group by publishYear, publishQuarter
            order by publishYear desc, publishQuarter desc
            limit 16
        `,
        prisma.$queryRaw<DurationRow[]>`
            select
                case
                    when durationSeconds <= 60 then '0-60 秒'
                    when durationSeconds <= 180 then '1-3 分钟'
                    when durationSeconds <= 300 then '3-5 分钟'
                    when durationSeconds <= 600 then '5-10 分钟'
                    else '10 分钟+'
                end as label,
                case
                    when durationSeconds <= 60 then 1
                    when durationSeconds <= 180 then 2
                    when durationSeconds <= 300 then 3
                    when durationSeconds <= 600 then 4
                    else 5
                end as sortOrder,
                count(*) as count
            from Video
            group by label, sortOrder
            order by sortOrder
        `,
        prisma.video.findMany({
            orderBy: [{ play: "desc" }, { publishAt: "desc" }],
            select: {
                bvid: true,
                cleanTitle: true,
                coverUrl: true,
                creator: {
                    select: {
                        faceUrl: true,
                        mid: true,
                        name: true,
                    },
                },
                durationSeconds: true,
                engagementRate: true,
                favorite: true,
                hasSubtitle: true,
                like: true,
                play: true,
                publishAt: true,
                reply: true,
                share: true,
                sourceKeywords: true,
                tags: true,
                title: true,
                typeName: true,
                videoTags: {
                    select: {
                        source: true,
                        tag: { select: { id: true, name: true } },
                    },
                },
            },
            take: 6,
        }),
    ]);

    const creators = await prisma.creator.findMany({
        where: { id: { in: topCreatorGroups.map((group) => group.creatorId) } },
        select: {
            faceUrl: true,
            id: true,
            mid: true,
            name: true,
        },
    });
    const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

    const topCreators: CreatorSummary[] = topCreatorGroups.flatMap((group) => {
        const creator = creatorById.get(group.creatorId);
        if (!creator || !group._max.publishAt) {
            return [];
        }

        return [{
            averageEngagementRate: group._avg.engagementRate ?? 0,
            faceUrl: creator.faceUrl,
            latestPublishAt: group._max.publishAt,
            mid: creator.mid,
            name: creator.name,
            totalPlay: group._sum.play ?? 0,
            videoCount: group._count._all,
        }];
    });

    const durationMap = new Map(durationRows.map((row) => [row.label, toNumber(row.count)]));
    const durationBuckets: DurationBucket[] = [
        { label: "0-60 秒", count: durationMap.get("0-60 秒") ?? 0 },
        { label: "1-3 分钟", count: durationMap.get("1-3 分钟") ?? 0 },
        { label: "3-5 分钟", count: durationMap.get("3-5 分钟") ?? 0 },
        { label: "5-10 分钟", count: durationMap.get("5-10 分钟") ?? 0 },
        { label: "10 分钟+", count: durationMap.get("10 分钟+") ?? 0 },
    ];

    const uploadTrend: TrendPoint[] = uploadTrendRows
        .map((row) => ({
            key: row.periodKey,
            label: row.label,
            totalPlay: toNumber(row.totalPlay),
            videoCount: toNumber(row.videoCount),
        }))
        .sort((left, right) => left.key.localeCompare(right.key));

    const learningVideos: LearningVideo[] = learningVideoRows.map((video) => ({
        bvid: video.bvid,
        coverUrl: video.coverUrl,
        creatorName: video.creator.name,
        engagementRate: video.engagementRate,
        ideaScore: ideaScore(video),
        play: video.play,
        publishAt: video.publishAt,
        reason: learningReason(video),
        sourceKeywords: jsonStringArray(video.sourceKeywords),
        subtitleExcerpt: null,
        tags: jsonStringArray(video.tags),
        title: video.cleanTitle || video.title,
    }));

    const totalVideos = videoAggregate._count;

    return {
        durationBuckets,
        learningVideos,
        recentVideos: [],
        taggedVideoBuckets: [],
        topCreators,
        topTags: [],
        uploadTrend,
        totals: {
            averageDurationSeconds: videoAggregate._avg.durationSeconds ?? 0,
            averageEngagementRate: videoAggregate._avg.engagementRate ?? 0,
            subtitleCoverage: totalVideos === 0 ? 0 : subtitleCount / totalVideos,
            totalCreators,
            totalPlay: videoAggregate._sum.play ?? 0,
            totalVideos,
        },
    };
}
