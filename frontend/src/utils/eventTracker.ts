/**
 * Event Telemetry Tracker
 *
 * YouTube-architecture: every click, pause, seek, scroll emits events.
 * Clients are thin — this batches and sends to /api/events/track.
 */

import { getApiBaseUrl } from './urlHelpers';

const API_BASE_URL = getApiBaseUrl();
const BATCH_INTERVAL = 5000; // flush every 5s
const MAX_BATCH = 50;

interface TelemetryEvent {
  eventType: string;
  videoId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class EventTracker {
  private queue: TelemetryEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('accessToken');
    this.start();
  }

  /** Start the flush timer. */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), BATCH_INTERVAL);
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  /** Push an event into the batch queue. */
  track(eventType: string, videoId?: string, metadata?: Record<string, unknown>) {
    this.queue.push({
      eventType,
      videoId,
      metadata,
      timestamp: new Date().toISOString(),
    });
    if (this.queue.length >= MAX_BATCH) {
      this.flush();
    }
  }

  /** Flush pending events to the backend. */
  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, MAX_BATCH);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      this.token = localStorage.getItem('accessToken');
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      // Use sendBeacon for reliable delivery on page unload
      if (navigator.sendBeacon && document.visibilityState === 'hidden') {
        const blob = new Blob(
          [JSON.stringify({ events: batch })],
          { type: 'application/json' },
        );
        navigator.sendBeacon(`${API_BASE_URL}/events/track`, blob);
        return;
      }

      await fetch(`${API_BASE_URL}/events/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
    } catch {
      // Re-queue on failure (but don't exceed max)
      this.queue.unshift(...batch.slice(0, MAX_BATCH - this.queue.length));
    }
  }

  // ---------- convenience methods ----------

  trackVideoView(videoId: string, watchDuration: number, completed: boolean) {
    this.track('VIDEO_VIEW', videoId, { watchDuration, completed });
  }

  trackVideoLike(videoId: string) {
    this.track('VIDEO_LIKE', videoId);
  }

  trackVideoShare(videoId: string, platform?: string) {
    this.track('VIDEO_SHARE', videoId, { platform });
  }

  trackSearch(query: string, resultsCount: number) {
    this.track('SEARCH', undefined, { query, resultsCount });
  }

  trackQualityChange(videoId: string, fromQuality: string, toQuality: string) {
    this.track('VIDEO_QUALITY_CHANGE', videoId, { fromQuality, toQuality });
  }

  trackPlaybackError(videoId: string, error: string) {
    this.track('PLAYBACK_ERROR', videoId, { error });
  }

  trackChannelView(channelId: string) {
    this.track('CHANNEL_VIEW', undefined, { channelId });
  }
}

export const eventTracker = new EventTracker();
