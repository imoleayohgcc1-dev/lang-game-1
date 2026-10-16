/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseService } from './supabaseClient';
import { AuthenticationManager } from './authManager';
import { ChatConversation, ChatMessage, UserBlock, UserReport } from './types';
import { SupabaseErrorHandler } from './supabaseErrorHandler';

/**
 * Architectural Foundation for Future Prince & Princess Real-Time Chat (Phase 16 - Section 13).
 * Provides secure data access methods grounded in strict Row Level Security (RLS).
 */
export class RealtimeChatManager {
  private static instance: RealtimeChatManager | null = null;

  public static getInstance(): RealtimeChatManager {
    if (!RealtimeChatManager.instance) {
      RealtimeChatManager.instance = new RealtimeChatManager();
    }
    return RealtimeChatManager.instance;
  }

  /**
   * Fetch conversations the authenticated user is a member of.
   * RLS guarantees only memberships belonging to auth.uid() are returned.
   */
  public async getMyConversations(): Promise<ChatConversation[]> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('chat_conversations')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[RealtimeChatManager] Error fetching conversations:', error.message);
        return [];
      }

      return (data || []) as ChatConversation[];
    } catch (err) {
      console.warn('[RealtimeChatManager] Network error fetching conversations:', err);
      return [];
    }
  }

  /**
   * Fetch messages for a specific conversation.
   * RLS enforces that only confirmed conversation members can read messages.
   */
  public async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const client = SupabaseService.getInstance().getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.warn('[RealtimeChatManager] Error reading messages:', error.message);
        return [];
      }

      return (data || []) as ChatMessage[];
    } catch (err) {
      console.warn('[RealtimeChatManager] Network error reading messages:', err);
      return [];
    }
  }

  /**
   * Send a message to an authorized conversation.
   */
  public async sendMessage(
    conversationId: string,
    messageText: string
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    const authState = AuthenticationManager.getInstance().getState();
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Must be authenticated to send messages.' };
    }

    const trimmed = messageText.trim();
    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    if (trimmed.length > 500) {
      return { success: false, error: 'Message exceeds maximum length of 500 characters.' };
    }

    const client = SupabaseService.getInstance().getClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not connected.' };
    }

    try {
      const { data, error } = await client
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: authState.user.id,
          message: trimmed,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: SupabaseErrorHandler.formatError(error, 'Send message') };
      }

      return { success: true, message: data as ChatMessage };
    } catch (err) {
      return { success: false, error: SupabaseErrorHandler.formatError(err, 'Send message') };
    }
  }

  /**
   * Block a user.
   */
  public async blockUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
    const authState = AuthenticationManager.getInstance().getState();
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const client = SupabaseService.getInstance().getClient();
    if (!client) return { success: false, error: 'Database not connected.' };

    try {
      const { error } = await client.from('user_blocks').insert({
        blocker_id: authState.user.id,
        blocked_id: targetUserId,
      });

      if (error) {
        return { success: false, error: SupabaseErrorHandler.formatError(error, 'Block user') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: SupabaseErrorHandler.formatError(err, 'Block user') };
    }
  }

  /**
   * Report an abusive user.
   */
  public async reportUser(
    reportedUserId: string,
    reason: string,
    details?: string
  ): Promise<{ success: boolean; error?: string }> {
    const authState = AuthenticationManager.getInstance().getState();
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const client = SupabaseService.getInstance().getClient();
    if (!client) return { success: false, error: 'Database not connected.' };

    try {
      const { error } = await client.from('user_reports').insert({
        reporter_id: authState.user.id,
        reported_id: reportedUserId,
        reason,
        details,
      });

      if (error) {
        return { success: false, error: SupabaseErrorHandler.formatError(error, 'Report user') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: SupabaseErrorHandler.formatError(err, 'Report user') };
    }
  }
}
