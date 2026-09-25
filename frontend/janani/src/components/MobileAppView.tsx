import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { PlantDiagram } from './PlantDiagram';
import { TTSService } from '../services/TTSService';
import { TranslationService } from '../services/TranslationService';

type MobileScreen =
  | 'Splash'
  | 'Home'
  | 'LanguageSelect'
  | 'LessonList'
  | 'LessonPage'
  | 'Translate'
  | 'Progress'
  | 'WorksheetPractice';

interface MobileAppViewProps {
  onBackToPortal?: () => void;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({ onBackToPortal }) => {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('Home');
  const [selectedLang, setSelectedLang] = useState<'sat_Olck' | 'hin_Deva' | 'eng_Latn' | 'ho' | 'mundari'>('sat_Olck');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [translateMode, setTranslateMode] = useState<'text' | 'voice'>('text');
  const [transInput, setTransInput] = useState('आओ मिलकर सीखें');
  const [transResult, setTransResult] = useState('ᱫᱮᱞᱟ ᱢᱤᱫ ᱥᱟᱶᱛᱮ ᱵᱚᱱ ᱪᱮᱫ-ᱟ ᱾');
  const [transTargetLang, setTransTargetLang] = useState<'sat_Olck' | 'ho' | 'mundari'>('sat_Olck');

  // Interactive Worksheet State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);

  const practiceQuestions = [
    {
      questionEn: 'Which part of the plant makes food?',
      questionHi: 'पौधे का कौन सा भाग भोजन बनाता है?',
      questionSat: 'ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱚᱠᱟ ᱦᱟᱹᱴᱤᱧ ᱡᱚᱢᱟᱜ ᱮ ᱵᱮᱱᱟᱣᱟ?',
      options: [
        { id: 0, text: 'Leaves (ᱥᱟᱠᱟᱢ / पत्ते)', correct: true },
        { id: 1, text: 'Roots (ᱨᱮᱦᱮᱫ / जड़)', correct: false },
        { id: 2, text: 'Stem (ᱰᱟᱹᱨ / तना)', correct: false },
        { id: 3, text: 'Flower (ᱵᱟᱦᱟ / फूल)', correct: false },
      ],
      explanation: 'Leaves absorb sunlight and make food for the whole plant through photosynthesis.',
    },
    {
      questionEn: 'Which part absorbs water from the soil?',
      questionHi: 'मिट्टी से पानी कौन सा भाग सोखता है?',
      questionSat: 'ᱦᱟᱥᱟ ᱠᱷᱚᱱ ᱫᱟᱜ ᱫᱚ ᱚᱠᱟ ᱦᱟᱹᱴᱤᱧ ᱮ ᱚᱨ-ᱟ?',
      options: [
        { id: 0, text: 'Flower (ᱵᱟᱦᱟ / फूल)', correct: false },
        { id: 1, text: 'Roots (ᱨᱮᱦᱮᱫ / जड़)', correct: true },
        { id: 2, text: 'Fruit (ᱡᱚ / फल)', correct: false },
        { id: 3, text: 'Leaves (ᱥᱟᱠᱟᱢ / पत्ते)', correct: false },
      ],
      explanation: 'Roots grow underground and absorb water and minerals from the soil.',
    },
    {
      questionEn: 'What do plants need to grow?',
      questionHi: 'पौधों को बढ़ने के लिए किसकी आवश्यकता होती है?',
      questionSat: 'ᱫᱟᱨᱮ ᱦᱟᱨᱟᱜ ᱞᱟᱹᱜᱤᱫ ᱪᱮᱫ ᱞᱟᱹᱠᱛᱤᱭᱟ?',
      options: [
        { id: 0, text: 'Sunlight & Water (ᱥᱤᱛᱩᱝ ᱟᱨ ᱫᱟᱜ)', correct: true },
        { id: 1, text: 'Darkness (ᱧᱩᱛ)', correct: false },
        { id: 2, text: 'Only Stone (ᱫᱷᱤᱨᱤ ᱥᱩᱢᱩᱝ)', correct: false },
        { id: 3, text: 'None of these (ᱱᱚᱶᱟ ᱠᱚ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ)', correct: false },
      ],
      explanation: 'Plants need sunlight, fresh air, water, and soil nutrients to grow healthy.',
    },
  ];

  const handleTranslate = async () => {
    if (!transInput.trim()) return;
    try {
      const res = await TranslationService.translate({
        text: transInput,
        sourceLanguage: 'hin_Deva',
        targetLanguage: transTargetLang,
      });
      if (res.success && res.translatedText) {
        setTransResult(res.translatedText);
      }
    } catch {
      // Fallback response
      if (transTargetLang === 'ho') {
        setTransResult('𑢱𑣈𑣘𑣁 𑣕𑣂𑣑 𑣚𑣁𑣙𑣐𑣈 𑣂𑣐𑣃𑣌𑣉𑣁 (Dela mid sawte itukoa)');
      } else if (transTargetLang === 'mundari') {
        setTransResult('देला मियद सांवते इतुकोआ (Dela miyad sawte itukoa)');
      } else {
        setTransResult('ᱫᱮᱞᱟ ᱢᱤᱫ ᱥᱟᱶᱛᱮ ᱵᱚᱱ ᱪᱮᱫ-ᱟ ᱾');
      }
    }
  };

  const playLessonAudio = (text: string, romanText?: string) => {
    if (isPlayingAudio) {
      TTSService.stopAudio();
      setIsPlayingAudio(false);
      return;
    }
    TTSService.playNaturalVoice({
      text,
      romanText,
      language: selectedLang,
      onStart: () => setIsPlayingAudio(true),
      onEnded: () => setIsPlayingAudio(false),
    });
  };

  return (
    <View style={styles.phoneOuterContainer}>
      {/* ── Outer Phone Mockup Frame ── */}
      <View style={styles.phoneFrame}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.notchPill} />
          <View style={styles.statusIcons}>
            <Text style={styles.statusIconItem}>📶</Text>
            <Text style={styles.statusIconItem}>🔋</Text>
          </View>
        </View>

        {/* ── Screen Content Router ── */}
        <View style={styles.screenInner}>
          {/* 1. Splash Screen */}
          {currentScreen === 'Splash' && (
            <View style={styles.splashContainer}>
              <View style={styles.splashTop}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoBookEmoji}>📖</Text>
                </View>
                <Text style={styles.splashTitle}>Janani</Text>
                <Text style={styles.splashTagline}>Learn Together. Grow Further.</Text>

                <View style={styles.childrenIllustration}>
                  <Text style={{ fontSize: 56 }}>👧🏽👦🏽🎒</Text>
                </View>
              </View>

              <View style={styles.splashBottom}>
                <TouchableOpacity
                  style={styles.splashPrimaryBtn}
                  onPress={() => setCurrentScreen('Home')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.splashPrimaryText}>Get Started →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.splashSecondaryBtn}
                  onPress={() => setCurrentScreen('Home')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.splashSecondaryText}>Use Offline Mode</Text>
                </TouchableOpacity>

                <Text style={styles.splashSupports}>Supports: Santali | Hindi | English | Ho | Mundari</Text>
              </View>
            </View>
          )}

          {/* 2. Mobile Home / Dashboard */}
          {currentScreen === 'Home' && (
            <ScrollView style={styles.scrollScreen} contentContainerStyle={styles.scrollContent}>
              <View style={styles.homeHeader}>
                <View style={styles.headerBrand}>
                  <Text style={styles.brandIcon}>📖</Text>
                  <Text style={styles.brandTitle}>Janani</Text>
                </View>
                <TouchableOpacity onPress={() => setCurrentScreen('LanguageSelect')} style={styles.profileBtn}>
                  <Text style={{ fontSize: 16 }}>👩‍🏫</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.welcomeGreeting}>
                <Text style={styles.greetingTitle}>Hello! 👋</Text>
                <Text style={styles.greetingSub}>Let's learn together</Text>
              </View>

              {/* 2x2 Main Action Grid */}
              <View style={styles.grid2x2}>
                <TouchableOpacity
                  style={[styles.gridCard, { backgroundColor: '#fef9c3', borderColor: '#fef08a' }]}
                  onPress={() => setCurrentScreen('LessonList')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gridIconCircle, { backgroundColor: '#fef08a' }]}>
                    <Text style={{ fontSize: 24 }}>📖</Text>
                  </View>
                  <Text style={styles.gridCardTitle}>Learn</Text>
                  <Text style={styles.gridCardSub}>Start a lesson</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                  onPress={() => setCurrentScreen('Translate')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gridIconCircle, { backgroundColor: '#bfdbfe' }]}>
                    <Text style={{ fontSize: 24 }}>🌐</Text>
                  </View>
                  <Text style={styles.gridCardTitle}>Translate</Text>
                  <Text style={styles.gridCardSub}>Text / Voice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                  onPress={() => setCurrentScreen('WorksheetPractice')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gridIconCircle, { backgroundColor: '#bbf7d0' }]}>
                    <Text style={{ fontSize: 24 }}>🎮</Text>
                  </View>
                  <Text style={styles.gridCardTitle}>Practice</Text>
                  <Text style={styles.gridCardSub}>Activities & Quiz</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}
                  onPress={() => setCurrentScreen('Progress')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gridIconCircle, { backgroundColor: '#e9d5ff' }]}>
                    <Text style={{ fontSize: 24 }}>📊</Text>
                  </View>
                  <Text style={styles.gridCardTitle}>My Progress</Text>
                  <Text style={styles.gridCardSub}>View progress</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Lessons */}
              <View style={styles.recentSectionHeader}>
                <Text style={styles.sectionTitleBold}>Recent Lessons</Text>
                <TouchableOpacity onPress={() => setCurrentScreen('LessonList')}>
                  <Text style={styles.viewAllSmall}>View All →</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.recentLessonItem}
                onPress={() => setCurrentScreen('LessonPage')}
                activeOpacity={0.85}
              >
                <View style={styles.lessonThumb}>
                  <Text style={{ fontSize: 22 }}>🌱</Text>
                </View>
                <View style={styles.lessonMeta}>
                  <Text style={styles.lessonMetaTitle}>Plants</Text>
                  <Text style={styles.lessonMetaSub}>Class 3 · EVS</Text>
                </View>
                <Text style={styles.chevronSmall}>›</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* 3. Choose Language Screen */}
          {currentScreen === 'LanguageSelect' && (
            <View style={styles.screenPadded}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>Choose Language</Text>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {[
                  { id: 'sat_Olck', title: 'Santali (Ol Chiki)', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
                  { id: 'ho', title: 'Ho (Warang Citi)', native: '𑢹𑣉 / Ho' },
                  { id: 'mundari', title: 'Mundari (Devanagari)', native: 'मुंडारी' },
                  { id: 'hin_Deva', title: 'Hindi', native: 'हिंदी' },
                  { id: 'eng_Latn', title: 'English', native: 'English' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.langChoiceCard, selectedLang === item.id && styles.langChoiceCardActive]}
                    onPress={() => setSelectedLang(item.id as any)}
                  >
                    <View>
                      <Text style={styles.langChoiceTitle}>{item.title}</Text>
                      <Text style={styles.langChoiceNative}>{item.native}</Text>
                    </View>
                    <View style={[styles.radioCircle, selectedLang === item.id && styles.radioCircleActive]}>
                      {selectedLang === item.id && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => setCurrentScreen('Home')}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4. Lesson List (Class 3 - EVS) */}
          {currentScreen === 'LessonList' && (
            <View style={styles.screenPadded}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>Class 3 - EVS</Text>
              </View>

              {/* Segmented Filter Bar */}
              <View style={styles.filterPillsRow}>
                <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]}>
                  <Text style={styles.filterPillTextActive}>Lessons</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterPill}>
                  <Text style={styles.filterPillText}>Videos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterPill} onPress={() => setCurrentScreen('WorksheetPractice')}>
                  <Text style={styles.filterPillText}>Quizzes</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {[
                  { num: 1, title: 'Plants', sub: 'Parts of a plant', icon: '🌱' },
                  { num: 2, title: 'Animals', sub: 'Domestic & wild animals', icon: '🐘' },
                  { num: 3, title: 'Food', sub: 'Fruits and vegetables', icon: '🍎' },
                  { num: 4, title: 'Water Cycle', sub: 'Rain and rivers', icon: '🌧️' },
                  { num: 5, title: 'My Body', sub: 'Body parts', icon: '🖐️' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.num}
                    style={styles.lessonListItem}
                    onPress={() => setCurrentScreen('LessonPage')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.lessonListThumb}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonListTitle}>
                        {item.num}. {item.title}
                      </Text>
                      <Text style={styles.lessonListSub}>{item.sub}</Text>
                    </View>
                    <Text style={styles.chevronSmall}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 5. Mobile Lesson Page (Parts of a Plant) */}
          {currentScreen === 'LessonPage' && (
            <ScrollView style={styles.scrollScreen} contentContainerStyle={styles.scrollContent}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('LessonList')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>Parts of a Plant</Text>
              </View>

              {/* Sub tabs */}
              <View style={styles.subtabsMobile}>
                {['Learn', 'Explain', 'Activity', 'Quiz'].map((tab, idx) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.subtabMobileBtn, idx === 0 && styles.subtabMobileBtnActive]}
                    onPress={() => {
                      if (tab === 'Quiz' || tab === 'Activity') setCurrentScreen('WorksheetPractice');
                    }}
                  >
                    <Text style={[styles.subtabMobileText, idx === 0 && styles.subtabMobileTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Plant Diagram */}
              <View style={styles.plantCardMobile}>
                <PlantDiagram selectedLanguage={selectedLang} />
              </View>

              {/* Audio Player Bar */}
              <View style={styles.audioBarMobile}>
                <TouchableOpacity
                  style={styles.audioPlayBtnMobile}
                  onPress={() =>
                    playLessonAudio(
                      'ᱥᱟᱠᱟᱢ, ᱰᱟᱹᱨ ᱟᱨ ᱨᱮᱦᱮᱫ ᱫᱚ ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱢᱩᱬ ᱦᱟᱹᱴᱤᱧ ᱠᱟᱱᱟ ᱾',
                      'Sakam, dar ar rehed do dare reyag munr hatinj kana.'
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 18, color: '#713f12' }}>{isPlayingAudio ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.listenLabelMobile}>
                    Listen ({selectedLang === 'sat_Olck' ? 'Santali' : selectedLang === 'ho' ? 'Ho' : 'Mundari'})
                  </Text>
                  <View style={styles.staticWave}>
                    <Text style={{ color: '#eab308', letterSpacing: 2 }}>ılılılılılılı</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>1.0x</Text>
              </View>
            </ScrollView>
          )}

          {/* 6. Translate (Text / Voice) */}
          {currentScreen === 'Translate' && (
            <ScrollView style={styles.scrollScreen} contentContainerStyle={styles.scrollContent}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>Translate</Text>
              </View>

              {/* Language Selector Bar */}
              <View style={styles.translateLangBar}>
                <Text style={styles.langNameBadge}>Hindi</Text>
                <Text style={{ fontSize: 16, color: '#64748b' }}>⇄</Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = transTargetLang === 'sat_Olck' ? 'ho' : transTargetLang === 'ho' ? 'mundari' : 'sat_Olck';
                    setTransTargetLang(next);
                  }}
                  style={styles.targetLangPickerBtn}
                >
                  <Text style={styles.langNameBadgeActive}>
                    {transTargetLang === 'sat_Olck' ? 'Santali' : transTargetLang === 'ho' ? 'Ho' : 'Mundari'} ▾
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mode Toggle (Text / Voice) */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, translateMode === 'text' && styles.modeToggleBtnActive]}
                  onPress={() => setTranslateMode('text')}
                >
                  <Text style={[styles.modeToggleText, translateMode === 'text' && styles.modeToggleTextActive]}>
                    Text
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, translateMode === 'voice' && styles.modeToggleBtnActive]}
                  onPress={() => setTranslateMode('voice')}
                >
                  <Text style={[styles.modeToggleText, translateMode === 'voice' && styles.modeToggleTextActive]}>
                    Voice
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Input Card */}
              <View style={styles.mobileInputCard}>
                <TextInput
                  value={transInput}
                  onChangeText={setTransInput}
                  multiline
                  style={styles.mobileTextInput}
                  placeholder="यहाँ हिंदी में लिखें..."
                />
                <TouchableOpacity style={styles.micCircleSmall}>
                  <Text style={{ fontSize: 16 }}>🎤</Text>
                </TouchableOpacity>
              </View>

              {/* Yellow Translate Button */}
              <TouchableOpacity style={styles.yellowTranslateBtn} onPress={handleTranslate} activeOpacity={0.85}>
                <Text style={styles.yellowTranslateText}>Translate</Text>
              </TouchableOpacity>

              {/* Output Result */}
              {transResult ? (
                <View style={styles.mobileOutputCard}>
                  <Text style={styles.mobileOutputTag}>
                    Translated ({transTargetLang === 'sat_Olck' ? 'Santali' : transTargetLang === 'ho' ? 'Ho' : 'Mundari'})
                  </Text>
                  <Text style={styles.mobileOutputMain}>{transResult}</Text>

                  <View style={styles.outputIconsRow}>
                    <TouchableOpacity
                      style={styles.actionCircleBtn}
                      onPress={() => playLessonAudio(transResult)}
                    >
                      <Text style={{ fontSize: 16 }}>🔊</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCircleBtn}>
                      <Text style={{ fontSize: 16 }}>📋</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCircleBtn}>
                      <Text style={{ fontSize: 16 }}>💾</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}

          {/* 7. My Progress Screen */}
          {currentScreen === 'Progress' && (
            <ScrollView style={styles.scrollScreen} contentContainerStyle={styles.scrollContent}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>My Progress</Text>
              </View>

              {/* 4 Metrics Grid */}
              <View style={styles.progressGrid}>
                <View style={styles.progressMetricCard}>
                  <Text style={{ fontSize: 18 }}>✅</Text>
                  <Text style={styles.metricVal}>12</Text>
                  <Text style={styles.metricSub}>Lessons Completed</Text>
                </View>
                <View style={styles.progressMetricCard}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                  <Text style={styles.metricVal}>8</Text>
                  <Text style={styles.metricSub}>Quizzes Done</Text>
                </View>
                <View style={styles.progressMetricCard}>
                  <Text style={{ fontSize: 18 }}>⏱️</Text>
                  <Text style={styles.metricVal}>4h</Text>
                  <Text style={styles.metricSub}>Learning Time</Text>
                </View>
                <View style={styles.progressMetricCard}>
                  <Text style={{ fontSize: 18 }}>🎯</Text>
                  <Text style={styles.metricVal}>90%</Text>
                  <Text style={styles.metricSub}>Average Score</Text>
                </View>
              </View>

              {/* Topic-wise Progress */}
              <Text style={styles.sectionTitleBold}>Topic-wise Progress</Text>
              {[
                { title: 'Plants', pct: 100, color: '#22c55e' },
                { title: 'Animals', pct: 80, color: '#3b82f6' },
                { title: 'Food', pct: 60, color: '#eab308' },
                { title: 'Water Cycle', pct: 40, color: '#f97316' },
              ].map((topic) => (
                <View key={topic.title} style={styles.progressRow}>
                  <View style={styles.progressRowLabel}>
                    <Text style={styles.progressRowTitle}>{topic.title}</Text>
                    <Text style={styles.progressRowPct}>{topic.pct}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${topic.pct}%`, backgroundColor: topic.color }]} />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* 8. Interactive Worksheet Practice Screen */}
          {currentScreen === 'WorksheetPractice' && (
            <ScrollView style={styles.scrollScreen} contentContainerStyle={styles.scrollContent}>
              <View style={styles.screenTopNav}>
                <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtnSmall}>
                  <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.screenTopTitle}>Interactive Practice</Text>
              </View>

              {/* Score header */}
              <View style={styles.practiceScoreBar}>
                <Text style={styles.practiceQuestionNum}>
                  Question {currentQIndex + 1} of {practiceQuestions.length}
                </Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>⭐ Score: {score} pts</Text>
                </View>
              </View>

              {/* Question card */}
              <View style={styles.practiceQCard}>
                <Text style={styles.qSantali}>{practiceQuestions[currentQIndex].questionSat}</Text>
                <Text style={styles.qHindi}>{practiceQuestions[currentQIndex].questionHi}</Text>
                <Text style={styles.qEnglish}>{practiceQuestions[currentQIndex].questionEn}</Text>

                <TouchableOpacity
                  style={styles.qVoiceBtn}
                  onPress={() =>
                    playLessonAudio(
                      practiceQuestions[currentQIndex].questionSat,
                      practiceQuestions[currentQIndex].questionEn
                    )
                  }
                >
                  <Text style={styles.qVoiceBtnText}>🔊 Read Question Aloud</Text>
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {practiceQuestions[currentQIndex].options.map((opt) => {
                  const isSelected = selectedAnswer === opt.id;
                  let optStyle: any = styles.optionItem;
                  if (isAnswerChecked) {
                    if (opt.correct) optStyle = [styles.optionItem, styles.optionCorrect];
                    else if (isSelected && !opt.correct) optStyle = [styles.optionItem, styles.optionWrong];
                  } else if (isSelected) {
                    optStyle = [styles.optionItem, styles.optionSelected];
                  }

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={optStyle}
                      onPress={() => {
                        if (!isAnswerChecked) setSelectedAnswer(opt.id);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.optionText}>{opt.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Check Answer / Next Question Button */}
              {!isAnswerChecked ? (
                <TouchableOpacity
                  style={[styles.checkBtn, selectedAnswer === null && styles.checkBtnDisabled]}
                  disabled={selectedAnswer === null}
                  onPress={() => {
                    setIsAnswerChecked(true);
                    const isCorrect = practiceQuestions[currentQIndex].options.find(
                      (o) => o.id === selectedAnswer
                    )?.correct;
                    if (isCorrect) setScore(score + 10);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.checkBtnText}>Check Answer ✓</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackTitle}>
                      {practiceQuestions[currentQIndex].options.find((o) => o.id === selectedAnswer)?.correct
                        ? '🎉 Correct! Well done!'
                        : '💡 Note the answer:'}
                    </Text>
                    <Text style={styles.feedbackText}>{practiceQuestions[currentQIndex].explanation}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.nextQBtn}
                    onPress={() => {
                      if (currentQIndex < practiceQuestions.length - 1) {
                        setCurrentQIndex(currentQIndex + 1);
                        setSelectedAnswer(null);
                        setIsAnswerChecked(false);
                      } else {
                        alert(`Awesome! You completed the practice with ${score} points!`);
                        setCurrentScreen('Progress');
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextQBtnText}>
                      {currentQIndex < practiceQuestions.length - 1 ? 'Next Question →' : 'Finish Practice 🌟'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* ── Bottom Mobile Tab Bar ── */}
        <View style={styles.bottomTabBar}>
          {[
            { id: 'Home', icon: '🏠', label: 'Home' },
            { id: 'LessonList', icon: '📖', label: 'Lessons' },
            { id: 'Translate', icon: '🌐', label: 'Translate' },
            { id: 'WorksheetPractice', icon: '🎮', label: 'Practice' },
            { id: 'Progress', icon: '📊', label: 'Progress' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tabItem}
              onPress={() => setCurrentScreen(item.id as MobileScreen)}
            >
              <Text style={styles.tabItemIcon}>{item.icon}</Text>
              <Text style={[styles.tabItemLabel, currentScreen === item.id && styles.tabItemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  phoneOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  phoneFrame: {
    width: 360,
    height: 720,
    backgroundColor: '#ffffff',
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  statusBar: {
    height: 38,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusTime: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  notchPill: { width: 80, height: 16, borderRadius: 8, backgroundColor: '#0f172a' },
  statusIcons: { flexDirection: 'row', gap: 6 },
  statusIconItem: { fontSize: 11 },

  screenInner: { flex: 1, backgroundColor: '#f8fafc' },
  scrollScreen: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  screenPadded: { flex: 1, padding: 16 },

  /* Splash Screen */
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splashTop: { alignItems: 'center', marginTop: 30 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBookEmoji: { fontSize: 32 },
  splashTitle: { fontSize: 32, fontWeight: '900', color: '#1e293b' },
  splashTagline: { fontSize: 13, color: '#64748b', marginTop: 4 },
  childrenIllustration: { marginTop: 40 },
  splashBottom: { width: '100%', alignItems: 'center', gap: 12, marginBottom: 20 },
  splashPrimaryBtn: {
    backgroundColor: '#facc15',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  splashPrimaryText: { fontSize: 15, fontWeight: '800', color: '#713f12' },
  splashSecondaryBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  splashSecondaryText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  splashSupports: { fontSize: 10, color: '#94a3b8', marginTop: 6 },

  /* Home Screen */
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIcon: { fontSize: 20 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#1e3a8a' },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeGreeting: { marginBottom: 16 },
  greetingTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  greetingSub: { fontSize: 12, color: '#64748b' },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridCardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  gridCardSub: { fontSize: 10, color: '#64748b', marginTop: 2 },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleBold: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  viewAllSmall: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  recentLessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  lessonThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonMeta: { flex: 1 },
  lessonMetaTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  lessonMetaSub: { fontSize: 11, color: '#64748b' },
  chevronSmall: { fontSize: 16, color: '#94a3b8' },

  /* Top Nav in screens */
  screenTopNav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  screenTopTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  /* Language select */
  langChoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  langChoiceCardActive: { borderColor: '#facc15', backgroundColor: '#fefce8' },
  langChoiceTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  langChoiceNative: { fontSize: 12, color: '#64748b', marginTop: 2 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: { borderColor: '#eab308' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#eab308' },
  continueBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  continueBtnText: { fontSize: 14, fontWeight: '800', color: '#713f12' },

  /* Lesson list */
  filterPillsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: { backgroundColor: '#fef08a', borderColor: '#facc15' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterPillTextActive: { fontSize: 12, fontWeight: '800', color: '#854d0e' },
  lessonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    gap: 12,
  },
  lessonListThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonListTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  lessonListSub: { fontSize: 11, color: '#64748b' },

  /* Mobile Lesson Page */
  subtabsMobile: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  subtabMobileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subtabMobileBtnActive: { backgroundColor: '#fef08a', borderColor: '#facc15' },
  subtabMobileText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  subtabMobileTextActive: { fontSize: 11, fontWeight: '800', color: '#854d0e' },
  plantCardMobile: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 14,
  },
  audioBarMobile: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioPlayBtnMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenLabelMobile: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  staticWave: { marginTop: 2 },

  /* Mobile Translate */
  translateLangBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  langNameBadge: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  langNameBadgeActive: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  targetLangPickerBtn: { padding: 4 },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  modeToggleBtnActive: { backgroundColor: '#facc15' },
  modeToggleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  modeToggleTextActive: { fontSize: 12, fontWeight: '800', color: '#713f12' },
  mobileInputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    position: 'relative',
  },
  mobileTextInput: { minHeight: 60, fontSize: 14, color: '#0f172a', textAlignVertical: 'top' },
  micCircleSmall: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yellowTranslateBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  yellowTranslateText: { fontSize: 14, fontWeight: '800', color: '#713f12' },
  mobileOutputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fde047',
  },
  mobileOutputTag: { fontSize: 10, fontWeight: '800', color: '#854d0e', marginBottom: 4 },
  mobileOutputMain: { fontSize: 16, fontWeight: '700', color: '#1e293b', lineHeight: 24 },
  outputIconsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Progress screen */
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  progressMetricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  metricSub: { fontSize: 10, color: '#64748b' },
  progressRow: { marginTop: 12 },
  progressRowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressRowTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  progressRowPct: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  progressBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  /* Interactive Worksheet Practice */
  practiceScoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  practiceQuestionNum: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  scoreBadge: { backgroundColor: '#fef08a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreBadgeText: { fontSize: 11, fontWeight: '800', color: '#854d0e' },
  practiceQCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  qSantali: { fontSize: 16, fontWeight: '800', color: '#1e3a8a', marginBottom: 4 },
  qHindi: { fontSize: 13, color: '#334155', marginBottom: 2 },
  qEnglish: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 12 },
  qVoiceBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  qVoiceBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  optionsList: { gap: 10, marginBottom: 16 },
  optionItem: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  optionSelected: { borderColor: '#facc15', backgroundColor: '#fefce8' },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: '#ecfdf5' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  optionText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  checkBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  checkBtnDisabled: { opacity: 0.5 },
  checkBtnText: { fontSize: 14, fontWeight: '800', color: '#713f12' },
  feedbackBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  feedbackTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  feedbackText: { fontSize: 11, color: '#475569', lineHeight: 16 },
  nextQBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextQBtnText: { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  /* Bottom Tab Bar */
  bottomTabBar: {
    height: 56,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: { alignItems: 'center' },
  tabItemIcon: { fontSize: 18 },
  tabItemLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', marginTop: 2 },
  tabItemLabelActive: { color: '#ca8a04' },
});
