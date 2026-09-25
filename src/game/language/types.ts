export type LanguageCode = 'en-US' | 'en-GB' | 'zh-CN' | 'fr-FR' | 'es-ES';

export type LanguageDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type LanguageChallengeState =
  | 'IDLE'
  | 'SHOW_WORD'
  | 'SHOW_TRANSLATION'
  | 'WAITING_FOR_RESPONSE'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type AITeacherStatus =
  | 'IDLE'
  | 'READY'
  | 'GENERATING'
  | 'OFFLINE_FALLBACK'
  | 'DISABLED';

export interface RawAILessonItem {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  pronunciationGuide: string;
  transliteration: string;
  exampleSentence?: string;
  difficulty: string;
  category: string;
}

export interface LearningItem {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  languageCode: LanguageCode;
  sourceText: string;
  translatedText: string;
  pronunciationText?: string;
  transliteration?: string; // Pinyin for Mandarin, phonetic for others
  difficulty: LanguageDifficulty;
  category: string;
  exampleSentence?: string;
  audioReference?: string;
  lessonNumber: number;
  learningObjective: string;
  aiGenerated?: boolean;
}

export interface LearningProgress {
  targetLanguageCode: LanguageCode;
  englishVariant: 'US' | 'UK';
  wordsEncountered: string[];
  wordsCompleted: string[];
  currentLesson: number;
  currentDifficulty: LanguageDifficulty;
  selectedCategory: string;
  useAITeacher: boolean;
  totalChallengesCompleted: number;
  totalXPEarned: number;
}

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  subvariant?: 'US' | 'UK';
  description: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'zh-CN',
    name: 'Chinese (Mandarin)',
    nativeName: '普通话',
    flag: '🇨🇳',
    description: 'Simplified Mandarin Chinese with standard Pinyin tones.',
  },
  {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    description: 'Castilian & Latin American vocabulary with clear phonetics.',
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    description: 'Modern French with phonetic guides and gender context.',
  },
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'American English',
    flag: '🇺🇸',
    subvariant: 'US',
    description: 'General American spelling, pronunciation, and idioms.',
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'British English',
    flag: '🇬🇧',
    subvariant: 'UK',
    description: 'British spelling, Received Pronunciation, and UK expressions.',
  },
];

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const LESSON_CATEGORIES: CategoryInfo[] = [
  { id: 'ALL', name: 'All Categories', icon: '✨', description: 'Varied mix of useful vocabulary' },
  { id: 'GREETINGS', name: 'Greetings', icon: '👋', description: 'Hello, polite courtesies, introductions' },
  { id: 'DAILY_LIFE', name: 'Daily Life', icon: '☀️', description: 'Everyday routines, habits, and home' },
  { id: 'TRAVEL', name: 'Travel', icon: '✈️', description: 'Transit, stations, hotels, and exploration' },
  { id: 'FOOD', name: 'Food & Dining', icon: '🍜', description: 'Meals, drinks, ordering, and flavors' },
  { id: 'FAMILY', name: 'Family & Friends', icon: '👥', description: 'Relations, companions, and people' },
  { id: 'SCHOOL', name: 'School', icon: '🎒', description: 'Study, learning, books, and campus life' },
  { id: 'WORK', name: 'Work', icon: '💼', description: 'Office, business, tasks, and colleagues' },
  { id: 'DIRECTIONS', name: 'Directions', icon: '🧭', description: 'Navigation, left, right, straight, maps' },
  { id: 'NUMBERS', name: 'Numbers', icon: '🔢', description: 'Counting, prices, quantities, and stats' },
  { id: 'TIME', name: 'Time & Dates', icon: '⏰', description: 'Hours, days, weeks, calendar, and schedule' },
  { id: 'COMMON_VERBS', name: 'Common Verbs', icon: '⚡', description: 'Come, go, eat, drink, see, do' },
  { id: 'COMMON_PHRASES', name: 'Common Phrases', icon: '💬', description: 'Essential survival expressions' },
  { id: 'CONVERSATION', name: 'Conversation', icon: '🗣️', description: 'Questions, answers, and dialogue starters' },
];

export const DEFAULT_LEARNING_PROGRESS: LearningProgress = {
  targetLanguageCode: 'zh-CN',
  englishVariant: 'US',
  wordsEncountered: [],
  wordsCompleted: [],
  currentLesson: 1,
  currentDifficulty: 'BEGINNER',
  selectedCategory: 'ALL',
  useAITeacher: true,
  totalChallengesCompleted: 0,
  totalXPEarned: 0,
};
