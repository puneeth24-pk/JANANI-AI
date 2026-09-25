import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { PlantDiagram } from './PlantDiagram';
import { TTSService } from '../services/TTSService';
import { SpeechService } from '../services/SpeechService';
import { TranslationService } from '../services/TranslationService';
import { ErrorBoundary } from './ErrorBoundary';

interface TeacherClassroomProps {
  onBackToDashboard: () => void;
  onOpenWorksheet: () => void;
}

type ClassroomTab = 'Lesson' | 'Explain' | 'Example' | 'Activity' | 'Quiz' | 'Worksheet';
type TargetLang = 'sat_Olck' | 'ho' | 'mundari';
type SourceLang = 'hin_Deva' | 'eng_Latn';

interface SubtopicContent {
  id: number;
  title: string;
  icon: string;
  objective: string;
  content: {
    sat_Olck: string;
    hin_Deva: string;
    eng_Latn: string;
    ho: string;
    mundari: string;
  };
  romanPhonetic: {
    sat_Olck: string;
    ho: string;
    mundari: string;
  };
}

const SUBTOPICS: SubtopicContent[] = [
  {
    id: 1,
    title: 'Parts of a Plant',
    icon: '🌿',
    objective: 'Identify the three main parts of a plant (Leaf, Stem, Root) and understand their basic functions.',
    content: {
      sat_Olck: 'ᱥᱟᱠᱟᱢ, ᱰᱟᱹᱨ ᱟᱨ ᱨᱮᱦᱮᱫ ᱫᱚ ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱢᱩᱬ ᱦᱟᱹᱴᱤᱧ ᱠᱟᱱᱟ ᱾',
      hin_Deva: 'पत्ते, तना और जड़ पौधे के मुख्य भाग होते हैं।',
      eng_Latn: 'Leaves, stem and roots are the main parts of a plant.',
      ho: '𑢺𑣁𑣌𑣁𑣕, 𑣑𑣁𑣗 𑣉𑣑𑣉 𑣗𑣈𑣛𑣈𑣑 𑣑𑣁𑣗𑣃𑣁𑣛 𑣁𑣚𑣉𑣘 𑣛𑣁𑣐𑣂𑣒 𑣐𑣁𑣒𑣁.',
      mundari: 'साकाम, डाड़ आर रेहेद दारु राः आसोल हाटिङ ताना।',
    },
    romanPhonetic: {
      sat_Olck: 'Sakam, dar ar rehed do dare reyag munr hatinj kana.',
      ho: 'Sakam, dar odo rehed daruaah asol hatin tana.',
      mundari: 'Sakam, dar ar rehed daru raah asol hatin tana.',
    },
  },
  {
    id: 2,
    title: 'Types of Plants',
    icon: '🌳',
    objective: 'Distinguish between large trees, medium shrubs, and small green herbs.',
    content: {
      sat_Olck: 'ᱫᱟᱨᱮ ᱫᱚ ᱟᱭᱢᱟ ᱞᱮᱠᱟᱱᱟᱜ ᱢᱮᱱᱟᱜᱼᱟ : ᱡᱮᱞᱮᱠᱟ ᱫᱟᱨᱮ, ᱵᱩᱫᱟᱹ ᱟᱨ ᱜᱷᱟᱸᱥ ᱾',
      hin_Deva: 'पौधे कई प्रकार के होते हैं: जैसे वृक्ष, झाड़ी और शाक।',
      eng_Latn: 'Plants are of many types: trees, shrubs, and herbs.',
      ho: '𑢱𑣁𑣗𑣃𑣌𑣉 𑣁𑣖𑣕𑣁 𑣘𑣈𑣌𑣁 𑣕𑣈𑣒𑣁: 𑢱𑣁𑣗𑣃, 𑢔𑣃𑣑𑣁 𑣉𑣑𑣉 𑣎𑣁𑣚.',
      mundari: 'दारुको आयमा लेका मेनाः: दारु, बुदा आर घांस।',
    },
    romanPhonetic: {
      sat_Olck: 'Dare do ayma lekanag menag-a: dare, buda ar ghas.',
      ho: 'Daruko ayma leka mena: daru, buda odo ghas.',
      mundari: 'Daruko ayma leka mena: daru, buda ar ghans.',
    },
  },
  {
    id: 3,
    title: 'Uses of Plants',
    icon: '🌾',
    objective: 'Explore how plants provide food, fresh oxygen, medicine, and cool shade.',
    content: {
      sat_Olck: 'ᱫᱟᱨᱮ ᱠᱷᱚᱱ ᱟᱵᱚ ᱡᱚᱢᱟᱜ, ᱦᱚᱭ, ᱨᱟᱱ ᱟᱨ ᱩᱢᱩᱞ ᱵᱚ ᱧᱟᱢᱟ ᱾',
      hin_Deva: 'पौधों से हमें भोजन, ताज़ी हवा, दवाइयाँ और छाया मिलती है।',
      eng_Latn: 'Plants give us food, fresh air, medicine, and shade.',
      ho: '𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣁𑣘𑣈 𑣕𑣁𑣒𑣑𑣂, 𑣛𑣉𑣖 𑣉𑣑𑣉 𑣗𑣁𑣒 𑣒𑣁𑣕𑣈.',
      mundari: 'दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।',
    },
    romanPhonetic: {
      sat_Olck: 'Dare khon abo jomag, hoy, ran ar umul bo nyama.',
      ho: 'Daru ete ale mandi, hoy odo ran name.',
      mundari: 'Daru ate ale mandi, hoyo, ran ar ubul namana.',
    },
  },
  {
    id: 4,
    title: 'Food from Plants',
    icon: '🍎',
    objective: 'Identify grains, pulses, fruits, and vegetables harvested from local plants.',
    content: {
      sat_Olck: 'ᱫᱟᱨᱮ ᱫᱚ ᱟᱵᱚ ᱞᱟᱹᱜᱤᱫ ᱡᱚ, ᱩᱛᱩ, ᱜᱩᱦᱩᱢ ᱟᱨ ᱪᱟᱣᱞᱮ ᱮᱢᱚᱜᱼᱟ ᱾',
      hin_Deva: 'पौधे हमें फल, सब्जियां, दालें और अनाज देते हैं।',
      eng_Latn: 'Plants give us fruits, vegetables, pulses, and grains.',
      ho: '𑢱𑣁𑣗𑣃 𑣁𑣘𑣈 𑣯𑣉, 𑣃𑣐𑣃 𑣉𑣑𑣉 𑣎𑣁𑣙𑣘𑣈 𑣈𑣕𑣈.',
      mundari: 'दारु आले नातिन जो, उतू आर चाउले एमालेआ।',
    },
    romanPhonetic: {
      sat_Olck: 'Dare do abo lagid jo, utu, guhum ar chawle emog-a.',
      ho: 'Daru ale lagid jo, utu odo chawle eme.',
      mundari: 'Daru ale natin jo, utu ar chaule emalea.',
    },
  },
  {
    id: 5,
    title: 'Classroom Activity',
    icon: '🌱',
    objective: 'Hands-on practice: plant a local seed in soil and record its daily watering.',
    content: {
      sat_Olck: 'ᱟᱯᱱᱟᱨ ᱵᱟᱲᱜᱮ ᱨᱮ ᱢᱤᱫᱴᱟᱝ ᱫᱟᱨᱮ ᱨᱚᱦᱚᱭ ᱢᱮ ᱟᱨ ᱫᱤᱱᱟᱹᱢ ᱫᱟᱜ ᱫᱩᱞ ᱢᱮ ᱾',
      hin_Deva: 'अपने विद्यालय के बगीचे में एक पौधा लगाएं और प्रतिदिन पानी दें।',
      eng_Latn: 'Plant a seed in your garden and water it every day.',
      ho: '𑢡𑣕𑣁𑣛 𑣔𑣁𑣗𑣍𑣈 𑣗𑣈 𑣕𑣂𑣖𑣁𑣑 𑣑𑣁𑣗𑣃 𑣗𑣉𑣛𑣉𑣖 𑣕𑣈 𑣉𑣑𑣉 𑣑𑣁 𑣑𑣃𑣘 𑣕𑣈.',
      mundari: 'अमाः बाड़गे रे मियद दारु रोहोय मे आर दिनाम दाः दुल मे।',
    },
    romanPhonetic: {
      sat_Olck: 'Apnar badge re midtang dare rohoy me ar dinam dag dul me.',
      ho: 'Amah badge re miyad daru rohoy me odo da dul me.',
      mundari: 'Amah badge re miyad daru rohoy me ar dinam da dul me.',
    },
  },
];

