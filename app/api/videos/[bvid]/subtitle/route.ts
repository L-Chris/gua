import { revalidatePath } from "next/cache";
import {
    refreshVideoSubtitleByBvid,
    VideoNotFoundError,
} from "@/lib/subtitle-backfill";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ bvid: string }> },
) {
    const { bvid } = await params;

    if (!bvid?.trim()) {
        return Response.json({ error: "缺少 bvid" }, { status: 400 });
    }

    try {
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
