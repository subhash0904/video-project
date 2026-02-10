// Gesture recognition utilities for touch and mouse interactions

export interface GestureEvent {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch';
  x: number;
  y: number;
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  timestamp: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_DELAY = 500;
const SWIPE_THRESHOLD = 50;

export class GestureRecognizer {
  private touchState: TouchState | null = null;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private longPressTimeout: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<
    string,
    (event: GestureEvent) => void
  > = new Map();
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupListeners();
  }

  private setupListeners() {
    // Touch events
    this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.element.addEventListener('touchcancel', () => this.reset());

    // Mouse events (for desktop)
    this.element.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.element.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.element.addEventListener('mouseup', () => this.handleMouseUp());
    this.element.addEventListener('mouseleave', () => this.reset());

    // Pinch events
    this.element.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchState = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
      };

      // Start long-press timer
      this.longPressTimeout = setTimeout(() => {
        if (this.touchState) {
          this.emit('long-press', {
            x: this.touchState.startX,
            y: this.touchState.startY,
          });
        }
      }, LONG_PRESS_DELAY);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && this.touchState) {
      const touch = e.touches[0];
      this.touchState.currentX = touch.clientX;
      this.touchState.currentY = touch.clientY;

      // Cancel long-press if moved too much
      const dx = Math.abs(touch.clientX - this.touchState.startX);
      const dy = Math.abs(touch.clientY - this.touchState.startY);
      if (dx > 10 || dy > 10) {
        if (this.longPressTimeout) {
          clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (this.touchState && e.touches.length === 0) {
      if (this.longPressTimeout) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }

      const dx = this.touchState.currentX - this.touchState.startX;
      const dy = this.touchState.currentY - this.touchState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - this.touchState.startTime;

      // Detect tap
      if (distance < 10 && duration < 500) {
        this.handleTap(this.touchState.startX, this.touchState.startY);
      }
      // Detect swipe
      else if (distance > SWIPE_THRESHOLD && duration < 1000) {
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this.emit('swipe', {
          x: this.touchState.startX,
          y: this.touchState.startY,
          deltaX: dx,
          deltaY: dy,
          direction,
        });
      }
    }

    this.reset();
  }

  private handleMouseDown(e: MouseEvent) {
    this.touchState = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      currentX: e.clientX,
      currentY: e.clientY,
    };

    // Start long-press timer
    this.longPressTimeout = setTimeout(() => {
      if (this.touchState) {
        this.emit('long-press', {
          x: this.touchState.startX,
          y: this.touchState.startY,
        });
      }
    }, LONG_PRESS_DELAY);
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.touchState) {
      this.touchState.currentX = e.clientX;
      this.touchState.currentY = e.clientY;

      // Cancel long-press if moved too much
      const dx = Math.abs(e.clientX - this.touchState.startX);
      const dy = Math.abs(e.clientY - this.touchState.startY);
      if (dx > 10 || dy > 10) {
        if (this.longPressTimeout) {
          clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }
      }
    }
  }

  private handleMouseUp() {
    if (this.touchState) {
      if (this.longPressTimeout) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }

      const dx = this.touchState.currentX - this.touchState.startX;
      const dy = this.touchState.currentY - this.touchState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - this.touchState.startTime;

      // Detect tap
      if (distance < 10 && duration < 500) {
        this.handleTap(this.touchState.startX, this.touchState.startY);
      }
      // Detect swipe
      else if (distance > SWIPE_THRESHOLD && duration < 1000) {
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this.emit('swipe', {
          x: this.touchState.startX,
          y: this.touchState.startY,
          deltaX: dx,
          deltaY: dy,
          direction,
        });
      }
    }

    this.reset();
  }

  private handleTap(x: number, y: number) {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;
    const distanceFromLastTap = Math.sqrt(Math.pow(x - this.lastTapX, 2) + Math.pow(y - this.lastTapY, 2));

    // Double-tap detection
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && distanceFromLastTap < 50) {
      this.emit('double-tap', { x, y });
      this.lastTapTime = 0; // Reset to prevent triple tap
    } else {
      this.emit('tap', { x, y });
      this.lastTapTime = now;
      this.lastTapX = x;
      this.lastTapY = y;
    }
  }

  private handleWheel(e: WheelEvent) {
    // Pinch zoom simulation with wheel event
    if (e.ctrlKey) {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      this.emit('pinch', {
        x: e.clientX,
        y: e.clientY,
        scale,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, callback: (data: any) => void) {
    this.callbacks.set(event, callback);
  }

  public off(event: string) {
    this.callbacks.delete(event);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data: any) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback({ type: event, ...data, timestamp: Date.now() });
    }
  }

  private reset() {
    this.touchState = null;
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  public destroy() {
    this.reset();
    this.callbacks.clear();
  }
}
