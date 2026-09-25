export type MessageType = 'gameplay' | 'target' | 'objective' | 'language' | 'warning' | 'success';

export interface TemporaryMessageState {
  id: string;
  text: string;
  subtext?: string;
  type: MessageType;
  priority: number;
  duration: number; // in milliseconds
  timestamp: number;
}

export class TemporaryMessageManager {
  private currentMessage: TemporaryMessageState | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  public onMessageChanged?: (message: TemporaryMessageState | null) => void;

  constructor() {
    // Initialized empty
  }

  /**
   * Display a temporary message in the top SAFE_HUD_AREA
   * @param text Primary message text
   * @param duration Duration in milliseconds (default 3000ms)
   * @param type Message category
   * @param priority Higher priority overrides lower priority
   * @param subtext Optional secondary detail (e.g. language translation)
   */
  public showMessage(
    text: string,
    duration: number = 3000,
    type: MessageType = 'gameplay',
    priority: number = 1,
    subtext?: string
  ): void {
    const now = Date.now();

    // Check priority: if active message has higher priority and hasn't expired, reject or queue
    if (this.currentMessage && this.currentMessage.priority > priority) {
      return;
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const message: TemporaryMessageState = {
      id: `${now}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      subtext,
      type,
      priority,
      duration,
      timestamp: now,
    };

    this.currentMessage = message;
    if (this.onMessageChanged) {
      this.onMessageChanged(this.currentMessage);
    }

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.hideMessage();
      }, duration);
    }
  }

  /**
   * Dismiss the active message immediately
   */
  public hideMessage(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentMessage = null;
    if (this.onMessageChanged) {
      this.onMessageChanged(null);
    }
  }

  /**
   * Set message priority of current message if present
   */
  public setMessagePriority(priority: number): void {
    if (this.currentMessage) {
      this.currentMessage.priority = priority;
    }
  }

  /**
   * Set message type of current message if present
   */
  public setMessageType(type: MessageType): void {
    if (this.currentMessage) {
      this.currentMessage.type = type;
      if (this.onMessageChanged) {
        this.onMessageChanged(this.currentMessage);
      }
    }
  }

  public getCurrentMessage(): TemporaryMessageState | null {
    return this.currentMessage;
  }

  public reset(): void {
    this.hideMessage();
  }

  public dispose(): void {
    this.hideMessage();
    this.onMessageChanged = undefined;
  }
}
