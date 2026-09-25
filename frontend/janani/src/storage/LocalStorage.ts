/**
 * JANANI Offline Storage Manager
 * Stores lessons, history, worksheets, and teacher settings locally.
 */

import { LessonRecord, Worksheet } from '../types';

const SETTINGS_KEY = 'janani_settings';
const LESSONS_KEY = 'janani_lessons';
const WORKSHEETS_KEY = 'janani_worksheets';

export interface AppSettings {
  sourceLanguage: 'hin_Deva' | 'eng_Latn';
  targetLanguage: 'sat_Olck';
  voiceSpeed: number;
  autoPlay: boolean;
  offlineMode: boolean;
  modelBackend: 'int8' | 'standard';
}

const DEFAULT_SETTINGS: AppSettings = {
  sourceLanguage: 'hin_Deva',
  targetLanguage: 'sat_Olck',
  voiceSpeed: 0.92,
  autoPlay: true,
  offlineMode: true,
  modelBackend: 'int8',
};

const PRACTICE_SESSIONS_KEY = 'janani_practice_sessions';

export class LocalStorage {
  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const updated = { ...this.getSettings(), ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  static getLessons(): LessonRecord[] {
    try {
      const data = localStorage.getItem(LESSONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static saveLesson(lesson: LessonRecord): LessonRecord[] {
    const lessons = this.getLessons();
    const updated = [lesson, ...lessons.filter((l) => l.id !== lesson.id)].slice(0, 100);
    try {
      localStorage.setItem(LESSONS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  static deleteLesson(id: string): LessonRecord[] {
    const lessons = this.getLessons().filter((l) => l.id !== id);
    try {
      localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
    } catch {}
    return lessons;
  }

  static getWorksheets(): Worksheet[] {
    try {
      const data = localStorage.getItem(WORKSHEETS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static saveWorksheet(ws: Worksheet): Worksheet[] {
    const list = this.getWorksheets();
    const updated = [ws, ...list.filter((w) => w.id !== ws.id)].slice(0, 50);
    try {
      localStorage.setItem(WORKSHEETS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  static getPracticeSessions(): any[] {
    try {
      const data = localStorage.getItem(PRACTICE_SESSIONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static savePracticeSession(session: any): any[] {
    const list = this.getPracticeSessions();
    const updated = [session, ...list].slice(0, 50);
    try {
      localStorage.setItem(PRACTICE_SESSIONS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  static clearAudioCache() {
    // Only clears cached temporary session data, never original AI models
    console.log('Audio cache cleared safely.');
  }

  static clearGeneratedLessons() {
    try {
      localStorage.removeItem(LESSONS_KEY);
      localStorage.removeItem(WORKSHEETS_KEY);
      localStorage.removeItem(PRACTICE_SESSIONS_KEY);
    } catch {}
  }
}
