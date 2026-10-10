/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdPlacement =
  | 'PRE_LEVEL'
  | 'POST_LEVEL'
  | 'GAME_OVER'
  | 'RETRY'
  | 'BONUS_REWARD'
  | 'LEVEL_START_REWARD'
  | 'REWARDED_RETRY'
  | 'DOUBLE_COINS';

export interface RewardedAdResult {
  success: boolean;
  placement: AdPlacement;
  attemptId: string;
  earnedReward: boolean;
  errorMessage?: string;
}

export interface AdConfig {
  enabled: boolean;
  testMode: boolean;
  adDurationSeconds: number;
  placements: Record<AdPlacement, {
    enabled: boolean;
    rewardType: string;
    maxUsesPerRun?: number;
  }>;
}

export const AD_CONFIG: AdConfig = {
  enabled: true,
  testMode: true,
  adDurationSeconds: 5, // 5s interactive simulated rewarded ad
  placements: {
    LEVEL_START_REWARD: {
      enabled: true,
      rewardType: 'START_LEVEL',
    },
    REWARDED_RETRY: {
      enabled: true,
      rewardType: 'REVIVE_RUN',
      maxUsesPerRun: 1,
    },
    PRE_LEVEL: {
      enabled: true,
      rewardType: 'BOOST',
    },
    POST_LEVEL: {
      enabled: true,
      rewardType: 'EXTRA_COINS',
    },
    GAME_OVER: {
      enabled: true,
      rewardType: 'DOUBLE_COINS',
    },
    RETRY: {
      enabled: true,
      rewardType: 'SHIELD_START',
    },
    BONUS_REWARD: {
      enabled: true,
      rewardType: 'BONUS_AMMO',
    },
    DOUBLE_COINS: {
      enabled: true,
      rewardType: 'DOUBLE_COINS',
    },
  },
};
