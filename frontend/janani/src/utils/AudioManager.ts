/**
 * JANANI Robust Audio Manager
 * Ensures strict single-voice playback, safe event lifecycle, null-safety,
 * error boundary protection, and cleanup to prevent page crashes and memory leaks.
 */

export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'error';

export interface PlaybackOptions {
  text?: string;
  romanText?: string;
  audioUrl?: string;
  language?: string;
  speed?: number;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export class AudioManager {
  private static activeAudio: HTMLAudioElement | null = null;
  private static currentState: AudioPlaybackState = 'idle';
  private static callbackFired = false;

  public static getState(): AudioPlaybackState {
    return this.currentState;
  }

  /**
   * Stops any currently playing audio and speech synthesis safely.
   */
  public static stop(): void {
    this.currentState = 'idle';

    if (this.activeAudio) {
      try {
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.oncanplaythrough = null;
        this.activeAudio.pause();
        this.activeAudio.src = '';
      } catch (err) {
        console.warn('[AudioManager] Error stopping HTMLAudioElement:', err);
      } finally {
        this.activeAudio = null;
      }
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('[AudioManager] Error cancelling SpeechSynthesis:', err);
      }
    }
  }

  /**
   * Plays voice safely with full lifecycle protection.
   * If pre-rendered audioUrl fails or is not available, falls back to
   * browser SpeechSynthesis with natural phonetic voice.
   */
  public static play(options: PlaybackOptions): void {
    // 1. Stop any currently active playback
    this.stop();
    this.callbackFired = false;
    this.currentState = 'loading';

    const safeText = String(options.text || '').trim();
    const safeRoman = options.romanText ? String(options.romanText).trim() : undefined;
    const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
    const language = options.language || 'sat_Olck';

    const safeOnStart = () => {
      this.currentState = 'playing';
      try {
        if (options.onStart) options.onStart();
      } catch (e) {
        console.error('[AudioManager] Error in onStart callback:', e);
      }
    };

    const safeOnEnded = () => {
      if (this.callbackFired) return;
      this.callbackFired = true;
      this.currentState = 'idle';
      this.activeAudio = null;
      try {
        if (options.onEnded) options.onEnded();
      } catch (e) {
        console.error('[AudioManager] Error in onEnded callback:', e);
      }
    };

    const safeOnError = (err: Error) => {
      if (this.callbackFired) return;
      this.callbackFired = true;
      this.currentState = 'error';
      this.activeAudio = null;
      try {
        if (options.onError) {
          options.onError(err);
        } else if (options.onEnded) {
          // If no error handler provided, gracefully reset via onEnded
          options.onEnded();
        }
      } catch (e) {
        console.error('[AudioManager] Error in onError callback:', e);
      }
    };

    // If no text or audioUrl is provided, gracefully complete
    if (!safeText && !options.audioUrl) {
      safeOnError(new Error('No text or audio URL provided for voice playback.'));
      return;
    }

    // ── Method 1: Pre-synthesized audio URL ──
    if (options.audioUrl && typeof window !== 'undefined') {
      try {
        const audio = new Audio();
        this.activeAudio = audio;
        audio.preload = 'auto';
        audio.playbackRate = speed;

        audio.onended = () => {
          safeOnEnded();
        };

        audio.onerror = (e) => {
          console.warn('[AudioManager] Audio URL failed, attempting speech synthesis fallback...', e);
          this.activeAudio = null;
          // Fallback to speech synthesis
          this.playSpeechSynthFallback({
            text: safeText,
            romanText: safeRoman,
            language,
            speed,
            onStart: safeOnStart,
            onEnded: safeOnEnded,
            onError: safeOnError,
          });
        };

        audio.src = options.audioUrl;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              safeOnStart();
            })
            .catch((err) => {
              console.warn('[AudioManager] Audio play promise rejected, falling back to speech synthesis:', err);
              this.activeAudio = null;
              this.playSpeechSynthFallback({
                text: safeText,
                romanText: safeRoman,
                language,
                speed,
                onStart: safeOnStart,
                onEnded: safeOnEnded,
                onError: safeOnError,
              });
            });
        }
        return;
      } catch (err: any) {
        console.warn('[AudioManager] HTMLAudioElement initialization error:', err);
      }
    }

    // ── Method 2: Browser SpeechSynthesis Fallback ──
    this.playSpeechSynthFallback({
      text: safeText,
      romanText: safeRoman,
      language,
      speed,
      onStart: safeOnStart,
      onEnded: safeOnEnded,
      onError: safeOnError,
    });
  }

  private static playSpeechSynthFallback(opts: {
    text: string;
    romanText?: string;
    language: string;
    speed: number;
    onStart: () => void;
    onEnded: () => void;
    onError: (err: Error) => void;
  }): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      opts.onError(new Error('Voice playback could not be completed on this browser.'));
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Determine phonetic string to pronounce accurately
      let spokenText = opts.text;
      let voiceLang = 'hi-IN';

      if (opts.language === 'sat_Olck') {
        spokenText = opts.romanText || opts.text;
        voiceLang = 'hi-IN';
      } else if (opts.language === 'ho') {
        // Strip non-phonetic script tags if needed
        spokenText = opts.romanText || opts.text.replace(/[\u118A0-\u118FF]/g, '').trim() || opts.text;
        voiceLang = 'hi-IN';
      } else if (opts.language === 'mundari') {
        spokenText = opts.romanText || opts.text;
        voiceLang = 'hi-IN';
      } else if (opts.language === 'eng_Latn' || opts.language === 'english') {
        spokenText = opts.text;
        voiceLang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = Math.max(0.6, Math.min(1.4, opts.speed * 0.9));
      utterance.pitch = 1.05;
      utterance.lang = voiceLang;

      // Select natural voice
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(
        (v) => v.lang.startsWith(voiceLang) || v.lang.startsWith('hi') || v.lang.startsWith('en-IN')
      );
      if (matched) {
        utterance.voice = matched;
      }

      utterance.onstart = () => {
        opts.onStart();
      };

      utterance.onend = () => {
        opts.onEnded();
      };

      utterance.onerror = (event) => {
        console.warn('[AudioManager] SpeechSynthesisUtterance error:', event);
        if (event.error === 'canceled' || event.error === 'interrupted') {
          // User or new playback cancelled this utterance gracefully
          opts.onEnded();
        } else {
          opts.onError(new Error('Voice playback could not be completed.'));
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      console.error('[AudioManager] Fatal SpeechSynthesis exception:', e);
      opts.onError(new Error('Voice playback could not be completed.'));
    }
  }
}
