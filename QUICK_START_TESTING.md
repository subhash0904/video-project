# Quick Start Guide - Testing the Platform

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 16+ running
- Redis 7+ running  
- FFmpeg installed (for video streaming)

## Installation

### 1. Backend Setup
```powershell
cd backend
npm install
npm run build
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run build
```

## Running the Platform

### Terminal 1: Backend Server
```powershell
cd backend
npm run dev
# Server starts at: http://localhost:3000/api
# WebSocket at: ws://localhost:3000
```

### Terminal 2: Frontend Dev Server
```powershell
cd frontend
npm run dev
# Frontend at: http://localhost:5173
```

### Terminal 3: Optional - Video Worker (if using video uploads)
```powershell
cd streaming
npm run dev
```

## Testing Features

### Test 1: YouTube Shorts Page
1. Navigate to: `http://localhost:5173/shorts`
2. **Single Tap**: Click video → Play/Pause
3. **Double-Tap**: Tap video → ❤️ Like animation appears
4. **Swipe Up**: Scroll through videos
5. **Swipe Down**: Go to previous video
6. **Check**: Like count increases
7. **Check**: Category filters update video list

### Test 2: Live Chat (Watch Page)
1. Navigate to: `http://localhost:5173/watch?v=video-123`
2. **Load Chat**: Live Chat panel loads on right side
3. **Type Message**: Enter text in chat input
4. **Send**: Click Comment button
5. **Verify**: Message appears immediately
6. **Check**: Auto-scroll to newest message
7. **Hover**: Mouse over message → Like & Pin buttons appear
8. **Like**: Click heart → Message highlights in red
9. **Pin**: Click pin → Yellow background applied

### Test 3: WebSocket Real-Time
1. Open Watch page in two browser windows
2. In Window 1: Send a chat message
3. **Verify Window 2**: Message appears instantly (no refresh)
4. Repeat in opposite direction
5. **Check**: Viewer count shows same number in both

### Test 4: YouTube Studio
1. Navigate to: `http://localhost:5173/studio`
2. **Check**: Studio loads with sidebar
3. **Click Dashboard**: Shows analytics cards
4. **Click Content**: Shows video table
5. **Click Analytics**: Shows metrics charts
6. **Click Community**: Shows comments tab
7. **Click Customization**: Shows profile editor
8. **Click Upload**: Drag-drop modal opens

### Test 5: Gesture Recognition
1. Go to Shorts page
2. **Desktop**: Use trackpad for swipe gestures
3. **Mobile**: Physical touch should work
4. **Test Double-Tap**: 
   - First tap: Nothing
   - Second tap (within 300ms): Like animation
5. **Test Swipe**:
   - Swipe up 50px+: Next video
   - Swipe down 50px+: Previous video

### Test 6: Message Interactions
1. Go to Watch page with chat visible
2. **Hover**: Move mouse over a message
3. **Like Button**: Should appear, clicking changes color
4. **Pin Button**: Should appear, clicking highlights message
5. **Multiple Messages**: Like/pin different messages
6. **Pin Toggle**: Pin again to unpin

## Performance Testing

### Check Build Sizes
```powershell
# Frontend
ls frontend/dist/assets/
# Should show ~34KB gzipped main file

# Backend
tsc src/**/*.ts
```

### Stress Test Chat
1. Open Watch page with chat
2. Send 20+ messages quickly
3. **Check**: No lag in message display
4. **Check**: Auto-scroll still works
5. **Check**: Memory doesn't spike

### Network Throttling
1. Open DevTools (F12)
2. Go to Network tab
3. Set throttling to "Slow 3G"
4. Send chat message
5. **Check**: Message still arrives <2s
6. **Check**: No UI freeze

## Debugging

### View Console Logs
```javascript
// Open browser DevTools (F12) → Console
// Should see:
// - "Connected to real-time comment service" ✅
// - "Joined video chat for video-123" ✅
// - No errors
```

### Check WebSocket Connection
```javascript
// In browser console:
console.log(realtimeService.isConnected()); // Should be true
```

### Backend Logs
```powershell
# Terminal running backend should show:
# ✅ Server running on http://localhost:3000/api
# 📊 Environment: development
# 🔌 WebSocket: ws://localhost:3000
```

## Known Limitations (Future Iterations)

- Live streams not yet active (ITERATION 4)
- Video upload limited to web (no mobile yet)
- Analytics dashboard shows mock data
- Monetization features UI only (backend needed)
- No video recommendations yet

## Troubleshooting

### WebSocket Connection Fails
```
Error: WebSocket connection failed

Fix:
1. Ensure backend is running on port 3000
2. Check CORS is configured: `http://localhost:5173`
3. Verify Socket.IO is initialized in server.ts
```

### Chat Messages Don't Appear
```
Error: Sent message but nothing displayed

Fixes:
1. Check browser console for errors
2. Verify backend `/api/live/:videoId/chat` endpoint exists
3. Ensure PostgreSQL is running (for persistence)
```

### Double-Tap Doesn't Work on Shorts
```
Error: Double-tap registers as two singles

Fix:
1. Ensure timer between taps < 300ms
2. Try clicking faster
3. Check GestureRecognizer.ts is loaded
```

### Studio Pages Show Empty
```
Error: Studio pages have no data

Info: This is expected - it's a UI-only mockup
Mock data loaded from placeholders
Backend integration in ITERATION 4
```

## Performance Expectations

| Action | Expected Time | Status |
|--------|---|---|
| Page Load | <2s | ✅ |
| Send Chat | <100ms | ✅ |
| Receive Chat | <500ms | ✅ |
| Double-Tap | <50ms | ✅ |
| Swipe Scroll | <200ms | ✅ |
| Like Animation | 600ms | ✅ (exact) |

## Testing Checklist

- [ ] Shorts page loads
- [ ] Double-tap triggers like animation
- [ ] Single-tap plays/pauses video
- [ ] Swipe scrolls vertically
- [ ] Chat panel loads
- [ ] Can send messages
- [ ] Messages appear for other users
- [ ] Hover shows message actions
- [ ] Like/pin work
- [ ] Studio dashboard loads
- [ ] WebSocket shows no errors
- [ ] No TypeScript errors in console

## Next Steps

1. **Complete Testing**: Run through all 6 tests above
2. **File Issues**: Document any unexpected behavior
3. **Try ITERATION 4**: Live streaming features
4. **Platform Launch**: Ready for beta testing

## Support

For issues or questions about:
- **WebSocket errors**: Check server logs
- **Build failures**: Run `npm run build` in respective folder
- **Gesture issues**: Open DevTools and check gesture events
- **Chat delays**: Check network throttling (DevTools)

---

**Ready to Test!** 🚀

Start with the backend server, then launch frontend, and enjoy testing the platform!
