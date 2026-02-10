# Database Seeding Documentation

## Overview

This document describes the production-grade database seeding strategy for the video streaming platform. The seed script populates the database with realistic, human-like data suitable for development, testing, and ML training.

## Data Model Assumptions

### Users
- **Email**: Valid format (validated with regex)
- **Password**: Minimum 8 characters before bcrypt hashing
- **Created At**: Realistic timestamps (1-3 years in the past)
- **Last Login**: Within the last 7 days
- **Types**: 
  - **Creators**: Users who own channels
  - **Viewers**: Users who consume content

### Channels
- **One-to-One**: Each user can have at most one channel
- **Handle**: Unique, @ prefix format
- **Subscriber Count**: Realistic distribution
  - Verified channels: 500K - 2.5M subscribers
  - Unverified channels: 10K - 150K subscribers
- **Created At**: 1-30 days after user creation

### Videos
- **Duration**: 
  - Shorts: < 60 seconds
  - Standard: 2-20 minutes
- **Upload Timeline**: Between channel creation and present
- **Status**: All videos are in READY state
- **Views Distribution**: Power law (realistic engagement)
  - Verified channels: 50K - 500K views per video
  - Unverified channels: 1K - 50K views per video
- **Engagement Ratios**:
  - Likes: 2-8% of views
  - Dislikes: 2-10% of likes
  - Comments: 5-15% of likes

### Subscriptions
- **Constraint**: Users cannot subscribe to their own channel
- **No Duplicates**: Enforced by unique constraint
- **Subscription Date**: After channel creation
- **Distribution**:
  - Creators: 20-50 subscriptions
  - Viewers: 5-30 subscriptions

### Watch History
- **Watch Duration**: ≤ video duration
- **Completion Rate**: 40% of videos watched to completion
- **Partial Views**: 20-80% of video duration
- **Watch Date**: After video publication
- **Distribution**:
  - Creators: 50-150 watched videos
  - Viewers: 100-500 watched videos

### Likes
- **One Per User Per Video**: Enforced by unique constraint
- **Like Date**: After video publication
- **Distribution**: 90% likes, 10% dislikes
- **Count**:
  - Creators: 30-80 likes
  - Viewers: 50-200 likes

### Comments
- **Realistic Content**: Human-like comments, not lorem ipsum
- **70% of Videos**: Not all videos have comments
- **3-20 Comments**: Per video
- **Comment Date**: After video publication
- **Likes**: 0-100 likes per comment

### Analytics Events
- **Sample Size**: 5,000 events for development
- **Event Types**: VIDEO_VIEW, VIDEO_LIKE, VIDEO_SHARE, VIDEO_QUALITY_CHANGE
- **Device Distribution**: desktop, mobile, tablet
- **Geographic Distribution**: US, UK, CA, IN, DE, FR, JP

## Validation Rules

### Enforced Validations

1. **Email Format**
   ```typescript
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   ```

2. **Password Length**
   - Minimum 8 characters (before hashing)
   - Hashed with bcrypt (cost factor: 12)

3. **Date Consistency**
   - User creation < Channel creation
   - Channel creation < Video upload
   - Video upload < Video publication
   - Video publication < Watch/Like/Comment

4. **Foreign Key Integrity**
   - All user IDs must exist
   - All channel IDs must exist
   - All video IDs must exist

5. **Unique Constraints**
   - User email (unique)
   - User username (unique)
   - Channel handle (unique)
   - Subscription: (userId, channelId) (unique)
   - Like: (userId, videoId) (unique)

6. **Business Logic**
   - User cannot subscribe to own channel
   - Watch duration ≤ video duration
   - No negative values (views, likes, duration)

### Error Handling

- **Validation Failures**: Record is skipped, reason is logged
- **Duplicate Errors**: Silently skipped (idempotent)
- **Foreign Key Errors**: Logged as error, seeding continues
- **Critical Errors**: Script exits with non-zero status

## Seed Strategy

### Deterministic Randomization

Uses a **seeded random number generator** (seed: 42) for reproducibility:

```typescript
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}
```

**Benefits**:
- Same seed = same data every time
- Reproducible test environments
- Debuggable data issues

### Seeding Order

Order respects foreign key dependencies:

