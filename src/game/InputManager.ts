export class InputManager {
  private element: HTMLElement;
  
  // Touch tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private minSwipeDistance: number = 28; // px
  private maxSwipeTime: number = 550; // ms

  // Mobile double-tap screen shooting
  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;
  private doubleTapMaxInterval: number = 350; // ms
  private doubleTapMaxDistance: number = 75; // px

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
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
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

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.isEnabled || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = performance.now();
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isEnabled || e.changedTouches.length === 0) return;
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
      } else {
        // Tap detected (not a swipe). Check for mobile double-tap to shoot!
        const now = performance.now();
        const timeSinceLastTap = now - this.lastTapTime;
        const distFromLastTap = Math.hypot(touch.clientX - this.lastTapX, touch.clientY - this.lastTapY);

        if (timeSinceLastTap > 40 && timeSinceLastTap <= this.doubleTapMaxInterval && distFromLastTap <= this.doubleTapMaxDistance) {
          // Double-tap confirmed! Shoot weapon
          this.lastTapTime = 0; // Reset so 3rd tap isn't immediately counted
          const screenWidth = window.innerWidth || 360;
          if (touch.clientX < screenWidth * 0.42) {
            this.onShoot?.('LEFT');
          } else if (touch.clientX > screenWidth * 0.58) {
            this.onShoot?.('RIGHT');
          } else {
            this.onShoot?.('AUTO');
          }
        } else {
          this.lastTapTime = now;
          this.lastTapX = touch.clientX;
          this.lastTapY = touch.clientY;
        }
      }
    }
  };

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }
}
