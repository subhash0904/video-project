import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('\n📊 DATABASE STATISTICS');
  console.log('═══════════════════════════════════════\n');

  const users = await prisma.user.count();
  const channels = await prisma.channel.count();
  const videos = await prisma.video.count();
  const subscriptions = await prisma.subscription.count();
  const watchHistory = await prisma.watchHistory.count();
  const likes = await prisma.like.count();
  const comments = await prisma.comment.count();
  const analytics = await prisma.analyticsEvent.count();

  console.log(`✅ Users:              ${users.toString().padStart(6)}`);
  console.log(`✅ Channels:           ${channels.toString().padStart(6)}`);
  console.log(`✅ Videos:             ${videos.toString().padStart(6)}`);
  console.log(`✅ Subscriptions:      ${subscriptions.toString().padStart(6)}`);
  console.log(`✅ Watch History:      ${watchHistory.toString().padStart(6)}`);
  console.log(`✅ Likes:              ${likes.toString().padStart(6)}`);
  console.log(`✅ Comments:           ${comments.toString().padStart(6)}`);
  console.log(`✅ Analytics Events:   ${analytics.toString().padStart(6)}`);

  console.log('\n📈 TOP CHANNELS BY SUBSCRIBERS');
  console.log('═══════════════════════════════════════\n');

  const topChannels = await prisma.channel.findMany({
    take: 5,
    orderBy: { subscriberCount: 'desc' },
    include: { user: { select: { displayName: true } } },
  });

  topChannels.forEach((ch, i) => {
    console.log(`${i + 1}. ${ch.name.padEnd(30)} ${ch.subscriberCount.toLocaleString().padStart(12)} subs`);
  });

  console.log('\n🎬 RECENT VIDEOS');
  console.log('═══════════════════════════════════════\n');

  const recentVideos = await prisma.video.findMany({
    take: 5,
    orderBy: { publishedAt: 'desc' },
    include: { channel: { select: { name: true } } },
  });

  recentVideos.forEach((v, i) => {
    const views = Number(v.views).toLocaleString();
    console.log(`${i + 1}. ${v.title.substring(0, 50).padEnd(52)} ${views.padStart(10)} views`);
  });

  console.log('\n✅ VALIDATION CHECKS');
  console.log('═══════════════════════════════════════\n');

  // Check 1: No self-subscriptions (manually check)
  const allSubscriptions = await prisma.subscription.findMany({
    include: { channel: true },
  });
  const selfSubs = allSubscriptions.filter(sub => sub.userId === sub.channel.userId).length;
  console.log(`✅ Self-subscriptions:  ${selfSubs === 0 ? '0 (PASS)' : selfSubs + ' (FAIL)'}`);

  // Check 2: All users with channels
  const usersWithChannels = await prisma.user.findMany({
    include: { channel: true },
  });
  const creatorsWithoutChannels = usersWithChannels.filter(u => u.channel === null && u.email.includes('techcreator')).length;
  console.log(`✅ Creator consistency: ${creatorsWithoutChannels === 0 ? 'PASS' : 'FAIL'}`);
  const totalUsers = await prisma.user.count();
  const uniqueEmails = await prisma.user.groupBy({
    by: ['email'],
  });
  console.log(`✅ Email uniqueness:    ${totalUsers === uniqueEmails.length ? 'PASS' : 'FAIL'}`);

  // Check 5: Video type distribution
  const standardVideos = await prisma.video.count({ where: { type: 'STANDARD' } });
  const shortVideos = await prisma.video.count({ where: { type: 'SHORT' } });
  const shortPercentage = Math.round((shortVideos / videos) * 100);
  console.log(`✅ Video distribution:  ${standardVideos} standard, ${shortVideos} shorts (${shortPercentage}%)`);

  console.log('\n🔍 DATA QUALITY SAMPLES');
  console.log('═══════════════════════════════════════\n');

  // Sample user
  const sampleUser = await prisma.user.findFirst({
    where: { email: { contains: 'sarah' } },
  });
  if (sampleUser) {
    console.log('Sample User:');
    console.log(`  Email: ${sampleUser.email}`);
    console.log(`  Username: ${sampleUser.username}`);
    console.log(`  Display Name: ${sampleUser.displayName}`);
    console.log(`  Created: ${sampleUser.createdAt.toISOString().split('T')[0]}`);
  }

  // Sample video
  const sampleVideo = await prisma.video.findFirst({
    include: { channel: true },
  });
  if (sampleVideo) {
    console.log('\nSample Video:');
    console.log(`  Title: ${sampleVideo.title}`);
    console.log(`  Channel: ${sampleVideo.channel.name}`);
    console.log(`  Duration: ${Math.floor(sampleVideo.duration / 60)}m ${sampleVideo.duration % 60}s`);
    console.log(`  Views: ${Number(sampleVideo.views).toLocaleString()}`);
    console.log(`  Likes: ${sampleVideo.likes.toLocaleString()}`);
    console.log(`  Published: ${sampleVideo.publishedAt?.toISOString().split('T')[0] || 'N/A'}`);
  }

  console.log('\n✅ VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
}

verifyData().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