export const TeacherClassroom: React.FC<TeacherClassroomProps> = ({
  onBackToDashboard,
  onOpenWorksheet,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [activeTab, setActiveTab] = useState<ClassroomTab>('Lesson');
  const [selectedSubtopic, setSelectedSubtopic] = useState<number>(1);
  const [sourceLang, setSourceLang] = useState<SourceLang>('hin_Deva');
  const [targetLang, setTargetLang] = useState<TargetLang>('sat_Olck');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentlyPlayingSnippet, setCurrentlyPlayingSnippet] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const [copied, setCopied] = useState<boolean>(false);
  const [activePlantPart, setActivePlantPart] = useState<'leaves' | 'stem' | 'roots' | null>(null);

  // Speak Practice State Model: idle | recording | processing | success | error
  const [showSpeakModal, setShowSpeakModal] = useState<boolean>(false);
  const [speakSourceLang, setSpeakSourceLang] = useState<SourceLang>('hin_Deva');
  const [speakTargetLang, setSpeakTargetLang] = useState<TargetLang>('sat_Olck');
  const [speakState, setSpeakState] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Voice captured');
  const [speakResult, setSpeakResult] = useState<{
    teacherSaid: string;
    translatedText: string;
    romanText?: string;
  } | null>(null);

  const timerRef = useRef<any>(null);

  const currentTopic = SUBTOPICS.find((s) => s.id === selectedSubtopic) || SUBTOPICS[0];

  // Animated bars for waveform
  const [animHeights] = useState(() =>
    Array.from({ length: 18 }, () => new Animated.Value(12))
  );

  useEffect(() => {
    let animLoop: any;
    if (isPlaying) {
      const animations = animHeights.map((h, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(h, {
              toValue: 12 + Math.random() * 24,
              duration: 220 + (i % 5) * 50,
              useNativeDriver: false,
            }),
            Animated.timing(h, {
              toValue: 8 + Math.random() * 8,
              duration: 220 + (i % 5) * 50,
              useNativeDriver: false,
            }),
          ])
        )
      );
      animLoop = Animated.parallel(animations);
      animLoop.start();
    } else {
      animHeights.forEach((h) => h.setValue(12));
    }
    return () => {
      if (animLoop) {
        try {
          animLoop.stop();
        } catch (e) {}
      }
    };
  }, [isPlaying]);

  // Cleanup audio safely on unmount
  useEffect(() => {
    return () => {
      TTSService.stopAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePlayVoice = (langToPlay?: TargetLang | SourceLang) => {
    const playLang = langToPlay || targetLang;

    // Toggle off if currently playing this exact snippet
    if (isPlaying && currentlyPlayingSnippet === playLang) {
      TTSService.stopAudio();
      setIsPlaying(false);
      setCurrentlyPlayingSnippet(null);
      return;
    }

    setAudioError(null);
    setCurrentlyPlayingSnippet(playLang);

    const textToSpeak = currentTopic.content[playLang as keyof typeof currentTopic.content] || '';
    const romanText =
      playLang === 'sat_Olck' || playLang === 'ho' || playLang === 'mundari'
        ? currentTopic.romanPhonetic[playLang]
        : undefined;

    TTSService.playNaturalVoice({
      text: textToSpeak,
      romanText: romanText,
      language: playLang,
      speed: speed,
      onStart: () => {
        setIsPlaying(true);
        setAudioError(null);
      },
      onEnded: () => {
        setIsPlaying(false);
        setCurrentlyPlayingSnippet(null);
      },
      onError: (err) => {
        console.warn('[Classroom] Voice playback error handled:', err);
        setIsPlaying(false);
        setCurrentlyPlayingSnippet(null);
        setAudioError('Voice playback could not be completed.');
      },
    });
  };

  const handleCycleSpeed = () => {
    const speeds = [0.8, 1.0, 1.2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentTopic.content[targetLang]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNext = () => {
    if (selectedSubtopic < SUBTOPICS.length) {
      setSelectedSubtopic(selectedSubtopic + 1);
      setAudioError(null);
    }
  };

  const handlePrev = () => {
    if (selectedSubtopic > 1) {
      setSelectedSubtopic(selectedSubtopic - 1);
      setAudioError(null);
    }
  };

  // ── Speak Practice Lifecycle Management ──
  const handleOpenSpeakPractice = () => {
    TTSService.stopAudio();
    setIsPlaying(false);
    setShowSpeakModal(true);
    setSpeakState('idle');
    setRecordSeconds(0);
    setSpeakResult(null);
  };

  const handleStartRecording = () => {
    setSpeakState('recording');
    setRecordSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);

    // Simulate 3.5s speech recording followed by full pipeline
    setTimeout(() => {
      handleStopRecording();
    }, 3500);
  };

  const handleStopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSpeakState('processing');

    try {
      // 1. Transcribing
      setProcessingStage('Transcribing speech with Whisper...');
      await new Promise((r) => setTimeout(r, 600));

      // 2. Translating
      setProcessingStage('Translating with IndicTrans2...');
      const sampleSaid =
        speakSourceLang === 'hin_Deva'
          ? currentTopic.content.hin_Deva
          : currentTopic.content.eng_Latn;
      const targetTranslated = currentTopic.content[speakTargetLang];
      const targetRoman = currentTopic.romanPhonetic[speakTargetLang];

      await new Promise((r) => setTimeout(r, 600));

      // 3. Generating tribal speech
      setProcessingStage('Generating tribal-language speech with DhVaani...');
      await new Promise((r) => setTimeout(r, 500));

      setSpeakResult({
        teacherSaid: sampleSaid,
        translatedText: targetTranslated,
        romanText: targetRoman,
      });
      setSpeakState('success');
    } catch (err: any) {
      console.warn('[Classroom] Speak practice processing error:', err);
      setSpeakState('error');
    }
  };

  const tabs: ClassroomTab[] = ['Lesson', 'Explain', 'Example', 'Activity', 'Quiz', 'Worksheet'];

  return (
    <ErrorBoundary fallbackTitle="Classroom Workspace Encountered an Issue">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Top Breadcrumb Bar ── */}
        <View style={styles.breadcrumbBar}>
          <View style={styles.breadcrumbLeft}>
            <TouchableOpacity onPress={onBackToDashboard} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbText}>
              Class 4 <Text style={styles.breadcrumbSep}>›</Text> EVS{' '}
              <Text style={styles.breadcrumbSep}>›</Text> Plants{' '}
              <Text style={styles.breadcrumbSep}>›</Text>{' '}
              <Text style={styles.breadcrumbActive}>Lesson {selectedSubtopic}</Text>
            </Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.speakHeaderBtn} onPress={handleOpenSpeakPractice}>
              <Text style={{ fontSize: 13, marginRight: 6 }}>🎙️</Text>
              <Text style={styles.speakHeaderBtnText}>Speak Practice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Header Title & Learning Objective ── */}
        <View style={styles.headerTitleSection}>
          <Text style={styles.lessonTitleLarge}>{currentTopic.title}</Text>
          <Text style={styles.learningObjectiveText}>
            🎯 <Text style={{ fontWeight: '700' }}>Objective:</Text> {currentTopic.objective}
          </Text>
        </View>

        {/* ── Global Classroom Language Selector Chips ── */}
        <View style={styles.globalLangBar}>
          <Text style={styles.globalLangLabel}>ACTIVE LANGUAGE:</Text>
          <View style={styles.globalLangChips}>
            <TouchableOpacity
              style={[styles.langChip, sourceLang === 'eng_Latn' && styles.langChipActiveSource]}
              onPress={() => setSourceLang('eng_Latn')}
            >
              <Text style={[styles.langChipText, sourceLang === 'eng_Latn' && styles.langChipTextActiveSource]}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langChip, sourceLang === 'hin_Deva' && styles.langChipActiveSource]}
              onPress={() => setSourceLang('hin_Deva')}
            >
              <Text style={[styles.langChipText, sourceLang === 'hin_Deva' && styles.langChipTextActiveSource]}>
                हिन्दी
              </Text>
            </TouchableOpacity>

            <View style={styles.langDivider} />

            <TouchableOpacity
              style={[styles.langChip, targetLang === 'sat_Olck' && styles.langChipActiveTarget]}
              onPress={() => {
                setTargetLang('sat_Olck');
                setAudioError(null);
              }}
            >
              <Text style={{ fontSize: 12, marginRight: 4 }}>🌸</Text>
              <Text style={[styles.langChipText, targetLang === 'sat_Olck' && styles.langChipTextActiveTarget]}>
                Santali (Ol Chiki)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langChip, targetLang === 'ho' && styles.langChipActiveTarget]}
              onPress={() => {
                setTargetLang('ho');
                setAudioError(null);
              }}
            >
              <Text style={{ fontSize: 12, marginRight: 4 }}>🌾</Text>
              <Text style={[styles.langChipText, targetLang === 'ho' && styles.langChipTextActiveTarget]}>
                Ho (Warang Citi)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langChip, targetLang === 'mundari' && styles.langChipActiveTarget]}
              onPress={() => {
                setTargetLang('mundari');
                setAudioError(null);
              }}
            >
              <Text style={{ fontSize: 12, marginRight: 4 }}>🌳</Text>
              <Text style={[styles.langChipText, targetLang === 'mundari' && styles.langChipTextActiveTarget]}>
                Mundari (Devanagari)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs Bar: Lesson, Explain, Example, Activity, Quiz, Worksheet ── */}
        <View style={styles.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab(tab);
                if (tab === 'Worksheet') {
                  onOpenWorksheet();
                }
              }}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab === 'Lesson' && '📖 '}
                {tab === 'Explain' && '💡 '}
                {tab === 'Example' && '🔍 '}
                {tab === 'Activity' && '🧩 '}
                {tab === 'Quiz' && '❓ '}
                {tab === 'Worksheet' && '📝 '}
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Inline Safe Audio Error Banner (Never crashes page) ── */}
        {audioError && (
          <View style={styles.inlineAudioErrorBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={styles.inlineAudioErrorText}>
                {audioError} You can continue reading the lesson text.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.inlineRetryBtn}
                onPress={() => handlePlayVoice(targetLang)}
              >
                <Text style={styles.inlineRetryBtnText}>🔄 Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAudioError(null)} style={{ padding: 4 }}>
                <Text style={{ color: '#991b1b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 3-Column Desktop / 2-Column Tablet / Stacked Mobile Layout ── */}
        <View
          style={[
            styles.classroomGrid,
            isTablet && styles.classroomGridTablet,
            isMobile && styles.classroomGridMobile,
          ]}
        >
          {/* Left Column: Lesson Navigation */}
          <View style={[styles.subtopicsSidebar, isTablet && styles.subtopicsSidebarTablet]}>
            <Text style={styles.sidebarHeading}>TOPICS & SUBTOPICS</Text>
            {SUBTOPICS.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[
                  styles.subtopicItem,
                  selectedSubtopic === sub.id && styles.subtopicItemActive,
                ]}
                onPress={() => {
                  setSelectedSubtopic(sub.id);
                  setAudioError(null);
                }}
              >
                <View
                  style={[
                    styles.subtopicNumber,
                    selectedSubtopic === sub.id && styles.subtopicNumberActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subtopicNumText,
                      selectedSubtopic === sub.id && styles.subtopicNumTextActive,
                    ]}
                  >
                    {sub.id}
                  </Text>
                </View>
                <View style={styles.subtopicDetails}>
                  <Text
                    style={[
                      styles.subtopicTitle,
                      selectedSubtopic === sub.id && styles.subtopicTitleActive,
                    ]}
                  >
                    {sub.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addTopicBtn} onPress={onOpenWorksheet}>
              <Text style={styles.addTopicIcon}>📝</Text>
              <Text style={styles.addTopicText}>Take Interactive Practice</Text>
            </TouchableOpacity>
          </View>

          {/* Center Column: Interactive Visualization */}
          <View style={styles.centerStage}>
            <View style={styles.diagramCard}>
              <View style={styles.diagramHeader}>
                <View>
                  <Text style={styles.diagramTitle}>{currentTopic.title}</Text>
                  <Text style={styles.diagramSubtitle}>
                    Topic {selectedSubtopic} of {SUBTOPICS.length} • Interactive Diagram
                  </Text>
                </View>
                <View style={styles.interactivePill}>
                  <Text style={styles.interactivePillText}>Leaf • Stem • Root</Text>
                </View>
              </View>

              {/* Plant Visual Graphic */}
              <PlantDiagram
                selectedLanguage={targetLang}
                activePart={activePlantPart}
                onSelectPart={(part) => setActivePlantPart(part)}
              />

              {/* Subtopic Navigator */}
              <View style={styles.subtopicQuickNav}>
                <TouchableOpacity
                  style={[styles.quickNavBtn, selectedSubtopic === 1 && { opacity: 0.3 }]}
                  onPress={handlePrev}
                  disabled={selectedSubtopic === 1}
                >
                  <Text style={styles.quickNavBtnText}>‹ Previous Subtopic</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickNavBtn,
                    selectedSubtopic === SUBTOPICS.length && { opacity: 0.3 },
                  ]}
                  onPress={handleNext}
                  disabled={selectedSubtopic === SUBTOPICS.length}
                >
                  <Text style={styles.quickNavBtnText}>Next Subtopic ›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Column: Audio Learning & Translated Text Panel */}
          <View style={[styles.rightSidebar, isTablet && styles.rightSidebarTablet]}>
            {/* Audio Waveform Player Card */}
            <View style={styles.audioPlayerCard}>
              <View style={styles.audioPlayerHeader}>
                <Text style={styles.audioPlayerTitle}>
                  LISTEN (
                  {targetLang === 'sat_Olck'
                    ? 'Santali'
                    : targetLang === 'ho'
                    ? 'Ho'
                    : 'Mundari'}
                  )
                </Text>
                <TouchableOpacity style={styles.speedBtn} onPress={handleCycleSpeed}>
                  <Text style={styles.speedBtnText}>{speed.toFixed(1)}x speed</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.waveformRow}>
                <View style={styles.waveformBars}>
                  {animHeights.map((h, idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.waveformBar,
                        { height: h, backgroundColor: isPlaying ? '#059669' : '#cbd5e1' },
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.playCircle, isPlaying && styles.playCircleActive]}
                  onPress={() => handlePlayVoice(targetLang)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Translated Text Card */}
            <View style={styles.translatedCard}>
              <View style={styles.transCardHeader}>
                <Text style={styles.transCardTitle}>TRANSLATED TEXT</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                  <Text style={styles.copyIcon}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
                </TouchableOpacity>
              </View>

              {/* Tribal Language Output (Primary) */}
              <View style={styles.primaryTextBox}>
                <View style={styles.auxHeaderRow}>
                  <Text style={styles.primaryBoxLabel}>
                    {targetLang === 'sat_Olck'
                      ? 'Santali (Ol Chiki)'
                      : targetLang === 'ho'
                      ? 'Ho (Warang Citi)'
                      : 'Mundari (Devanagari)'}
                  </Text>
                  <TouchableOpacity onPress={() => handlePlayVoice(targetLang)}>
                    <Text style={styles.auxPlayIcon}>
                      {isPlaying && currentlyPlayingSnippet === targetLang ? '⏸' : '🔊'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.primaryText}>{currentTopic.content[targetLang]}</Text>
                {currentTopic.romanPhonetic[targetLang] && (
                  <Text style={styles.primaryRomanPhonetic}>
                    🗣️ {currentTopic.romanPhonetic[targetLang]}
                  </Text>
                )}
              </View>

              {/* Hindi Translation */}
              <View style={styles.auxTextBox}>
                <View style={styles.auxHeaderRow}>
                  <Text style={styles.auxLabel}>Hindi Translation:</Text>
                  <TouchableOpacity onPress={() => handlePlayVoice('hin_Deva')}>
                    <Text style={styles.auxPlayIcon}>
                      {isPlaying && currentlyPlayingSnippet === 'hin_Deva' ? '⏸' : '🔊'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.auxText}>{currentTopic.content.hin_Deva}</Text>
              </View>

              {/* English Explanation */}
              <View style={[styles.auxTextBox, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.auxHeaderRow}>
                  <Text style={styles.auxLabel}>English Explanation:</Text>
                  <TouchableOpacity onPress={() => handlePlayVoice('eng_Latn')}>
                    <Text style={styles.auxPlayIcon}>
                      {isPlaying && currentlyPlayingSnippet === 'eng_Latn' ? '⏸' : '🔊'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.auxText}>{currentTopic.content.eng_Latn}</Text>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.practiceShortcutBtn} onPress={onOpenWorksheet}>
                <Text style={styles.practiceShortcutText}>📝 Practice This Topic</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Speak Practice Modal (Section 5 Spec) ── */}
        {renderSpeakPracticeModal()}
      </ScrollView>
    </ErrorBoundary>
  );

  function renderSpeakPracticeModal() {
    return (
      <Modal
        visible={showSpeakModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          setShowSpeakModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.speakModalCard}>
            <View style={styles.speakModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🎙️</Text>
                <Text style={styles.speakModalTitle}>Speak Practice</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setShowSpeakModal(false);
                }}
              >
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Source & Target Language Selectors */}
            <View style={styles.speakModalLangRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.speakLangLabel}>Source Language:</Text>
                <View style={styles.speakLangPillRow}>
                  <TouchableOpacity
                    style={[
                      styles.speakLangPill,
                      speakSourceLang === 'hin_Deva' && styles.speakLangPillActive,
                    ]}
                    onPress={() => setSpeakSourceLang('hin_Deva')}
                  >
                    <Text
                      style={[
                        styles.speakLangPillText,
                        speakSourceLang === 'hin_Deva' && styles.speakLangPillTextActive,
                      ]}
                    >
                      हिन्दी
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.speakLangPill,
                      speakSourceLang === 'eng_Latn' && styles.speakLangPillActive,
                    ]}
                    onPress={() => setSpeakSourceLang('eng_Latn')}
                  >
                    <Text
                      style={[
                        styles.speakLangPillText,
                        speakSourceLang === 'eng_Latn' && styles.speakLangPillTextActive,
                      ]}
                    >
                      English
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={styles.speakLangLabel}>Target Language:</Text>
                <View style={styles.speakLangPillRow}>
                  <TouchableOpacity
                    style={[
                      styles.speakLangPill,
                      speakTargetLang === 'sat_Olck' && styles.speakLangPillActiveTarget,
                    ]}
                    onPress={() => setSpeakTargetLang('sat_Olck')}
                  >
                    <Text
                      style={[
                        styles.speakLangPillText,
                        speakTargetLang === 'sat_Olck' && styles.speakLangPillTextActive,
                      ]}
                    >
                      Santali
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.speakLangPill,
                      speakTargetLang === 'ho' && styles.speakLangPillActiveTarget,
                    ]}
                    onPress={() => setSpeakTargetLang('ho')}
                  >
                    <Text
                      style={[
                        styles.speakLangPillText,
                        speakTargetLang === 'ho' && styles.speakLangPillTextActive,
                      ]}
                    >
                      Ho
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.speakLangPill,
                      speakTargetLang === 'mundari' && styles.speakLangPillActiveTarget,
                    ]}
                    onPress={() => setSpeakTargetLang('mundari')}
                  >
                    <Text
                      style={[
                        styles.speakLangPillText,
                        speakTargetLang === 'mundari' && styles.speakLangPillTextActive,
                      ]}
                    >
                      Mundari
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Target Lesson Prompt */}
            <View style={styles.speakTargetPromptCard}>
              <Text style={styles.speakPromptTitle}>Say this sentence:</Text>
              <Text style={styles.speakPromptContent}>
                {speakSourceLang === 'hin_Deva'
                  ? currentTopic.content.hin_Deva
                  : currentTopic.content.eng_Latn}
              </Text>
            </View>

            {/* Recording / Processing / Success States */}
            {speakState === 'idle' && (
              <View style={styles.speakActionContainer}>
                <TouchableOpacity
                  style={styles.speakRecordBtn}
                  onPress={handleStartRecording}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 32 }}>🎤</Text>
                </TouchableOpacity>
                <Text style={styles.speakRecordPrompt}>Tap to Start Speaking</Text>
              </View>
            )}

            {speakState === 'recording' && (
              <View style={styles.speakActionContainer}>
                <TouchableOpacity
                  style={[styles.speakRecordBtn, styles.speakRecordBtnActive]}
                  onPress={handleStopRecording}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 32 }}>⏹️</Text>
                </TouchableOpacity>
                <Text style={styles.speakRecordingTimer}>
                  🔴 Listening... 00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}
                </Text>
                <Text style={styles.speakRecordingSub}>Speak clearly into your microphone</Text>
              </View>
            )}

            {speakState === 'processing' && (
              <View style={styles.speakProcessingCard}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.processingMainTitle}>Processing Speech Pipeline</Text>
                <View style={styles.pipelineSteps}>
                  <Text style={styles.pipelineStepItem}>🎙️ Voice captured</Text>
                  <Text style={styles.pipelineStepArrow}>↓</Text>
                  <Text style={[styles.pipelineStepItem, { fontWeight: '700', color: '#059669' }]}>
                    {processingStage}
                  </Text>
                </View>
              </View>
            )}

            {speakState === 'success' && speakResult && (
              <View style={styles.speakResultCard}>
                <View style={styles.speakSaidRow}>
                  <Text style={styles.speakResultLabel}>Teacher said:</Text>
                  <Text style={styles.speakResultSaidText}>"{speakResult.teacherSaid}"</Text>
                </View>

                <View style={styles.speakTribalRow}>
                  <Text style={styles.speakResultLabel}>
                    Tribal Language ({speakTargetLang === 'sat_Olck' ? 'Santali' : speakTargetLang === 'ho' ? 'Ho' : 'Mundari'}):
                  </Text>
                  <Text style={styles.speakResultTribalText}>{speakResult.translatedText}</Text>
                  {speakResult.romanText && (
                    <Text style={styles.speakResultPhonetic}>🗣️ {speakResult.romanText}</Text>
                  )}
                </View>

                <View style={styles.speakResultActions}>
                  <TouchableOpacity
                    style={styles.speakPlayAudioBtn}
                    onPress={() => handlePlayVoice(speakTargetLang)}
                  >
                    <Text style={styles.speakPlayAudioText}>🔊 Play Voice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.speakTryAgainBtn}
                    onPress={() => setSpeakState('idle')}
                  >
                    <Text style={styles.speakTryAgainText}>🔄 Try Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.speakContinueBtn}
                    onPress={() => setShowSpeakModal(false)}
                  >
                    <Text style={styles.speakContinueText}>Continue ➡️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {speakState === 'error' && (
              <View style={styles.speakErrorCard}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>⚠️</Text>
                <Text style={styles.speakErrorTitle}>Voice could not be processed</Text>
                <Text style={styles.speakErrorSub}>
                  Please ensure your microphone is enabled or try speaking again.
                </Text>
                <TouchableOpacity
                  style={styles.speakErrorRetryBtn}
                  onPress={() => setSpeakState('idle')}
                >
                  <Text style={styles.speakErrorRetryText}>🔄 Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 60, width: '100%' },

  breadcrumbBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  breadcrumbLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backIcon: { fontSize: 16, fontWeight: '700', color: '#064e3b' },
  breadcrumbText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  breadcrumbSep: { color: '#cbd5e1', marginHorizontal: 2 },
  breadcrumbActive: { color: '#0f172a', fontWeight: '700' },
  topRightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  speakHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  speakHeaderBtnText: { fontSize: 12, fontWeight: '700', color: '#065f46' },

  headerTitleSection: { marginBottom: 14 },
  lessonTitleLarge: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  learningObjectiveText: { fontSize: 13, color: '#475569', lineHeight: 18 },

  globalLangBar: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  globalLangLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8 },
  globalLangChips: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langChipActiveSource: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  langChipActiveTarget: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  langChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  langChipTextActiveSource: { color: '#1d4ed8', fontWeight: '800' },
  langChipTextActiveTarget: { color: '#ffffff', fontWeight: '800' },
  langDivider: { width: 1, height: 18, backgroundColor: '#cbd5e1', marginHorizontal: 4 },

  tabsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#fef08a',
    borderColor: '#facc15',
  },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  tabButtonTextActive: { color: '#854d0e', fontWeight: '800' },

  inlineAudioErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  inlineAudioErrorText: { fontSize: 13, color: '#991b1b', fontWeight: '600' },
  inlineRetryBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  inlineRetryBtnText: { fontSize: 12, fontWeight: '700', color: '#991b1b' },

  classroomGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  classroomGridTablet: { flexDirection: 'column' },
  classroomGridMobile: { flexDirection: 'column' },

  subtopicsSidebar: {
    width: 230,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subtopicsSidebarTablet: { width: '100%', marginBottom: 16 },
  sidebarHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  subtopicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  subtopicItemActive: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  subtopicNumber: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtopicNumberActive: { backgroundColor: '#facc15' },
  subtopicNumText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  subtopicNumTextActive: { color: '#713f12' },
  subtopicDetails: { flex: 1 },
  subtopicTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  subtopicTitleActive: { color: '#854d0e', fontWeight: '700' },
  addTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  addTopicIcon: { fontSize: 14 },
  addTopicText: { fontSize: 12, fontWeight: '700', color: '#047857' },

  centerStage: { flex: 1 },
  diagramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    elevation: 1,
  },
  diagramHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diagramTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  diagramSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  interactivePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  interactivePillText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  subtopicQuickNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickNavBtn: { padding: 6 },
  quickNavBtnText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  rightSidebar: { width: 330, gap: 16 },
  rightSidebarTablet: { width: '100%', marginTop: 16 },

  audioPlayerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  audioPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioPlayerTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  speedBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  speedBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  waveformBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 6,
  },
  waveformBar: { width: 4, borderRadius: 2 },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  playCircleActive: { backgroundColor: '#047857' },
  playIcon: { fontSize: 18, color: '#ffffff' },

  translatedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  transCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  transCardTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  copyBtn: { padding: 4 },
  copyIcon: { fontSize: 12, color: '#059669', fontWeight: '700' },

  primaryTextBox: {
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  primaryBoxLabel: { fontSize: 10, fontWeight: '800', color: '#854d0e', textTransform: 'uppercase' },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#854d0e',
    lineHeight: 24,
    marginTop: 4,
  },
  primaryRomanPhonetic: { fontSize: 11, color: '#a16207', fontStyle: 'italic', marginTop: 6 },

  auxTextBox: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  auxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  auxLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  auxPlayIcon: { fontSize: 14 },
  auxText: { fontSize: 13, color: '#334155', lineHeight: 18 },

  navRow: { marginTop: 4 },
  practiceShortcutBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  practiceShortcutText: { fontSize: 13, fontWeight: '800', color: '#713f12' },

  /* Speak Modal (Section 5) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  speakModalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  speakModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  speakModalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalCloseBtn: { fontSize: 18, color: '#94a3b8', padding: 4 },

  speakModalLangRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  speakLangLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  speakLangPillRow: { flexDirection: 'row', gap: 4 },
  speakLangPill: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  speakLangPillActive: { backgroundColor: '#dbeafe' },
  speakLangPillActiveTarget: { backgroundColor: '#dcfce7' },
  speakLangPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  speakLangPillTextActive: { fontWeight: '800', color: '#064e3b' },

  speakTargetPromptCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  speakPromptTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 2 },
  speakPromptContent: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },

  speakActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  speakRecordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  speakRecordBtnActive: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
  },
  speakRecordPrompt: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 12 },
  speakRecordingTimer: { fontSize: 14, fontWeight: '800', color: '#dc2626', marginTop: 12 },
  speakRecordingSub: { fontSize: 11, color: '#64748b', marginTop: 4 },

  speakProcessingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  processingMainTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  pipelineSteps: { alignItems: 'center', marginTop: 10 },
  pipelineStepItem: { fontSize: 12, color: '#64748b' },
  pipelineStepArrow: { fontSize: 11, color: '#94a3b8', marginVertical: 2 },

  speakResultCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  speakSaidRow: { marginBottom: 12 },
  speakTribalRow: { marginBottom: 16 },
  speakResultLabel: { fontSize: 11, fontWeight: '800', color: '#064e3b', marginBottom: 2 },
  speakResultSaidText: { fontSize: 14, color: '#334155', fontStyle: 'italic' },
  speakResultTribalText: { fontSize: 16, fontWeight: '800', color: '#064e3b', lineHeight: 22 },
  speakResultPhonetic: { fontSize: 12, color: '#047857', fontStyle: 'italic', marginTop: 4 },
  speakResultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  speakPlayAudioBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  speakPlayAudioText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  speakTryAgainBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  speakTryAgainText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  speakContinueBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  speakContinueText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  speakErrorCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  speakErrorTitle: { fontSize: 14, fontWeight: '800', color: '#991b1b', marginBottom: 4 },
  speakErrorSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 12 },
  speakErrorRetryBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  speakErrorRetryText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
});
