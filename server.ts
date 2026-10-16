import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI on the server side
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Health check endpoint
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

/**
 * Public Supabase Client Config Endpoint (Phase 16).
 * Exposes ONLY the public Supabase URL and public publishable/anon key.
 * Strictly NEVER exposes service_role key.
 */
app.get('/api/supabase/config', (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  res.json({
    configured: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
  });
});

// ==============================================================================
// PHASE 4: CHAT INVITATIONS, NOTIFICATIONS & LEVEL-GATED ACCESS (SERVER API)
// ==============================================================================
const serverSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serverSupabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const adminSupabase = (serverSupabaseUrl && serverSupabaseKey)
  ? createClient(serverSupabaseUrl, serverSupabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

import { RealPlayerStore } from './server/playerStore';

// In-memory rate limiting map: key (ip/userId) -> timestamps
const invitationRateLimitMap = new Map<string, number[]>();
function checkInvitationRateLimit(key: string, maxRequests = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const history = (invitationRateLimitMap.get(key) || []).filter((ts) => now - ts < windowMs);
  if (history.length >= maxRequests) {
    return false;
  }
  history.push(now);
  invitationRateLimitMap.set(key, history);
  return true;
}

// Helper to authenticate user from Bearer header or x-user-id
async function verifyAuthUser(req: express.Request): Promise<{ id: string; email?: string } | null> {
  const customUserId = (req.headers['x-user-id'] as string) || (req.body && req.body.userId) || (req.query && req.query.userId as string);
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      if (adminSupabase) {
        try {
          const { data: { user }, error } = await adminSupabase.auth.getUser(token);
          if (!error && user) {
            return { id: user.id, email: user.email };
          }
        } catch {
          // Fall through to custom user ID
        }
      }
      // If token itself is a userId or guest identifier
      if (token.length > 5 && !token.includes('.')) {
        return { id: token };
      }
    }
  }

  if (customUserId && typeof customUserId === 'string' && customUserId.trim().length > 0) {
    return { id: customUserId.trim() };
  }

  return null;
}
/**
 * GET /api/discovery/players
 * Retrieves real registered player profiles with strict feed prioritization:
 * 1. People online now
 * 2. People active within 5 minutes
 * 3. People active within 10 minutes
 * 4. People active within 30 minutes
 * 5. Other eligible people active longer ago
 */
app.get('/api/discovery/players', async (req, res) => {
  try {
    const {
      userId,
      seeking = 'ALL',
      minAge = '18',
      maxAge = '120',
      scope = 'GLOBAL',
      myCountry,
      religion = 'ANY',
      myReligion,
      searchQuery = '',
      onlyOnline = 'false',
    } = req.query as Record<string, string>;

    const store = RealPlayerStore.getInstance();
    const players = store.getEligiblePlayers({
      excludeUserId: userId,
      seeking,
      minAge: Number(minAge) || 18,
      maxAge: Number(maxAge) || 120,
      countryScope: scope,
      myCountry,
      religionPref: religion,
      myReligion,
      searchQuery,
      onlyOnline: onlyOnline === 'true',
    });

    return res.json({
      success: true,
      players,
      totalRealUsersInDb: players.length,
      error: null,
    });
  } catch (err: any) {
    console.error('[API /api/discovery/players] Error:', err);
    return res.status(500).json({
      success: false,
      players: [],
      error: 'Failed to retrieve player directory',
      totalRealUsersInDb: 0,
    });
  }
});

/**
 * POST /api/discovery/sync-profile
 * Saves or updates a real player profile in the persistent store.
 */
