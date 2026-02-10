/**
 * PRODUCTION-GRADE DATABASE SEED SCRIPT
 * 
 * This script populates the database with realistic, human-like data.
 * Designed for development, testing, and ML training.
 * 
 * Features:
 * - Deterministic randomization (reproducible)
 * - Strict validation rules
 * - Referential integrity
 * - Realistic data distribution
 * - Progress logging
 * - Safe re-runs (idempotent)
 */

import { PrismaClient, VideoType, VideoStatus, LikeType, EventType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Deterministic random number generator (seeded)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  boolean(probability = 0.5): boolean {
    return this.next() < probability;
  }
}

const random = new SeededRandom(42); // Fixed seed for reproducibility

// ============================================
// VALIDATION UTILITIES
// ============================================

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 8;
}

function validateDateConsistency(earlier: Date, later: Date): boolean {
  return earlier.getTime() <= later.getTime();
}

function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
  };
  console.log(`${icons[level]} ${message}`);
}

// ============================================
// DATA TEMPLATES
// ============================================

const REALISTIC_USERS = [
  // Tech Creators
  {
    email: 'sarah.johnson@techcreator.io',
    username: 'sarahjtech',
    password: 'SecurePass123!',
    displayName: 'Sarah Johnson',
    channelName: 'Tech with Sarah',
    channelHandle: '@sarahjtech',
    description: 'Software engineer sharing coding tutorials, tech reviews, and career advice. 10+ years in tech.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'alex.chen@devtips.com',
    username: 'alexdevtips',
    password: 'DevSecure456!',
    displayName: 'Alex Chen',
    channelName: 'DevTips Daily',
    channelHandle: '@alexdevtips',
    description: 'Daily programming tips, tricks, and tutorials. Making developers\' lives easier, one video at a time.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'maria.rodriguez@codeninja.net',
    username: 'mariacodeninja',
    password: 'NinjaCode789!',
    displayName: 'Maria Rodriguez',
    channelName: 'Code Ninja Academy',
    channelHandle: '@codeninja',
    description: 'Full-stack development courses, JavaScript mastery, and real-world projects. Build, deploy, succeed!',
    verified: true,
    type: 'creator',
  },
  {
    email: 'david.kim@webdevpro.io',
    username: 'davidwebdev',
    password: 'WebDev2024!',
    displayName: 'David Kim',
    channelName: 'WebDev Pro',
    channelHandle: '@webdevpro',
    description: 'Web development tutorials focusing on React, Node.js, and modern JavaScript frameworks.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'priya.sharma@pythonista.dev',
    username: 'priyapython',
    password: 'Python4Ever!',
    displayName: 'Priya Sharma',
    channelName: 'Pythonista',
    channelHandle: '@priyapython',
    description: 'Python programming, data science, machine learning tutorials. From beginner to advanced.',
    verified: true,
    type: 'creator',
  },
  
  // Mid-tier Creators
  {
    email: 'john.smith@quickcode.io',
    username: 'johnquickcode',
    password: 'QuickCode99!',
    displayName: 'John Smith',
    channelName: 'QuickCode',
    channelHandle: '@quickcode',
    description: 'Quick coding tutorials for busy developers. Learn fast, code faster.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'emma.wilson@debuglife.com',
    username: 'emmadebug',
    password: 'DebugMaster!',
    displayName: 'Emma Wilson',
    channelName: 'Debug Life',
    channelHandle: '@debuglife',
    description: 'Debugging techniques, problem-solving strategies, and software engineering best practices.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'liam.brown@mobilefirst.dev',
    username: 'liammobile',
    password: 'Mobile2024!',
    displayName: 'Liam Brown',
    channelName: 'Mobile First Dev',
    channelHandle: '@mobilefirst',
    description: 'iOS and Android development tutorials. React Native, Flutter, and native app development.',
    verified: false,
    type: 'creator',
  },

  // Casual Viewers (non-creators)
  {
    email: 'viewer1@gmail.com',
    username: 'techfan2024',
    password: 'ViewPass123!',
    displayName: 'Tech Enthusiast',
    type: 'viewer',
  },
  {
    email: 'viewer2@yahoo.com',
    username: 'codinglearner',
    password: 'Learning456!',
    displayName: 'Aspiring Developer',
    type: 'viewer',
  },
  {
    email: 'viewer3@outlook.com',
    username: 'techcurious',
    password: 'Curious789!',
    displayName: 'Tech Curious',
    type: 'viewer',
  },
  {
    email: 'viewer4@proton.me',
    username: 'dailywatcher',
    password: 'DailyPass!1',
    displayName: 'Daily Watcher',
    type: 'viewer',
  },
  {
    email: 'viewer5@gmail.com',
    username: 'programminglover',
    password: 'ILoveCode!2',
    displayName: 'Programming Lover',
    type: 'viewer',
  },
  
  // Additional Creators for scale
  {
    email: 'olivia.martin@cloudguru.dev',
    username: 'oliviacloud',
    password: 'CloudPass123!',
    displayName: 'Olivia Martin',
    channelName: 'Cloud Guru',
    channelHandle: '@cloudguru',
    description: 'AWS, Azure, GCP tutorials. Cloud architecture, DevOps, and serverless computing.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'ethan.davis@aideveloper.ai',
    username: 'ethanaidev',
    password: 'AISecure456!',
    displayName: 'Ethan Davis',
    channelName: 'AI Developer Hub',
    channelHandle: '@aidevhub',
    description: 'Machine learning, deep learning, and AI engineering tutorials. Build intelligent applications.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'sophia.garcia@cybersecpro.net',
    username: 'sophiacyber',
    password: 'CyberSafe789!',
    displayName: 'Sophia Garcia',
    channelName: 'CyberSec Pro',
    channelHandle: '@cybersecpro',
    description: 'Cybersecurity tutorials, ethical hacking, and security best practices.',
    verified: true,
    type: 'creator',
  },
  {
    email: 'mason.lee@gamedevmaster.io',
    username: 'masongamedev',
    password: 'GameDev2024!',
    displayName: 'Mason Lee',
    channelName: 'GameDev Master',
    channelHandle: '@gamedevmaster',
    description: 'Game development with Unity, Unreal Engine, and Godot. Create amazing games!',
    verified: true,
    type: 'creator',
  },
  {
    email: 'ava.anderson@designcode.studio',
    username: 'avadesigncode',
    password: 'Design4Code!',
    displayName: 'Ava Anderson',
    channelName: 'Design & Code',
    channelHandle: '@designcode',
    description: 'UI/UX design for developers. Figma, CSS animations, and beautiful interfaces.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'noah.thomas@blockchaindev.io',
    username: 'noahblockchain',
    password: 'BlockSecure!1',
    displayName: 'Noah Thomas',
    channelName: 'Blockchain Developer',
    channelHandle: '@blockchaindev',
    description: 'Blockchain development, smart contracts, Web3, and cryptocurrency programming.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'isabella.white@fullstackpath.com',
    username: 'isabellafullstack',
    password: 'FullStack99!',
    displayName: 'Isabella White',
    channelName: 'FullStack Path',
    channelHandle: '@fullstackpath',
    description: 'Complete fullstack development roadmap. Frontend, backend, databases, and deployment.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'james.harris@apiexpert.dev',
    username: 'jamesapi',
    password: 'APIExpert!23',
    displayName: 'James Harris',
    channelName: 'API Expert',
    channelHandle: '@apiexpert',
    description: 'REST, GraphQL, gRPC, and API design patterns. Build scalable APIs.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'mia.clark@dataviz.studio',
    username: 'miadataviz',
    password: 'DataViz456!',
    displayName: 'Mia Clark',
    channelName: 'Data Visualization',
    channelHandle: '@datavizstudio',
    description: 'Beautiful data visualizations with D3.js, Chart.js, and Python. Tell stories with data.',
    verified: false,
    type: 'creator',
  },
  {
    email: 'lucas.lopez@rustlang.dev',
    username: 'lucasrust',
    password: 'RustSafe789!',
    displayName: 'Lucas Lopez',
    channelName: 'Rust Programming',
    channelHandle: '@rustlang',
    description: 'Learn Rust programming language. Systems programming, memory safety, and performance.',
    verified: false,
    type: 'creator',
  },
  
  // More Viewers
  {
    email: 'viewer6@gmail.com',
    username: 'techexplorer',
    password: 'Explorer123!',
    displayName: 'Tech Explorer',
    type: 'viewer',
  },
  {
    email: 'viewer7@outlook.com',
    username: 'codestudent',
    password: 'Student456!',
    displayName: 'Code Student',
    type: 'viewer',
  },
  {
    email: 'viewer8@yahoo.com',
    username: 'devjunior',
    password: 'Junior789!',
    displayName: 'Junior Developer',
    type: 'viewer',
  },
  {
    email: 'viewer9@proton.me',
    username: 'technews',
    password: 'TechNews!1',
    displayName: 'Tech News Follower',
    type: 'viewer',
  },
  {
    email: 'viewer10@gmail.com',
    username: 'weblearner',
    password: 'WebLearn!2',
    displayName: 'Web Learner',
    type: 'viewer',
  },
  {
    email: 'viewer11@gmail.com',
    username: 'pythonbeginner',
    password: 'PyStart123!',
    displayName: 'Python Beginner',
    type: 'viewer',
  },
  {
    email: 'viewer12@outlook.com',
    username: 'jsnovice',
    password: 'JSNovice!45',
    displayName: 'JavaScript Novice',
    type: 'viewer',
  },
  {
    email: 'viewer13@yahoo.com',
    username: 'cpplearner',
    password: 'CppLearn!67',
    displayName: 'C++ Learner',
    type: 'viewer',
  },
  {
    email: 'viewer14@gmail.com',
    username: 'mobilefan',
    password: 'Mobile789!',
    displayName: 'Mobile App Fan',
    type: 'viewer',
  },
  {
    email: 'viewer15@proton.me',
    username: 'cloudenthusiast',
    password: 'Cloud2024!',
    displayName: 'Cloud Enthusiast',
    type: 'viewer',
  },
  {
    email: 'viewer16@gmail.com',
    username: 'datascifan',
    password: 'DataSci!99',
    displayName: 'Data Science Fan',
    type: 'viewer',
  },
  {
    email: 'viewer17@outlook.com',
    username: 'aienthusiast',
    password: 'AIFan2024!',
    displayName: 'AI Enthusiast',
    type: 'viewer',
  },
  {
    email: 'viewer18@yahoo.com',
    username: 'devopswatcher',
    password: 'DevOps123!',
    displayName: 'DevOps Watcher',
    type: 'viewer',
  },
  {
    email: 'viewer19@gmail.com',
    username: 'securityminded',
    password: 'SecMind!45',
    displayName: 'Security Minded',
    type: 'viewer',
  },
  {
    email: 'viewer20@proton.me',
    username: 'gamedevfan',
    password: 'GameDev!78',
    displayName: 'Game Dev Fan',
    type: 'viewer',
  },
];

