import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

export type PipelineStage = 'idle' | 'listening' | 'recognizing' | 'translating' | 'speaking';

interface MicButtonProps {
  stage: PipelineStage;
  onPress: () => void;
  disabled?: boolean;
  languageLabel?: string;
}

export const MicButton: React.FC<MicButtonProps> = ({
  stage,
  onPress,
  disabled = false,
  languageLabel = 'Hindi',
}) => {
  const isBusy = stage !== 'idle';

  const getButtonBg = () => {
    switch (stage) {
      case 'listening':
        return '#ef4444'; // Bright Red (pulsing recording)
      case 'recognizing':
        return '#f59e0b'; // Amber
      case 'translating':
        return '#6366f1'; // Indigo
      case 'speaking':
        return '#10b981'; // Emerald Green
      default:
        return '#2563eb'; // Royal Blue
    }
  };

  const getButtonIcon = () => {
    switch (stage) {
      case 'listening':
        return '⏹️';
      case 'recognizing':
        return '📝';
      case 'translating':
        return '🔄';
      case 'speaking':
        return '🔊';
      default:
        return '🎤';
    }
  };

  const getStageLabel = () => {
    switch (stage) {
      case 'listening':
        return 'Listening... Speak now';
      case 'recognizing':
        return 'Recognizing speech...';
      case 'translating':
        return 'Translating to Santali...';
      case 'speaking':
        return 'Speaking Santali...';
      default:
        return `Tap to Speak (${languageLabel})`;
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || (isBusy && stage !== 'listening')}
        style={[
          styles.button,
          { backgroundColor: getButtonBg() },
          stage === 'listening' && styles.listeningShadow,
        ]}
      >
        {stage === 'recognizing' || stage === 'translating' ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <Text style={styles.icon}>{getButtonIcon()}</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.label}>{getStageLabel()}</Text>
      {stage !== 'idle' && (
        <View style={styles.stageBreadcrumb}>
          <Text style={[styles.crumbItem, stage === 'listening' && styles.crumbActive]}>🎤 Listen</Text>
          <Text style={styles.crumbArrow}>→</Text>
          <Text style={[styles.crumbItem, stage === 'recognizing' && styles.crumbActive]}>📝 Recognize</Text>
          <Text style={styles.crumbArrow}>→</Text>
          <Text style={[styles.crumbItem, stage === 'translating' && styles.crumbActive]}>🔄 Translate</Text>
          <Text style={styles.crumbArrow}>→</Text>
          <Text style={[styles.crumbItem, stage === 'speaking' && styles.crumbActive]}>🔊 Speak</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  listeningShadow: {
    shadowColor: '#ef4444',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 4,
    borderColor: '#fee2e2',
  },
  icon: {
    fontSize: 40,
  },
  label: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  stageBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  crumbItem: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  crumbActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  crumbArrow: {
    fontSize: 10,
    color: '#94a3b8',
    marginHorizontal: 4,
  },
});
