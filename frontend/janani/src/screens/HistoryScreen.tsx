import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LessonService } from '../services/LessonService';
import { LocalStorage } from '../storage/LocalStorage';
import { TTSService } from '../services/TTSService';
import { LessonRecord } from '../types';

export const HistoryScreen: React.FC = () => {
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const local = LocalStorage.getLessons();
    try {
      const remote = await LessonService.getHistory();
      if (remote.length > 0) {
        setLessons(remote);
        return;
      }
    } catch {}
    setLessons(local);
  };

  const handlePlay = (lesson: LessonRecord) => {
    if (playingId === lesson.id) {
      TTSService.stopAudio();
      setPlayingId(null);
      return;
    }

    if (lesson.audioUrl) {
      setPlayingId(lesson.id);
      TTSService.playAudio(lesson.audioUrl, () => setPlayingId(null));
    } else if (lesson.santaliText) {
      setPlayingId(lesson.id);
      TTSService.synthesize({ text: lesson.santaliText }).then((res) => {
        if (res.success && res.audioUrl) {
          TTSService.playAudio(res.audioUrl, () => setPlayingId(null));
        } else {
          setPlayingId(null);
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    const updated = LocalStorage.deleteLesson(id);
    setLessons(updated);
  };

  const filtered = lessons.filter(
    (l) =>
      (l.sourceText && l.sourceText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.santaliText && l.santaliText.includes(searchQuery)) ||
      (l.topic && l.topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Lesson History & Audio Library</Text>
      <Text style={styles.headerSub}>Offline classroom lessons and generated Santali speech recordings</Text>

      {/* Search Filter */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search lessons by topic or phrase..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {filtered.length > 0 ? (
        filtered.map((item) => (
          <View key={item.id} style={styles.lessonCard}>
            <View style={styles.cardTop}>
              <View style={styles.badgeGroup}>
                <Text style={styles.classBadge}>Class {item.classLevel || 2}</Text>
                <Text style={styles.topicBadge}>{item.topic || 'General'}</Text>
              </View>
              <Text style={styles.dateText}>{item.date || 'Offline'}</Text>
            </View>

            <View style={styles.phraseBlock}>
              <Text style={styles.srcLabel}>{item.sourceLanguage || 'Hindi'}:</Text>
              <Text style={styles.srcText}>{item.sourceText}</Text>
            </View>

            <View style={styles.santaliBlock}>
              <Text style={styles.satLabel}>Santali (Ol Chiki):</Text>
              <Text style={styles.satText}>{item.santaliText}</Text>
            </View>

            {/* Audio & Delete Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.playBtn, playingId === item.id && styles.playingBtn]}
                onPress={() => handlePlay(item)}
              >
                <Text style={styles.playBtnText}>
                  {playingId === item.id ? '⏹️ Stop' : '▶ Play Santali Voice'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>No Lessons Saved Yet</Text>
          <Text style={styles.emptySub}>
            Lessons completed in Classroom Mode or Translate screen will automatically appear here.
          </Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1e293b',
  },
  clearBtn: {
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
  lessonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  classBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topicBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  phraseBlock: {
    marginBottom: 8,
  },
  srcLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  srcText: {
    fontSize: 14,
    color: '#334155',
    marginTop: 2,
  },
  santaliBlock: {
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  satLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  satText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  playBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playingBtn: {
    backgroundColor: '#dc2626',
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