const VIDEO_TEMPLATES = {
  tutorials: [
    {
      title: 'Complete React Hooks Guide - useState, useEffect, useContext',
      description: 'Master React Hooks with practical examples. Learn useState for state management, useEffect for side effects, and useContext for global state. Includes real-world project.',
      duration: 1847, // ~30 min
      tags: ['react', 'javascript', 'hooks', 'tutorial'],
    },
    {
      title: 'Node.js REST API from Scratch - Express, MongoDB, JWT Auth',
      description: 'Build a production-ready REST API with Node.js and Express. Covers authentication, authorization, error handling, validation, and deployment to AWS.',
      duration: 2456, // ~40 min
      tags: ['nodejs', 'express', 'mongodb', 'api'],
    },
    {
      title: 'TypeScript Crash Course - Types, Interfaces, Generics',
      description: 'Learn TypeScript fundamentals in one comprehensive tutorial. Perfect for JavaScript developers transitioning to TypeScript.',
      duration: 1623, // ~27 min
      tags: ['typescript', 'javascript', 'types'],
    },
    {
      title: 'Docker for Developers - Containerization Made Easy',
      description: 'Complete Docker tutorial covering containers, images, volumes, networks, and Docker Compose. Deploy multi-container applications with confidence.',
      duration: 2134, // ~35 min
      tags: ['docker', 'devops', 'containers'],
    },
    {
      title: 'Python Data Science - Pandas, NumPy, Matplotlib',
      description: 'Comprehensive guide to data analysis with Python. Learn data manipulation with Pandas, numerical computing with NumPy, and visualization with Matplotlib.',
      duration: 3241, // ~54 min
      tags: ['python', 'datascience', 'pandas'],
    },
    {
      title: 'AWS Cloud Fundamentals - EC2, S3, Lambda, RDS',
      description: 'Learn AWS cloud services from scratch. Deploy scalable applications using EC2, store files in S3, build serverless functions with Lambda, and manage databases with RDS.',
      duration: 2867, // ~47 min
      tags: ['aws', 'cloud', 'devops'],
    },
    {
      title: 'Git & GitHub Mastery - Version Control for Teams',
      description: 'Master Git workflows, branching strategies, pull requests, and collaboration. Essential skills for every developer.',
      duration: 1389, // ~23 min
      tags: ['git', 'github', 'versioncontrol'],
    },
    {
      title: 'Next.js 14 Full Course - App Router, Server Components',
      description: 'Build modern web apps with Next.js 14. Learn the new App Router, Server Components, streaming, and deployment to Vercel.',
      duration: 3456, // ~57 min
      tags: ['nextjs', 'react', 'webdev'],
    },
    {
      title: 'CSS Grid & Flexbox - Modern Layouts Explained',
      description: 'Master CSS layout systems. Create responsive, beautiful layouts with Grid and Flexbox. Includes real-world examples and best practices.',
      duration: 1245, // ~20 min
      tags: ['css', 'webdev', 'frontend'],
    },
    {
      title: 'GraphQL API Development - Apollo Server & Client',
      description: 'Build powerful GraphQL APIs with Apollo Server. Learn queries, mutations, subscriptions, and real-time features.',
      duration: 2678, // ~44 min
      tags: ['graphql', 'api', 'apollo'],
    },
  ],
  shorts: [
    {
      title: 'useState in 60 Seconds',
      description: 'Quick React Hook tutorial',
      duration: 58,
      tags: ['react', 'hooks', 'shorts'],
    },
    {
      title: '5 VS Code Extensions You Need',
      description: 'Boost productivity instantly',
      duration: 45,
      tags: ['vscode', 'productivity', 'shorts'],
    },
    {
      title: 'CSS Centering in 30 Seconds',
      description: 'The easiest way to center elements',
      duration: 32,
      tags: ['css', 'tricks', 'shorts'],
    },
    {
      title: 'JavaScript Array Methods',
      description: 'map, filter, reduce explained',
      duration: 54,
      tags: ['javascript', 'arrays', 'shorts'],
    },
    {
      title: 'Git Commit Best Practices',
      description: 'Write better commit messages',
      duration: 41,
      tags: ['git', 'bestpractices', 'shorts'],
    },
    {
      title: 'Python List Comprehension Trick',
      description: 'Clean code in one line',
      duration: 38,
      tags: ['python', 'tips', 'shorts'],
    },
    {
      title: 'Docker vs VM Explained',
      description: 'Key differences in 60 seconds',
      duration: 59,
      tags: ['docker', 'devops', 'shorts'],
    },
    {
      title: 'API vs REST vs GraphQL',
      description: 'Quick comparison',
      duration: 47,
      tags: ['api', 'graphql', 'shorts'],
    },
  ],
};

