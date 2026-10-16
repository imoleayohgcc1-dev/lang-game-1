/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class SupabaseErrorHandler {
  public static formatError(error: unknown, context: string = 'Operation'): string {
    if (!error) return `${context} failed due to an unknown issue.`;

    if (typeof error === 'string') return error;

    const err = error as { message?: string; code?: string; details?: string; hint?: string };

    if (err.message) {
      if (err.message.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please verify your credentials.';
      }
      if (err.message.includes('User already registered')) {
        return 'An account with this email already exists. Try signing in instead.';
      }
      if (err.message.includes('Password should be at least')) {
        return 'Password must be at least 6 characters long.';
      }
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return 'Network connection failed. Offline fallback active.';
      }
      if (err.message.includes('JWT')) {
        return 'Session expired. Please sign in again.';
      }
      if (err.message.includes('permission denied') || err.message.includes('row-level security')) {
        return 'Database permission denied by Row Level Security (RLS).';
      }
      return err.message;
    }

    return `${context} failed. Please check network connectivity and Supabase configuration.`;
  }
}
