import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { LocalStorage, AppSettings } from '../storage/LocalStorage';
import { ModelService } from '../services/ModelService';
import { SystemModelStatus } from '../types';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => LocalStorage.getSettings());
  const [modelStatus, setModelStatus] = useState<SystemModelStatus | null>(null);
  const [clearedMsg, setClearedMsg] = useState<string | null>(null);

  useEffect(() => {
    ModelService.getStatus().then(setModelStatus).catch(console.warn);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = LocalStorage.saveSettings({ [key]: value });
    setSettings(updated);
  };

  const handleClearLessons = () => {
    LocalStorage.clearGeneratedLessons();
    setClearedMsg('✓ Generated lessons and worksheets cleared.');
    setTimeout(() => setClearedMsg(null), 3000);
  };

  const handleClearAudioCache = () => {
    LocalStorage.clearAudioCache();
    setClearedMsg('✓ Temporary audio playback cache cleared.');
    setTimeout(() => setClearedMsg(null), 3000);
  };

  const handleUnloadModels = async () => {
    const ok = await ModelService.unloadModels();
    if (ok) {
      setClearedMsg('✓ All AI models unloaded from RAM to preserve battery/memory.');
      ModelService.getStatus().then(setModelStatus).catch(console.warn);
      setTimeout(() => setClearedMsg(null), 3000);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Application Settings</Text>
      <Text style={styles.headerSub}>Preferences, audio tuning, and local storage management</Text>

      {/* Language Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Language Preferences</Text>

        <View style={styles.rowItem}>
          <Text style={styles.itemLabel}>Primary Teacher Language</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.smallPill, settings.sourceLanguage === 'hin_Deva' && styles.smallPillActive]}
              onPress={() => updateSetting('sourceLanguage', 'hin_Deva')}
            >
              <Text style={[styles.pillText, settings.sourceLanguage === 'hin_Deva' && styles.pillTextActive]}>
                हिंदी (Hindi)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallPill, settings.sourceLanguage === 'eng_Latn' && styles.smallPillActive]}
              onPress={() => updateSetting('sourceLanguage', 'eng_Latn')}
            >
              <Text style={[styles.pillText, settings.sourceLanguage === 'eng_Latn' && styles.pillTextActive]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rowItem}>
          <Text style={styles.itemLabel}>Target Language</Text>
          <Text style={styles.fixedTarget}>Santali (Ol Chiki / ᱥᱟᱱᱛᱟᱲᱤ)</Text>
        </View>
      </View>

      {/* Audio Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Speech & Audio Tuning</Text>

        <View style={styles.rowItem}>
          <Text style={styles.itemLabel}>Teaching Voice Speed</Text>
          <View style={styles.toggleRow}>
            {[0.8, 0.92, 1.0].map((spd) => (
              <TouchableOpacity
                key={spd}
                style={[styles.smallPill, settings.voiceSpeed === spd && styles.smallPillActive]}
                onPress={() => updateSetting('voiceSpeed', spd)}
              >
                <Text style={[styles.pillText, settings.voiceSpeed === spd && styles.pillTextActive]}>
                  {spd === 0.92 ? '0.92x (Default)' : `${spd}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.rowItem}>
          <Text style={styles.itemLabel}>Auto-Play Translated Audio</Text>
          <Switch
            value={settings.autoPlay}
            onValueChange={(val) => updateSetting('autoPlay', val)}
            thumbColor={settings.autoPlay ? '#2563eb' : '#cbd5e1'}
          />
        </View>

        <View style={styles.rowItem}>
          <Text style={styles.itemLabel}>Offline Mode Enforcement</Text>
          <Text style={styles.fixedTarget}>Always ON (No Cloud)</Text>
        </View>
      </View>

      {/* Model Storage & Status (Protected) */}
      <View style={styles.sectionCard}>
        <View style={styles.protectedHeader}>
          <Text style={styles.sectionTitle}>Protected Model Storage</Text>
          <View style={styles.safeTag}>
            <Text style={styles.safeTagText}>🔒 Read-Only Models</Text>
          </View>
        </View>

        <View style={styles.modelStatusTable}>
          <View style={styles.tableRow}>
            <Text style={styles.colModel}>Whisper STT</Text>
            <Text style={styles.colSize}>Small (~460MB)</Text>
            <Text style={styles.colStatus}>✓ Installed</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colModel}>IndicTrans2 INT8</Text>
            <Text style={styles.colSize}>1.59 GB</Text>
            <Text style={styles.colStatus}>✓ Installed</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colModel}>DhVaani Santali TTS</Text>
            <Text style={styles.colSize}>491 MB</Text>
            <Text style={styles.colStatus}>✓ Installed</Text>
          </View>
        </View>

        {modelStatus?.memory && (
          <View style={styles.ramUsageBox}>
            <Text style={styles.ramText}>
              Device RAM: {modelStatus.memory.process_rss_mb} MB used by app ({modelStatus.memory.system_percent_used}% system overall)
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.unloadBtn} onPress={handleUnloadModels}>
          <Text style={styles.unloadBtnText}>🧹 Free Memory (Unload idle models from RAM)</Text>
        </TouchableOpacity>
      </View>

      {/* Generated Content Storage (Safe to clear) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Generated Content Storage</Text>
        <Text style={styles.dangerNotice}>
          Note: Clearing generated lessons does NOT touch original AI model files.
        </Text>

        {clearedMsg && (
          <View style={styles.successNotice}>
            <Text style={styles.successNoticeText}>{clearedMsg}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.cleanBtn} onPress={handleClearAudioCache}>
          <Text style={styles.cleanBtnText}>Clear Audio Cache (WAV temp files)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cleanBtn, styles.cleanBtnRed]} onPress={handleClearLessons}>
          <Text style={[styles.cleanBtnText, styles.cleanBtnTextRed]}>Clear All Saved Lessons & Worksheets</Text>
        </TouchableOpacity>
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
    padding: 18,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  fixedTarget: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  smallPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  protectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  safeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  safeTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  modelStatusTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  colModel: {
    flex: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  colSize: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
  },
  colStatus: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    textAlign: 'right',
  },
  ramUsageBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  ramText: {
    fontSize: 11,
    color: '#1e40af',
  },
  unloadBtn: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  unloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dangerNotice: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  successNotice: {
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  successNoticeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
  },
  cleanBtn: {
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cleanBtnRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  cleanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cleanBtnTextRed: {
    color: '#dc2626',
  },
});