1. **Users** (no dependencies)
2. **Channels** (depends on Users)
3. **Videos** (depends on Channels)
4. **Subscriptions** (depends on Users, Channels)
5. **Watch History** (depends on Users, Videos)
6. **Likes** (depends on Users, Videos)
7. **Comments** (depends on Users, Videos)
8. **Analytics** (depends on Users, Videos)

### Progress Logging

- Clear visual feedback with emoji indicators
- Progress updates every N records
- Summary statistics at completion
- Execution time tracking

## File Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Original simple seed
│   └── seed-production.ts      # Production-grade seed ⭐
├── SEED_DOCUMENTATION.md       # This file
└── package.json               # Contains seed script
```

## Execution

### Prerequisites

```bash
# Ensure dependencies are installed
cd backend
pnpm install
```

### Running the Seed

```bash
# Production seed (recommended)
pnpm exec tsx prisma/seed-production.ts

# OR using package.json script (if configured)
pnpm db:seed
```

### Expected Output

```
╔════════════════════════════════════════════════════════╗
║  PRODUCTION-GRADE DATABASE SEED                       ║
║  Deterministic • Validated • Realistic                ║
╚════════════════════════════════════════════════════════╝

ℹ️  Clearing existing data...
✅ Database cleared

📝 Seeding users...
✅ Created user: sarah.johnson@techcreator.io
✅ Created user: alex.chen@devtips.com
...
✅ Users: 13 created, 0 skipped

📺 Seeding channels...
✅ Created channel: Tech with Sarah (1,234,567 subs)
...
✅ Channels: 8 created, 5 skipped

🎬 Seeding videos...
ℹ️  Progress: 50 videos created...
ℹ️  Progress: 100 videos created...
...
✅ Videos: 287 created, 0 skipped

🔔 Seeding subscriptions...
✅ Subscriptions: 234 created, 12 skipped

👁️  Seeding watch history...
ℹ️  Progress: 500 watch records created...
...
✅ Watch history: 1,847 created, 23 skipped

👍 Seeding likes...
ℹ️  Progress: 500 likes created...
...
✅ Likes: 1,234 created, 45 skipped

💬 Seeding comments...
ℹ️  Progress: 200 comments created...
...
✅ Comments: 876 created, 12 skipped

📊 Seeding analytics events...
ℹ️  Progress: 1000 events created...
...
✅ Analytics: 5000 events created

╔════════════════════════════════════════════════════════╗
║  🎉 SEED COMPLETED SUCCESSFULLY                        ║
╚════════════════════════════════════════════════════════╝

⏱️  Duration: 45.67s

📊 Summary:
   Users: 13
   Channels: 8
   Videos: 287

✅ Database is ready for development and testing!
   Run "npx prisma studio" to explore the data
```

### Re-running the Seed

The script is **idempotent** and safe to re-run:

```bash
# Clear database and reseed
pnpm exec tsx prisma/seed-production.ts
```

It will:
1. Delete all existing records
2. Reseed with the same data (deterministic)
3. Handle any conflicts gracefully

## Verification

### Using Prisma Studio

```bash
cd backend
npx prisma studio
```

Opens GUI at `http://localhost:5555` to explore:
- Browse all tables
- Inspect relationships
- Verify data quality
- Query data interactively

### Using SQL Queries

```sql
-- User statistics
SELECT COUNT(*) as total_users FROM users;

-- Channel statistics
SELECT 
  name,
  "subscriberCount",
  "videoCount",
  verified
FROM channels
ORDER BY "subscriberCount" DESC;

-- Video statistics
SELECT 
  type,
  COUNT(*) as count,
  AVG(duration) as avg_duration,
  AVG(views::numeric) as avg_views
FROM videos
GROUP BY type;

-- Engagement metrics
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_watches,
  AVG(watch_duration) as avg_watch_duration
FROM watch_history;

-- Subscription distribution
SELECT 
  COUNT(*) as total_subscriptions,
  AVG(sub_count) as avg_subs_per_user
FROM (
  SELECT user_id, COUNT(*) as sub_count
  FROM subscriptions
  GROUP BY user_id
) subquery;
```

### Using API Endpoints

```bash
# Get video feed
curl http://localhost:4000/api/videos/feed

# Get channel details
curl http://localhost:4000/api/channels/@sarahjtech

# Get user subscriptions
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/users/subscriptions
```

