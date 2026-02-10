/**
 * Update all database counters with actual data
 * Run this to sync displayed counts with actual relationships
 */

import { PrismaClient, LikeType } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCounters() {
  console.log('🔄 Updating all counters with actual data...\n');
  
  // STEP 1: Update video metrics (views, likes, dislikes, comments)
  console.log('📹 Updating video metrics...');
  const videos = await prisma.video.findMany();
  let videoCount = 0;
  
  for (const video of videos) {
    const viewCount = await prisma.watchHistory.count({
      where: { videoId: video.id },
    });
    
    const likeCount = await prisma.like.count({
      where: { videoId: video.id, type: LikeType.LIKE },
    });
    
    const dislikeCount = await prisma.like.count({
      where: { videoId: video.id, type: LikeType.DISLIKE },
    });
    
    const commentCount = await prisma.comment.count({
      where: { videoId: video.id },
    });
    
    await prisma.video.update({
      where: { id: video.id },
      data: { 
        views: BigInt(viewCount),
        likes: likeCount,
        dislikes: dislikeCount,
        commentCount,
      },
    });
    
    videoCount++;
    if (videoCount % 100 === 0) {
      console.log(`  ✓ Updated ${videoCount}/${videos.length} videos...`);
    }
  }
  console.log(`✅ Updated ${videoCount} videos\n`);
  
  // STEP 2: Update channel metrics (subscribers, video count, total views)
  console.log('📺 Updating channel metrics...');
  const channels = await prisma.channel.findMany();
  
  for (const channel of channels) {
    const subscriberCount = await prisma.subscription.count({
      where: { channelId: channel.id },
    });
    
    const videoCount = await prisma.video.count({
      where: { channelId: channel.id },
    });
    
    const channelVideos = await prisma.video.findMany({
      where: { channelId: channel.id },
      select: { views: true },
    });
    
    const totalViews = channelVideos.reduce((sum, v) => sum + BigInt(v.views), BigInt(0));
    
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        subscriberCount,
        videoCount,
        totalViews,
      },
    });
    
    console.log(`  ✓ ${channel.name}: ${subscriberCount} subs, ${videoCount} videos, ${totalViews.toString()} views`);
  }
  
  console.log(`\n✅ All ${channels.length} channels updated`);
  console.log('\n🎉 Counter update complete! All data is now consistent.\n');
}

updateCounters()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
