import { GameState } from './constants';

export type StateChangeCallback = (newState: GameState, prevState: GameState) => void;

export class GameStateManager {
  private currentState: GameState = 'LOADING';
  private listeners: Set<StateChangeCallback> = new Set();

  constructor(initialState: GameState = 'LOADING') {
    this.currentState = initialState;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public setState(newState: GameState): boolean {
    if (this.currentState === newState) return false;

    // Validate state transitions
    const valid = this.canTransition(this.currentState, newState);
    if (!valid) {
      console.warn(`[GameStateManager] Invalid transition from ${this.currentState} to ${newState}`);
      return false;
    }

    const prevState = this.currentState;
    this.currentState = newState;

    this.listeners.forEach((callback) => {
      try {
        callback(newState, prevState);
      } catch (err) {
        console.error('[GameStateManager] Listener error:', err);
      }
    });

    return true;
  }

  private canTransition(from: GameState, to: GameState): boolean {
    switch (from) {
      case 'LOADING':
        return to === 'READY';
      case 'READY':
        return to === 'PLAYING';
      case 'PLAYING':
        return to === 'PAUSED' || to === 'GAME_OVER' || to === 'READY';
      case 'PAUSED':
        return to === 'PLAYING' || to === 'READY';
      case 'GAME_OVER':
        return to === 'READY' || to === 'PLAYING';
      default:
        return true;
    }
  }

  public subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public isPlaying(): boolean {
    return this.currentState === 'PLAYING';
  }

  public isPaused(): boolean {
    return this.currentState === 'PAUSED';
  }
}
