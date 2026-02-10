# Video Categories and Filtering Feature

## ✅ Implementation Complete

The video platform now supports full category-based video organization and filtering.

---

## 📋 Available Categories

All videos can be categorized into one of the following categories:

1. **FILM_ANIMATION** - Films, Animation, Movies
2. **AUTOS_VEHICLES** - Cars, Motorcycles, Vehicles
3. **MUSIC** - Music Videos, Songs, Concerts
4. **PETS_ANIMALS** - Pets, Wildlife, Animals
5. **SPORTS** - Sports, Fitness, Athletics
6. **TRAVEL_EVENTS** - Travel, Events, Tourism
7. **GAMING** - Video Games, Gaming Content
8. **PEOPLE_BLOGS** - Vlogs, Personal Content
9. **COMEDY** - Comedy, Humor, Sketches
10. **ENTERTAINMENT** - Entertainment, Shows
11. **NEWS_POLITICS** - News, Politics, Current Events
12. **HOWTO_STYLE** - Tutorials, How-to, Style
13. **EDUCATION** - Educational Content, Courses
14. **SCIENCE_TECH** - Science, Technology, Innovation
15. **NONPROFITS_ACTIVISM** - Nonprofits, Activism, Social Causes
16. **KIDS** - Kids Content, Family-Friendly
17. **OTHER** - Miscellaneous (Default)

---

## 🚀 API Endpoints

### 1. Get All Categories

```http
GET /api/videos/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "FILM_ANIMATION",
      "label": "Film & Animation"
    },
    {
      "value": "MUSIC",
      "label": "Music"
    },
    {
      "value": "GAMING",
      "label": "Gaming"
    },
    {
      "value": "EDUCATION",
      "label": "Education"
    }
    // ... all categories
  ],
  "message": "Categories retrieved successfully"
}
```

**Usage Example:**
```bash
curl http://localhost:4000/api/videos/categories
```

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:4000/api/videos/categories" -Method GET
```

---

### 2. Get Video Feed with Category Filter

```http
GET /api/videos/feed?category={CATEGORY_NAME}
```

**Query Parameters:**
- `category` (optional) - Filter by category (e.g., GAMING, EDUCATION, MUSIC)
- `type` (optional) - Filter by type: STANDARD or SHORT
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page

**Example Requests:**

```bash
# Get all gaming videos
curl "http://localhost:4000/api/videos/feed?category=GAMING"

# Get education videos, page 2
curl "http://localhost:4000/api/videos/feed?category=EDUCATION&page=2&limit=10"

# Get music shorts
curl "http://localhost:4000/api/videos/feed?category=MUSIC&type=SHORT"

# Get all videos (no filter)
curl "http://localhost:4000/api/videos/feed"
```

```powershell
# PowerShell examples
# Gaming videos
Invoke-RestMethod -Uri "http://localhost:4000/api/videos/feed?category=GAMING"

# Education videos with pagination
Invoke-RestMethod -Uri "http://localhost:4000/api/videos/feed?category=EDUCATION&page=2&limit=10"

# Science & Tech standard videos
Invoke-RestMethod -Uri "http://localhost:4000/api/videos/feed?category=SCIENCE_TECH&type=STANDARD"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "video-uuid",
      "title": "Introduction to Machine Learning",
      "description": "Learn the basics...",
      "thumbnailUrl": "https://...",
      "duration": 1230,
      "views": 1500,
      "likes": 120,
      "type": "STANDARD",
      "category": "EDUCATION",
      "publishedAt": "2024-02-10T...",
      "channel": {
        "id": "channel-uuid",
        "name": "Tech Academy",
        "handle": "@techacademy",
        "avatarUrl": "https://...",
        "verified": true,
        "subscriberCount": 50000
      }
    }
    // ... more videos
  ],
  "meta": {
    "total": 145,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "message": "Video feed retrieved"
}
```

---

### 3. Search Videos with Category Filter

```http
GET /api/videos/search?q={query}&category={CATEGORY_NAME}
```

**Query Parameters:**
- `q` (required) - Search query
- `category` (optional) - Filter by category
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Example Requests:**

```bash
# Search for "javascript" in EDUCATION category
curl "http://localhost:4000/api/videos/search?q=javascript&category=EDUCATION"

