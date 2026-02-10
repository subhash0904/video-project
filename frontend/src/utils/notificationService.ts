/**
 * Notification Service (client)
 *
 * Uses REST API + WebSocket for real-time push.
 */

import { apiClient } from '../lib/api';
import { realtimeService } from './realtimeService';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  thumbnailUrl?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: AppNotification[];
  meta?: { total: number; page: number; limit: number; hasNextPage: boolean };
}

interface UnreadResponse {
  success: boolean;
  data: { count: number };
}

class NotificationClient {
  private listeners: Set<(n: AppNotification) => void> = new Set();

  /** Fetch notification list. */
  async getAll(page = 1, limit = 20): Promise<{ notifications: AppNotification[]; total: number }> {
    try {
      const res = (await apiClient.get(`/notifications?page=${page}&limit=${limit}`)) as NotificationsResponse;
      return { notifications: res.data, total: res.meta?.total ?? res.data.length };
    } catch {
      return { notifications: [], total: 0 };
    }
  }

  /** Get unread count. */
  async getUnreadCount(): Promise<number> {
    try {
      const res = (await apiClient.get('/notifications/unread')) as UnreadResponse;
      return res.data.count;
    } catch {
      return 0;
    }
  }

  /** Mark single as read. */
  async markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`);
  }

  /** Mark all as read. */
  async markAllRead() {
    await apiClient.patch('/notifications/read-all');
  }

  /** Delete a notification. */
  async remove(id: string) {
    await apiClient.delete(`/notifications/${id}`);
  }

  /** Subscribe to real-time pushes. */
  onNewNotification(cb: (n: AppNotification) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Call from app init to listen for WS notifications. */
  startListening() {
    realtimeService.on('notification', (data: AppNotification) => {
      for (const cb of this.listeners) {
        cb(data);
      }
    });
  }
}

export const notificationClient = new NotificationClient();
