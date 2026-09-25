import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';

interface TeacherDashboardProps {
  onStartTeaching: () => void;
  onNavigateTranslate: () => void;
  onNavigateLesson: () => void;
  onNavigateWorksheet: () => void;
  onNavigateFlashcards?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onStartTeaching,
  onNavigateTranslate,
  onNavigateLesson,
  onNavigateWorksheet,
  onNavigateFlashcards,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const [selectedClass, setSelectedClass] = useState<number>(4);
  const [selectedSubject, setSelectedSubject] = useState<string>('EVS');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Desktop Top Search & Controls Bar ── */}
      {isDesktop && (
        <View style={styles.topBar}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search lessons, topics, or words..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.topRightControls}>
            <View style={styles.offlineStatusPill}>
              <Text style={styles.offlinePillDot}>●</Text>
              <Text style={styles.offlinePillText}>100% OFFLINE AI</Text>
            </View>

            <View style={styles.teacherBadge}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 16 }}>👩‍🏫</Text>
              </View>
              <View>
                <Text style={styles.teacherName}>Teacher</Text>
                <Text style={styles.schoolName}>Govt. School - AP</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── TABLET ADAPTIVE HEADER (Matches screen 3 in mockup) ── */}
      {isTablet && (
        <View style={styles.tabletWelcomeCard}>
          <View style={styles.tabletWelcomeHeader}>
            <View>
              <Text style={styles.tabletWelcomeTitle}>Welcome back!</Text>
              <Text style={styles.tabletWelcomeSub}>Let's continue learning</Text>
            </View>
            <View style={styles.tabletOfflinePill}>
              <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>● Offline AI</Text>
            </View>
          </View>

          {/* Class Selector Row: Class 1, 2, 3, 4, 5 */}
          <View style={styles.classSelectorRow}>
            {[1, 2, 3, 4, 5].map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[
                  styles.classPill,
                  selectedClass === cls && styles.classPillActive,
                ]}
                onPress={() => setSelectedClass(cls)}
              >
                <Text
                  style={[
                    styles.classPillText,
                    selectedClass === cls && styles.classPillTextActive,
                  ]}
                >
                  Class {cls}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subject Cards Row: EVS, Maths, English */}
          <View style={styles.subjectCardsRow}>
            <TouchableOpacity
              style={[
                styles.subjectCard,
                { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
                selectedSubject === 'EVS' && styles.subjectCardSelected,
              ]}
              onPress={() => setSelectedSubject('EVS')}
            >
              <Text style={{ fontSize: 24 }}>🌱</Text>
              <Text style={[styles.subjectCardTitle, { color: '#064e3b' }]}>EVS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subjectCard,
                { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                selectedSubject === 'Maths' && styles.subjectCardSelected,
              ]}
              onPress={() => setSelectedSubject('Maths')}
            >
              <Text style={{ fontSize: 24 }}>🔢 123</Text>
              <Text style={[styles.subjectCardTitle, { color: '#92400e' }]}>Maths</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subjectCard,
                { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
                selectedSubject === 'English' && styles.subjectCardSelected,
              ]}
              onPress={() => setSelectedSubject('English')}
            >
              <Text style={{ fontSize: 24 }}>🅰️</Text>
              <Text style={[styles.subjectCardTitle, { color: '#1e40af' }]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DESKTOP & MOBILE HERO BANNER (Matches screen 1 mockup) ── */}
      {!isTablet && (
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>
              Learn in Your Language,{'\n'}Grow Without Limits
            </Text>
            <Text style={styles.heroSubtitle}>
              AI-powered offline education for tribal language learners.{'\n'}
              English and Hindi content translated into Santali, Ho, Mundari and more.
            </Text>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.primaryCtaBtn}
                onPress={onStartTeaching}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryCtaText}>▶ Start Learning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCtaBtn}
                onPress={onNavigateLesson}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryCtaText}>► How It Works</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Visual Flow Diagram (Right) */}
          {isDesktop && (
            <View style={styles.heroRight}>
              <View style={styles.flowContainer}>
                {/* Source Language Column */}
                <View style={styles.flowCol}>
                  <View style={styles.langPillSource}>
                    <Text style={styles.sourceLangLetter}>A</Text>
                    <Text style={styles.sourceLangText}>English</Text>
                  </View>
                  <View style={[styles.langPillSource, { marginTop: 12 }]}>
                    <Text style={[styles.sourceLangLetter, { color: '#d97706' }]}>अ</Text>
                    <Text style={styles.sourceLangText}>Hindi</Text>
                  </View>
                </View>

                {/* Arrow Connector */}
                <View style={styles.arrowConnector}>
                  <Text style={styles.arrowIcon}>➔</Text>
                </View>

                {/* Target Tribal Language Column */}
                <View style={styles.flowCol}>
                  <View
                    style={[
                      styles.langPillTarget,
                      { backgroundColor: '#fce7f3', borderColor: '#fbcfe8' },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>🌸</Text>
                    <Text style={[styles.targetLangText, { color: '#9d174d' }]}>Santali</Text>
                  </View>

                  <View
                    style={[
                      styles.langPillTarget,
                      {
                        backgroundColor: '#fef3c7',
                        borderColor: '#fde68a',
                        marginVertical: 8,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>🌾</Text>
                    <Text style={[styles.targetLangText, { color: '#b45309' }]}>Ho</Text>
                  </View>

                  <View
                    style={[
                      styles.langPillTarget,
                      { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>🌳</Text>
                    <Text style={[styles.targetLangText, { color: '#15803d' }]}>Mundari</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── 5 Statistics Highlights Cards Row (Desktop / Mobile) ── */}
      <View style={styles.statsRow}>
        {/* 1. Lessons */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.statIcon}>📖</Text>
          </View>
          <View style={styles.statTextCol}>
            <Text style={styles.statNumber}>120+</Text>
            <Text style={styles.statTitle}>Lessons</Text>
            <Text style={styles.statSub}>Classes 1 – 5</Text>
          </View>
        </View>

        {/* 2. Tribal Languages */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.statIcon}>🗣️</Text>
          </View>
          <View style={styles.statTextCol}>
            <Text style={styles.statNumber}>4+</Text>
            <Text style={styles.statTitle}>Tribal Languages</Text>
            <Text style={styles.statSub}>Santali, Ho, Mundari & more</Text>
          </View>
        </View>

        {/* 3. Offline Access */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.statIcon}>🛡️</Text>
          </View>
          <View style={styles.statTextCol}>
            <Text style={[styles.statNumber, { color: '#15803d' }]}>100%</Text>
            <Text style={styles.statTitle}>Offline Access</Text>
            <Text style={styles.statSub}>No Internet Required</Text>
          </View>
        </View>

        {/* 4. For Primary Learners */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#ffedd5' }]}>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          <View style={styles.statTextCol}>
            <Text style={styles.statTitleHighlight}>For Primary Learners</Text>
            <Text style={styles.statSub}>Interactive & Visual</Text>
          </View>
        </View>

        {/* 5. Quantized AI Models */}
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#f3e8ff' }]}>
            <Text style={styles.statIcon}>⚡</Text>
          </View>
          <View style={styles.statTextCol}>
            <Text style={styles.statTitleHighlight}>Quantized AI Models</Text>
            <Text style={styles.statSub}>Works on Low-end Devices</Text>
          </View>
        </View>
      </View>

      {/* ── Middle Section: Continue Learning (Left) + Quick Actions (Right) ── */}
      <View style={[styles.middleSectionRow, (isMobile || isTablet) && styles.middleSectionStacked]}>
        {/* Left Column: Continue Learning */}
        <View style={styles.continueLearningCol}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <TouchableOpacity onPress={onStartTeaching}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.continueCard}>
            <View style={styles.plantThumbBox}>
              <Text style={{ fontSize: 44 }}>🌱</Text>
            </View>

            <View style={styles.continueContent}>
              <Text style={styles.continueMeta}>Class 4 • EVS</Text>
              <Text style={styles.continueTopic}>Plants</Text>
              <Text style={styles.continueLessonName}>Lesson 1: Parts of a Plant</Text>

              {/* Progress Bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '60%' }]} />
                </View>
                <Text style={styles.progressLabel}>60% complete</Text>
              </View>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={onStartTeaching}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Right Column: Quick Actions (4 Grid Cards) */}
        <View style={styles.quickActionsCol}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.quickGrid}>
            {/* 1. Translate */}
            <TouchableOpacity
              style={[
                styles.quickCard,
                { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
              ]}
              onPress={onNavigateTranslate}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#dbeafe' }]}>
                <Text style={{ fontSize: 20 }}>🌐</Text>
              </View>
              <Text style={styles.quickTitle}>Translate</Text>
              <Text style={styles.quickDesc}>English/Hindi → Tribal</Text>
            </TouchableOpacity>

            {/* 2. Practice */}
            <TouchableOpacity
              style={[
                styles.quickCard,
                { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
              ]}
              onPress={onNavigateWorksheet}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#ffe4e6' }]}>
                <Text style={{ fontSize: 20 }}>📝</Text>
              </View>
              <Text style={styles.quickTitle}>Practice</Text>
              <Text style={styles.quickDesc}>Interactive Exercises</Text>
            </TouchableOpacity>

            {/* 3. Flashcards */}
            <TouchableOpacity
              style={[
                styles.quickCard,
                { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
              ]}
              onPress={onNavigateFlashcards || onNavigateLesson}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#dcfce7' }]}>
                <Text style={{ fontSize: 20 }}>🃏</Text>
              </View>
              <Text style={styles.quickTitle}>Flashcards</Text>
              <Text style={styles.quickDesc}>Learn New Words</Text>
            </TouchableOpacity>

            {/* 4. Lesson Library */}
            <TouchableOpacity
              style={[
                styles.quickCard,
                { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' },
              ]}
              onPress={onNavigateLesson}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIconBox, { backgroundColor: '#f3e8ff' }]}>
                <Text style={{ fontSize: 20 }}>📚</Text>
              </View>
              <Text style={styles.quickTitle}>Lesson Library</Text>
              <Text style={styles.quickDesc}>Browse All Lessons</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Bottom Section: Popular Lessons Carousel ── */}
      <View style={styles.popularSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Popular Lessons</Text>
          <View style={styles.carouselNavButtons}>
            <Text style={styles.carouselArrow}>‹</Text>
            <Text style={styles.carouselArrow}>›</Text>
          </View>
        </View>

        <View style={styles.popularGrid}>
          {/* Lesson 1: Parts of a Plant */}
          <TouchableOpacity
            style={styles.popularCard}
            onPress={onStartTeaching}
            activeOpacity={0.85}
          >
            <View style={[styles.popularIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Text style={{ fontSize: 24 }}>🌱</Text>
            </View>
            <Text style={styles.popularCardTitle}>Parts of a Plant</Text>
            <Text style={styles.popularCardMeta}>Class 4 • EVS</Text>
          </TouchableOpacity>

          {/* Lesson 2: Animals Around Us */}
          <TouchableOpacity
            style={styles.popularCard}
            onPress={onStartTeaching}
            activeOpacity={0.85}
          >
            <View style={[styles.popularIconBox, { backgroundColor: '#fef3c7' }]}>
              <Text style={{ fontSize: 24 }}>🐘</Text>
            </View>
            <Text style={styles.popularCardTitle}>Animals Around Us</Text>
            <Text style={styles.popularCardMeta}>Class 3 • EVS</Text>
          </TouchableOpacity>

          {/* Lesson 3: Numbers 1-100 */}
          <TouchableOpacity
            style={styles.popularCard}
            onPress={onStartTeaching}
            activeOpacity={0.85}
          >
            <View style={[styles.popularIconBox, { backgroundColor: '#eff6ff' }]}>
              <Text style={{ fontSize: 24 }}>🔢</Text>
            </View>
            <Text style={styles.popularCardTitle}>Numbers 1–100</Text>
            <Text style={styles.popularCardMeta}>Class 1 • Maths</Text>
          </TouchableOpacity>

          {/* Lesson 4: My Family */}
          <TouchableOpacity
            style={styles.popularCard}
            onPress={onStartTeaching}
            activeOpacity={0.85}
          >
            <View style={[styles.popularIconBox, { backgroundColor: '#fdf2f8' }]}>
              <Text style={{ fontSize: 24 }}>👨‍👩‍👧‍👦</Text>
            </View>
            <Text style={styles.popularCardTitle}>My Family</Text>
            <Text style={styles.popularCardMeta}>Class 2 • EVS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 28,
    paddingBottom: 60,
    width: '100%',
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 480,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b' },
  topRightControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offlineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  offlinePillDot: { color: '#34d399', fontSize: 10 },
  offlinePillText: { fontSize: 11, fontWeight: '800', color: '#ecfdf5' },
  teacherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  schoolName: { fontSize: 10, color: '#64748b' },

  // ── Tablet Welcome Card ──
  tabletWelcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tabletWelcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tabletWelcomeTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  tabletWelcomeSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  tabletOfflinePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  classPill: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  classPillActive: {
    backgroundColor: '#059669',
  },
  classPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  classPillTextActive: { color: '#ffffff' },
  subjectCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  subjectCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subjectCardSelected: {
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  subjectCardTitle: { fontSize: 14, fontWeight: '800' },

  // ── Hero Banner ──
  heroBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 22,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#064e3b',
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 20,
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryCtaBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryCtaBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  // ── Hero Flow Diagram ──
  heroRight: {
    width: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  flowCol: {
    justifyContent: 'center',
  },
  langPillSource: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  sourceLangLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
  },
  sourceLangText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  arrowConnector: {
    paddingHorizontal: 12,
  },
  arrowIcon: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '900',
  },
  langPillTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  targetLangText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // ── 5 Statistics Highlights ──
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 20,
  },
  statTextCol: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  statTitleHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
  },
  statSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Middle Section Row ──
  middleSectionRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  middleSectionStacked: {
    flexDirection: 'column',
  },
  continueLearningCol: {
    flex: 1.2,
  },
  quickActionsCol: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Continue Learning Card
  continueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  plantThumbBox: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueContent: {
    flex: 1,
  },
  continueMeta: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  continueTopic: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 2,
  },
  continueLessonName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  continueBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#064e3b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Quick Actions 4 Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  quickIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  quickDesc: {
    fontSize: 11,
    color: '#64748b',
  },

  // ── Popular Lessons Carousel ──
  popularSection: {
    marginBottom: 24,
  },
  carouselNavButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  popularIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  popularCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  popularCardMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});
