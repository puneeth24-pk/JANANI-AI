/**
 * VoiceTranslatorScreen
 * ─────────────────────
 * Dedicated voice translation screen.
 *
 * Pipeline:
 *   🎤 Tap Mic → Listening → Whisper STT → Translating → Output (Santali Voice / Ho / Mundari)
 *
 * Supported:
 *   - Source: Hindi, English (Urdu removed)
 *   - Target: Santali (Ol Chiki + DhVaani TTS), Ho (Warang Citi & Latin), Mundari (Devanagari & Roman)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SpeechService } from '../services/SpeechService';
import { TTSService } from '../services/TTSService';
import { TranslationService } from '../services/TranslationService';
import { TargetLanguage } from '../types';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type VoiceStage =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'translating'
  | 'generating'
  | 'speaking'
  | 'done';

type SourceLang = 'hin_Deva' | 'eng_Latn';

interface SourceLangConfig {
  code: SourceLang;
  label: string;
  flag: string;
  placeholder: string;
}

const SOURCE_LANGS: SourceLangConfig[] = [
  { code: 'hin_Deva', label: 'हिंदी (Hindi)', flag: '🇮🇳', placeholder: 'हिंदी में बोलें...' },
  { code: 'eng_Latn', label: 'English', flag: '🇬🇧', placeholder: 'Speak in English...' },
];

interface TargetLangConfig {
  code: TargetLanguage;
  label: string;
  nativeLabel: string;
  script: string;
  hasVoice: boolean;
}

const TARGET_LANGS: TargetLangConfig[] = [
  { code: 'sat_Olck', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki', hasVoice: true },
  { code: 'ho', label: 'Ho', nativeLabel: '𑢹𑣉 / Ho', script: 'Warang Citi', hasVoice: false },
  { code: 'mundari', label: 'Mundari', nativeLabel: 'मुंडारी / ᱢᱩᱱᱰᱟᱨᱤ', script: 'Devanagari', hasVoice: false },
];

const STAGE_LABELS: Record<VoiceStage, string> = {
  idle: '🎤 Tap to Speak',
  listening: '🎙️ Listening...',
  understanding: '🧠 Understanding...',
  translating: '⚡ Translating...',
  generating: '🎵 Generating Voice...',
  speaking: '🔊 Speaking Santali...',
  done: '✅ Done',
};

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export const VoiceTranslatorScreen: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<SourceLang>('hin_Deva');
  const [targetLang, setTargetLang] = useState<TargetLanguage>('sat_Olck');
  const [stage, setStage] = useState<VoiceStage>('idle');
  const [spokenText, setSpokenText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [secondaryText, setSecondaryText] = useState<string | undefined>();
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [timings, setTimings] = useState<{
    stt?: number; trans?: number; tts?: number; total?: number;
  } | null>(null);

  // Mic pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pipelineStart = useRef<number>(0);

  // ─── Pulse animation ───────────────────────────────────
  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  };

  // ─── Recording ─────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    setSpokenText('');
    setTargetText('');
    setSecondaryText(undefined);
    setAudioUrl(undefined);
    setTimings(null);
    pipelineStart.current = performance.now();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone not available.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await runVoicePipeline(blob);
      };

      recorder.start();
      setStage('listening');
      startPulse();
    } catch (err: any) {
      stopPulse();
      // Fallback: quick sample phrase pipeline
      const demo =
        sourceLang === 'hin_Deva'
          ? 'आज हम गिनती सीखेंगे।'
          : 'Today we will learn counting.';
      await runTextFallback(demo);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && stage === 'listening') {
      stopPulse();
      mediaRecorderRef.current.stop();
      setStage('understanding');
    }
  };

  const handleMicPress = () => {
    if (stage === 'idle' || stage === 'done') {
      startRecording();
    } else if (stage === 'listening') {
      stopRecording();
    }
  };

  // ─── Pipeline ──────────────────────────────────────────
  const runVoicePipeline = async (audioBlob: Blob) => {
    try {
      setStage('understanding');

      if (targetLang === 'sat_Olck') {
        // Full Santali voice pipeline (Whisper + IndicTrans2 + DhVaani)
        const res = await SpeechService.processSpeechPipeline({
          audioBlob,
          sourceLanguage: sourceLang,
        });

        const totalMs = Math.round(performance.now() - pipelineStart.current);

        if (!res.success) {
          setStage('idle');
          setError(res.error || 'Pipeline failed.');
          return;
        }

        if (res.transcription) setSpokenText(res.transcription);
        if (res.santali_text) setTargetText(res.santali_text);

        const t = res.timing || {};
        setTimings({
          stt: t.stt_ms ? +(t.stt_ms / 1000).toFixed(1) : undefined,
          trans: t.translation_ms ? +(t.translation_ms / 1000).toFixed(1) : undefined,
          tts: t.tts_ms ? +(t.tts_ms / 1000).toFixed(1) : undefined,
          total: +(totalMs / 1000).toFixed(1),
        });

        if (res.audioUrl) {
          setAudioUrl(res.audioUrl);
          setStage('speaking');
          TTSService.playAudio(res.audioUrl, () => setStage('done'));
        } else {
          setStage('done');
        }
      } else {
        // Ho / Mundari voice-to-text pipeline
        const asrRes = await SpeechService.transcribe({
          audioBlob,
          language: sourceLang,
        });

        if (!asrRes.success || !asrRes.text) {
          setStage('idle');
          setError(asrRes.error || 'Speech recognition failed.');
          return;
        }

        setSpokenText(asrRes.text);
        setStage('translating');

        const transRes = await TranslationService.translate({
          text: asrRes.text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        });

        const totalMs = Math.round(performance.now() - pipelineStart.current);

        if (transRes.success && transRes.translatedText) {
          setTargetText(transRes.translatedText);
          setSecondaryText(transRes.romanText);
          setTimings({
            stt: +(asrRes.processingTimeMs / 1000).toFixed(1),
            trans: +(transRes.processingTimeMs / 1000).toFixed(1),
            total: +(totalMs / 1000).toFixed(1),
          });
          setStage('done');
        } else {
          setStage('idle');
          setError(transRes.error || 'Translation failed.');
        }
      }
    } catch (err: any) {
      setStage('idle');
      setError(err.message || 'Voice pipeline failed. Is the JANANI server running?');
    }
  };

  const runTextFallback = async (text: string) => {
    setSpokenText(text);
    setStage('translating');
    try {
      if (targetLang === 'sat_Olck') {
        const res = await TranslationService.translateWithTTS({ text, sourceLanguage: sourceLang });
        const totalMs = Math.round(performance.now() - pipelineStart.current);

        if (!res.success) {
          setStage('idle');
          setError(res.error || 'Translation failed.');
          return;
        }

        if (res.santaliText) setTargetText(res.santaliText);

        const t = res.timing || {};
        setTimings({
          trans: t.translation_ms ? +(t.translation_ms / 1000).toFixed(1) : undefined,
          tts: t.tts_ms ? +(t.tts_ms / 1000).toFixed(1) : undefined,
          total: +(totalMs / 1000).toFixed(1),
        });

        if (res.audioUrl) {
          setAudioUrl(res.audioUrl);
          setStage('speaking');
          TTSService.playAudio(res.audioUrl, () => setStage('done'));
        } else {
          setStage('done');
        }
      } else {
        const res = await TranslationService.translate({
          text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        });
        const totalMs = Math.round(performance.now() - pipelineStart.current);

        if (res.success && res.translatedText) {
          setTargetText(res.translatedText);
          setSecondaryText(res.romanText);
          setTimings({
            trans: +(res.processingTimeMs / 1000).toFixed(1),
            total: +(totalMs / 1000).toFixed(1),
          });
          setStage('done');
        } else {
          setStage('idle');
          setError(res.error || 'Translation failed.');
        }
      }
    } catch (err: any) {
      setStage('idle');
      setError(err.message || 'Offline pipeline failed.');
    }
  };

  const handleReplay = () => {
    if (!audioUrl) return;
    setStage('speaking');
    TTSService.playAudio(audioUrl, () => setStage('done'));
  };

  const handleReset = () => {
    TTSService.stopAudio();
    setStage('idle');
    setSpokenText('');
    setTargetText('');
    setSecondaryText(undefined);
    setAudioUrl(undefined);
    setTimings(null);
    setError(null);
  };

  // ─── Derived UI helpers ────────────────────────────────
  const isActive = stage === 'listening';
  const isBusy = ['understanding', 'translating', 'generating', 'speaking'].includes(stage);
  const stageLabel = STAGE_LABELS[stage];
  const targetConfig = TARGET_LANGS.find((t) => t.code === targetLang)!;

  // Microphone button colour
  const micBgColor = isActive ? '#dc2626' : isBusy ? '#f59e0b' : '#2563eb';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎤 Voice Translator</Text>
        <Text style={styles.headerSub}>English & Hindi → Santali, Ho & Mundari</Text>
      </View>

      {/* ── Source Language Selector (Hindi & English only) ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>INPUT LANGUAGE</Text>
      </View>
      <View style={styles.langRow}>
        {SOURCE_LANGS.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langBtn, sourceLang === lang.code && styles.langBtnActive]}
            onPress={() => setSourceLang(lang.code)}
            disabled={isBusy}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langLabel, sourceLang === lang.code && styles.langLabelActive]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Target Language Selector (Santali, Ho, Mundari) ── */}
      <View style={[styles.sectionHeader, { marginTop: 4 }]}>
        <Text style={styles.sectionLabel}>TARGET TRIBAL LANGUAGE</Text>
      </View>
      <View style={styles.targetRow}>
        {TARGET_LANGS.map((tgt) => (
          <TouchableOpacity
            key={tgt.code}
            style={[styles.targetBtn, targetLang === tgt.code && styles.targetBtnActive]}
            onPress={() => {
              setTargetLang(tgt.code);
              setTargetText('');
              setSecondaryText(undefined);
              setAudioUrl(undefined);
            }}
            disabled={isBusy}
          >
            <Text style={[styles.targetBtnTitle, targetLang === tgt.code && styles.targetBtnTitleActive]}>
              {tgt.label}
            </Text>
            <Text style={[styles.targetBtnNative, targetLang === tgt.code && styles.targetBtnNativeActive]}>
              {tgt.nativeLabel}
            </Text>
            <Text style={styles.targetBtnSub}>{tgt.script}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Microphone ── */}
      <View style={styles.micSection}>
        <TouchableOpacity
          onPress={handleMicPress}
          disabled={isBusy}
          activeOpacity={0.85}
          style={styles.micWrapper}
        >
          <Animated.View style={[styles.micOuter, { backgroundColor: micBgColor + '22', transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.micInner, { backgroundColor: micBgColor }]}>
              <Text style={styles.micIcon}>
                {isActive ? '⏹' : isBusy ? '⏳' : '🎤'}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <Text style={[styles.stageText, isActive && styles.stageTextActive]}>
          {stageLabel}
        </Text>

        {isActive && (
          <Text style={styles.tapStopHint}>Tap microphone to stop recording</Text>
        )}
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* ── Results ── */}
      {spokenText ? (
        <View style={styles.resultsSection}>

          {/* YOU SAID */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTag}>
              YOU SAID ({SOURCE_LANGS.find(l => l.code === sourceLang)?.label})
            </Text>
            <Text style={styles.spokenText}>"{spokenText}"</Text>
          </View>

          {/* TARGET OUTPUT */}
          {targetText ? (
            <View style={styles.targetCard}>
              <View style={styles.targetCardHeader}>
                <Text style={styles.targetTag}>
                  {targetConfig.label} ({targetConfig.script})
                </Text>
                <View style={styles.liveChip}>
                  <Text style={styles.liveChipText}>✓ OFFLINE</Text>
                </View>
              </View>
              <Text style={styles.targetMainText}>{targetText}</Text>

              {secondaryText && (
                <View style={styles.secondaryBox}>
                  <Text style={styles.secondaryLabel}>Reading:</Text>
                  <Text style={styles.secondaryText}>{secondaryText}</Text>
                </View>
              )}

              {/* Audio controls */}
              <View style={styles.audioRow}>
                {audioUrl && (
                  <TouchableOpacity
                    style={[styles.audioBtn, stage === 'speaking' && styles.audioBtnActive]}
                    onPress={handleReplay}
                  >
                    <Text style={styles.audioBtnText}>
                      {stage === 'speaking' ? '⏹ Playing...' : '🔊 PLAY VOICE'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetBtnText}>🔄 New</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Latency */}
          {timings && (
            <View style={styles.latencyBar}>
              <Text style={styles.latencyTitle}>⚡ ACTUAL LATENCY</Text>
              <View style={styles.latencyRow}>
                {timings.stt !== undefined && (
                  <Text style={styles.latencyChip}>STT: {timings.stt}s</Text>
                )}
                {timings.trans !== undefined && (
                  <Text style={styles.latencyChip}>Trans: {timings.trans}s</Text>
                )}
                {timings.tts !== undefined && (
                  <Text style={styles.latencyChip}>TTS: {timings.tts}s</Text>
                )}
                {timings.total !== undefined && (
                  <Text style={[styles.latencyChip, styles.latencyTotal]}>
                    Total: {timings.total}s
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ) : !error ? (
        <View style={styles.instructions}>
          <Text style={styles.instrTitle}>How it works:</Text>
          <Text style={styles.instrStep}>1. Select your language (Hindi or English)</Text>
          <Text style={styles.instrStep}>2. Select target tribal language (Santali, Ho, or Mundari)</Text>
          <Text style={styles.instrStep}>3. Tap microphone and speak naturally</Text>
          <Text style={styles.instrStep}>4. Tap again to convert directly to tribal script and voice</Text>
          <View style={styles.pipelineBadge}>
            <Text style={styles.pipelineText}>
              Offline AI · Santali (Ol Chiki) · Ho (Warang Citi) · Mundari
            </Text>
          </View>
        </View>
      ) : null}

    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f6ff' },
  content: { padding: 20, paddingBottom: 48 },

  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e3a8a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: '500' },

  sectionHeader: { marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.8 },

  langRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 8,
    elevation: 1,
  },
  langBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    elevation: 3,
  },
  langFlag: { fontSize: 18 },
  langLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  langLabelActive: { color: '#1d4ed8' },

  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  targetBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  targetBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    elevation: 2,
  },
  targetBtnTitle: { fontSize: 13, fontWeight: '800', color: '#334155' },
  targetBtnTitleActive: { color: '#1d4ed8' },
  targetBtnNative: { fontSize: 11, color: '#64748b', marginTop: 2 },
  targetBtnNativeActive: { color: '#2563eb' },
  targetBtnSub: { fontSize: 9, color: '#94a3b8', marginTop: 2 },

  micSection: { alignItems: 'center', marginBottom: 24 },
  micWrapper: { alignItems: 'center', justifyContent: 'center' },
  micOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  micIcon: { fontSize: 36, color: '#ffffff' },
  stageText: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 14 },
  stageTextActive: { color: '#dc2626' },
  tapStopHint: { fontSize: 12, color: '#dc2626', marginTop: 4, fontWeight: '600' },

  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  resultsSection: { gap: 14 },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTag: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.8, marginBottom: 6 },
  spokenText: { fontSize: 17, color: '#1e293b', fontStyle: 'italic' },

  targetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#2563eb',
    elevation: 3,
  },
  targetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTag: { fontSize: 13, fontWeight: '900', color: '#1e3a8a' },
  liveChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveChipText: { fontSize: 10, fontWeight: '800', color: '#166534' },
  targetMainText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 32,
    marginBottom: 10,
  },
  secondaryBox: {
    backgroundColor: '#fefce8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  secondaryLabel: { fontSize: 10, fontWeight: '700', color: '#854d0e', marginBottom: 2 },
  secondaryText: { fontSize: 13, fontStyle: 'italic', color: '#713f12' },

  audioRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  audioBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  audioBtnActive: { backgroundColor: '#15803d' },
  audioBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  resetBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  latencyBar: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  latencyTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.8, marginBottom: 8 },
  latencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  latencyChip: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  latencyTotal: { backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: '800' },

  instructions: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instrTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  instrStep: { fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 20 },
  pipelineBadge: {
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pipelineText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
});
