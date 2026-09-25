import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { isValidOlChiki } from '../utils/olchiki';
import { TTSService } from '../services/TTSService';

interface OlChikiCardProps {
  santaliText: string;
  sourceText?: string;
  sourceLang?: string;
  audioUrl?: string;
  onSave?: () => void;
  isSaved?: boolean;
}

export const OlChikiCard: React.FC<OlChikiCardProps> = ({
  santaliText,
  sourceText,
  sourceLang = 'Hindi',
  audioUrl,
  onSave,
  isSaved = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOlChikiValid = isValidOlChiki(santaliText);

  const handlePlay = async () => {
    if (isPlaying) {
      TTSService.stopAudio();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      setIsPlaying(true);
      TTSService.playAudio(audioUrl, () => setIsPlaying(false));
    } else if (santaliText) {
      setIsPlaying(true);
      try {
        const res = await TTSService.synthesize({ text: santaliText });
        if (res.success && res.audioUrl) {
          TTSService.playAudio(res.audioUrl, () => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleCopy = () => {
    if (navigator?.clipboard && santaliText) {
      navigator.clipboard.writeText(santaliText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!santaliText) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.badgeLabel}>SANTALI</Text>
          <View style={[styles.scriptBadge, isOlChikiValid ? styles.validBadge : styles.warnBadge]}>
            <Text style={[styles.scriptBadgeText, isOlChikiValid ? styles.validText : styles.warnText]}>
              {isOlChikiValid ? '✓ Ol Chiki Verified' : '⚠️ Ol Chiki'}
            </Text>
          </View>
        </View>
        <Text style={styles.scriptLabel}>ᱚᱞ ᱪᱤᱠᱤ</Text>
      </View>

      {sourceText ? (
        <View style={styles.sourceBox}>
          <Text style={styles.sourceLangLabel}>{sourceLang}:</Text>
          <Text style={styles.sourceText}>{sourceText}</Text>
        </View>
      ) : null}

      <View style={styles.santaliBox}>
        <Text style={styles.santaliText} selectable>
          {santaliText}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.playBtn, isPlaying && styles.playingBtn]}
          onPress={handlePlay}
        >
          <Text style={styles.playBtnText}>{isPlaying ? '⏹️ Stop' : '🔊 Play Santali'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
          <Text style={styles.actionBtnText}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
        </TouchableOpacity>

        {onSave && (
          <TouchableOpacity
            style={[styles.actionBtn, isSaved && styles.savedBtn]}
            onPress={onSave}
          >
            <Text style={styles.actionBtnText}>{isSaved ? '✓ Saved' : '💾 Save Lesson'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    marginVertical: 12,
    elevation: 3,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.8,
  },
  scriptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  validBadge: {
    backgroundColor: '#ecfdf5',
  },
  warnBadge: {
    backgroundColor: '#fffbeb',
  },
  scriptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  validText: {
    color: '#047857',
  },
  warnText: {
    color: '#b45309',
  },
  scriptLabel: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },
  sourceBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#94a3b8',
  },
  sourceLangLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sourceText: {
    fontSize: 15,
    color: '#334155',
    marginTop: 2,
    lineHeight: 20,
  },
  santaliBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginVertical: 4,
  },
  santaliText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 32,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  playBtn: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  playingBtn: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  playBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  savedBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
});