# Search for "tutorial" in SCIENCE_TECH category
curl "http://localhost:4000/api/videos/search?q=tutorial&category=SCIENCE_TECH"

# Search without category filter
curl "http://localhost:4000/api/videos/search?q=react"
```

```powershell
# PowerShell
$query = "javascript"
$category = "EDUCATION"
Invoke-RestMethod -Uri "http://localhost:4000/api/videos/search?q=$query&category=$category"
```

---

## 📤 Upload/Update Videos with Category

### Upload Video

```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (file) - Video file
- `thumbnail` (file, optional) - Thumbnail image
- `title` (string) - Video title
- `description` (string, optional) - Description
- `category` (string, optional) - Category (default: OTHER)
- `type` (string, optional) - STANDARD or SHORT
- `isPublic` (boolean, optional) - Public visibility
- `allowComments` (boolean, optional) - Allow comments
- `ageRestricted` (boolean, optional) - Age restriction

**Example with curl:**
```bash
curl -X POST http://localhost:4000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "thumbnail=@/path/to/thumb.jpg" \
  -F "title=My Coding Tutorial" \
  -F "description=Learn to code" \
  -F "category=EDUCATION" \
  -F "type=STANDARD"
```

**Example with PowerShell:**
```powershell
$token = "YOUR_ACCESS_TOKEN"
$videoPath = "C:\Videos\tutorial.mp4"
$thumbnailPath = "C:\Images\thumb.jpg"

$form = @{
    video = Get-Item -Path $videoPath
    thumbnail = Get-Item -Path $thumbnailPath
    title = "My Coding Tutorial"
    description = "Learn to code"
    category = "EDUCATION"
    type = "STANDARD"
}

Invoke-RestMethod -Uri "http://localhost:4000/api/videos/upload" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" } `
    -Form $form
```

---

### Update Video Category

```http
PATCH /api/videos/{videoId}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "SCIENCE_TECH",
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:4000/api/videos/video-uuid-here \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"GAMING","title":"Epic Gaming Montage"}'
```

```powershell
$videoId = "video-uuid-here"
$token = "YOUR_ACCESS_TOKEN"

$body = @{
    category = "GAMING"
    title = "Epic Gaming Montage"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/videos/$videoId" `
    -Method PATCH `
    -Headers @{ 
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

---

## 🎨 Frontend Integration Examples

### React Example

```tsx
import { useState, useEffect } from 'react';

// Fetch all categories
const useCategories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/videos/categories')
      .then(res => res.json())
      .then(data => setCategories(data.data));
  }, []);

  return categories;
};

// Category filter component
const CategoryFilter = ({ onCategoryChange }) => {
  const categories = useCategories();
  
  return (
    <select onChange={(e) => onCategoryChange(e.target.value)}>
      <option value="">All Categories</option>
      {categories.map(cat => (
        <option key={cat.value} value={cat.value}>
          {cat.label}
        </option>
      ))}
    </select>
  );
};

// Fetch videos by category
const VideoFeed = () => {
  const [videos, setVideos] = useState([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const url = new URL('http://localhost:4000/api/videos/feed');
    if (category) url.searchParams.append('category', category);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', 20);

    fetch(url)
      .then(res => res.json())
      .then(data => setVideos(data.data));
  }, [category, page]);

  return (
    <div>
      <CategoryFilter onCategoryChange={setCategory} />
      
      <div className="video-grid">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      
      <Pagination 
        currentPage={page} 
        onPageChange={setPage}
      />
    </div>
  );
};
```

### JavaScript/Fetch Example

```javascript
// Get all categories
async function getCategories() {
  const response = await fetch('http://localhost:4000/api/videos/categories');
  const data = await response.json();
  return data.data;
}

// Get videos by category
async function getVideosByCategory(category, page = 1) {
  const url = new URL('http://localhost:4000/api/videos/feed');
  if (category) url.searchParams.append('category', category);
  url.searchParams.append('page', page);
  
  const response = await fetch(url);
  const data = await response.json();
  return data.data;
}

// Usage
const categories = await getCategories();
console.log('Available categories:', categories);

