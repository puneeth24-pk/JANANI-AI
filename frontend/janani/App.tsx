import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

// Components & Screens
import { TeacherDashboard } from './src/components/TeacherDashboard';
import { TeacherClassroom } from './src/components/TeacherClassroom';
import { WorksheetScreen } from './src/screens/WorksheetScreen';
import { TranslateScreen } from './src/screens/TranslateScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export type ActiveTab =
  | 'Dashboard'
  | 'Classroom'
  | 'Translate'
  | 'Worksheets'
  | 'Lessons'
  | 'Flashcards'
  | 'History'
  | 'Settings';

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);

  return (
    <ErrorBoundary fallbackTitle="JANANI AI Application Encountered an Issue">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* ── Top Application Header ── */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <View style={styles.logoBadge}>
              <Text style={{ fontSize: 20 }}>🌱</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>JANANI AI</Text>
              <Text style={styles.brandSubtitle}>Bridging Languages, Building Futures</Text>
            </View>
          </View>

          <View style={styles.topHeaderRight}>
            {/* Offline Ready Indicator */}
            <View style={styles.offlineStatusBadge}>
              <Text style={styles.offlineDot}>●</Text>
              <View>
                <Text style={styles.offlineText}>Offline Ready</Text>
                <Text style={styles.offlineSub}>100% OFFLINE AI</Text>
              </View>
            </View>

            {/* Tribal Language Badge */}
            {isDesktop && (
              <View style={styles.langPillBadge}>
                <Text style={{ fontSize: 13, marginRight: 4 }}>🌐</Text>
                <Text style={styles.langPillText}>Santali • Ho • Mundari</Text>
              </View>
            )}

            {/* Teacher Profile */}
            {!isMobile && (
              <View style={styles.teacherProfilePill}>
                <View style={styles.teacherAvatar}>
                  <Text style={{ fontSize: 14 }}>👩‍🏫</Text>
                </View>
                <View>
                  <Text style={styles.teacherName}>Teacher</Text>
                  <Text style={styles.teacherSchool}>Govt. School - AP</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Main App Container ── */}
        <View style={styles.appBody}>
          {/* Desktop / Tablet Sidebar (Hidden on Mobile) */}
          {!isMobile && (
            <View style={[styles.sidebar, isTablet && styles.sidebarTablet]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
                {/* Sidebar Branding Title */}
                {!isTablet && (
                  <View style={styles.sidebarBranding}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🌱</Text>
                      <Text style={styles.sidebarBrandTitle}>JANANI AI</Text>
                    </View>
                    <Text style={styles.sidebarBrandSub}>Tribal Language Learning Platform</Text>
                  </View>
                )}

                {/* Section 1: Classroom Flow */}
                <View style={styles.navSection}>
                  {!isTablet && <Text style={styles.navSectionLabel}>TEACHING & CLASSROOM</Text>}
                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Dashboard' && styles.navItemActive]}
                    onPress={() => setActiveTab('Dashboard')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>🏠</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Dashboard' && styles.navLabelActive]}>
                        Dashboard
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Classroom' && styles.navItemActive]}
                    onPress={() => setActiveTab('Classroom')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>🏫</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Classroom' && styles.navLabelActive]}>
                        Classroom
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Translate' && styles.navItemActive]}
                    onPress={() => setActiveTab('Translate')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>🌐</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Translate' && styles.navLabelActive]}>
                        Translate
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Section 2: Materials & Practice */}
                <View style={styles.navSection}>
                  {!isTablet && <Text style={styles.navSectionLabel}>MATERIALS & PRACTICE</Text>}
                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Worksheets' && styles.navItemActive]}
                    onPress={() => setActiveTab('Worksheets')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>📝</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Worksheets' && styles.navLabelActive]}>
                        Worksheets & Practice
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Lessons' && styles.navItemActive]}
                    onPress={() => setActiveTab('Lessons')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>📚</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Lessons' && styles.navLabelActive]}>
                        Lesson Generator
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Flashcards' && styles.navItemActive]}
                    onPress={() => setActiveTab('Flashcards')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>🃏</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Flashcards' && styles.navLabelActive]}>
                        Flashcards
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Section 3: Records & System */}
                <View style={styles.navSection}>
                  {!isTablet && <Text style={styles.navSectionLabel}>RECORDS & SETTINGS</Text>}
                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'History' && styles.navItemActive]}
                    onPress={() => setActiveTab('History')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>📜</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'History' && styles.navLabelActive]}>
                        History & Progress
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, activeTab === 'Settings' && styles.navItemActive]}
                    onPress={() => setActiveTab('Settings')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.navIcon}>⚙️</Text>
                    {!isTablet && (
                      <Text style={[styles.navLabel, activeTab === 'Settings' && styles.navLabelActive]}>
                        Settings
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Bottom Tribal Languages Support List */}
              {!isTablet && (
                <View style={styles.sidebarFooter}>
                  <Text style={styles.footerLangTitle}>TRIBAL LANGUAGES</Text>
                  <View style={styles.footerLangItem}>
                    <Text style={{ fontSize: 12 }}>🌸</Text>
                    <Text style={styles.footerLangList}>Santali (Ol Chiki)</Text>
                  </View>
                  <View style={styles.footerLangItem}>
                    <Text style={{ fontSize: 12 }}>🌾</Text>
                    <Text style={styles.footerLangList}>Ho (Warang Citi)</Text>
                  </View>
                  <View style={styles.footerLangItem}>
                    <Text style={{ fontSize: 12 }}>🌳</Text>
                    <Text style={styles.footerLangList}>Mundari (Devanagari)</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Main Responsive Content Area with Error Boundary ── */}
          <View style={styles.mainContentArea}>
            {activeTab === 'Dashboard' && (
              <TeacherDashboard
                onStartTeaching={() => setActiveTab('Classroom')}
                onNavigateTranslate={() => setActiveTab('Translate')}
                onNavigateLesson={() => setActiveTab('Lessons')}
                onNavigateWorksheet={() => setActiveTab('Worksheets')}
                onNavigateFlashcards={() => setActiveTab('Flashcards')}
              />
            )}

            {activeTab === 'Classroom' && (
              <TeacherClassroom
                onBackToDashboard={() => setActiveTab('Dashboard')}
                onOpenWorksheet={() => setActiveTab('Worksheets')}
              />
            )}

            {activeTab === 'Translate' && <TranslateScreen />}

            {activeTab === 'Worksheets' && <WorksheetScreen />}

            {activeTab === 'Lessons' && <LessonScreen />}

            {activeTab === 'Flashcards' && <FlashcardsScreen />}

            {activeTab === 'History' && <HistoryScreen />}

            {activeTab === 'Settings' && <SettingsScreen />}
          </View>
        </View>

        {/* ── Mobile "More" Drawer Modal ── */}
        {isMobile && showMobileMoreMenu && (
          <View style={styles.mobileMoreOverlay}>
            <TouchableOpacity
              style={styles.mobileMoreBackdrop}
              onPress={() => setShowMobileMoreMenu(false)}
            />
            <View style={styles.mobileMoreSheet}>
              <View style={styles.mobileMoreHeader}>
                <Text style={styles.mobileMoreTitle}>More Options</Text>
                <TouchableOpacity onPress={() => setShowMobileMoreMenu(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setActiveTab('Flashcards');
                  setShowMobileMoreMenu(false);
                }}
              >
                <Text style={styles.moreMenuIcon}>🃏</Text>
                <Text style={styles.moreMenuLabel}>Visual Flashcards</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setActiveTab('History');
                  setShowMobileMoreMenu(false);
                }}
              >
                <Text style={styles.moreMenuIcon}>📜</Text>
                <Text style={styles.moreMenuLabel}>History & Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setActiveTab('Settings');
                  setShowMobileMoreMenu(false);
                }}
              >
                <Text style={styles.moreMenuIcon}>⚙️</Text>
                <Text style={styles.moreMenuLabel}>System & Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Mobile Bottom Navigation Bar (Visible only on mobile screen widths) ── */}
        {isMobile && (
          <View style={styles.bottomNavBar}>
            <TouchableOpacity
              style={[styles.bottomNavTab, activeTab === 'Dashboard' && styles.bottomNavTabActive]}
              onPress={() => setActiveTab('Dashboard')}
            >
              <Text style={styles.bottomNavIcon}>🏠</Text>
              <Text style={[styles.bottomNavLabel, activeTab === 'Dashboard' && styles.bottomNavLabelActive]}>
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomNavTab, activeTab === 'Classroom' && styles.bottomNavTabActive]}
              onPress={() => setActiveTab('Classroom')}
            >
              <Text style={styles.bottomNavIcon}>🏫</Text>
              <Text style={[styles.bottomNavLabel, activeTab === 'Classroom' && styles.bottomNavLabelActive]}>
                Classroom
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomNavTab, activeTab === 'Translate' && styles.bottomNavTabActive]}
              onPress={() => setActiveTab('Translate')}
            >
              <Text style={styles.bottomNavIcon}>🌐</Text>
              <Text style={[styles.bottomNavLabel, activeTab === 'Translate' && styles.bottomNavLabelActive]}>
                Translate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomNavTab, activeTab === 'Worksheets' && styles.bottomNavTabActive]}
              onPress={() => setActiveTab('Worksheets')}
            >
              <Text style={styles.bottomNavIcon}>📝</Text>
              <Text style={[styles.bottomNavLabel, activeTab === 'Worksheets' && styles.bottomNavLabelActive]}>
                Practice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomNavTab, activeTab === 'Lessons' && styles.bottomNavTabActive]}
              onPress={() => setActiveTab('Lessons')}
            >
              <Text style={styles.bottomNavIcon}>📚</Text>
              <Text style={[styles.bottomNavLabel, activeTab === 'Lessons' && styles.bottomNavLabelActive]}>
                Lessons
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavTab}
              onPress={() => setShowMobileMoreMenu((v) => !v)}
            >
              <Text style={styles.bottomNavIcon}>⋯</Text>
              <Text style={styles.bottomNavLabel}>More</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // ── Top Header ──
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064e3b',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 8,
  },
  offlineDot: {
    color: '#6ee7b7',
    fontSize: 10,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  offlineSub: {
    color: '#d1fae5',
    fontSize: 9,
    fontWeight: '600',
  },
  langPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  teacherProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  teacherAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  teacherSchool: {
    fontSize: 10,
    color: '#64748b',
  },

  // ── App Body ──
  appBody: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },

  // ── Sidebar (Desktop / Tablet) ──
  sidebar: {
    width: 240,
    backgroundColor: '#064e3b',
    paddingVertical: 16,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: '#042f2e',
  },
  sidebarTablet: {
    width: 72,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sidebarContent: {
    paddingBottom: 16,
  },
  sidebarBranding: {
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  sidebarBrandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sidebarBrandSub: {
    fontSize: 10,
    color: '#6ee7b7',
    marginTop: 2,
    fontWeight: '600',
  },
  navSection: {
    marginBottom: 14,
  },
  navSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6ee7b7',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: '#059669',
    shadowColor: '#042f2e',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  navIcon: {
    fontSize: 17,
  },
  navLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#a7f3d0',
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sidebarFooter: {
    padding: 12,
    backgroundColor: '#042f2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#064e3b',
    marginTop: 8,
  },
  footerLangTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#34d399',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  footerLangItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  footerLangList: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
  },

  // ── Main Content Area ──
  mainContentArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // ── Mobile Bottom Navigation ──
  bottomNavBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomNavTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 52,
  },
  bottomNavTabActive: {
    backgroundColor: '#ecfdf5',
  },
  bottomNavIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  bottomNavLabelActive: {
    color: '#059669',
    fontWeight: '800',
  },

  // ── Mobile More Overlay ──
  mobileMoreOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  mobileMoreBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  mobileMoreSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  mobileMoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  mobileMoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  moreMenuIcon: {
    fontSize: 20,
  },
  moreMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
});
