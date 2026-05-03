import { syncVideoLibrary } from "../lib/sync";
import { prisma } from "../lib/prisma";

async function main() {
  const result = await syncVideoLibrary();
  console.log("sync complete", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
