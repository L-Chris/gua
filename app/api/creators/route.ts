import { getCreatorFilters } from "@/lib/creator-filters-query";

export async function GET() {
    return Response.json(await getCreatorFilters());
}
