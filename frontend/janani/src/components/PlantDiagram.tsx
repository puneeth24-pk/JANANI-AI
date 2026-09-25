import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PlantDiagramProps {
  selectedLanguage: 'sat_Olck' | 'hin_Deva' | 'eng_Latn' | 'ho' | 'mundari';
  activePart?: 'leaves' | 'stem' | 'roots' | null;
  onSelectPart?: (part: 'leaves' | 'stem' | 'roots') => void;
}

export const PlantDiagram: React.FC<PlantDiagramProps> = ({
  selectedLanguage,
  activePart,
  onSelectPart,
}) => {
  // Multilingual labels for plant parts
  const labels = {
    leaves: {
      sat_Olck: 'ᱥᱟᱠᱟᱢ (Ol Chiki)',
      hin_Deva: 'पत्ते (Leaves)',
      eng_Latn: 'Leaves',
      ho: '𑢺𑣁𑣌𑣁𑣕 / Sakam',
      mundari: 'साकाम (Sakam)',
    },
    stem: {
      sat_Olck: 'ᱰᱟᱹᱨ (Ol Chiki)',
      hin_Deva: 'तना (Stem)',
      eng_Latn: 'Stem',
      ho: '𑣑𑣁𑣗 / Dar',
      mundari: 'डाड़ (Dar)',
    },
    roots: {
      sat_Olck: 'ᱨᱮᱦᱮᱫ (Ol Chiki)',
      hin_Deva: 'जड़ (Roots)',
      eng_Latn: 'Roots',
      ho: '𑣗𑣈𑣛𑣈𑣑 / Rehed',
      mundari: 'रेहेद (Rehed)',
    },
  };

  return (
    <View style={styles.container}>
      {/* Visual Plant Drawing */}
      <View style={styles.plantGraphic}>
        {/* Leaves section */}
        <TouchableOpacity
          style={[styles.partHotspot, styles.leavesSpot, activePart === 'leaves' && styles.spotActive]}
          onPress={() => onSelectPart?.('leaves')}
          activeOpacity={0.8}
        >
          <View style={styles.leafShapeLeft} />
          <View style={styles.leafShapeRight} />
          <View style={styles.leafShapeTop} />
          <View style={styles.calloutTag}>
            <Text style={styles.calloutTitle}>Leaves</Text>
            <Text style={styles.calloutSub}>{labels.leaves[selectedLanguage]}</Text>
          </View>
        </TouchableOpacity>

        {/* Stem section */}
        <TouchableOpacity
          style={[styles.partHotspot, styles.stemSpot, activePart === 'stem' && styles.spotActive]}
          onPress={() => onSelectPart?.('stem')}
          activeOpacity={0.8}
        >
          <View style={styles.stemTrunk} />
          <View style={styles.stemBranchLeft} />
          <View style={styles.stemBranchRight} />
          <View style={[styles.calloutTag, styles.stemCallout]}>
            <Text style={styles.calloutTitle}>Stem</Text>
            <Text style={styles.calloutSub}>{labels.stem[selectedLanguage]}</Text>
          </View>
        </TouchableOpacity>

        {/* Soil & Roots section */}
        <TouchableOpacity
          style={[styles.partHotspot, styles.rootsSpot, activePart === 'roots' && styles.spotActive]}
          onPress={() => onSelectPart?.('roots')}
          activeOpacity={0.8}
        >
          <View style={styles.soilMound} />
          {/* Root tendrils */}
          <View style={styles.rootCenter} />
          <View style={styles.rootLeft} />
          <View style={styles.rootRight} />
          <View style={styles.rootFarLeft} />
          <View style={styles.rootFarRight} />
          <View style={[styles.calloutTag, styles.rootsCallout]}>
            <Text style={styles.calloutTitle}>Roots</Text>
            <Text style={styles.calloutSub}>{labels.roots[selectedLanguage]}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.hintText}>💡 Click any part (Leaves, Stem, Roots) to learn its function</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  plantGraphic: {
    width: 320,
    height: 330,
    position: 'relative',
    alignItems: 'center',
  },
  partHotspot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotActive: {
    transform: [{ scale: 1.05 }],
  },

  /* Leaves */
  leavesSpot: {
    top: 10,
    width: 200,
    height: 120,
    zIndex: 3,
  },
  leafShapeTop: {
    width: 38,
    height: 64,
    backgroundColor: '#22c55e',
    borderRadius: 30,
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    borderColor: '#15803d',
    shadowColor: '#16a34a',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  leafShapeLeft: {
    width: 65,
    height: 38,
    backgroundColor: '#4ade80',
    borderRadius: 30,
    position: 'absolute',
    top: 40,
    left: 25,
    transform: [{ rotate: '-35deg' }],
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  leafShapeRight: {
    width: 65,
    height: 38,
    backgroundColor: '#4ade80',
    borderRadius: 30,
    position: 'absolute',
    top: 40,
    right: 25,
    transform: [{ rotate: '35deg' }],
    borderWidth: 2,
    borderColor: '#16a34a',
  },

  /* Stem */
  stemSpot: {
    top: 105,
    width: 140,
    height: 110,
    zIndex: 2,
  },
  stemTrunk: {
    width: 16,
    height: 110,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#15803d',
  },
  stemBranchLeft: {
    width: 35,
    height: 8,
    backgroundColor: '#16a34a',
    position: 'absolute',
    top: 30,
    left: 40,
    transform: [{ rotate: '-25deg' }],
    borderRadius: 4,
  },
  stemBranchRight: {
    width: 35,
    height: 8,
    backgroundColor: '#16a34a',
    position: 'absolute',
    top: 55,
    right: 40,
    transform: [{ rotate: '25deg' }],
    borderRadius: 4,
  },

  /* Soil & Roots */
  rootsSpot: {
    top: 205,
    width: 240,
    height: 120,
    zIndex: 1,
  },
  soilMound: {
    width: 180,
    height: 52,
    backgroundColor: '#92400e',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderWidth: 2,
    borderColor: '#78350f',
  },
  rootCenter: {
    width: 8,
    height: 60,
    backgroundColor: '#d97706',
    position: 'absolute',
    top: 45,
    borderRadius: 4,
  },
  rootLeft: {
    width: 6,
    height: 48,
    backgroundColor: '#d97706',
    position: 'absolute',
    top: 45,
    left: 95,
    transform: [{ rotate: '22deg' }],
    borderRadius: 3,
  },
  rootRight: {
    width: 6,
    height: 48,
    backgroundColor: '#d97706',
    position: 'absolute',
    top: 45,
    right: 95,
    transform: [{ rotate: '-22deg' }],
    borderRadius: 3,
  },
  rootFarLeft: {
    width: 4,
    height: 35,
    backgroundColor: '#b45309',
    position: 'absolute',
    top: 50,
    left: 70,
    transform: [{ rotate: '40deg' }],
    borderRadius: 2,
  },
  rootFarRight: {
    width: 4,
    height: 35,
    backgroundColor: '#b45309',
    position: 'absolute',
    top: 50,
    right: 70,
    transform: [{ rotate: '-40deg' }],
    borderRadius: 2,
  },

  /* Callout labels */
  calloutTag: {
    position: 'absolute',
    right: -100,
    top: 15,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stemCallout: {
    right: -90,
    top: 35,
  },
  rootsCallout: {
    right: -70,
    top: 55,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  calloutSub: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
