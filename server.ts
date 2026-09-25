import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

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