// ============================================
// SEED FUNCTIONS
// ============================================

async function clearDatabase() {
  log('Clearing existing data...', 'info');
  
  await prisma.analyticsEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.videoQuality.deleteMany();
  await prisma.video.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  
  log('Database cleared', 'success');
}

async function seedUsers() {
  log('\n📝 Seeding users...', 'info');
  
  const users = [];
  let created = 0;
  let skipped = 0;

  for (const userData of REALISTIC_USERS) {
    try {
      // Validate email
      if (!validateEmail(userData.email)) {
        log(`Invalid email: ${userData.email}`, 'warning');
        skipped++;
        continue;
      }

      // Validate password
      if (!validatePassword(userData.password)) {
        log(`Password too short for: ${userData.email}`, 'warning');
        skipped++;
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create realistic timestamps (1-3 years ago)
      const daysAgo = random.nextInt(365, 1095);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const lastLoginAt = new Date(Date.now() - random.nextInt(0, 7) * 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          passwordHash,
          displayName: userData.displayName,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&size=200&background=random`,
          emailVerified: true,
          language: 'en',
          theme: random.choice(['dark', 'light']),
          createdAt,
          lastLoginAt,
        },
      });

      users.push({ ...user, userData });
      created++;
      log(`Created user: ${userData.email}`, 'success');
    } catch (error: any) {
      log(`Failed to create user ${userData.email}: ${error.message}`, 'error');
      skipped++;
    }
  }

  log(`\n✅ Users: ${created} created, ${skipped} skipped`, 'success');
  return users;
}

async function seedChannels(users: any[]) {
  log('\n📺 Seeding channels...', 'info');
  
  const channels = [];
  let created = 0;
  let skipped = 0;

  for (const { id, userData, createdAt } of users) {
    if (userData.type !== 'creator') {
      skipped++;
      continue;
    }

    try {
      // Channel created a few days after user registration
      const channelCreatedAt = new Date(createdAt.getTime() + random.nextInt(1, 30) * 24 * 60 * 60 * 1000);

      // Subscriber count will be calculated after actual subscriptions are created
      const subscriberCount = 0;

      const channel = await prisma.channel.create({
        data: {
          userId: id,
          handle: userData.channelHandle,
          name: userData.channelName,
          description: userData.description,
          verified: userData.verified,
          subscriberCount,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.channelName)}&size=200&background=random`,
          createdAt: channelCreatedAt,
        },
      });

      channels.push({ ...channel, userData });
      created++;
      log(`Created channel: ${userData.channelName}`, 'success');
    } catch (error: any) {
      log(`Failed to create channel for ${userData.email}: ${error.message}`, 'error');
      skipped++;
    }
  }

  log(`\n✅ Channels: ${created} created, ${skipped} skipped`, 'success');
  return channels;
}

