import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const videos = await prisma.video.findMany({
    where: { hlsUrl: null },
    select: { id: true, title: true },
  });

  console.log(`Found ${videos.length} videos with null hlsUrl`);

  for (const v of videos) {
    await prisma.video.update({
      where: { id: v.id },
      data: { hlsUrl: `/hls/${v.id}/master.m3u8` },
    });
    console.log(`  Updated: ${v.title}`);
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main().catch(console.error);
