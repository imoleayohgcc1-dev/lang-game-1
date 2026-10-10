export class InputManager {
  private element: HTMLElement;
  
  // Touch tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private minSwipeDistance: number = 32; // px
  private maxSwipeTime: number = 550; // ms

  // Mobile double-tap screen shooting
  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;
  private doubleTapMaxInterval: number = 480; // ms (relaxed for fluid phone tapping)
  private doubleTapMaxDistance: number = 110; // px (generous touch drift margin)
  private isDoubleTapHandled: boolean = false;

  // Callbacks
  public onMoveLeft?: () => void;
  public onMoveRight?: () => void;
  public onJump?: () => void;
  public onSlide?: () => void;
  public onShoot?: (side?: 'LEFT' | 'RIGHT' | 'AUTO') => void;
  public onBomb?: () => void;
  public onReload?: () => void;
  public onTogglePause?: () => void;

  private isEnabled: boolean = true;

  constructor(element: HTMLElement) {
    this.element = element;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    // Bind to window so touches anywhere on mobile phone screen are captured
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('dblclick', this.handleDoubleClick);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.onMoveLeft?.();
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.onMoveRight?.();
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.onJump?.();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.onSlide?.();
        break;
      case 'KeyQ':
      case 'KeyZ':
        e.preventDefault();
        this.onShoot?.('LEFT');
        break;
      case 'KeyE':
      case 'KeyX':
        e.preventDefault();
        this.onShoot?.('RIGHT');
        break;
      case 'KeyF':
        e.preventDefault();
        this.onShoot?.('AUTO');
        break;
      case 'KeyB':
      case 'KeyG':
        e.preventDefault();
        this.onBomb?.();
        break;
      case 'KeyR':
        e.preventDefault();
        this.onReload?.();
        break;
      case 'Escape':
      case 'KeyP':
        e.preventDefault();
        this.onTogglePause?.();
        break;
    }
  };

  private handleDoubleClick = (e: MouseEvent): void => {
    if (!this.isEnabled) return;
    if ((e.target as HTMLElement)?.closest('button, [role="button"], input, a')) return;
    const screenWidth = window.innerWidth || 360;
    if (e.clientX < screenWidth * 0.4) {
      this.onShoot?.('LEFT');
    } else if (e.clientX > screenWidth * 0.6) {
      this.onShoot?.('RIGHT');
    } else {
      this.onShoot?.('AUTO');
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.isEnabled || e.touches.length === 0) return;
    // Don't intercept touches on buttons
    if ((e.target as HTMLElement)?.closest('button, [role="button"], input, a')) return;

    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = performance.now();

    const now = performance.now();
    const timeSinceLastTap = now - this.lastTapTime;
    const distFromLastTap = Math.hypot(touch.clientX - this.lastTapX, touch.clientY - this.lastTapY);

    if (
      timeSinceLastTap > 30 &&
      timeSinceLastTap <= this.doubleTapMaxInterval &&
      distFromLastTap <= this.doubleTapMaxDistance
    ) {
      // Rapid double-tap detected on touchstart! Fire weapon immediately for responsive feel
      this.isDoubleTapHandled = true;
      this.lastTapTime = 0;
      this.lastTapX = 0;
      this.lastTapY = 0;

      const screenWidth = window.innerWidth || 360;
      if (touch.clientX < screenWidth * 0.4) {
        this.onShoot?.('LEFT');
      } else if (touch.clientX > screenWidth * 0.6) {
        this.onShoot?.('RIGHT');
      } else {
        this.onShoot?.('AUTO');
      }
    } else {
      this.isDoubleTapHandled = false;
      this.lastTapTime = now;
      this.lastTapX = touch.clientX;
      this.lastTapY = touch.clientY;
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isEnabled || e.changedTouches.length === 0) return;
    if ((e.target as HTMLElement)?.closest('button, [role="button"], input, a')) return;

    if (this.isDoubleTapHandled) {
      // Suppress swipe detection if this was a double-tap
      this.isDoubleTapHandled = false;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const deltaTime = performance.now() - this.touchStartTime;

    if (deltaTime <= this.maxSwipeTime) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX >= this.minSwipeDistance || absY >= this.minSwipeDistance) {
        if (absX > absY) {
          if (deltaX > 0) {
            this.onMoveRight?.();
          } else {
            this.onMoveLeft?.();
          }
        } else {
          if (deltaY < 0) {
            this.onJump?.();
          } else {
            this.onSlide?.();
          }
        }
      }
    }
  };

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('dblclick', this.handleDoubleClick);
  }
}