async function seedVideos(channels: any[]) {
  log('\n🎬 Seeding videos...', 'info');
  
  const videos = [];
  let created = 0;
  let skipped = 0;

  for (const channel of channels) {
    // Number of videos per channel (realistic distribution)
    const videoCount = channel.verified 
      ? random.nextInt(40, 80)  // Verified: 40-80 videos
      : random.nextInt(15, 40);  // Unverified: 15-40 videos

    for (let i = 0; i < videoCount; i++) {
      try {
        // Mix of standard videos and shorts
        const isShort = random.boolean(0.3); // 30% shorts
        const template = isShort
          ? random.choice(VIDEO_TEMPLATES.shorts)
          : random.choice(VIDEO_TEMPLATES.tutorials);

        // Unique title per channel
        const titleSuffix = i > 0 && random.boolean(0.4) ? ` - Part ${random.nextInt(1, 5)}` : '';
        const title = template.title + titleSuffix;

        // Upload date: between channel creation and now
        const channelAge = Date.now() - channel.createdAt.getTime();
        const uploadOffset = random.nextInt(0, Math.floor(channelAge / (24 * 60 * 60 * 1000)));
        const uploadedAt = new Date(channel.createdAt.getTime() + uploadOffset * 24 * 60 * 60 * 1000);
        
        // Published shortly after upload
        const publishedAt = new Date(uploadedAt.getTime() + random.nextInt(5, 60) * 60 * 1000);
        const processedAt = new Date(uploadedAt.getTime() + random.nextInt(2, 10) * 60 * 1000);

        // Initial counts set to 0, will be updated based on actual data
        const views = 0;
        const likes = 0;
        const dislikes = 0;
        const commentCount = 0;

        const video = await prisma.video.create({
          data: {
            channelId: channel.id,
            title,
            description: template.description,
            thumbnailUrl: `https://picsum.photos/seed/${channel.id}-${i}/1280/720`,
            duration: template.duration,
            type: isShort ? VideoType.SHORT : VideoType.STANDARD,
            status: VideoStatus.READY,
            isPublic: true,
            allowComments: random.boolean(0.95), // 95% allow comments
            uploadedAt,
            publishedAt,
            processedAt,
            views: BigInt(views),
            likes,
            dislikes,
            commentCount,
          },
        });

        videos.push(video);
        created++;

        if (created % 50 === 0) {
          log(`Progress: ${created} videos created...`, 'info');
        }
      } catch (error: any) {
        log(`Failed to create video: ${error.message}`, 'error');
        skipped++;
      }
    }
  }

  log(`\n✅ Videos: ${created} created, ${skipped} skipped`, 'success');
  return videos;
}

