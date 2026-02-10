// Route handler for live chat comment broadcasting
// This middleware hooks into the comment creation to emit Socket.IO events

import { Router } from 'express';
import { prisma } from '../../config/db.js';
import { optionalAuth } from '../../middleware/auth.js';
import { emitVideoCommented } from '../events/event.producer.js';

const router = Router();

// Get live chat messages (last 50 comments for a video)
router.get('/live/:videoId/chat', async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const comments = await prisma.comment.findMany({
      where: {
        videoId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Reverse to get oldest first (for chat display)
    const chatMessages = comments.reverse().map((comment) => ({
      id: comment.id,
      videoId: comment.videoId,
      userId: comment.userId,
      username: comment.user?.username || 'Anonymous',
      displayName: comment.user?.displayName || 'User',
      content: comment.content,
      avatarUrl: comment.user?.avatarUrl,
      timestamp: comment.createdAt,
      likesCount: comment.likes,
    }));

    res.json({ success: true, data: chatMessages });
  } catch (error: any) {
    console.error('Error fetching live chat:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages' });
  }
});

// Post a comment and broadcast via WebSocket (requires auth)
router.post('/live/:videoId/chat', optionalAuth, async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const { content } = req.body;
    const userId = (req as any).user?.userId;

    if (!content || !videoId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content cannot be empty' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, message: 'Chat message too long (max 500 chars)' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to chat' });
    }

    const comment = await prisma.comment.create({
      data: {
        videoId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const chatMessage = {
      id: comment.id,
      videoId: comment.videoId,
      userId: comment.userId,
      username: comment.user?.username || 'Anonymous',
      displayName: comment.user?.displayName || 'User',
      content: comment.content,
      avatarUrl: comment.user?.avatarUrl,
      timestamp: comment.createdAt,
    };

    // Broadcast to WebSocket clients via Socket.IO
    const io = req.app?.locals?.commentBroadcaster?.getIO?.();
    if (io) {
      io.to(`video-${videoId}`).emit('new-comment', chatMessage);
    }

    // Increment video comment count
    await prisma.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    });

    // Emit event for notifications & stats
    emitVideoCommented({
      videoId,
      commentId: comment.id,
      userId,
      content: content.trim(),
    }).catch(() => {});

    res.json({ success: true, data: chatMessage });
  } catch (error: any) {
    console.error('Error posting comment:', error);
    res.status(500).json({ success: false, message: 'Failed to post message' });
  }
});

export default router;
