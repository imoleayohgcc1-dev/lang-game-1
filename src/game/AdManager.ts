/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AD_CONFIG, AdPlacement, RewardedAdResult } from './adConfig';

export type AdStateListener = (activeAd: {
  placement: AdPlacement;
  attemptId: string;
  durationSeconds: number;
} | null) => void;

export class AdManager {
  private static instance: AdManager | null = null;
  private isAdShowing: boolean = false;
  private currentAttemptId: string | null = null;
  private activePlacement: AdPlacement | null = null;
  private pendingResolve: ((result: RewardedAdResult) => void) | null = null;
  private stateListeners: Set<AdStateListener> = new Set();

  // Retry usage tracking per run ID
  private retryUsesByRun: Map<string, number> = new Map();

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  public subscribeState(listener: AdStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyState(active: { placement: AdPlacement; attemptId: string; durationSeconds: number } | null): void {
    this.stateListeners.forEach((l) => l(active));
  }

  public isPlacementEnabled(placement: AdPlacement): boolean {
    if (!AD_CONFIG.enabled) return false;
    const cfg = AD_CONFIG.placements[placement];
    return !!cfg?.enabled;
  }

  public canUseRewardedRetry(runId: string): boolean {
    if (!this.isPlacementEnabled('REWARDED_RETRY')) return false;
    const maxUses = AD_CONFIG.placements.REWARDED_RETRY.maxUsesPerRun ?? 1;
    const used = this.retryUsesByRun.get(runId) || 0;
    return used < maxUses;
  }

  public getRemainingRewardedRetries(runId: string): number {
    const maxUses = AD_CONFIG.placements.REWARDED_RETRY.maxUsesPerRun ?? 1;
    const used = this.retryUsesByRun.get(runId) || 0;
    return Math.max(0, maxUses - used);
  }

  public recordRewardedRetryUsed(runId: string): void {
    const current = this.retryUsesByRun.get(runId) || 0;
    this.retryUsesByRun.set(runId, current + 1);
  }

  public isReady(): boolean {
    return AD_CONFIG.enabled && !this.isAdShowing;
  }

  /**
   * Request and present a rewarded ad for the specified placement
   */
  public async showRewardedAd(placement: AdPlacement): Promise<RewardedAdResult> {
    if (!this.isPlacementEnabled(placement)) {
      return {
        success: false,
        placement,
        attemptId: '',
        earnedReward: false,
        errorMessage: `Rewarded ads for placement ${placement} are currently disabled.`,
      };
    }

    if (this.isAdShowing) {
      return {
        success: false,
        placement,
        attemptId: '',
        earnedReward: false,
        errorMessage: 'An ad is already being processed.',
      };
    }

    this.isAdShowing = true;
    this.activePlacement = placement;
    const attemptId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentAttemptId = attemptId;

    return new Promise<RewardedAdResult>((resolve) => {
      this.pendingResolve = resolve;

      // Broadcast to UI to display interactive ad container
      this.notifyState({
        placement,
        attemptId,
        durationSeconds: AD_CONFIG.adDurationSeconds,
      });
    });
  }

  /**
   * Authoritative callback triggered when user completes the rewarded ad
   */
  public confirmAdCompletion(attemptId: string): boolean {
    if (!this.isAdShowing || this.currentAttemptId !== attemptId || !this.pendingResolve || !this.activePlacement) {
      return false;
    }

    const placement = this.activePlacement;
    const resolve = this.pendingResolve;

    this.isAdShowing = false;
    this.currentAttemptId = null;
    this.activePlacement = null;
    this.pendingResolve = null;

    this.notifyState(null);

    resolve({
      success: true,
      placement,
      attemptId,
      earnedReward: true,
    });

    return true;
  }

  /**
   * Authoritative callback triggered if user closes ad early or ad fails
   */
  public cancelOrCloseAd(attemptId: string, reason: string = 'User dismissed ad early.'): void {
    if (!this.isAdShowing || this.currentAttemptId !== attemptId || !this.pendingResolve || !this.activePlacement) {
      return;
    }

    const placement = this.activePlacement;
    const resolve = this.pendingResolve;

    this.isAdShowing = false;
    this.currentAttemptId = null;
    this.activePlacement = null;
    this.pendingResolve = null;

    this.notifyState(null);

    resolve({
      success: false,
      placement,
      attemptId,
      earnedReward: false,
      errorMessage: reason,
    });
  }
}
