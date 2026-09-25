import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { OlChikiCard } from '../components/OlChikiCard';
import { TranslationService } from '../services/TranslationService';
import { SpeechService } from '../services/SpeechService';
import { LessonService } from '../services/LessonService';
import { TTSService } from '../services/TTSService';
import { SourceLanguage, TargetLanguage } from '../types';

interface TargetLangConfig {
  id: TargetLanguage;
  label: string;
  nativeLabel: string;
  script: string;
  badge: string;
  color: string;
}

const TARGET_LANGS: TargetLangConfig[] = [
  { id: 'sat_Olck', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki', badge: 'Neural AI', color: '#16a34a' },
  { id: 'ho', label: 'Ho', nativeLabel: '𑢹𑣉 / Ho', script: 'Warang Citi & Latin', badge: 'Warang Citi', color: '#2563eb' },
  { id: 'mundari', label: 'Mundari', nativeLabel: 'मुंडारी / ᱢᱩᱱᱰᱟᱨᱤ', script: 'Devanagari & Roman', badge: '10K Dataset', color: '#7c3aed' },
];

interface SrcLangConfig {
  code: SourceLanguage;
  label: string;
  flag: string;
  placeholder: string;
}

const SRC_LANGS: SrcLangConfig[] = [
  { code: 'hin_Deva', label: 'हिंदी (Hindi)', flag: '🇮🇳', placeholder: 'यहाँ हिंदी में वाक्य लिखें या बोलें...' },
  { code: 'eng_Latn', label: 'English', flag: '🇬🇧', placeholder: 'Type or speak sentence in English...' },
];

const SAMPLE_SENTENCES: Record<SourceLanguage, string[]> = {
  hin_Deva: [
    'यह एक किताब है।',
    'सभी बच्चे अपनी जगह पर बैठें।',
    'पत्ते, तना और जड़ पौधे के मुख्य भाग हैं।',
    'पानी पियो और हाथ धो लो।',
    'नमस्ते, आप कैसे हैं?',
    'आज हम पौधों के बारे में सीखेंगे।',
  ],
  eng_Latn: [
    'This is a book.',
    'All children please sit down.',
    'Leaves, stem and roots are the main parts of a plant.',
    'Drink water and wash your hands.',
    'Hello, how are you?',
    'Today we will learn about plants.',
  ],
};

export const TranslateScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [sourceLang, setSourceLang] = useState<SourceLanguage>('hin_Deva');
  const [targetLang, setTargetLang] = useState<TargetLanguage>('sat_Olck');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [romanText, setRomanText] = useState<string | undefined>();
  const [scriptName, setScriptName] = useState<string>('Ol Chiki');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sourcePlaceholder = SRC_LANGS.find((l) => l.code === sourceLang)?.placeholder || 'Type here...';
  const sampleSentences = SAMPLE_SENTENCES[sourceLang];
  const targetLangConfig = TARGET_LANGS.find((t) => t.id === targetLang)!;

  const handleTranslate = async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text) {
      setErrorMsg('Please type or speak a sentence.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setTranslatedText('');
    setRomanText(undefined);
    setSaved(false);
    setCopied(false);
    setIsPlayingVoice(false);
    TTSService.stopAudio();

    const start = performance.now();
    try {
      const res = await TranslationService.translate({
        text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      setLatencyMs(Math.round(performance.now() - start));
      if (res.success && res.translatedText) {
        setTranslatedText(res.translatedText);
        setRomanText(res.romanText);
        setScriptName(
          res.script ||
            (targetLang === 'sat_Olck'
              ? 'Ol Chiki'
              : targetLang === 'ho'
              ? 'Warang Citi'
              : 'Devanagari')
        );
      } else {
        setErrorMsg(res.error || 'Translation failed.');
      }
    } catch (err: any) {
      setLatencyMs(Math.round(performance.now() - start));
      setErrorMsg(err.message || 'Translation failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Voice Recording & Offline Whisper STT ──
  const startRecording = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Microphone access is not supported in this browser.');
        return;
      }

      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });

        if (audioBlob.size < 100) {
          setErrorMsg('Audio recording was too short.');
          setIsRecording(false);
          setVoiceStatus(null);
          return;
        }

        setVoiceStatus('🧠 Whisper Transcribing...');
        setLoading(true);

        try {
          const res = await SpeechService.transcribe({
            audioBlob,
            language: sourceLang,
          });

          if (res.success && res.text) {
            setInputText(res.text);
            setVoiceStatus(null);
            setIsRecording(false);
            // Translate the transcribed speech
            await handleTranslate(res.text);
          } else {
            setErrorMsg(res.error || 'Could not recognize speech.');
            setIsRecording(false);
            setVoiceStatus(null);
            setLoading(false);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Speech recognition failed.');
          setIsRecording(false);
          setVoiceStatus(null);
          setLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setVoiceStatus('🎙️ Listening... (Speak clearly)');
    } catch (err: any) {
      setErrorMsg('Microphone permission denied or unavailable.');
      setIsRecording(false);
      setVoiceStatus(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceStatus('⏳ Processing speech...');
    }
  };

  const handlePlayVoice = () => {
    if (isPlayingVoice) {
      TTSService.stopAudio();
      setIsPlayingVoice(false);
      return;
    }
    TTSService.playNaturalVoice({
      text: translatedText,
      romanText: romanText,
      language: targetLang,
      onStart: () => setIsPlayingVoice(true),
      onEnded: () => setIsPlayingVoice(false),
    });
  };

  const handleSaveLesson = async () => {
    if (!inputText || !translatedText) return;
    await LessonService.saveHistory({
      classLevel: 2,
      subject: 'Language',
      topic: 'Vocabulary & Phrases',
      sourceLanguage: sourceLang === 'hin_Deva' ? 'Hindi' : 'English',
      sourceText: inputText,
      santaliText: translatedText,
    });
    setSaved(true);
  };

  const copyToClipboard = (txt: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Page Title ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>🌐 Language Translator</Text>
        <Text style={styles.pageSub}>Hindi & English → Santali (Ol Chiki), Ho & Mundari</Text>
      </View>

      {/* ── Input Mode Selector: Text vs Voice ── */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[styles.modeToggleBtn, inputMode === 'text' && styles.modeToggleBtnActive]}
          onPress={() => {
            setInputMode('text');
            if (isRecording) stopRecording();
          }}
        >
          <Text style={[styles.modeToggleText, inputMode === 'text' && styles.modeToggleTextActive]}>
            ⌨️ Text Input
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeToggleBtn, inputMode === 'voice' && styles.modeToggleBtnActive]}
          onPress={() => setInputMode('voice')}
        >
          <Text style={[styles.modeToggleText, inputMode === 'voice' && styles.modeToggleTextActive]}>
            🎙️ Voice Input (Whisper)
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Source Language ── */}
      <Text style={styles.sectionLabel}>SOURCE LANGUAGE</Text>
      <View style={styles.srcRow}>
        {SRC_LANGS.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.srcChip, sourceLang === lang.code && styles.srcChipActive]}
            onPress={() => {
              setSourceLang(lang.code);
              setTranslatedText('');
              setErrorMsg(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.flagIcon}>{lang.flag}</Text>
            <Text style={[styles.srcChipText, sourceLang === lang.code && styles.srcChipTextActive]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Target Language ── */}
      <Text style={[styles.sectionLabel, { marginTop: 14 }]}>TARGET LANGUAGE</Text>
      <View style={styles.targetRow}>
        {TARGET_LANGS.map((tgt) => (
          <TouchableOpacity
            key={tgt.id}
            style={[
              styles.targetBtn,
              targetLang === tgt.id && {
                borderColor: tgt.color,
                backgroundColor: tgt.color + '0d',
              },
            ]}
            onPress={() => {
              setTargetLang(tgt.id);
              setTranslatedText('');
              setErrorMsg(null);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.targetHeader}>
              <Text
                style={[
                  styles.targetBtnTitle,
                  targetLang === tgt.id && { color: tgt.color },
                ]}
              >
                {tgt.label}
              </Text>
              <View
                style={[
                  styles.availBadge,
                  targetLang === tgt.id && { backgroundColor: tgt.color + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.availBadgeText,
                    targetLang === tgt.id && { color: tgt.color },
                  ]}
                >
                  {tgt.badge}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.targetBtnNative,
                targetLang === tgt.id && { color: tgt.color },
              ]}
            >
              {tgt.nativeLabel}
            </Text>
            <Text style={styles.targetSub}>{tgt.script}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Input Card (Text Mode vs Voice Mode) ── */}
      <View style={styles.inputCard}>
        {inputMode === 'text' ? (
          <>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder={sourcePlaceholder}
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={(txt) => {
                setInputText(txt);
                if (errorMsg) setErrorMsg(null);
              }}
            />

            {/* Quick Phrases */}
            <View style={styles.chipsRow}>
              <Text style={styles.chipsLabel}>Quick Phrases:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sampleSentences.map((sample, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chip}
                    onPress={() => {
                      setInputText(sample);
                      handleTranslate(sample);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipText}>{sample}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Translate Button */}
            <TouchableOpacity
              style={[
                styles.translateBtn,
                { backgroundColor: targetLangConfig.color },
                (!inputText.trim() || loading) && styles.translateBtnDisabled,
              ]}
              onPress={() => handleTranslate()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.translateBtnText}>
                    Translating to {targetLangConfig.label}...
                  </Text>
                </View>
              ) : (
                <Text style={styles.translateBtnText}>
                  Translate → {targetLangConfig.label} ({targetLangConfig.nativeLabel})
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* Voice Mode Recording Panel */
          <View style={styles.voicePanel}>
            <Text style={styles.voicePrompt}>
              Speak clearly in {sourceLang === 'hin_Deva' ? 'Hindi' : 'English'}
            </Text>
            <Text style={styles.voiceSubPrompt}>
              Offline Whisper ASR will convert speech to text and translate automatically.
            </Text>

            <View style={styles.micContainer}>
              <TouchableOpacity
                style={[
                  styles.bigMicBtn,
                  isRecording && styles.bigMicBtnRecording,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.85}
              >
                <Text style={styles.bigMicEmoji}>{isRecording ? '⏹' : '🎤'}</Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.voiceStatusText,
                isRecording && styles.voiceStatusRecording,
              ]}
            >
              {voiceStatus || (isRecording ? 'Recording... Tap to Finish' : 'Tap Microphone to Speak')}
            </Text>

            {inputText ? (
              <View style={styles.voiceTranscribedBox}>
                <Text style={styles.voiceTranscribedLabel}>Recognized Speech:</Text>
                <Text style={styles.voiceTranscribedText}>"{inputText}"</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* ── Error ── */}
      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* ── Translation Output ── */}
      {translatedText ? (
        <View style={styles.outputSection}>
          <View style={styles.outputMeta}>
            <Text style={[styles.outputMetaOk, { color: targetLangConfig.color }]}>
              ✓ {targetLangConfig.label} · {scriptName} · Offline AI
            </Text>
            {latencyMs !== null && (
              <Text style={styles.latencyTag}>{(latencyMs / 1000).toFixed(2)}s</Text>
            )}
          </View>

          {targetLang === 'sat_Olck' ? (
            <OlChikiCard
              santaliText={translatedText}
              sourceText={inputText}
              sourceLang={sourceLang === 'hin_Deva' ? 'Hindi' : 'English'}
              onSave={handleSaveLesson}
              isSaved={saved}
            />
          ) : (
            <View style={[styles.tribalCard, { borderColor: targetLangConfig.color + '40' }]}>
              {/* Header row */}
              <View style={styles.tribalHeader}>
                <View>
                  <Text style={[styles.tribalLangTitle, { color: targetLangConfig.color }]}>
                    {targetLangConfig.label}
                  </Text>
                  <Text style={styles.tribalScriptBadge}>{scriptName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(translatedText)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
                </TouchableOpacity>
              </View>

              {/* Main Script Output */}
              <View
                style={[
                  styles.nativeTextContainer,
                  { borderColor: targetLangConfig.color + '30' },
                ]}
              >
                <Text style={styles.tribalMainText}>{translatedText}</Text>
              </View>

              {/* Roman Phonetic */}
              {romanText && (
                <View style={styles.romanBox}>
                  <Text style={styles.romanLabel}>📢 Phonetic Pronunciation:</Text>
                  <Text style={styles.romanText}>"{romanText}"</Text>
                </View>
              )}

              {/* ── VOICE PLAYER BAR ── */}
              <TouchableOpacity
                style={[
                  styles.voicePlayerBar,
                  {
                    borderColor: targetLangConfig.color + '50',
                    backgroundColor: targetLangConfig.color + '08',
                  },
                ]}
                onPress={handlePlayVoice}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.voicePlayIcon,
                    { backgroundColor: targetLangConfig.color },
                  ]}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>
                    {isPlayingVoice ? '⏹' : '▶'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.voiceLabel, { color: targetLangConfig.color }]}>
                    {isPlayingVoice
                      ? `Speaking ${targetLangConfig.label}...`
                      : `Listen in ${targetLangConfig.label}`}
                  </Text>
                  <Text
                    style={[
                      styles.voiceWave,
                      { color: isPlayingVoice ? targetLangConfig.color : '#94a3b8' },
                    ]}
                  >
                    {isPlayingVoice
                      ? 'ılılılılılılılılılılılılı'
                      : 'ı  ı  ı  ı  ı  ı  ı  ı  ı  ı'}
                  </Text>
                </View>
                <Text style={{ fontSize: 20 }}>🔊</Text>
              </TouchableOpacity>

              {/* Source */}
              <View style={styles.sourceBox}>
                <Text style={styles.sourceLabel}>
                  {sourceLang === 'hin_Deva' ? 'Hindi' : 'English'} Original:
                </Text>
                <Text style={styles.sourceContent}>{inputText}</Text>
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnDone]}
                onPress={handleSaveLesson}
                disabled={saved}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveBtnText, saved && styles.saveBtnTextDone]}>
                  {saved ? '✓ Saved in Lesson History' : '💾 Save to Classroom Lessons'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 60, width: '100%' },

  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Mode Toggle
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeToggleTextActive: {
    color: '#ffffff',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 8,
  },

  srcRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  srcChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  srcChipActive: { backgroundColor: '#1e3a8a', borderColor: '#1d4ed8' },
  flagIcon: { fontSize: 16 },
  srcChipText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  srcChipTextActive: { color: '#ffffff' },

  targetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  targetBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetBtnTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  targetBtnNative: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 2 },
  targetSub: { fontSize: 10, color: '#94a3b8' },
  availBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availBadgeText: { fontSize: 9, fontWeight: '700', color: '#64748b' },

  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  textInput: {
    minHeight: 80,
    fontSize: 16,
    color: '#0f172a',
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 12,
  },
  chipsRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginBottom: 14,
  },
  chipsLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 6 },
  chip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  chipText: { fontSize: 12, color: '#334155' },
  translateBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateBtnDisabled: { opacity: 0.5 },
  translateBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Voice Panel
  voicePanel: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  voicePrompt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  voiceSubPrompt: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  micContainer: {
    marginVertical: 12,
  },
  bigMicBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  bigMicBtnRecording: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
  },
  bigMicEmoji: {
    fontSize: 30,
    color: '#ffffff',
  },
  voiceStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  voiceStatusRecording: {
    color: '#dc2626',
  },
  voiceTranscribedBox: {
    marginTop: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
  },
  voiceTranscribedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  voiceTranscribedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },

  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  outputSection: { marginTop: 20 },
  outputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  outputMetaOk: { fontSize: 12, fontWeight: '700' },
  latencyTag: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  tribalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1.5 },
  tribalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  tribalLangTitle: { fontSize: 17, fontWeight: '800' },
  tribalScriptBadge: { fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 },
  copyBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  nativeTextContainer: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  tribalMainText: { fontSize: 22, fontWeight: '700', color: '#0f172a', lineHeight: 32 },
  romanBox: {
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  romanLabel: { fontSize: 11, fontWeight: '700', color: '#854d0e', marginBottom: 4 },
  romanText: { fontSize: 14, fontStyle: 'italic', color: '#713f12' },

  voicePlayerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  voicePlayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceLabel: { fontSize: 13, fontWeight: '700' },
  voiceWave: { fontSize: 12, marginTop: 2, letterSpacing: 1 },

  sourceBox: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 14,
  },
  sourceLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  sourceContent: { fontSize: 13, color: '#475569' },
  saveBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  saveBtnTextDone: { color: '#166534' },
});
