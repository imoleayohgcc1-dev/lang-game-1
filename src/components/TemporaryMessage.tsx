import React from 'react';
import { TemporaryMessageState } from '../game/TemporaryMessageManager';

interface TemporaryMessageProps {
  message: TemporaryMessageState | null;
}

export const TemporaryMessage: React.FC<TemporaryMessageProps> = () => {
  // Never write any blocking information on the screen during gameplay
  return null;
};
