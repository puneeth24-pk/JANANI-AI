import { localFetch, getApiBaseUrl } from './ApiClient';
import { LessonRecord, Worksheet, Flashcard } from '../types';

export class LessonService {
  /**
   * Generates a structured bilingual lesson aligned with NIPUN Bharat
   */
  static async generateLesson(params: {
    classLevel: number;
    subject: string;
    topic: string;
    learningOutcome?: string;
    sourceLanguage: string;
    sourceText: string;
    targetLanguage?: string;
  }): Promise<LessonRecord> {
    const res = await localFetch('/api/lesson/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_level: params.classLevel,
        subject: params.subject,
        topic: params.topic,
        learning_outcome: params.learningOutcome || 'Foundational Literacy',
        source_language: params.sourceLanguage,
        source_text: params.sourceText,
        target_language: params.targetLanguage || 'Santali',
      }),
    });

    if (!res.success || !res.lesson) {
      throw new Error(res.error || 'Failed to generate lesson.');
    }

    const lesson = res.lesson;
    if (lesson.audio_url) {
      lesson.audioUrl = `${getApiBaseUrl()}${lesson.audio_url}`;
    }

    return {
      id: lesson.id,
      date: lesson.date,
      classLevel: lesson.class_level,
      subject: lesson.subject,
      topic: lesson.topic,
      learningOutcome: lesson.learning_outcome,
      sourceLanguage: lesson.source_language,
      sourceText: lesson.source_text,
      targetLanguage: lesson.target_language || 'Santali',
      santaliText: lesson.santali_text,
      hoText: lesson.ho_text,
      hoRoman: lesson.ho_roman,
      mundariText: lesson.mundari_text,
      mundariRoman: lesson.mundari_roman,
      audioUrl: lesson.audioUrl,
      activities: lesson.activities,
      assessments: lesson.assessments,
    };
  }

  /**
   * Generates printable bilingual worksheet
   */
  static async generateWorksheet(params: {
    classLevel: number;
    subject: string;
    topic: string;
    difficulty: string;
    numQuestions: number;
  }): Promise<Worksheet> {
    const res = await localFetch('/api/worksheet/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_level: params.classLevel,
        subject: params.subject,
        topic: params.topic,
        difficulty: params.difficulty,
        num_questions: params.numQuestions,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || 'Worksheet generation failed.');
    }

    return {
      id: res.worksheet_id,
      classLevel: res.class_level,
      subject: res.subject,
      topic: res.topic,
      difficulty: res.difficulty,
      questions: res.questions,
      htmlUrl: res.html_url ? `${getApiBaseUrl()}${res.html_url}` : undefined,
      date: new Date().toLocaleDateString(),
    };
  }

  /**
   * Retrieves visual flashcards
   */
  static async getFlashcards(category?: string): Promise<Record<string, Flashcard[]>> {
    const url = category ? `/api/flashcards?category=${encodeURIComponent(category)}` : '/api/flashcards';
    const res = await localFetch(url);

    if (res.success) {
      if (category && res.cards) {
        return { [category]: res.cards };
      }
      return res.data || {};
    }
    return {};
  }

  /**
   * Fetches local lesson history
   */
  static async getHistory(): Promise<LessonRecord[]> {
    try {
      const res = await localFetch('/api/history');
      if (res.success && Array.isArray(res.history)) {
        return res.history.map((item: any) => ({
          ...item,
          classLevel: item.class_level || item.classLevel || 1,
          sourceLanguage: item.source_language || item.sourceLanguage || 'Hindi',
          sourceText: item.source_text || item.sourceText || '',
          santaliText: item.santali_text || item.santaliText || '',
          audioUrl: item.audio_url ? `${getApiBaseUrl()}${item.audio_url}` : item.audioUrl,
        }));
      }
    } catch {
      // fallback to offline local storage
    }
    return [];
  }

  /**
   * Saves a completed lesson to local history
   */
  static async saveHistory(record: Partial<LessonRecord>): Promise<boolean> {
    try {
      await localFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      return true;
    } catch {
      return false;
    }
  }
}