async function seedSubscriptions(users: any[], channels: any[]) {
  log('\n🔔 Seeding subscriptions...', 'info');
  
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Number of subscriptions per user (realistic)
    const subCount = user.userData.type === 'creator'
      ? random.nextInt(20, 50)  // Creators follow more
      : random.nextInt(5, 30);  // Viewers follow fewer

    const availableChannels = channels.filter(c => c.userId !== user.id);
    const shuffled = random.shuffle(availableChannels);
    const selectedChannels = shuffled.slice(0, Math.min(subCount, shuffled.length));

    for (const channel of selectedChannels) {
      try {
        // Subscribe date: after channel creation
        const subscribedAt = new Date(
          channel.createdAt.getTime() + 
          random.nextInt(0, Math.floor((Date.now() - channel.createdAt.getTime()) / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000
        );

        await prisma.subscription.create({
          data: {
            userId: user.id,
            channelId: channel.id,
            notificationsOn: random.boolean(0.7), // 70% have notifications on
            subscribedAt,
          },
        });

        created++;
      } catch (error: any) {
        // Skip duplicates silently
        skipped++;
      }
    }
  }

  log(`\n✅ Subscriptions: ${created} created, ${skipped} skipped`, 'success');
}

async function seedWatchHistory(users: any[], videos: any[]) {
  log('\n👁️  Seeding watch history...', 'info');
  
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Watch count per user
    const watchCount = user.userData.type === 'creator'
      ? random.nextInt(100, 300)
      : random.nextInt(200, 800);

    const shuffled = random.shuffle(videos);
    const selectedVideos = shuffled.slice(0, Math.min(watchCount, shuffled.length));

    for (const video of selectedVideos) {
      try {
        // Watch after video publication
        const timeSincePublish = Date.now() - new Date(video.publishedAt).getTime();
        const watchedAt = new Date(
          new Date(video.publishedAt).getTime() + 
          random.nextInt(0, Math.floor(timeSincePublish / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000
        );

        // Watch duration (realistic patterns)
        const completed = random.boolean(0.4); // 40% completion rate
        const watchDuration = completed
          ? video.duration
          : Math.floor(video.duration * random.nextInt(20, 80) / 100);
        
        const lastPosition = completed ? video.duration : watchDuration;

        await prisma.watchHistory.create({
          data: {
            userId: user.id,
            videoId: video.id,
            watchedAt,
            watchDuration,
            completed,
            lastPosition,
          },
        });

        created++;

        if (created % 500 === 0) {
          log(`Progress: ${created} watch records created...`, 'info');
        }
      } catch (error: any) {
        skipped++;
      }
    }
  }

  log(`\n✅ Watch history: ${created} created, ${skipped} skipped`, 'success');
}

async function seedLikes(users: any[], videos: any[]) {
  log('\n👍 Seeding likes...', 'info');
  
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Likes per user
    const likeCount = user.userData.type === 'creator'
      ? random.nextInt(60, 150)
      : random.nextInt(100, 400);

    const shuffled = random.shuffle(videos);
    const selectedVideos = shuffled.slice(0, Math.min(likeCount, shuffled.length));

    for (const video of selectedVideos) {
      try {
        // Like after video publication
        const createdAt = new Date(
          new Date(video.publishedAt).getTime() + 
          random.nextInt(0, Math.floor((Date.now() - new Date(video.publishedAt).getTime()) / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000
        );

        const likeType = random.boolean(0.9) ? LikeType.LIKE : LikeType.DISLIKE; // 90% likes, 10% dislikes

        await prisma.like.create({
          data: {
            userId: user.id,
            videoId: video.id,
            type: likeType,
            createdAt,
          },
        });

        created++;

        if (created % 500 === 0) {
          log(`Progress: ${created} likes created...`, 'info');
        }
      } catch (error: any) {
        skipped++;
      }
    }
  }

  log(`\n✅ Likes: ${created} created, ${skipped} skipped`, 'success');
}

async function seedComments(users: any[], videos: any[]) {
  log('\n💬 Seeding comments...', 'info');
  
  const commentTemplates = [
    'Great tutorial! This helped me a lot.',
    'Thanks for explaining this so clearly!',
    'Awesome content, keep it up!',
    'This is exactly what I was looking for.',
    'Very well explained. Subscribed!',
    'Could you make a video about [TOPIC]?',
    'Best tutorial on this topic!',
    'Clear and concise. Thank you!',
    'This saved me hours of debugging.',
    'More content like this please!',
    'Incredible explanation!',
    'Finally someone who explains it properly.',
    'This is gold. Thank you!',
    'Just what I needed for my project.',
    'Fantastic video! Very helpful.',
  ];

  let created = 0;
  let skipped = 0;

  // Select subset of videos for comments
  const videosWithComments = random.shuffle(videos).slice(0, Math.floor(videos.length * 0.8));

  for (const video of videosWithComments) {
    if (!video.allowComments) continue;

    const commentCount = random.nextInt(5, 30);
    const shuffledUsers = random.shuffle(users);
    const selectedUsers = shuffledUsers.slice(0, Math.min(commentCount, shuffledUsers.length));

    for (const user of selectedUsers) {
      try {
        const createdAt = new Date(
          new Date(video.publishedAt).getTime() + 
          random.nextInt(0, Math.floor((Date.now() - new Date(video.publishedAt).getTime()) / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000
        );

        const content = random.choice(commentTemplates);

        await prisma.comment.create({
          data: {
            userId: user.id,
            videoId: video.id,
            content,
            likes: random.nextInt(0, 100),
            createdAt,
          },
        });

        created++;

        if (created % 200 === 0) {
          log(`Progress: ${created} comments created...`, 'info');
        }
      } catch (error: any) {
        skipped++;
      }
    }
  }

  log(`\n✅ Comments: ${created} created, ${skipped} skipped`, 'success');
}

async function seedAnalytics(users: any[], videos: any[]) {
  log('\n📊 Seeding analytics events...', 'info');
  
  let created = 0;
  const eventCount = 15000; // Reasonable sample size

  for (let i = 0; i < eventCount; i++) {
    try {
      const user = random.choice(users);
      const video = random.choice(videos);
      const eventType = random.choice([
        EventType.VIDEO_VIEW,
        EventType.VIDEO_LIKE,
        EventType.VIDEO_SHARE,
        EventType.VIDEO_QUALITY_CHANGE,
      ]);

      const timestamp = new Date(
        new Date(video.publishedAt).getTime() + 
        random.nextInt(0, Math.floor((Date.now() - new Date(video.publishedAt).getTime()) / (24 * 60 * 60 * 1000))) * 24 * 60 * 60 * 1000
      );

      await prisma.analyticsEvent.create({
        data: {
          userId: user.id,
          videoId: video.id,
          eventType,
          timestamp,
          sessionId: `session-${random.nextInt(1000, 9999)}`,
          device: random.choice(['desktop', 'mobile', 'tablet']),
          country: random.choice(['US', 'UK', 'CA', 'IN', 'DE', 'FR', 'JP']),
        },
      });

      created++;

      if (created % 1000 === 0) {
        log(`Progress: ${created} events created...`, 'info');
      }
    } catch (error: any) {
      // Skip silently
    }
  }

  log(`\n✅ Analytics: ${created} events created`, 'success');
}

async function updateCounters() {
  log('\n🔄 Updating counters with actual data...', 'info');
  
  // STEP 1: Update video metrics first (views, likes, dislikes, comments)
  const videos = await prisma.video.findMany();
  let videoUpdateCount = 0;
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
    
    videoUpdateCount++;
    if (videoUpdateCount % 100 === 0) {
      log(`Updated ${videoUpdateCount} videos...`, 'info');
    }
  }
  
  // STEP 2: Update channel metrics (subscriber count, video count, total views)
  const channels = await prisma.channel.findMany();
  for (const channel of channels) {
    const subscriberCount = await prisma.subscription.count({
      where: { channelId: channel.id },
    });
    
    const videoCount = await prisma.video.count({
      where: { channelId: channel.id },
    });
    
    // Get updated videos with actual view counts
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
    
    log(`Updated ${channel.name}: ${subscriberCount} subs, ${videoCount} videos, ${totalViews.toString()} views`, 'success');
  }
  
  log(`\n✅ All counters updated with actual data`, 'success');
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  PRODUCTION-GRADE DATABASE SEED                       ║');
  console.log('║  Deterministic • Validated • Realistic                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Clear existing data
    await clearDatabase();

    // Seed in order (respecting foreign keys)
    const users = await seedUsers();
    const channels = await seedChannels(users);
    const videos = await seedVideos(channels);
    await seedSubscriptions(users, channels);
    await seedWatchHistory(users, videos);
    await seedLikes(users, videos);
    await seedComments(users, videos);
    await seedAnalytics(users, videos);
    
    // Update all counters with actual data
    await updateCounters();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🎉 SEED COMPLETED SUCCESSFULLY                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Channels: ${channels.length}`);
    console.log(`   Videos: ${videos.length}`);
    console.log('\n✅ Database is ready for development and testing!');
    console.log('   Run "npx prisma studio" to explore the data\n');

  } catch (error) {
    log('Seed failed catastrophically', 'error');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
