import { Router } from 'express';
import * as channelController from './channel.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { prisma } from '../../config/db.js';
import { emitUserSubscribed } from '../events/event.producer.js';

const router = Router();

// Public routes
router.get('/:identifier', optionalAuth, channelController.getChannel);
router.get('/:id/videos', optionalAuth, channelController.getChannelVideos);

// Protected routes
router.patch(
  '/:id',
  authenticate,
  channelController.updateChannelValidation,
  channelController.updateChannel
);
router.get('/:id/analytics', authenticate, channelController.getChannelAnalytics);

// Subscription routes
router.post('/:id/subscribe', authenticate, async (req, res) => {
  try {
    const channelId = req.params.id as string;
    const userId = (req as any).user?.userId as string;
    const { notificationsOn = true } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user owns the channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.userId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot subscribe to your own channel' });
    }

    // Create subscription
    await prisma.subscription.create({
      data: {
        userId,
        channelId,
        notificationsOn,
      },
    });

    // subscriberCount updated by async worker via event (Rule 6)
    // DO NOT increment channel.subscriberCount directly

    // Emit event for notifications
    emitUserSubscribed({
      userId,
      channelId,
      action: 'subscribed',
    }).catch(() => {});

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Already subscribed' });
    }
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

router.delete('/:id/subscribe', authenticate, async (req, res) => {
  try {
    const channelId = req.params.id as string;
    const userId = (req as any).user?.userId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.subscription.delete({
      where: { userId_channelId: { userId, channelId } },
    });

    // subscriberCount updated by async worker via event (Rule 6)
    // DO NOT decrement channel.subscriberCount directly

    // Emit event
    emitUserSubscribed({
      userId,
      channelId,
      action: 'unsubscribed',
    }).catch(() => {});

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
});

router.get('/:id/subscription', authenticate, async (req, res) => {
  try {
    const channelId = req.params.id as string;
    const userId = (req as any).user?.userId as string;

    const subscription = await prisma.subscription.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });

    res.json({
      success: true,
      data: {
        isSubscribed: !!subscription,
        notificationsOn: subscription?.notificationsOn || false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to check subscription' });
  }
});

router.patch('/:id/notifications', authenticate, async (req, res) => {
  try {
    const channelId = req.params.id as string;
    const userId = (req as any).user?.userId as string;
    const { notificationsOn } = req.body;

    await prisma.subscription.update({
      where: { userId_channelId: { userId, channelId } },
      data: { notificationsOn },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

export default router;
