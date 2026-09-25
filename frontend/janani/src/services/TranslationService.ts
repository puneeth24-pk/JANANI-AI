import { localFetch, getApiBaseUrl } from './ApiClient';
import { TranslationResult, SourceLanguage } from '../types';
import { isValidOlChiki } from '../utils/olchiki';

export interface TranslateParams {
  text: string;
  sourceLanguage: SourceLanguage | string;
  targetLanguage?: string;
}

export interface TranslateWithTTSResult {
  success: boolean;
  santaliText?: string;
  audioUrl?: string;
  timing?: Record<string, number>;
  error?: string;
}

export class TranslationService {
  /**
   * Translation-only endpoint (text in → Santali text out).
   * Only use this when TTS is not needed (e.g. typing practice).
   */
  static async translate({
    text,
    sourceLanguage,
    targetLanguage = 'sat_Olck',
  }: TranslateParams): Promise<TranslationResult> {
    const start = performance.now();

    if (!text || !text.trim()) {
      return {
        sourceText: '',
        translatedText: '',
        sourceLanguage,
        targetLanguage,
        processingTimeMs: 0,
        success: false,
        error: 'Please enter text to translate.',
      };
    }

    try {
      const res = await localFetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          source_language: sourceLanguage,
          target_language: targetLanguage,
        }),
      });

      const elapsed = Math.round(performance.now() - start);
      const outputText = res.translated_text || res.santali_text;

      if (res.success && outputText) {
        const isOlChiki = targetLanguage === 'sat_Olck' ? isValidOlChiki(outputText) : true;
        return {
          sourceText: text,
          translatedText: outputText,
          sourceLanguage,
          targetLanguage,
          script: res.script,
          romanText: res.roman_text,
          warangCiti: res.warang_citi,
          processingTimeMs: elapsed,
          success: true,
          error: isOlChiki ? undefined : 'Warning: Output may contain non-Ol Chiki characters.',
        };
      } else {
        return {
          sourceText: text,
          translatedText: '',
          sourceLanguage,
          targetLanguage,
          processingTimeMs: elapsed,
          success: false,
          error: res.error || 'Translation returned an empty result.',
        };
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      return {
        sourceText: text,
        translatedText: '',
        sourceLanguage,
        targetLanguage,
        processingTimeMs: elapsed,
        success: false,
        error: err.message || 'Offline translation failed. Please check local model status.',
      };
    }
  }

  /**
   * Unified text → Santali text + audio endpoint (/api/lesson/text).
   * One round trip, one MODEL_LOCK — eliminates "fail to get" timeouts.
   * Use this in ClassroomScreen for the text fallback path.
   */
  static async translateWithTTS({
    text,
    sourceLanguage,
  }: {
    text: string;
    sourceLanguage: string;
  }): Promise<TranslateWithTTSResult> {
    if (!text || !text.trim()) {
      return { success: false, error: 'No text provided.' };
    }

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      formData.append('source_language', sourceLanguage);

      const res = await localFetch('/api/lesson/text', {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        const apiBase = getApiBaseUrl();
        return {
          success: true,
          santaliText: res.santali_text,
          audioUrl: res.audio_url ? `${apiBase}${res.audio_url}` : undefined,
          timing: res.timing,
        };
      }

      return { success: false, error: res.error || 'Lesson text pipeline failed.' };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Offline text+TTS pipeline failed.',
      };
    }
  }
}