app.post('/api/discovery/sync-profile', async (req, res) => {
  try {
    const profile = req.body?.profile;
    if (!profile || !profile.id) {
      return res.status(400).json({ success: false, error: 'Invalid profile data' });
    }

    const store = RealPlayerStore.getInstance();
    const saved = store.upsertProfile(profile);

    // Also attempt Supabase upsert in background if available
    if (adminSupabase) {
      try {
        await adminSupabase.from('profiles').upsert(profile, { onConflict: 'id' });
      } catch {
        // Safe ignore if schema not yet in Supabase
      }
    }

    return res.json({ success: true, profile: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to sync profile' });
  }
});

/**
 * GET /api/invitations
 * Retrieves all invitations involving the user with enriched profile details.
 */
app.get('/api/invitations', async (req, res) => {
  try {
    const user = await verifyAuthUser(req);
    const userId = user?.id || (req.query.userId as string);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required', invitations: [] });
    }

    const store = RealPlayerStore.getInstance();
    const rawList = store.getInvitationsForUser(userId);

    const enriched = rawList.map((inv) => {
      const sender = store.getProfile(inv.sender_id);
      const recipient = store.getProfile(inv.recipient_id);

      return {
        ...inv,
        sender_profile: sender
          ? {
              display_name: sender.display_name,
              avatar_url: sender.avatar_url,
              age: sender.age,
              country: sender.country,
              bio: sender.bio,
              religion: sender.religion,
              highest_unlocked_level: sender.highest_unlocked_level,
            }
          : undefined,
        recipient_profile: recipient
          ? {
              display_name: recipient.display_name,
              avatar_url: recipient.avatar_url,
              age: recipient.age,
              country: recipient.country,
              bio: recipient.bio,
              religion: recipient.religion,
              highest_unlocked_level: recipient.highest_unlocked_level,
            }
          : undefined,
      };
    });

    return res.json({
      success: true,
      invitations: enriched,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message, invitations: [] });
  }
});

/**
 * POST /api/invitations/send
 * Sends a chat invitation with validation of level, age, blocks, and duplicates.
 */
app.post('/api/invitations/send', async (req, res) => {
  const user = await verifyAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized session' });
  }

  const ipKey = req.ip || user.id;
  if (!checkInvitationRateLimit(user.id, 20, 60000) || !checkInvitationRateLimit(ipKey, 30, 60000)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment.' });
  }

  const { recipientId, highestUnlockedLevel = 1, currentLevel = 1 } = req.body || {};
  if (!recipientId || typeof recipientId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid recipient ID' });
  }

  if (recipientId === user.id) {
    return res.status(400).json({ success: false, error: 'You cannot invite yourself.' });
  }

  try {
    const store = RealPlayerStore.getInstance();

    // 1. Check sender profile
    const sender = store.getProfile(user.id);
    const senderAge = sender?.age ?? (req.body?.senderAge as number);
    if (senderAge !== undefined && senderAge !== null && senderAge < 18) {
      return res.status(403).json({ success: false, error: 'Romantic discovery is reserved for adults (18+).' });
    }

    const senderLevel = Math.max(
      highestUnlockedLevel,
      currentLevel,
      sender?.highest_unlocked_level || 1,
      sender?.current_level || 1
    );
    if (senderLevel < 4) {
      return res.status(403).json({ success: false, error: 'You must reach Level 4 to send chat invitations.' });
    }

    // 2. Check recipient
    const recipient = store.getProfile(recipientId);
    if (recipient && recipient.age !== null && recipient.age < 18) {
      return res.status(403).json({ success: false, error: 'Recipient is not eligible for romantic discovery.' });
    }

    // 3. Blocking check
    if (store.isBlocked(user.id, recipientId)) {
      return res.status(403).json({ success: false, error: 'Cannot connect with this player.' });
    }

    // 4. Duplicate pending check
    if (store.hasPendingInvitation(user.id, recipientId)) {
      return res.status(409).json({ success: false, error: 'You already have a pending invitation to this player.' });
    }

    // 5. Create new invitation
    const newInvite = store.createInvitation(user.id, recipientId);

    // Attempt background sync to Supabase if available
    if (adminSupabase) {
      try {
        await adminSupabase.from('chat_invitations').insert(newInvite);
      } catch {
        // Safe ignore
      }
    }

    return res.json({
      success: true,
      message: 'Your invitation has been sent.',
      invitation: newInvite,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error sending invitation' });
  }
});

/**
 * POST /api/invitations/respond
 * Accepts or declines an invitation. If accepting, verifies recipient has reached Level 4.
 */
app.post('/api/invitations/respond', async (req, res) => {
  const user = await verifyAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized session' });
  }

  const { invitationId, action, recipientHighestLevel = 1 } = req.body || {};
  if (!invitationId || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid invitation response parameters' });
  }

  try {
    const store = RealPlayerStore.getInstance();
    const invite = store.getInvitation(invitationId);

    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    if (invite.recipient_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Only the recipient can respond to this invitation.' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, error: `This invitation is already ${invite.status}.` });
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return res.status(400).json({ success: false, error: 'This invitation has expired.' });
    }

    // If accepting, check level gate: Recipient must have reached Level 4 to accept!
    if (action === 'accept') {
      const profile = store.getProfile(user.id);
      const level = Math.max(
        recipientHighestLevel,
        profile?.highest_unlocked_level || 1,
        profile?.current_level || 1
      );
      if (level < 4) {
        return res.status(403).json({
          success: false,
          error: 'You must complete Level 4 before you can accept invitations.',
        });
      }
    }

    const updated = store.respondInvitation(invitationId, user.id, action);

    // Attempt background sync to Supabase if available
    if (adminSupabase) {
      try {
        await adminSupabase.from('chat_invitations').update({
          status: updated.status,
          responded_at: updated.responded_at,
          is_read: true,
        }).eq('id', invitationId);
      } catch {
        // Safe ignore
      }
    }

    return res.json({
      success: true,
      status: updated.status,
      message: action === 'accept'
        ? 'Invitation accepted. You can continue to the next step when chat becomes available.'
        : 'Invitation declined.',
      invitation: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error responding to invitation' });
  }
});

/**
 * POST /api/invitations/cancel
 * Sender cancels their pending invitation.
 */
app.post('/api/invitations/cancel', async (req, res) => {
  const user = await verifyAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized session' });
  }

  const { invitationId } = req.body || {};
  if (!invitationId) {
    return res.status(400).json({ success: false, error: 'Invalid invitation ID' });
  }

  try {
    const store = RealPlayerStore.getInstance();
    const updated = store.cancelInvitation(invitationId, user.id);

    if (adminSupabase) {
      try {
        await adminSupabase.from('chat_invitations').update({
          status: 'cancelled',
          cancelled_at: updated.cancelled_at,
        }).eq('id', invitationId);
      } catch {
        // Safe ignore
      }
    }

    return res.json({ success: true, message: 'Invitation cancelled.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error cancelling invitation' });
  }
});

/**
 * POST /api/invitations/mark-read
 * Marks invitations as read for recipient.
 */
app.post('/api/invitations/mark-read', async (req, res) => {
  const user = await verifyAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized session' });
  }

  const { invitationId } = req.body || {};
  try {
    const store = RealPlayerStore.getInstance();
    if (invitationId) {
      store.markRead(invitationId, user.id);
    }
    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

/**
 * Server-side AI Language Lesson Generation Route.
 * Protects API key and provides strictly structured, age-appropriate language lessons.
 */
app.post('/api/language/lessons', async (req, res) => {
  try {
    const {
      sourceLanguage = 'English',
      targetLanguage = 'Chinese (Mandarin)',
      languageCode = 'zh-CN',
      englishVariant = 'US',
      difficulty = 'BEGINNER',
      category = 'GREETINGS',
      count = 4,
    } = req.body || {};

    if (!process.env.GEMINI_API_KEY || !aiClient) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'GEMINI_API_KEY is not configured on the server. Using local curriculum fallback.',
      });
    }

    const systemInstruction = `You are a certified, world-class language teacher powering an interactive 3D language runner game.
Your task is to generate clean, structured language learning cards for players.

STRICT CURRICULUM RULES:
1. Target Language: "${targetLanguage}" (${languageCode}). Source Language: "${sourceLanguage}" (Variant: "${englishVariant}").
2. Difficulty: "${difficulty}".
   - BEGINNER: Essential single words and 2-3 word practical phrases (e.g. come, go, eat, drink, hello, thank you, yes, no, home, friend).
   - INTERMEDIATE: Conversational expressions, useful travel/daily questions, common idioms, sentence connectors.
   - ADVANCED: Nuanced vernacular, complex phrases, professional/social cultural idioms, expressive thoughts.
3. Category: "${category}". Tailor content to this topic unless "ALL", in which case pick diverse core concepts.
4. Content Safety: Strict educational safety. Absolutely no profanity, sexual content, violence, sensitive political/personal topics, or dangerous instructions.
5. Accuracy:
   - For Chinese (Mandarin), always provide clear Pinyin with tone marks (e.g., "lái", "nǐ hǎo") in pronunciationGuide and "Pinyin: ..." in transliteration.
   - For Spanish and French, provide clear phonetic guides (e.g., "beh-NEER", "vuh-NEER") and/or IPA.
   - For English (US / UK), preserve correct regional spelling (e.g., "cheers / thank you" or "flat / home" for UK) and phonetic guide.
6. Length: Keep sourceText under 40 characters and translatedText under 40 characters so it fits cleanly in the player HUD.`;

    const prompt = `Generate ${count} unique, high-quality, practical learning items for a student studying ${targetLanguage} at ${difficulty} level in category "${category}".`;

    const generateConfig = {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sourceLanguage: { type: Type.STRING },
            targetLanguage: { type: Type.STRING },
            sourceText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            pronunciationGuide: { type: Type.STRING },
            transliteration: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: [
            'sourceLanguage',
            'targetLanguage',
            'sourceText',
            'translatedText',
            'pronunciationGuide',
            'transliteration',
            'difficulty',
            'category',
          ],
        },
      },
    };

    let response;
    try {
      response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: generateConfig,
      });
    } catch (primaryErr: any) {
      console.warn('[Server] Primary model gemini-3.8-flash busy, trying gemini-3.1-flash-lite...');
      response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: generateConfig,
      });
    }

    const text = response.text?.trim() || '[]';
    const items = JSON.parse(text);

    return res.json({
      success: true,
      lessons: Array.isArray(items) ? items : [items],
    });
  } catch (error: any) {
    console.warn('[Server] Gemini language generation warning:', error?.message || error);
    return res.status(200).json({
      success: false,
      fallback: true,
      error: error?.message || 'Failed to generate AI lessons',
    });
  }
});

// Full-stack serving: Vite in development, static files in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LANGUAGE RUNNER] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
