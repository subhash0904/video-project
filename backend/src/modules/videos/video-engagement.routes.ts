import { Router } from 'express';
import { prisma } from '../../config/db.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { emitVideoViewed, emitVideoCommented } from '../events/event.producer.js';

const router = Router();

// Get comments for a video
router.get('/:videoId/comments', async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const { sort = 'top' } = req.query;

    const comments = await prisma.comment.findMany({
      where: {
        videoId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: sort === 'new' ? { createdAt: 'desc' } : { likes: 'desc' },
    });

    res.json({ success: true, data: comments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Post a comment
router.post('/:videoId/comments', authenticate, async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const { content, parentId } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ success: false, message: 'Comment too long (max 10000 chars)' });
    }

    const comment = await prisma.comment.create({
      data: {
        videoId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Increment video comment count
    await prisma.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    });

    // Emit event for notification & stats
    emitVideoCommented({
      videoId,
      commentId: comment.id,
      userId,
      content: content.trim(),
      parentId: parentId || undefined,
    }).catch(() => {});

    // Broadcast via WebSocket if available
    const io = req.app?.locals?.commentBroadcaster?.getIO?.();
    if (io) {
      io.to(`video-${videoId}`).emit('new-comment', {
        id: comment.id,
        videoId,
        userId,
        displayName: comment.user?.displayName || 'User',
        content: comment.content,
        avatarUrl: comment.user?.avatarUrl,
        timestamp: comment.createdAt,
      });
    }

    res.json({ success: true, data: comment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Like a comment
router.post('/:videoId/comments/:commentId/like', authenticate, async (req, res) => {
  try {
    const commentId = req.params.commentId as string;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { likes: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a comment
router.delete('/:videoId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const commentId = req.params.commentId as string;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Count replies BEFORE deleting (fix race condition)
    const replyCount = await prisma.comment.count({
      where: { parentId: commentId },
    });

    // Delete comment and its replies
    await prisma.comment.deleteMany({
      where: { OR: [{ id: commentId }, { parentId: commentId }] },
    });

    // Decrement video comment count
    await prisma.video.update({
      where: { id: comment.videoId },
      data: { commentCount: { decrement: 1 + replyCount } },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record video view (public - optional auth)
router.post('/:videoId/view', optionalAuth, async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const userId = (req as any).user?.userId;

    await prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    });

    // Record analytics event
    if (userId) {
      await prisma.analyticsEvent.create({
        data: {
          userId,
          videoId,
          eventType: 'VIDEO_VIEW',
          device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        },
      }).catch(() => {});
    }

    // Emit view event for stats & trending
    emitVideoViewed({
      videoId,
      userId,
      watchDuration: 0,
      completed: false,
      device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
    }).catch(() => {});

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record watch history
router.post('/:videoId/watch', authenticate, async (req, res) => {
  try {
    const videoId = req.params.videoId as string;
    const { watchDuration } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { duration: true },
    });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const completed = watchDuration >= video.duration * 0.9;

    await prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: {
        userId,
        videoId,
        watchDuration,
        completed,
        lastPosition: watchDuration,
      },
      update: {
        watchDuration,
        completed,
        lastPosition: watchDuration,
        watchedAt: new Date(),
      },
    });

    // Emit view event with actual watch duration for stats
    emitVideoViewed({
      videoId,
      userId,
      watchDuration: watchDuration || 0,
      completed,
    }).catch(() => {});

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
