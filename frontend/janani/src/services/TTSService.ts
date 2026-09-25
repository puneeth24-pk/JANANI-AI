import { localFetch, getApiBaseUrl } from './ApiClient';
import { TTSResult } from '../types';
import { AudioManager } from '../utils/AudioManager';

export interface PlayVoiceOptions {
  text: string;
  romanText?: string;
  audioUrl?: string;
  language?: string;
  speed?: number;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export class TTSService {
  /**
   * Synthesizes tribal language text into audio WAV file via backend
   */
  static async synthesize({
    text,
    language = 'sat_Olck',
  }: {
    text: string;
    language?: string;
  }): Promise<TTSResult> {
    const start = performance.now();

    if (!text || !text.trim()) {
      return {
        processingTimeMs: 0,
        success: false,
        error: 'No text provided for synthesis.',
      };
    }

    try {
      const res = await localFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          language: language,
        }),
      });

      const elapsed = Math.round(performance.now() - start);

      if (res.success && res.audio_url) {
        const fullAudioUrl = `${getApiBaseUrl()}${res.audio_url}`;
        return {
          audioUrl: fullAudioUrl,
          processingTimeMs: elapsed,
          success: true,
        };
      } else {
        return {
          processingTimeMs: elapsed,
          success: false,
          error: res.error || 'TTS synthesis failed.',
        };
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      return {
        processingTimeMs: elapsed,
        success: false,
        error: err.message || 'Offline voice synthesis failed.',
      };
    }
  }

  /**
   * Universal natural voice player:
   * Uses robust AudioManager with lifecycle management, error boundary protection,
   * single playback instance, and graceful fallback so sound never crashes the page.
   */
  static playNaturalVoice(options: PlayVoiceOptions): void {
    AudioManager.play(options);
  }

  static playAudio(url: string, onEnded?: () => void): void {
    AudioManager.play({
      audioUrl: url,
      onEnded,
      onError: () => {
        if (onEnded) onEnded();
      },
    });
  }

  static stopAudio(): void {
    AudioManager.stop();
  }

  static isSpeaking(): boolean {
    return AudioManager.getState() === 'playing';
  }
}