## Data Quality Checklist

- [x] **Email Uniqueness**: All user emails are unique
- [x] **Password Security**: All passwords are bcrypt-hashed (cost 12)
- [x] **Date Consistency**: All timestamps follow logical order
- [x] **Referential Integrity**: All foreign keys are valid
- [x] **Realistic Values**: Views, likes, durations are human-like
- [x] **No Lorem Ipsum**: All text is meaningful and realistic
- [x] **Engagement Ratios**: Like/view ratios are realistic (2-8%)
- [x] **Completion Rates**: 40% watch completion is realistic
- [x] **Power Law Distribution**: Views follow realistic distribution
- [x] **No Self-Subscriptions**: Users don't subscribe to own channels

## Use Cases

### Development
- Frontend UI testing with realistic data
- API endpoint testing with real-world scenarios
- Edge case testing (high views, long videos, etc.)

### Testing
- Integration tests with predictable data
- Performance testing with realistic load
- E2E tests with complete user journeys

### ML Training
- Recommendation algorithm training
- View prediction models
- User behavior analysis
- Content classification

## Troubleshooting

### "Password too short" Warnings
- Some users skipped due to password validation
- Intentional: demonstrates validation logic
- Not an error

### "Email already exists" Errors
- Database not cleared before re-run
- Solution: Script auto-clears database

### Slow Performance
- Large dataset creation takes time
- Normal: ~30-60 seconds for full seed
- Use progress indicators to monitor

### Foreign Key Violations
- Check database constraints
- Ensure Prisma schema is up to date
- Run `npx prisma generate` first

## Maintenance

### Updating User Templates

Edit `REALISTIC_USERS` array in `seed-production.ts`:

```typescript
const REALISTIC_USERS = [
  {
    email: 'newcreator@example.com',
    username: 'newcreator',
    password: 'SecurePass123!',  // Min 8 chars
    displayName: 'New Creator',
    channelName: 'New Channel',
    channelHandle: '@newcreator',
    description: 'Channel description',
    verified: true,
    type: 'creator',
  },
  // ... add more
];
```

### Updating Video Templates

Edit `VIDEO_TEMPLATES` object:

```typescript
const VIDEO_TEMPLATES = {
  tutorials: [
    {
      title: 'Your Tutorial Title',
      description: 'Detailed description',
      duration: 1800,  // 30 minutes
      tags: ['tag1', 'tag2'],
    },
  ],
  shorts: [
    // ... short videos < 60s
  ],
};
```

### Adjusting Data Volume

Modify these values in seed functions:

```typescript
// In seedVideos()
const videoCount = channel.verified 
  ? random.nextInt(25, 60)   // Change these ranges
  : random.nextInt(8, 25);

// In seedWatchHistory()
const watchCount = user.userData.type === 'creator'
  ? random.nextInt(50, 150)   // Change these ranges
  : random.nextInt(100, 500);
```

## Performance Optimization

### Batch Inserts (Future Enhancement)

Currently: Individual inserts with error handling
Future: Batch inserts for better performance

```typescript
// Future optimization
await prisma.video.createMany({
  data: videosArray,
  skipDuplicates: true,
});
```

### Transaction Batching

For very large datasets, use transactions:

```typescript
await prisma.$transaction(async (tx) => {
  // Batch operations
});
```

## Security Notes

### Password Hashing
- Uses bcrypt with cost factor 12
- Never store plain-text passwords
- Test passwords are strong (8+ chars, mixed case, numbers, symbols)

### Test Credentials

**For Development Only**:
```
Email: sarah.johnson@techcreator.io
Password: SecurePass123!

Email: alex.chen@devtips.com
Password: DevSecure456!
```

**DO NOT USE IN PRODUCTION**

## Contributing

When adding new seed data:

1. Follow existing naming conventions
2. Maintain data realism
3. Add validation for new fields
4. Update this documentation
5. Test seed multiple times
6. Verify data quality in Prisma Studio

## Support

For issues or questions:
1. Check this documentation
2. Review seed script comments
3. Examine validation logic
4. Test with smaller datasets first
5. Check Prisma schema for constraints

---

**Last Updated**: February 9, 2026  
**Version**: 1.0.0  
**Author**: Senior Backend Engineer
