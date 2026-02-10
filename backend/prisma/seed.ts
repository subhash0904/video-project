import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const redis = new (Redis as any)({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 1,
});

async function clearCache() {
  const patterns = ['feed:*', 'video:*', 'channel:*'];
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

async function seed() {
  console.log('🌱 Seeding database with production-ready data...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.analyticsEvent.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.watchHistory.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.videoQuality.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.user.deleteMany({});
  
  await clearCache();
  console.log('🧹 Cleared Redis cache');

  // Hash password function
  const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 12);
  };

  // Create multiple users with realistic data
  const users: typeof prisma.user.create extends (...args: any[]) => Promise<infer T> ? T[] : never[] = [];
  const userCredentials = [
    { email: 'alice@example.com', username: 'alice_creator', display: 'Alice Tech' },
    { email: 'bob@example.com', username: 'bob_gamer', display: 'Bob Gaming' },
    { email: 'carol@example.com', username: 'carol_vlogs', display: 'Carol Vlogs' },
    { email: 'david@example.com', username: 'david_music', display: 'David Music' },
    { email: 'eve@example.com', username: 'eve_education', display: 'Eve Learning' },
    { email: 'testuser@example.com', username: 'testuser', display: 'Test User' },
  ];

  const passwordHash = await hashPassword('password123');

  for (const cred of userCredentials) {
    const user = await prisma.user.create({
      data: {
        email: cred.email,
        username: cred.username,
        passwordHash,
        displayName: cred.display,
        emailVerified: true,
        avatarUrl: `https://ui-avatars.com/api/?name=${cred.display}&size=200&background=random`,
      },
    });
    users.push(user);
    console.log(`✅ Created user: ${cred.email}`);
  }

  // Create channels for first 5 users
  const channels: typeof prisma.channel.create extends (...args: any[]) => Promise<infer T> ? T[] : never[] = [];
  const channelData = [
    { name: 'Tech Mastery', handle: '@techmastery', desc: 'Advanced programming tutorials and tech insights', verified: true },
    { name: 'Gaming Central', handle: '@gamingcentral', desc: 'Latest game reviews and playthroughs', verified: true },
    { name: 'Daily Vlogs', handle: '@dailyvlogs', desc: 'Daily life and travel experiences', verified: false },
    { name: 'Music Studio', handle: '@musicstudio', desc: 'Original music and covers', verified: true },
    { name: 'Learning Hub', handle: '@learninghub', desc: 'Educational content for all ages', verified: true },
  ];

  for (let i = 0; i < 5; i++) {
    const channel = await prisma.channel.create({
      data: {
        userId: users[i].id,
        handle: channelData[i].handle,
        name: channelData[i].name,
        description: channelData[i].desc,
        verified: channelData[i].verified,
        subscriberCount: Math.floor(Math.random() * 500000) + 50000, // 50k-550k subscribers
        avatarUrl: users[i].avatarUrl,
      },
    });
    channels.push(channel);
    console.log(`✅ Created channel: ${channel.name}`);
  }

  // Create subscriptions between users (users subscribe to channels)
  const subscriptionCount = users.length * 2; // Each user subscribes to 2 channels on average
  for (let i = 0; i < users.length; i++) {
    const availableChannels = channels.filter(c => c.userId !== users[i].id);
    const numSubs = Math.floor(Math.random() * 3) + 1; // 1-3 subscriptions per user
    
    for (let j = 0; j < numSubs && j < availableChannels.length; j++) {
      const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
      try {
        await prisma.subscription.create({
          data: {
            userId: users[i].id,
            channelId: randomChannel.id,
          },
        });
      } catch (e) {
        // Skip if unique constraint fails
      }
    }
  }
  console.log(`✅ Created subscriptions`);

  // Update subscriber counts based on actual subscriptions
  for (const channel of channels) {
    const count = await prisma.subscription.count({ where: { channelId: channel.id } });
    await prisma.channel.update({
      where: { id: channel.id },
      data: { subscriberCount: count },
    });
  }

  // Create sample videos with realistic stats (proportional to user count)
  const videoData = [
    {
      title: 'Building a Production-Ready Video Platform',
      description: 'Learn how to build a scalable video streaming platform with Node.js, React, and FFmpeg. Complete guide from setup to deployment.',
      category: 'EDUCATION',
      duration: 1245,
      type: 'STANDARD' as const,
    },
    {
      title: 'Complete Guide to TypeScript',
      description: 'Master TypeScript from basics to advanced concepts. Build type-safe applications with confidence.',
      category: 'EDUCATION',
      duration: 2890,
      type: 'STANDARD' as const,
    },
    {
      title: 'Docker Deployment Tutorial',
      description: 'Deploy your applications with Docker and Docker Compose. Learn containerization best practices.',
      category: 'EDUCATION',
      duration: 1580,
      type: 'STANDARD' as const,
    },
    {
      title: 'React Hooks in 60 Seconds',
      description: 'Quick overview of useState and useEffect hooks for React developers',
      category: 'EDUCATION',
      duration: 60,
      type: 'SHORT' as const,
    },
    {
      title: 'CSS Grid Explained',
      description: 'Learn modern CSS Grid layout techniques for responsive design',
      category: 'EDUCATION',
      duration: 45,
      type: 'SHORT' as const,
    },
    {
      title: 'Async/Await Best Practices',
      description: 'Write clean asynchronous JavaScript code. Error handling, performance tips, and more.',
      category: 'EDUCATION',
      duration: 892,
      type: 'STANDARD' as const,
    },
    {
      title: 'Next.js 15 - What\'s New',
      description: 'Explore the latest features in Next.js 15. Server components, streaming, and performance improvements.',
      category: 'EDUCATION',
      duration: 1456,
      type: 'STANDARD' as const,
    },
    {
      title: 'VS Code Extensions You Need',
      description: 'Boost your productivity with these essential VS Code extensions',
      category: 'EDUCATION',
      duration: 38,
      type: 'SHORT' as const,
    },
  ];

  const createdVideos: any[] = [];
  
  for (let i = 0; i < videoData.length; i++) {
    const vid = videoData[i];
    const channelIndex = i % channels.length;
    const channel = channels[channelIndex];
    
    const video = await prisma.video.create({
      data: {
        title: vid.title,
        description: vid.description,
        category: vid.category as any,
        duration: vid.duration,
        type: vid.type,
        channelId: channel.id,
        thumbnailUrl: `https://picsum.photos/seed/${i}/1280/720`,
        status: 'READY' as any,
        isPublic: true,
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        views: Math.floor(Math.random() * 10000) + 100, // 100-10k views per video
        likes: 0,
        dislikes: 0,
        commentCount: 0,
      },
    });
    createdVideos.push(video);
    console.log(`✅ Created video: ${vid.title}`);
  }

  // Update channel video count
  for (const channel of channels) {
    const videoCount = await prisma.video.count({ where: { channelId: channel.id } });
    await prisma.channel.update({
      where: { id: channel.id },
      data: { videoCount },
    });
  }

  // Create realistic likes/dislikes for videos (only from other users)
  for (const video of createdVideos) {
    const otherUsers = users.filter(u => {
      const videoChannel = channels.find(ch => ch.id === video.channelId);
      return u.id !== videoChannel?.userId;
    });

    // 30-60% of other users like/dislike the video
    const likeCount = Math.floor(otherUsers.length * (0.3 + Math.random() * 0.3));
    let likeCounter = 0;

    for (let i = 0; i < likeCount && i < otherUsers.length; i++) {
      const user = otherUsers[i];
      const type = Math.random() > 0.85 ? 'DISLIKE' : 'LIKE'; // 85% likes, 15% dislikes
      
      try {
        await prisma.like.create({
          data: {
            userId: user.id,
            videoId: video.id,
            type,
          },
        });

        if (type === 'LIKE') likeCounter++;
      } catch (e) {
        // Skip if already exists
      }
    }

    // Update video stats
    const likeCount_db = await prisma.like.count({ where: { videoId: video.id, type: 'LIKE' } });
    const dislikeCount_db = await prisma.like.count({ where: { videoId: video.id, type: 'DISLIKE' } });

    await prisma.video.update({
      where: { id: video.id },
      data: {
        likes: likeCount_db,
        dislikes: dislikeCount_db,
      },
    });
  }

  // Create comments on videos
  for (let i = 0; i < createdVideos.length; i++) {
    const video = createdVideos[i];
    const otherUsers = users.filter(u => {
      const videoChannel = channels.find(ch => ch.id === video.channelId);
      return u.id !== videoChannel?.userId;
    });

    // 30-50% of users leave comments
    const commentCount = Math.floor(otherUsers.length * (0.3 + Math.random() * 0.2));
    
    for (let j = 0; j < commentCount && j < otherUsers.length; j++) {
      const user = otherUsers[j];
      const comments = [
        'Great tutorial! Very helpful.',
        'Thanks for the clear explanation.',
        'Can you make a follow-up video on this?',
        'Amazing content as always!',
        'This is exactly what I was looking for.',
        'Well explained, easy to follow.',
        'Looking forward to more videos like this!',
      ];

      const comment = comments[Math.floor(Math.random() * comments.length)];

      try {
        await prisma.comment.create({
          data: {
            userId: user.id,
            videoId: video.id,
            content: comment,
            likes: Math.floor(Math.random() * 5),
          },
        });
      } catch (e) {
        // Skip
      }
    }

    // Update comment count
    const count = await prisma.comment.count({ where: { videoId: video.id, parentId: null } });
    await prisma.video.update({
      where: { id: video.id },
      data: { commentCount: count },
    });
  }

  // Create watch history
  for (const user of users) {
    // Each user watches 2-5 random videos
    const videoCount = Math.floor(Math.random() * 4) + 2;
    const randomVideos = createdVideos.sort(() => Math.random() - 0.5).slice(0, videoCount);

    for (const video of randomVideos) {
      try {
        await prisma.watchHistory.create({
          data: {
            userId: user.id,
            videoId: video.id,
            watchDuration: Math.floor(Math.random() * video.duration),
            completed: Math.random() > 0.3,
          },
        });
      } catch (e) {
        // Skip if already exists
      }
    }
  }

  console.log('\n🎉 Seed data created successfully!');
  console.log(`✅ ${users.length} users created`);
  console.log(`✅ ${channels.length} channels created`);
  console.log(`✅ ${createdVideos.length} videos created`);
  console.log('✅ Subscriptions, likes, comments, and watch history generated\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
