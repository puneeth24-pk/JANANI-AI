import { localFetch, getApiBaseUrl } from './ApiClient';
import { SpeechResult } from '../types';

export interface TranscribeParams {
  audioBlob: Blob;
  language: string;
}

export class SpeechService {
  /**
   * Transcribes teacher speech offline using Whisper (small CPU)
   */
  static async transcribe({ audioBlob, language }: TranscribeParams): Promise<SpeechResult> {
    const start = performance.now();

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech_recording.wav');
      formData.append('source_language', language);

      const res = await localFetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const elapsed = Math.round(performance.now() - start);

      if (res.success && res.transcription) {
        return {
          text: res.transcription,
          language: res.source_language || language,
          processingTimeMs: elapsed,
          success: true,
        };
      } else {
        return {
          text: '',
          language,
          processingTimeMs: elapsed,
          success: false,
          error: res.error || 'No speech recognized. Please speak clearly and try again.',
        };
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      return {
        text: '',
        language,
        processingTimeMs: elapsed,
        success: false,
        error: err.message || 'Offline speech recognition failed.',
      };
    }
  }

  /**
   * End-to-end speech to Santali translation and speech synthesis in one call
   */
  static async processSpeechPipeline({
    audioBlob,
    sourceLanguage,
  }: {
    audioBlob: Blob;
    sourceLanguage: string;
  }) {
    const start = performance.now();
    const formData = new FormData();
    formData.append('audio', audioBlob, 'teacher_speech.wav');
    formData.append('source_language', sourceLanguage);

    const res = await localFetch('/api/lesson/speech', {
      method: 'POST',
      body: formData,
    });

    const elapsed = Math.round(performance.now() - start);
    return {
      ...res,
      totalTimeMs: elapsed,
      audioUrl: res.audio_url ? `${getApiBaseUrl()}${res.audio_url}` : undefined,
    };
  }
}