const gamingVideos = await getVideosByCategory('GAMING');
console.log('Gaming videos:', gamingVideos);
```

---

## 🗄️ Database Schema

### Video Model (Relevant Fields)

```prisma
model Video {
  id           String        @id @default(uuid())
  title        String
  description  String?
  category     VideoCategory @default(OTHER)  // Category field
  type         VideoType     @default(STANDARD)
  status       VideoStatus   @default(PROCESSING)
  // ... other fields
}

enum VideoCategory {
  FILM_ANIMATION
  AUTOS_VEHICLES
  MUSIC
  PETS_ANIMALS
  SPORTS
  TRAVEL_EVENTS
  GAMING
  PEOPLE_BLOGS
  COMEDY
  ENTERTAINMENT
  NEWS_POLITICS
  HOWTO_STYLE
  EDUCATION
  SCIENCE_TECH
  NONPROFITS_ACTIVISM
  KIDS
  OTHER
}
```

### Check Existing Videos' Categories

```sql
-- Count videos by category
SELECT category, COUNT(*) as count
FROM videos
WHERE status = 'READY' AND "isPublic" = true
GROUP BY category
ORDER BY count DESC;

-- Get videos in EDUCATION category
SELECT id, title, category, views, likes
FROM videos
WHERE category = 'EDUCATION' AND status = 'READY'
ORDER BY views DESC
LIMIT 10;
```

```powershell
# PowerShell - Check video distribution
docker-compose exec postgres psql -U video_user -d video_platform -c "SELECT category, COUNT(*) as count FROM videos WHERE status = 'READY' GROUP BY category ORDER BY count DESC;"
```

---

## 🧪 Testing the Feature

### 1. Test Category Endpoint

```powershell
# Get all categories
curl http://localhost:4000/api/videos/categories | ConvertFrom-Json | Select-Object -ExpandProperty data
```

**Expected Output:**
```
value              label
-----              -----
FILM_ANIMATION     Film & Animation
AUTOS_VEHICLES     Autos & Vehicles
MUSIC              Music
GAMING             Gaming
EDUCATION          Education
SCIENCE_TECH       Science & Tech
...
```

### 2. Test Category Filtering

```powershell
# Get gaming videos
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/videos/feed?category=GAMING"
Write-Host "Found $($response.meta.total) gaming videos"
$response.data | Select-Object title, category, views | Format-Table

# Get education videos
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/videos/feed?category=EDUCATION"
Write-Host "Found $($response.meta.total) education videos"
$response.data | Select-Object title, category, views | Format-Table
```

### 3. Test Search with Category

```powershell
# Search "tutorial" in EDUCATION category
$query = "tutorial"
$category = "EDUCATION"
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/videos/search?q=$query&category=$category"
Write-Host "Found $($response.meta.total) education tutorials"
$response.data | Select-Object title, category | Format-Table
```

### 4. Update Video Category (Requires Auth)

```powershell
# First, login to get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"user@example.com","password":"password123"}'

$token = $loginResponse.accessToken

