import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LessonService } from '../services/LessonService';
import { TTSService } from '../services/TTSService';
import { Flashcard } from '../types';

type PracticeLang = 'sat_Olck' | 'ho' | 'mundari';
const LANG_CONFIG: { id: PracticeLang; label: string; nativeLabel: string; color: string }[] = [
  { id: 'sat_Olck', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ', color: '#16a34a' },
  { id: 'ho', label: 'Ho', nativeLabel: '𑢹𑣉', color: '#2563eb' },
  { id: 'mundari', label: 'Mundari', nativeLabel: 'मुंडारी', color: '#7c3aed' },
];

export const FlashcardsScreen: React.FC = () => {
  const [categories] = useState<string[]>([
    'Alphabet', 'Numbers', 'Colours', 'Shapes', 'Animals',
    'Birds', 'Fruits', 'Vegetables', 'Body parts', 'Family',
    'School', 'Nature', 'Food',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Numbers');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [practiceLang, setPracticeLang] = useState<PracticeLang>('sat_Olck');

  const currentLangConfig = LANG_CONFIG.find((l) => l.id === practiceLang)!;

  useEffect(() => {
    LessonService.getFlashcards(selectedCategory).then((data) => {
      const list = data[selectedCategory] || [];
      setCards(list);
      setCurrentIndex(0);
      setIsFlipped(false);
    });
  }, [selectedCategory]);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    if (cards.length <= 1) return;
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleHearCard = async () => {
    if (!currentCard) return;
    if (isPlaying) {
      TTSService.stopAudio();
      setIsPlaying(false);
      return;
    }

    // For Santali — try DhVaani WAV TTS first
    if (practiceLang === 'sat_Olck' && currentCard.santali) {
      setIsPlaying(true);
      try {
        const res = await TTSService.synthesize({ text: currentCard.santali });
        if (res.success && res.audioUrl) {
          TTSService.playAudio(res.audioUrl, () => setIsPlaying(false));
          return;
        }
      } catch {}
    }

    // For Ho / Mundari — use SpeechSynthesis fallback with phonetic text
    const speakText =
      practiceLang === 'sat_Olck'
        ? currentCard.santali || currentCard.front
        : practiceLang === 'ho'
        ? currentCard.ho || currentCard.front
        : currentCard.mundari || currentCard.hindi || currentCard.front;

    TTSService.playNaturalVoice({
      text: speakText,
      language: practiceLang,
      onStart: () => setIsPlaying(true),
      onEnded: () => setIsPlaying(false),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>🃏 Visual Flashcards</Text>
      <Text style={styles.headerSub}>Tap card to flip · Learn vocabulary in all 3 languages</Text>

      {/* Language Practice Picker */}
      <View style={styles.langPickerRow}>
        {LANG_CONFIG.map((lc) => (
          <TouchableOpacity
            key={lc.id}
            style={[styles.langPickerBtn, practiceLang === lc.id && { borderColor: lc.color, backgroundColor: lc.color + '12' }]}
            onPress={() => { setPracticeLang(lc.id); setIsFlipped(false); TTSService.stopAudio(); setIsPlaying(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.langPickerLabel, practiceLang === lc.id && { color: lc.color, fontWeight: '800' }]}>{lc.label}</Text>
            <Text style={[styles.langPickerNative, practiceLang === lc.id && { color: lc.color }]}>{lc.nativeLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[styles.categoryBtnText, selectedCategory === cat && styles.categoryBtnTextActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Flashcard Box */}
      {currentCard ? (
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={[styles.card, isFlipped ? styles.cardBack : styles.cardFront]}
            onPress={() => setIsFlipped(!isFlipped)}
            activeOpacity={0.9}
          >
            <View style={styles.cardTopIndicator}>
              <Text style={styles.sideLabel}>{isFlipped ? 'BACK (Santali & Hindi)' : 'FRONT (Tap to Flip)'}</Text>
              <Text style={styles.cardCounter}>
                {currentIndex + 1} / {cards.length}
              </Text>
            </View>

            {!isFlipped ? (
              // FRONT SIDE — show icon + word
              <View style={styles.cardBody}>
                <Text style={styles.cardIcon}>{currentCard.icon || '📖'}</Text>
                <Text style={styles.cardFrontText}>{currentCard.front}</Text>
                <Text style={styles.cardFrontSub}>{currentCard.english}</Text>
                <View style={[styles.tapHint, { borderColor: currentLangConfig.color + '40' }]}>
                  <Text style={[styles.tapPrompt, { color: currentLangConfig.color }]}>👆 Tap to see in {currentLangConfig.label}</Text>
                </View>
              </View>
            ) : (
              // BACK SIDE — show Hindi + all 3 tribal languages
              <View style={styles.cardBody}>
                <Text style={styles.cardHindiLabel}>हिंदी / English:</Text>
                <Text style={styles.cardHindiText}>{currentCard.hindi} · {currentCard.front}</Text>

                <View style={styles.divider} />

                {/* Santali */}
                <View style={[styles.langBlock, practiceLang === 'sat_Olck' && { borderColor: '#16a34a30', backgroundColor: '#f0fdf4' }]}>
                  <Text style={styles.langBlockLabel}>Santali · Ol Chiki</Text>
                  <Text style={[styles.cardSantaliText, { color: '#166534', fontSize: practiceLang === 'sat_Olck' ? 34 : 22 }]}>
                    {currentCard.santali}
                  </Text>
                </View>

                {/* Ho */}
                {currentCard.ho && (
                  <View style={[styles.langBlock, practiceLang === 'ho' && { borderColor: '#2563eb30', backgroundColor: '#eff6ff' }]}>
                    <Text style={styles.langBlockLabel}>Ho · Warang Citi</Text>
                    <Text style={[styles.cardSantaliText, { color: '#1d4ed8', fontSize: practiceLang === 'ho' ? 28 : 18 }]}>
                      {currentCard.ho}
                    </Text>
                  </View>
                )}

                {/* Mundari */}
                {currentCard.mundari && (
                  <View style={[styles.langBlock, practiceLang === 'mundari' && { borderColor: '#7c3aed30', backgroundColor: '#faf5ff' }]}>
                    <Text style={styles.langBlockLabel}>Mundari · Devanagari</Text>
                    <Text style={[styles.cardSantaliText, { color: '#6d28d9', fontSize: practiceLang === 'mundari' ? 26 : 18 }]}>
                      {currentCard.mundari || currentCard.hindi}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Audio Pronunciation Button */}
          <TouchableOpacity
            style={[styles.hearBtn, { backgroundColor: currentLangConfig.color }, isPlaying && styles.hearBtnPlaying]}
            onPress={handleHearCard}
            activeOpacity={0.85}
          >
            <Text style={styles.hearBtnText}>
              {isPlaying ? `⏹️ Stop ${currentLangConfig.label}...` : `🔊 Hear in ${currentLangConfig.label} (${currentLangConfig.nativeLabel})`}
            </Text>
          </TouchableOpacity>

          {/* Controls: Prev, Shuffle, Next */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={handlePrev}>
              <Text style={styles.controlText}>← Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlBtn, styles.shuffleBtn]} onPress={handleShuffle}>
              <Text style={styles.controlText}>🔀 Shuffle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleNext}>
              <Text style={styles.controlText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Loading cards...</Text>
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

  // Language Picker
  langPickerRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  langPickerBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  langPickerLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  langPickerNative: { fontSize: 11, color: '#64748b', marginTop: 2 },

  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  categoryBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  card: {
    width: '100%',
    minHeight: 280,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    justifyContent: 'space-between',
  },
  cardFront: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  cardBack: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  cardTopIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  cardCounter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  cardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  cardIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  cardFrontText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardFrontSub: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  tapHint: { marginTop: 18, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tapPrompt: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Multilingual back blocks
  langBlock: { width: '100%', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8, alignItems: 'center' },
  langBlockLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  cardHindiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  cardHindiText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#bfdbfe',
    marginVertical: 14,
  },
  cardSantaliLabel: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '800',
  },
  cardSantaliText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    marginTop: 4,
  },
  hearBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
  },
  hearBtnPlaying: {
    backgroundColor: '#dc2626',
  },
  hearBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  shuffleBtn: {
    backgroundColor: '#f8fafc',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
