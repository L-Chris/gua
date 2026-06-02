import { revalidatePath } from "next/cache";
import {
    refreshVideoSubtitleByBvid,
    VideoNotFoundError,
} from "@/lib/subtitle-backfill";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ bvid: string }> },
) {
    const { bvid } = await params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "1";

    if (!bvid?.trim()) {
        return Response.json({ error: "缺少 bvid" }, { status: 400 });
    }

    try {
        if (!refresh) {
            const video = await prisma.video.findUnique({
                where: { bvid: decodeURIComponent(bvid).trim() },
                select: {
                    bvid: true,
                    hasSubtitle: true,
                    subtitle: true,
                },
            });

            if (!video) {
                throw new VideoNotFoundError(decodeURIComponent(bvid));
            }

            return Response.json({
                bvid: video.bvid,
                hasSubtitle: video.hasSubtitle,
                subtitle: video.subtitle,
                subtitleLength: video.subtitle?.length ?? 0,
            });
        }

        const result = await refreshVideoSubtitleByBvid(
            decodeURIComponent(bvid),
        );
        revalidatePath("/");
        return Response.json(result);
    } catch (error) {
        if (error instanceof VideoNotFoundError) {
            return Response.json({ error: error.message }, { status: 404 });
        }

        const message = error instanceof Error ? error.message : "字幕更新失败";
        return Response.json({ error: message }, { status: 500 });
    }
}
