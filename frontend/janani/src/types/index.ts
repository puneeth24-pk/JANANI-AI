export type SourceLanguage = 'hin_Deva' | 'eng_Latn';

export type TargetLanguage = 'sat_Olck' | 'ho' | 'mundari';

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  script?: string;
  romanText?: string;
  warangCiti?: string;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface SpeechResult {
  text: string;
  language: string;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface TTSResult {
  audioUrl?: string;
  audioPath?: string;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface LessonRecord {
  id: string;
  date: string;
  classLevel: number;
  subject: string;
  topic: string;
  learningOutcome?: string;
  sourceLanguage: string;
  sourceText: string;
  targetLanguage?: string;
  santaliText: string;
  hoText?: string;
  hoRoman?: string;
  mundariText?: string;
  mundariRoman?: string;
  audioUrl?: string;
  processingTime?: {
    speech?: number;
    translation?: number;
    tts?: number;
    total: number;
  };
  activities?: Array<{ name: string; instruction: string }>;
  assessments?: Array<{ q: string; ans: string }>;
}

export interface Flashcard {
  id: string;
  front: string;
  hindi: string;
  santali: string;
  english: string;
  ho?: string;
  mundari?: string;
  icon?: string;
}

export interface WorksheetQuestion {
  q_en: string;
  q_hi: string;
  q_sat: string;
  ans: string;
}

export interface Worksheet {
  id: string;
  classLevel: number;
  subject: string;
  topic: string;
  difficulty: string;
  questions: WorksheetQuestion[];
  htmlUrl?: string;
  date: string;
}

export interface SystemModelStatus {
  whisper: { ready: boolean; model_name: string };
  indictrans2: { ready: boolean; backend: string };
  dhvaani: { ready: boolean; device: string };
  memory: {
    process_rss_mb: number;
    system_available_mb: number;
    system_percent_used: number;
  };
  installed: {
    whisper: boolean;
    indictrans2_int8: boolean;
    indictrans2_320m: boolean;
    dhvaani: boolean;
    all_installed: boolean;
  };
  ready_for_inference: boolean;
}

export type TabScreen =
  | 'Home'
  | 'Classroom'
  | 'Translate'
  | 'VoiceTranslator'
  | 'Lessons'
  | 'Worksheets'
  | 'Flashcards'
  | 'History'
  | 'Settings'
  | 'OfflineTest';

export type QuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'true_false'
  | 'number_recognition'
  | 'counting'
  | 'vocabulary'
  | 'translation_choice'
  | 'sentence_completion';

export interface QuestionOption {
  id: string | number;
  text: string;
  subText?: string;
  correct: boolean;
}

export interface PracticeQuestionItem {
  id: string;
  classLevel: number;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: QuestionType;
  hindiQuestion: string;
  englishQuestion?: string;
  santaliQuestion: string;
  romanPhonetic?: string;
  options: QuestionOption[];
  correctAnswer: string;
  hint?: string;
  explanation?: string;
  icon?: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  classLevel: number;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  score: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
}

