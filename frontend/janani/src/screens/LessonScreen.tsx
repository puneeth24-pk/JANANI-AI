import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LessonService } from '../services/LessonService';
import { TTSService } from '../services/TTSService';
import { LessonRecord, TargetLanguage } from '../types';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const LessonScreen: React.FC = () => {
  // Step 1: Tribal Language
  const [targetLang, setTargetLang] = useState<TargetLanguage>('sat_Olck');
  // Step 2: Class
  const [classLevel, setClassLevel] = useState<number>(2);
  // Step 3: Subject
  const [subject, setSubject] = useState<string>('EVS');
  // Step 4: Learning Objective
  const [outcome, setOutcome] = useState<string>('Foundational Literacy');
  // Step 5: Teacher Input
  const [sourceLang, setSourceLang] = useState<'hin_Deva' | 'eng_Latn'>('hin_Deva');
  const [inputText, setInputText] = useState<string>('पेड़-पौधे हमारे सच्चे मित्र हैं। वे हमें फल, छाया और ताज़ी हवा देते हैं।');

  // Generation & Pipeline state
  const [loading, setLoading] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeLangTab, setActiveLangTab] = useState<'sat_Olck' | 'ho' | 'mundari'>('sat_Olck');

  const classes = [1, 2, 3, 4, 5];
  const subjects = [
    { id: 'EVS', label: 'EVS / पर्यावरण', icon: '🌱' },
    { id: 'Language', label: 'Language / भाषा', icon: '📖' },
    { id: 'Mathematics', label: 'Mathematics / गणित', icon: '🔢' },
  ];
  const outcomes = [
    'Foundational Literacy',
    'Foundational Numeracy',
    'Reading',
    'Writing',
    'Counting',
    'Number Recognition',
    'Basic Operations',
  ];

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please enter teacher lesson content.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      setProgressStep('Preparing lesson structure...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Translating educational content...');
      const targetName =
        targetLang === 'ho' ? 'Ho' : targetLang === 'mundari' ? 'Mundari' : 'Santali';

      const generated = await LessonService.generateLesson({
        classLevel,
        subject,
        topic: outcome,
        learningOutcome: outcome,
        sourceLanguage: sourceLang,
        sourceText: inputText.trim(),
        targetLanguage: targetName,
      });

      setProgressStep('Preparing classroom content & vocabulary...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Synthesizing tribal speech...');
      await new Promise((r) => setTimeout(r, 400));

      setLesson(generated);
      setActiveLangTab(
        targetLang === 'ho' ? 'ho' : targetLang === 'mundari' ? 'mundari' : 'sat_Olck'
      );
      setLoading(false);
      setProgressStep('');

      // Auto save to local history
      try {
        await LessonService.saveHistory(generated);
      } catch (e) {}
    } catch (err: any) {
      setLoading(false);
      setProgressStep('');
      setErrorMsg(err.message || 'Lesson generation failed. Please try again.');
    }
  };

  const handlePlayVoice = (lang: 'sat_Olck' | 'ho' | 'mundari') => {
    if (!lesson) return;

    if (isPlayingAudio) {
      TTSService.stopAudio();
      setIsPlayingAudio(false);
      return;
    }

    let textToSpeak = lesson.santaliText || lesson.sourceText;
    let romanText: string | undefined = undefined;

    if (lang === 'ho') {
      textToSpeak = lesson.hoText || lesson.sourceText;
      romanText = lesson.hoRoman;
    } else if (lang === 'mundari') {
      textToSpeak = lesson.mundariText || lesson.sourceText;
      romanText = lesson.mundariRoman;
    }

    TTSService.playNaturalVoice({
      text: textToSpeak,
      romanText: romanText,
      audioUrl: lang === 'sat_Olck' ? lesson.audioUrl : undefined,
      language: lang,
      onStart: () => setIsPlayingAudio(true),
      onEnded: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  return (
    <ErrorBoundary fallbackTitle="Bilingual Lesson Generator Encountered an Issue">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bilingual Lesson Generator</Text>
          <Text style={styles.headerSub}>
            Create classroom-ready learning material in a tribal language aligned with NIPUN Bharat.
          </Text>
        </View>

        {/* Guided 5-Step Generator Card */}
        <View style={styles.generatorCard}>
          {/* STEP 1: Choose Tribal Language */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Choose Target Tribal Language</Text>
            </View>

            <View style={styles.choiceRow}>
              {[
                { code: 'sat_Olck', label: 'Santali (Ol Chiki)', icon: '🌸' },
                { code: 'ho', label: 'Ho (Warang Citi)', icon: '🌾' },
                { code: 'mundari', label: 'Mundari (Devanagari)', icon: '🌳' },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChoiceCard,
                    targetLang === lang.code && styles.langChoiceCardActive,
                  ]}
                  onPress={() => setTargetLang(lang.code as TargetLanguage)}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{lang.icon}</Text>
                  <Text
                    style={[
                      styles.langChoiceText,
                      targetLang === lang.code && styles.langChoiceTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STEP 2: Choose Class */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Choose Class / कक्षा</Text>
            </View>

            <View style={styles.choiceRow}>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.classPill, classLevel === cls && styles.classPillActive]}
                  onPress={() => setClassLevel(cls)}
                >
                  <Text
                    style={[
                      styles.classPillText,
                      classLevel === cls && styles.classPillTextActive,
                    ]}
                  >
                    Class {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STEP 3: Subject */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Select Subject / विषय</Text>
            </View>

            <View style={styles.choiceRow}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.subjectPill, subject === sub.id && styles.subjectPillActive]}
                  onPress={() => setSubject(sub.id)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{sub.icon}</Text>
                  <Text
                    style={[
                      styles.subjectPillText,
                      subject === sub.id && styles.subjectPillTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STEP 4: Learning Objective */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={styles.stepTitle}>Learning Objective / अधिगम लक्ष्य</Text>
            </View>

            <View style={styles.wrapRow}>
              {outcomes.map((out) => (
                <TouchableOpacity
                  key={out}
                  style={[styles.outcomeChip, outcome === out && styles.outcomeChipActive]}
                  onPress={() => setOutcome(out)}
                >
                  <Text
                    style={[
                      styles.outcomeChipText,
                      outcome === out && styles.outcomeChipTextActive,
                    ]}
                  >
                    {out}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STEP 5: Teacher Input */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>5</Text>
              </View>
              <Text style={styles.stepTitle}>Teacher Input / पाठ सामग्री</Text>
            </View>

            {/* Source language toggle */}
            <View style={styles.sourceLangToggleRow}>
              <TouchableOpacity
                style={[
                  styles.sourceToggleBtn,
                  sourceLang === 'hin_Deva' && styles.sourceToggleBtnActive,
                ]}
                onPress={() => setSourceLang('hin_Deva')}
              >
                <Text
                  style={[
                    styles.sourceToggleText,
                    sourceLang === 'hin_Deva' && styles.sourceToggleTextActive,
                  ]}
                >
                  हिन्दी (Hindi)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sourceToggleBtn,
                  sourceLang === 'eng_Latn' && styles.sourceToggleBtnActive,
                ]}
                onPress={() => setSourceLang('eng_Latn')}
              >
                <Text
                  style={[
                    styles.sourceToggleText,
                    sourceLang === 'eng_Latn' && styles.sourceToggleTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="Enter sentence or lesson text to translate and deliver..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
            />
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Progress Pipeline State */}
          {loading && (
            <View style={styles.progressStateBox}>
              <ActivityIndicator size="small" color="#059669" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.progressMainText}>Generating Classroom Content...</Text>
                <Text style={styles.progressStepText}>{progressStep}</Text>
              </View>
            </View>
          )}

          {/* Prominent Action Button */}
          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.generateBtnText}>
              {loading ? 'Creating Lesson...' : '⚡ Generate Lesson & Voice'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Generated Lesson Preview Card ── */}
        {lesson && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewMeta}>
                  Class {lesson.classLevel} • {lesson.subject} • {lesson.topic}
                </Text>
                <Text style={styles.previewTitle}>Lesson Material</Text>
              </View>

              <View style={styles.previewLangTabs}>
                <TouchableOpacity
                  style={[
                    styles.previewTab,
                    activeLangTab === 'sat_Olck' && styles.previewTabActive,
                  ]}
                  onPress={() => setActiveLangTab('sat_Olck')}
                >
                  <Text
                    style={[
                      styles.previewTabText,
                      activeLangTab === 'sat_Olck' && styles.previewTabTextActive,
                    ]}
                  >
                    Santali
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.previewTab,
                    activeLangTab === 'ho' && styles.previewTabActive,
                  ]}
                  onPress={() => setActiveLangTab('ho')}
                >
                  <Text
                    style={[
                      styles.previewTabText,
                      activeLangTab === 'ho' && styles.previewTabTextActive,
                    ]}
                  >
                    Ho
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.previewTab,
                    activeLangTab === 'mundari' && styles.previewTabActive,
                  ]}
                  onPress={() => setActiveLangTab('mundari')}
                >
                  <Text
                    style={[
                      styles.previewTabText,
                      activeLangTab === 'mundari' && styles.previewTabTextActive,
                    ]}
                  >
                    Mundari
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tribal Content Box */}
            <View style={styles.tribalOutputBox}>
              <View style={styles.outputBoxHeader}>
                <Text style={styles.outputBoxLabel}>
                  {activeLangTab === 'sat_Olck'
                    ? 'Santali (Ol Chiki Script)'
                    : activeLangTab === 'ho'
                    ? 'Ho (Warang Citi Script)'
                    : 'Mundari (Devanagari Script)'}
                </Text>

                <TouchableOpacity
                  style={styles.listenVoiceBtn}
                  onPress={() => handlePlayVoice(activeLangTab)}
                >
                  <Text style={styles.listenVoiceText}>
                    {isPlayingAudio ? '⏸ Stop Audio' : '🔊 Listen Voice'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.tribalOutputText}>
                {activeLangTab === 'sat_Olck'
                  ? lesson.santaliText
                  : activeLangTab === 'ho'
                  ? lesson.hoText || lesson.sourceText
                  : lesson.mundariText || lesson.sourceText}
              </Text>

              {activeLangTab === 'ho' && lesson.hoRoman && (
                <Text style={styles.phoneticNote}>🗣️ {lesson.hoRoman}</Text>
              )}
              {activeLangTab === 'mundari' && lesson.mundariRoman && (
                <Text style={styles.phoneticNote}>🗣️ {lesson.mundariRoman}</Text>
              )}
            </View>

            {/* Source Sentence Box */}
            <View style={styles.sourceOutputBox}>
              <Text style={styles.sourceBoxLabel}>Teacher Original ({lesson.sourceLanguage}):</Text>
              <Text style={styles.sourceOutputText}>{lesson.sourceText}</Text>
            </View>

            {/* Activities & Assessments */}
            {lesson.activities && lesson.activities.length > 0 && (
              <View style={styles.activityBox}>
                <Text style={styles.activityTitle}>🧩 Suggested Classroom Activities:</Text>
                {lesson.activities.map((act, idx) => (
                  <Text key={idx} style={styles.activityItem}>
                    • {act}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 60, width: '100%' },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#064e3b', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#475569', lineHeight: 18 },

  generatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },

  stepSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  choiceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  langChoiceCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  langChoiceCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  langChoiceText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  langChoiceTextActive: { color: '#064e3b', fontWeight: '800' },

  classPill: {
    flex: 1,
    minWidth: 60,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  classPillActive: { backgroundColor: '#059669' },
  classPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  classPillTextActive: { color: '#ffffff' },

  subjectPill: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subjectPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  subjectPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  subjectPillTextActive: { color: '#064e3b', fontWeight: '800' },

  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outcomeChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  outcomeChipActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  outcomeChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  outcomeChipTextActive: { color: '#92400e', fontWeight: '800' },

  sourceLangToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sourceToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  sourceToggleBtnActive: { backgroundColor: '#dbeafe' },
  sourceToggleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  sourceToggleTextActive: { color: '#1d4ed8', fontWeight: '800' },

  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 90,
    textAlignVertical: 'top',
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  progressStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  progressMainText: { fontSize: 13, fontWeight: '700', color: '#064e3b' },
  progressStepText: { fontSize: 11, color: '#047857', marginTop: 2 },

  generateBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.6 },
  generateBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  // Preview Card
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  previewMeta: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  previewTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  previewLangTabs: { flexDirection: 'row', gap: 6 },
  previewTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  previewTabActive: { backgroundColor: '#059669' },
  previewTabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  previewTabTextActive: { color: '#ffffff', fontWeight: '800' },

  tribalOutputBox: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 14,
  },
  outputBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  outputBoxLabel: { fontSize: 11, fontWeight: '800', color: '#064e3b' },
  listenVoiceBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  listenVoiceText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  tribalOutputText: { fontSize: 16, fontWeight: '700', color: '#064e3b', lineHeight: 24 },
  phoneticNote: { fontSize: 12, color: '#047857', fontStyle: 'italic', marginTop: 6 },

  sourceOutputBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  sourceBoxLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  sourceOutputText: { fontSize: 13, color: '#334155', lineHeight: 18 },

  activityBox: {
    backgroundColor: '#fefce8',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  activityTitle: { fontSize: 12, fontWeight: '800', color: '#854d0e', marginBottom: 6 },
  activityItem: { fontSize: 12, color: '#713f12', lineHeight: 18 },
});