# Update video category
$videoId = "your-video-id-here"
$updateBody = @{
    category = "SCIENCE_TECH"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/videos/$videoId" `
    -Method PATCH `
    -Headers @{ 
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $updateBody
```

---

## 📊 Analytics by Category

### Get Video Statistics by Category

```sql
-- Video count and total views by category
SELECT 
    category,
    COUNT(*) as video_count,
    SUM(views) as total_views,
    AVG(views) as avg_views,
    SUM(likes) as total_likes
FROM videos
WHERE status = 'READY' AND "isPublic" = true
GROUP BY category
ORDER BY total_views DESC;
```

```powershell
# PowerShell
docker-compose exec postgres psql -U video_user -d video_platform -c "
SELECT 
    category,
    COUNT(*) as video_count,
    SUM(views) as total_views,
    AVG(views) as avg_views
FROM videos
WHERE status = 'READY'
GROUP BY category
ORDER BY total_views DESC;
"
```

---

## 🔧 Configuration

### Update Existing Videos to Have Categories

If you have existing videos without proper categories, you can update them:

```sql
-- Set random categories for testing
UPDATE videos 
SET category = (
  CASE (RANDOM() * 16)::INT
    WHEN 0 THEN 'FILM_ANIMATION'
    WHEN 1 THEN 'MUSIC'
    WHEN 2 THEN 'GAMING'
    WHEN 3 THEN 'EDUCATION'
    WHEN 4 THEN 'SCIENCE_TECH'
    WHEN 5 THEN 'SPORTS'
    WHEN 6 THEN 'ENTERTAINMENT'
    WHEN 7 THEN 'COMEDY'
    WHEN 8 THEN 'NEWS_POLITICS'
    WHEN 9 THEN 'HOWTO_STYLE'
    WHEN 10 THEN 'PETS_ANIMALS'
    WHEN 11 THEN 'TRAVEL_EVENTS'
    WHEN 12 THEN 'PEOPLE_BLOGS'
    WHEN 13 THEN 'AUTOS_VEHICLES'
    WHEN 14 THEN 'NONPROFITS_ACTIVISM'
    WHEN 15 THEN 'KIDS'
    ELSE 'OTHER'
  END
)::VideoCategory
WHERE category = 'OTHER';
```

---

## 🎯 Common Use Cases

### 1. Category Navigation Menu

```javascript
// Build category navigation
const categories = await fetch('/api/videos/categories').then(r => r.json());

const CategoryNav = () => (
  <nav>
    <a href="/videos">All Videos</a>
    {categories.data.map(cat => (
      <a key={cat.value} href={`/videos?category=${cat.value}`}>
        {cat.label}
      </a>
    ))}
  </nav>
);
```

### 2. Category-Based Homepage Sections

```javascript
// Show different category sections on homepage
const categories = ['GAMING', 'EDUCATION', 'MUSIC', 'ENTERTAINMENT'];

const Homepage = () => {
  return (
    <>
      {categories.map(cat => (
        <CategorySection key={cat} category={cat} />
      ))}
    </>
  );
};

const CategorySection = ({ category }) => {
  const [videos, setVideos] = useState([]);
  
  useEffect(() => {
    fetch(`/api/videos/feed?category=${category}&limit=6`)
      .then(r => r.json())
      .then(data => setVideos(data.data));
  }, [category]);
  
  return (
    <section>
      <h2>{category.replace('_', ' ')}</h2>
      <div className="video-row">
        {videos.map(video => <VideoCard key={video.id} video={video} />)}
      </div>
    </section>
  );
};
```

### 3. Smart Category Suggestions

```javascript
// Suggest category based on video title
function suggestCategory(title) {
  const keywords = {
    GAMING: ['game', 'gameplay', 'gaming', 'gamer', 'esports'],
    EDUCATION: ['tutorial', 'learn', 'course', 'lesson', 'teach'],
    MUSIC: ['song', 'music', 'audio', 'beat', 'lyrics'],
    COMEDY: ['funny', 'comedy', 'laugh', 'hilarious', 'joke'],
    SCIENCE_TECH: ['tech', 'technology', 'science', 'programming', 'code'],
  };
  
  const lowerTitle = title.toLowerCase();
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerTitle.includes(word))) {
      return category;
    }
  }
  
  return 'OTHER';
}
```

---

## 📈 Performance Considerations

### Caching Strategy

The video feed with category filtering is cached for 2 minutes for unauthenticated users:

```typescript
// Cache key includes category
const cacheKey = `feed:${type || 'all'}:${category || 'all'}:${page}:${limit}`;
await cache.set(cacheKey, result, 120); // 2 minutes
```

### Database Indexing

Consider adding an index on the category column for better performance:

```sql
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_category_status ON videos(category, status);
```

---

## ✅ Summary

**Features Implemented:**
- ✅ 17 predefined video categories
- ✅ GET `/api/videos/categories` - List all categories
- ✅ GET `/api/videos/feed?category=X` - Filter feed by category
- ✅ GET `/api/videos/search?q=X&category=Y` - Search with category filter
- ✅ POST `/api/videos/upload` - Upload with category
- ✅ PATCH `/api/videos/:id` - Update video category
- ✅ Database schema with VideoCategory enum
- ✅ Caching support for category-filtered feeds
- ✅ Pagination support

**Documentation:**
- ✅ Complete API reference
- ✅ Frontend integration examples
- ✅ Testing guide
- ✅ SQL examples for analytics

**Next Steps:**
- 🔄 Restart backend to apply changes
- 🧪 Test the category endpoints
- 🎨 Update frontend with category navigation
- 📊 Add analytics dashboard for categories

---

**Status:** ✅ COMPLETE - Ready to use  
**Last Updated:** 2024-02-10  
**Version:** 1.0.0
