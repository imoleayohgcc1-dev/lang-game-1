import { LanguageCode, LearningItem } from './types';
import {
  PronunciationEvaluationResult,
  VOICE_CONFIG,
} from './voiceTypes';

/**
 * Normalizes input text by:
 * - Converting to lower case
 * - Stripping accents/diacritics where applicable (or keeping tone marks for pinyin if needed)
 * - Removing punctuation, symbols, and quotation marks
 * - Collapsing multiple spaces into single space
 * - Trimming outer whitespace
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .replace(/[\p{P}\p{S}]/gu, ' ') // remove all punctuation and symbols (including ¡, ¿, quotes, etc.)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Chinese text:
 * - Removes non-Chinese punctuation
 * - Strips whitespace
 */
export function normalizeChinese(text: string): string {
  if (!text) return '';
  return text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>，。！？、；：“”‘’（）\s]/g, '')
    .trim();
}

/**
 * Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates string similarity between 0.0 and 1.0 based on Levenshtein distance
 */
export function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  // Substring bonus: if the expected word is a distinct token inside what user said
  const tokens = longer.split(' ');
  if (tokens.includes(shorter)) {
    return 0.95;
  }

  const distance = levenshteinDistance(longer, shorter);
  return Math.max(0, (longer.length - distance) / longer.length);
}

export class PronunciationEvaluator {
  private threshold: number;

  constructor(threshold: number = VOICE_CONFIG.MINIMUM_ACCEPTANCE_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * Evaluates recognized speech against the expected target lesson item.
   * Considers:
   * - Target translatedText (e.g. "来" or "venir")
   * - Pinyin / transliteration for Chinese (e.g. "lái" vs "lai")
   * - Speech recognition transcript normalization
   * - Word boundary token matching
   */
  public evaluate(
    recognizedSpeech: string,
    item: LearningItem,
    attemptNumber: number = 1
  ): PronunciationEvaluationResult {
    const rawExpected = item.translatedText || item.sourceText;
    const lang = item.languageCode;

    // 1. Language-specific normalization
    let isCorrect = false;
    let confidenceScore = 0.0;
    let feedback = '';

    if (lang === 'zh-CN') {
      const cleanRecognized = normalizeChinese(recognizedSpeech);
      const cleanExpected = normalizeChinese(item.translatedText);
      const pinyinExpected = normalizeText(item.pronunciationText || '');
      const cleanPinyinRec = normalizeText(recognizedSpeech);

      // Match Hanzi directly or matching pinyin
      if (
        (cleanExpected && cleanRecognized.includes(cleanExpected)) ||
        (cleanRecognized && cleanExpected.includes(cleanRecognized))
      ) {
        isCorrect = true;
        confidenceScore = 1.0;
      } else if (pinyinExpected && cleanPinyinRec.includes(pinyinExpected)) {
        isCorrect = true;
        confidenceScore = 0.9;
      } else {
        const sim = calculateSimilarity(cleanRecognized, cleanExpected);
        confidenceScore = sim;
        isCorrect = sim >= this.threshold;
      }
    } else {
      // Latin-based languages (English US/UK, Spanish, French)
      const cleanRecognized = normalizeText(recognizedSpeech);
      const cleanExpected = normalizeText(rawExpected);

      // Exact normalized match or containment
      if (cleanRecognized === cleanExpected) {
        isCorrect = true;
        confidenceScore = 1.0;
      } else if (
        cleanRecognized.length > 0 &&
        (cleanRecognized.split(' ').includes(cleanExpected) ||
         cleanExpected.split(' ').includes(cleanRecognized))
      ) {
        isCorrect = true;
        confidenceScore = 0.92;
      } else {
        const sim = calculateSimilarity(cleanRecognized, cleanExpected);
        confidenceScore = sim;
        isCorrect = sim >= this.threshold;
      }
    }

    if (isCorrect) {
      feedback = '✓ Correct pronunciation!';
    } else {
      if (attemptNumber >= VOICE_CONFIG.MAX_PRONUNCIATION_ATTEMPTS) {
        feedback = `Expected: "${rawExpected}". Good effort!`;
      } else {
        feedback = 'Try again. Speak clearly into the microphone.';
      }
    }

    return {
      correct: isCorrect,
      confidence: Math.round(confidenceScore * 100) / 100,
      recognizedText: recognizedSpeech.trim(),
      expectedText: rawExpected,
      feedback,
      attemptsUsed: attemptNumber,
      maxAttempts: VOICE_CONFIG.MAX_PRONUNCIATION_ATTEMPTS,
    };
  }
}

export const pronunciationEvaluator = new PronunciationEvaluator();
