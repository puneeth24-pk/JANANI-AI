import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MicButton, PipelineStage } from '../components/MicButton';
import { OlChikiCard } from '../components/OlChikiCard';
import { SpeechService } from '../services/SpeechService';
import { TranslationService } from '../services/TranslationService';
import { TTSService } from '../services/TTSService';
import { LessonService } from '../services/LessonService';

export const ClassroomScreen: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<'hin_Deva' | 'eng_Latn'>('hin_Deva');
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [teacherText, setTeacherText] = useState<string>('');
  const [santaliText, setSantaliText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [timings, setTimings] = useState<{
    speech: number;
    trans: number;
    tts: number;
    total: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setErrorMsg(null);
    setSaved(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported on this browser/device.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await executeVoicePipeline(audioBlob);
      };

      mediaRecorder.start();
      setStage('listening');
    } catch (err: any) {
      console.warn('Microphone unavailable, using classroom demo phrase:', err);
      const sampleText =
        sourceLang === 'hin_Deva'
          ? 'अपनी किताब खोलो और पाठ दो पढ़ो।'
          : 'Open your book and read lesson two.';
      await executeTextFallback(sampleText);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && stage === 'listening') {
      mediaRecorderRef.current.stop();
      setStage('recognizing');
    }
  };

  const handleMicToggle = () => {
    if (stage === 'idle') {
      startRecording();
    } else if (stage === 'listening') {
      stopRecording();
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // VOICE PATH — single /api/lesson/speech (STT + translate + TTS in one)
  // Fixes "fail to get": was 3 round trips × MODEL_LOCK, now 1 round trip.
  // ──────────────────────────────────────────────────────────────────────
  const executeVoicePipeline = async (audioBlob: Blob) => {
    const totalStart = performance.now();
    setErrorMsg(null);
    setStage('recognizing');

    try {
      const res = await SpeechService.processSpeechPipeline({
        audioBlob,
        sourceLanguage: sourceLang,
      });

      const totalElapsed = Math.round(performance.now() - totalStart);

      if (!res.success) {
        setStage('idle');
        setErrorMsg(res.error || "Couldn't process speech. Please try again.");
        return;
      }

      if (res.transcription) setTeacherText(res.transcription);
      if (res.santali_text) setSantaliText(res.santali_text);

      const t = res.timing || {};
      setTimings({
        speech: t.stt_ms ? +(t.stt_ms / 1000).toFixed(1) : 0,
        trans: t.translation_ms ? +(t.translation_ms / 1000).toFixed(1) : 0,
        tts: t.tts_ms ? +(t.tts_ms / 1000).toFixed(1) : 0,
        total: +(totalElapsed / 1000).toFixed(1),
      });

      if (res.audioUrl) {
        setAudioUrl(res.audioUrl);
        setStage('speaking');
        TTSService.playAudio(res.audioUrl, () => setStage('idle'));
      } else {
        setStage('idle');
      }
    } catch (err: any) {
      setStage('idle');
      setErrorMsg(err.message || 'Pipeline failed. Is the JANANI server running on port 2004?');
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // TEXT FALLBACK — single /api/lesson/text (translate + TTS in one)
  // ──────────────────────────────────────────────────────────────────────
  const executeTextFallback = async (text: string) => {
    const totalStart = performance.now();
    setStage('translating');
    setTeacherText(text);

    try {
      const res = await TranslationService.translateWithTTS({
        text,
        sourceLanguage: sourceLang,
      });

      const totalElapsed = Math.round(performance.now() - totalStart);

      if (!res.success) {
        setStage('idle');
        setErrorMsg(res.error || 'Processing failed.');
        return;
      }

      if (res.santaliText) setSantaliText(res.santaliText);

      const t = res.timing || {};
      setTimings({
        speech: 0,
        trans: t.translation_ms ? +(t.translation_ms / 1000).toFixed(1) : 0,
        tts: t.tts_ms ? +(t.tts_ms / 1000).toFixed(1) : 0,
        total: +(totalElapsed / 1000).toFixed(1),
      });

      if (res.audioUrl) {
        setAudioUrl(res.audioUrl);
        setStage('speaking');
        TTSService.playAudio(res.audioUrl, () => setStage('idle'));
      } else {
        setStage('idle');
      }
    } catch (err: any) {
      setStage('idle');
      setErrorMsg(err.message || 'Text pipeline failed. Is the JANANI server running?');
    }
  };

  const handleSaveLesson = async () => {
    if (!teacherText || !santaliText) return;
    await LessonService.saveHistory({
      classLevel: 2,
      subject: 'Language',
      topic: 'Classroom Instruction',
      sourceLanguage: sourceLang === 'hin_Deva' ? 'Hindi' : 'English',
      sourceText: teacherText,
      santaliText,
      audioUrl,
    });
    setSaved(true);
  };

  const handleReplay = () => {
    if (audioUrl) {
      TTSService.playAudio(audioUrl);
    }
  };

  const handleNewSentence = () => {
    setTeacherText('');
    setSantaliText('');
    setAudioUrl(undefined);
    setTimings(null);
    setErrorMsg(null);
    setSaved(false);
    setStage('idle');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Language Selector Header */}
      <View style={styles.topControlRow}>
        <Text style={styles.sectionHeader}>SANTALI CLASSROOM</Text>
        <View style={styles.langSelector}>
          <TouchableOpacity
            style={[styles.langBtn, sourceLang === 'hin_Deva' && styles.langBtnActive]}
            onPress={() => setSourceLang('hin_Deva')}
          >
            <Text style={[styles.langBtnText, sourceLang === 'hin_Deva' && styles.langBtnTextActive]}>
              हिंदी (Hindi)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, sourceLang === 'eng_Latn' && styles.langBtnActive]}
            onPress={() => setSourceLang('eng_Latn')}
          >
            <Text style={[styles.langBtnText, sourceLang === 'eng_Latn' && styles.langBtnTextActive]}>
              English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Microphone Card */}
      <View style={styles.micCard}>
        <MicButton
          stage={stage}
          onPress={handleMicToggle}
          languageLabel={sourceLang === 'hin_Deva' ? 'Hindi' : 'English'}
        />

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </View>

      {/* Live Classroom Output */}
      {teacherText ? (
        <View style={styles.resultSection}>
          <View style={styles.teacherCard}>
            <Text style={styles.cardTag}>TEACHER SAID ({sourceLang === 'hin_Deva' ? 'HINDI' : 'ENGLISH'})</Text>
            <Text style={styles.teacherSpeechText}>"{teacherText}"</Text>
          </View>

          {santaliText ? (
            <OlChikiCard
              santaliText={santaliText}
              sourceText={teacherText}
              sourceLang={sourceLang === 'hin_Deva' ? 'Hindi' : 'English'}
              audioUrl={audioUrl}
              onSave={handleSaveLesson}
              isSaved={saved}
            />
          ) : null}

          {/* Actual Measured Latency */}
          {timings && (
            <View style={styles.latencyCard}>
              <Text style={styles.latencyTitle}>⚡ ACTUAL MEASURED PROCESSING TIME</Text>
              <View style={styles.latencyRow}>
                {timings.speech > 0 && (
                  <>
                    <Text style={styles.latencyMetric}>Speech: {timings.speech}s</Text>
                    <Text style={styles.latencyDivider}>|</Text>
                  </>
                )}
                <Text style={styles.latencyMetric}>Translation: {timings.trans}s</Text>
                <Text style={styles.latencyDivider}>|</Text>
                <Text style={styles.latencyMetric}>TTS: {timings.tts}s</Text>
                <Text style={styles.latencyDivider}>|</Text>
                <Text style={styles.latencyTotal}>Total: {timings.total}s</Text>
              </View>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {audioUrl && (
              <TouchableOpacity style={styles.quickActionBtn} onPress={handleReplay}>
                <Text style={styles.quickActionText}>🔁 Replay Voice</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleNewSentence}>
              <Text style={styles.quickActionText}>➕ New Sentence</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How to Teach in Classroom Mode:</Text>
          <Text style={styles.instructionStep}>1. Tap the big microphone button above.</Text>
          <Text style={styles.instructionStep}>2. Speak your instruction naturally in Hindi or English.</Text>
          <Text style={styles.instructionStep}>3. JANANI will automatically recognize, translate, and speak Santali (Ol Chiki) aloud to your students.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: 0.8,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  langBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  langBtnTextActive: {
    color: '#1e3a8a',
    fontWeight: '800',
  },
  micCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  resultSection: {
    marginTop: 8,
  },
  teacherCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  teacherSpeechText: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 24,
  },
  latencyCard: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  latencyTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  latencyMetric: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  latencyDivider: {
    marginHorizontal: 8,
    color: '#94a3b8',
  },
  latencyTotal: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  instructionCard: {
    backgroundColor: '#eff6ff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginTop: 4,
  },
});
