export class InputManager {
  private element: HTMLElement;
  
  // Touch tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private minSwipeDistance: number = 28; // px
  private maxSwipeTime: number = 550; // ms

  // Callbacks
  public onMoveLeft?: () => void;
  public onMoveRight?: () => void;
  public onJump?: () => void;
  public onSlide?: () => void;
  public onShoot?: () => void;
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
      case 'KeyF':
        e.preventDefault();
        this.onShoot?.();
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

      // Horizontal gesture is dominant
      if (absX > this.minSwipeDistance && absX > absY * 1.15) {
        if (deltaX < 0) {
          this.onMoveLeft?.();
        } else {
          this.onMoveRight?.();
        }
      } 
      // Vertical gesture is dominant
      else if (absY > this.minSwipeDistance && absY > absX * 1.15) {
        if (deltaY < 0) {
          // Swiped Up -> Jump
          this.onJump?.();
        } else {
          // Swiped Down -> Slide
          this.onSlide?.();
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
