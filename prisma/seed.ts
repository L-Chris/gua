import { prisma } from "../lib/prisma";

async function main() {
  const creatorCount = await prisma.creator.count();
  const videoCount = await prisma.video.count();
  console.log(`seed skipped · creators=${creatorCount} videos=${videoCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
