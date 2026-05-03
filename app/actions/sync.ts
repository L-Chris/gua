"use server";

import { revalidatePath } from "next/cache";
import { syncVideoLibrary } from "@/lib/sync";

export async function syncVideoLibraryAction() {
    await syncVideoLibrary();
    revalidatePath("/");
    revalidatePath("/videos");
}
