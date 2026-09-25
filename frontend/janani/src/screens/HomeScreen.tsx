import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TabScreen, SystemModelStatus } from '../types';
import { ModelService } from '../services/ModelService';

interface HomeScreenProps {
  onNavigate: (screen: TabScreen) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [modelStatus, setModelStatus] = useState<SystemModelStatus | null>(null);

  useEffect(() => {
    ModelService.getStatus().then(setModelStatus).catch(console.warn);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Header */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.logoIcon}>🌸</Text>
          <View style={styles.offlinePill}>
            <View style={styles.greenPulse} />
            <Text style={styles.offlinePillText}>100% OFFLINE</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>JANANI</Text>
        <Text style={styles.heroSubtitle}>Santali Mother-Tongue Learning Assistant</Text>
        <Text style={styles.heroTagline}>"Teach in the child's mother tongue."</Text>
      </View>

      {/* Main Classroom Action Card */}
      <TouchableOpacity
        style={styles.primaryClassroomBtn}
        activeOpacity={0.9}
        onPress={() => onNavigate('Classroom')}
      >
        <View style={styles.micCircle}>
          <Text style={styles.micIcon}>🎤</Text>
        </View>
        <View style={styles.classroomTextGroup}>
          <Text style={styles.classroomBtnTitle}>Start Classroom Mode</Text>
          <Text style={styles.classroomBtnSub}>Instant Hindi/English voice to Santali speech</Text>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </TouchableOpacity>

      {/* Quick Launch Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigate('VoiceTranslator')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#fce7f3' }]}>
            <Text style={styles.cardIcon}>🎙️</Text>
          </View>
          <Text style={styles.cardTitle}>Voice Translator</Text>
          <Text style={styles.cardDesc}>Speak → Santali</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigate('Translate')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.cardIcon}>🔤</Text>
          </View>
          <Text style={styles.cardTitle}>Translate</Text>
          <Text style={styles.cardDesc}>Text to Ol Chiki</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigate('Lessons')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.cardIcon}>📚</Text>
          </View>
          <Text style={styles.cardTitle}>Create Lesson</Text>
          <Text style={styles.cardDesc}>NIPUN Aligned</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigate('Worksheets')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.cardIcon}>📝</Text>
          </View>
          <Text style={styles.cardTitle}>Worksheets</Text>
          <Text style={styles.cardDesc}>Bilingual Printables</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigate('Flashcards')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconBox, { backgroundColor: '#f3e8ff' }]}>
            <Text style={styles.cardIcon}>🃏</Text>
          </View>
          <Text style={styles.cardTitle}>Flashcards</Text>
          <Text style={styles.cardDesc}>13 Categories</Text>
        </TouchableOpacity>
      </View>

      {/* System Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>✓ Offline AI Ready</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>Whisper STT</Text>
            <Text style={styles.modelVal}>
              {modelStatus?.installed?.whisper ? '✓ Installed' : 'Ready'}
            </Text>
          </View>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>IndicTrans2</Text>
            <Text style={styles.modelVal}>
              {modelStatus?.installed?.indictrans2_int8 ? '✓ INT8 (~1.5GB)' : 'Ready'}
            </Text>
          </View>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>DhVaani TTS</Text>
            <Text style={styles.modelVal}>
              {modelStatus?.installed?.dhvaani ? '✓ Santali 24kHz' : 'Ready'}
            </Text>
          </View>
        </View>

        {modelStatus?.memory?.process_rss_mb ? (
          <View style={styles.memBar}>
            <Text style={styles.memText}>
              Device Memory in Use: {modelStatus.memory.process_rss_mb} MB ({modelStatus.memory.system_percent_used}% system)
            </Text>
          </View>
        ) : null}
      </View>

      {/* Language Availability Card */}
      <View style={styles.langCard}>
        <View style={styles.langCardHeader}>
          <Text style={styles.langCardTitle}>Language Support</Text>
          <Text style={styles.langCardSub}>English & Hindi → Santali, Ho & Mundari</Text>
        </View>
        <View style={styles.langRow}>
          <View style={styles.langItemActive}>
            <Text style={styles.langItemIcon}>🌿</Text>
            <View>
              <Text style={styles.langItemName}>Santali</Text>
              <Text style={styles.langItemScript}>Ol Chiki · ᱥᱟᱱᱛᱟᱲᱤ</Text>
            </View>
            <View style={styles.langAvailBadge}>
              <Text style={styles.langAvailText}>✓ Voice + AI</Text>
            </View>
          </View>
          <View style={styles.langItemActive}>
            <Text style={styles.langItemIcon}>🌾</Text>
            <View>
              <Text style={styles.langItemName}>Ho</Text>
              <Text style={styles.langItemScript}>Warang Citi · 𑢹𑣉</Text>
            </View>
            <View style={styles.langAvailBadge}>
              <Text style={styles.langAvailText}>✓ Active</Text>
            </View>
          </View>
          <View style={styles.langItemActive}>
            <Text style={styles.langItemIcon}>🌳</Text>
            <View>
              <Text style={styles.langItemName}>Mundari</Text>
              <Text style={styles.langItemScript}>मुंडारी · 10K TSV</Text>
            </View>
            <View style={styles.langAvailBadge}>
              <Text style={styles.langAvailText}>✓ Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Offline Benchmark Test shortcut */}
      <TouchableOpacity
        style={styles.offlineTestBtn}
        onPress={() => onNavigate('OfflineTest')}
      >
        <Text style={styles.offlineTestText}>⚙️ Open Offline Diagnostic & Hackathon Demo Mode →</Text>
      </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  offlinePillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    marginTop: 4,
    fontWeight: '600',
  },
  heroTagline: {
    fontSize: 14,
    color: '#93c5fd',
    marginTop: 10,
    fontStyle: 'italic',
  },
  primaryClassroomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  micCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  micIcon: {
    fontSize: 26,
  },
  classroomTextGroup: {
    flex: 1,
  },
  classroomBtnTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  classroomBtnSub: {
    color: '#dbeafe',
    fontSize: 12,
    marginTop: 3,
  },
  arrowIcon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modelItem: {
    flex: 1,
  },
  modelLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  modelVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  memBar: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  memText: {
    fontSize: 11,
    color: '#64748b',
  },
  offlineTestBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  offlineTestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  langCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  langCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  langCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langCardSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'column',
    gap: 8,
  },
  langItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  langItemIcon: {
    fontSize: 20,
  },
  langItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  langItemScript: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  langAvailBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langAvailText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
});
