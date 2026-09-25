import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TabScreen } from '../types';

interface AppNavigatorProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
}

interface TabItem {
  id: TabScreen;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'Home', label: 'Home', icon: '🏠' },
  { id: 'Classroom', label: 'Classroom', icon: '🎤' },
  { id: 'Translate', label: 'Translate', icon: '🔤' },
  { id: 'Lessons', label: 'Lessons', icon: '📚' },
  { id: 'Worksheets', label: 'Worksheets', icon: '📝' },
  { id: 'Flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'History', label: 'History', icon: '🕘' },
  { id: 'Settings', label: 'Settings', icon: '⚙️' },
];

export const AppNavigator: React.FC<AppNavigatorProps> = ({ currentTab, onSelectTab }) => {
  return (
    <View style={styles.navBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 2,
    minWidth: 64,
  },
  tabBtnActive: {
    backgroundColor: '#eff6ff',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
});
