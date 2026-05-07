import { revalidatePath } from "next/cache";
import { syncVideoLibrary } from "@/lib/sync";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const timeStart = searchParams.get("time_start") || undefined;
    const timeEnd = searchParams.get("time_end") || undefined;
    const pagesStr = searchParams.get("pages");

    try {
        const result = await syncVideoLibrary({
            pages: pagesStr ? Number.parseInt(pagesStr, 10) : undefined,
            timeEnd,
            timeStart,
        });
        revalidatePath("/");
        return Response.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "同步失败";
        const status = message.includes("正在执行中") ? 409 : 500;
        return Response.json({ error: message }, { status });
    }
}
