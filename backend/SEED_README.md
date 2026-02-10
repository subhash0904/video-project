# Database Seed - Quick Reference

## Quick Start

```bash
cd backend

# Run production seed (recommended)
pnpm db:seed

# OR run simple seed (original)
pnpm db:seed:simple
```

## Expected Output

```
╔════════════════════════════════════════════════════════╗
║  PRODUCTION-GRADE DATABASE SEED                       ║
║  Deterministic • Validated • Realistic                ║
╚════════════════════════════════════════════════════════╝

✅ Users: 13 created
✅ Channels: 8 created
✅ Videos: ~215 created
✅ Subscriptions: ~96 created
✅ Watch history: ~1,800 created
✅ Likes: ~1,080 created
✅ Comments: ~1,480 created
✅ Analytics: 5,000 events created

⏱️  Duration: ~30-60s
```

## Verification

### 1. Using Prisma Studio (GUI)

```bash
pnpm db:studio
```

Visit: http://localhost:5555

### 2. Using API (Running Backend)

```bash
# Get video feed
curl http://localhost:4000/api/videos/feed

# Get channels
curl http://localhost:4000/api/channels

# Get specific channel
curl http://localhost:4000/api/channels/@sarahjtech
```

### 3. Using Direct SQL

```bash
psql -U video_user -d video_platform -h localhost -p 5432
```

```sql
-- Quick stats
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM channels) as channels,
  (SELECT COUNT(*) FROM videos) as videos,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions,
  (SELECT COUNT(*) FROM watch_history) as watch_records,
  (SELECT COUNT(*) FROM likes) as likes,
  (SELECT COUNT(*) FROM comments) as comments;
```

## Test Credentials

**Creator Accounts** (for testing upload/channel management):

```
Email: sarah.johnson@techcreator.io
Password: SecurePass123!

Email: alex.chen@devtips.com
Password: DevSecure456!

Email: maria.rodriguez@codeninja.net
Password: NinjaCode789!
```

**Viewer Accounts** (for testing playback/subscriptions):

```
Email: viewer1@gmail.com
Password: ViewPass123!

Email: viewer2@yahoo.com
Password: Learning456!
```

## Sample Data Overview

### Users (13 total)
- **8 Creators**: Own channels, multiple videos
- **5 Viewers**: Consume content, no channels

### Channels (8 total)
- **5 Verified**: 500K - 2.5M subscribers
- **3 Unverified**: 10K - 150K subscribers

### Videos (~215 total)
- **~150 Standard**: 2-20 minute tutorials
- **~65 Shorts**: < 60 second quick tips
- **Topics**: React, Node.js, TypeScript, Docker, Python, CSS, etc.

### Engagement
- **~100 Subscriptions**: Realistic follow patterns
- **~1,800 Watch Records**: With completion tracking
- **~1,080 Likes/Dislikes**: 90/10 ratio
- **~1,480 Comments**: Human-like feedback

## Troubleshooting

### Seed Fails

**Check Database Connection**:
```bash
psql -U video_user -d video_platform -h localhost -p 5432 -c "SELECT 1"
```

**Check Docker Services**:
```bash
cd ../infra
docker compose ps
```

### Database Not Clear

**Manual Reset**:
```sql
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE analytics_events CASCADE;
```

**OR Re-run Seed** (auto-clears):
```bash
pnpm db:seed
```

### Slow Performance

- Normal for first run (building indexes)
- Subsequent runs are faster
- Generate ~5,000+ records takes 30-60s

## File Locations

```
backend/
├── prisma/
│   ├── seed-production.ts    ← Main seed script
│   └── seed.ts               ← Simple seed (legacy)
├── SEED_DOCUMENTATION.md     ← Full documentation
└── SEED_README.md            ← This file
```

## Key Features

✅ **Deterministic**: Same seed = same data  
✅ **Validated**: Email format, password strength, date logic  
✅ **Realistic**: Human-like views, engagement, timestamps  
✅ **Safe**: Idempotent, can re-run anytime  
✅ **Fast**: ~30-60s for full dataset  
✅ **Logged**: Clear progress indicators  

## Next Steps

1. ✅ Seed database: `pnpm db:seed`
2. ✅ Start backend: `pnpm dev:watch`
3. ✅ Verify data: `pnpm db:studio`
4. ✅ Test API: `curl http://localhost:4000/api/videos/feed`
5. ✅ Start frontend: `cd ../frontend && pnpm dev`
6. ✅ Login with test account and explore!

## Support

- **Full Docs**: `SEED_DOCUMENTATION.md`
- **Schema**: `prisma/schema.prisma`
- **Seed Code**: `prisma/seed-production.ts`

---

**Last Updated**: February 9, 2026  
**Status**: ✅ Production Ready
