import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { LocalStorage } from '../storage/LocalStorage';
import { TTSService } from '../services/TTSService';
import {
  PRACTICE_QUESTIONS,
  TOPICS_LIST,
  getFilteredQuestions,
} from '../data/practiceQuestions';
import { PracticeQuestionItem, PracticeSession, Worksheet } from '../types';
import { LessonService } from '../services/LessonService';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const WorksheetScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Mode: Interactive Practice vs Printable Worksheet
  const [mode, setMode] = useState<'practice' | 'printable'>('practice');

  // ── Practice Setup State ──
  const [classLevel, setClassLevel] = useState<number>(2);
  const [selectedTopic, setSelectedTopic] = useState<string>('All Topics');
  const [difficulty, setDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isPracticing, setIsPracticing] = useState<boolean>(false);

  // ── Active Practice Session State ──
  const [questions, setQuestions] = useState<PracticeQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [answeredMap, setAnsweredMap] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // ── Progress History ──
  const [pastSessions, setPastSessions] = useState<PracticeSession[]>([]);
  const [showProgressHistory, setShowProgressHistory] = useState<boolean>(false);

  // ── Printable State ──
  const [printableQuestions, setPrintableQuestions] = useState<PracticeQuestionItem[]>([]);
  const [printCount, setPrintCount] = useState<number>(10);
  const [printableClass, setPrintableClass] = useState<number>(2);
  const [printableTopic, setPrintableTopic] = useState<string>('Numbers');
  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    setPastSessions(LocalStorage.getPracticeSessions());
  }, [isFinished]);

  // Start interactive practice
  const handleStartPractice = () => {
    const list = getFilteredQuestions({
      topic: selectedTopic,
      classLevel,
      difficulty: difficulty === 'All' ? undefined : difficulty,
      limit: questionCount,
    });

    setQuestions(list);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowHint(false);
    setScore(0);
    setFirstAttemptCorrect(0);
    setAnsweredMap({});
    setIsFinished(false);
    setIsPracticing(true);
    setShowProgressHistory(false);
    TTSService.stopAudio();
  };

  const currentQ = questions[currentIndex];

  // Voice playback of Santali question
  const handlePlayVoice = () => {
    if (!currentQ) return;
    if (isPlayingAudio) {
      TTSService.stopAudio();
      setIsPlayingAudio(false);
      return;
    }

    TTSService.playNaturalVoice({
      text: currentQ.santaliQuestion,
      romanText: currentQ.romanPhonetic,
      language: 'sat_Olck',
      onStart: () => setIsPlayingAudio(true),
      onEnded: () => setIsPlayingAudio(false),
    });
  };

  // Submit answer
  const handleSubmitAnswer = () => {
    if (selectedOptionId === null || isSubmitted) return;

    const chosen = currentQ.options.find((o) => o.id === selectedOptionId);
    const correct = chosen ? chosen.correct : false;

    setIsSubmitted(true);
    setIsCorrect(correct);

    // Track first attempt
    if (!answeredMap[currentIndex]) {
      setAnsweredMap((prev) => ({ ...prev, [currentIndex]: true }));
      if (correct) {
        setScore((s) => s + 1);
        setFirstAttemptCorrect((f) => f + 1);
      }
    }
  };

  // Try again
  const handleTryAgain = () => {
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setIsCorrect(null);
  };

  // Next question or finish
  const handleNextQuestion = () => {
    TTSService.stopAudio();
    setIsPlayingAudio(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setIsCorrect(null);
      setShowHint(false);
    } else {
      // Finished practice!
      const total = questions.length;
      const accuracy = Math.round((score / total) * 100);
      const sessionData: PracticeSession = {
        id: `sess_${Date.now()}`,
        date: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        classLevel,
        topic: selectedTopic,
        difficulty,
        totalQuestions: total,
        score,
        accuracy,
        correctCount: score,
        incorrectCount: total - score,
      };

      LocalStorage.savePracticeSession(sessionData);
      setPastSessions(LocalStorage.getPracticeSessions());
      setIsFinished(true);
    }
  };

  // Load printable questions
  useEffect(() => {
    const list = getFilteredQuestions({
      topic: printableTopic,
      classLevel: printableClass,
      limit: printCount,
    });
    setPrintableQuestions(list);
  }, [printableTopic, printableClass, printCount]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <ErrorBoundary fallbackTitle="Interactive Practice & Worksheets Encountered an Issue">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Mode Navigation Tabs ── */}
      <View style={styles.topTabsCard}>
        <TouchableOpacity
          style={[styles.topTabBtn, mode === 'practice' && styles.topTabBtnActive]}
          onPress={() => {
            setMode('practice');
            TTSService.stopAudio();
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.topTabText, mode === 'practice' && styles.topTabTextActive]}>
            🎯 Interactive Practice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, mode === 'printable' && styles.topTabBtnActive]}
          onPress={() => {
            setMode('printable');
            TTSService.stopAudio();
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.topTabText, mode === 'printable' && styles.topTabTextActive]}>
            📄 Printable Worksheet
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODE 1: INTERACTIVE PRACTICE                            */}
      {/* ════════════════════════════════════════════════════════ */}
      {mode === 'practice' && (
        <View style={styles.section}>
          {!isPracticing && !isFinished ? (
            /* Setup / Filter Screen */
            <View style={styles.setupCard}>
              <View style={styles.setupHeader}>
                <Text style={styles.setupTitle}>🎮 Student Interactive Practice</Text>
                <Text style={styles.setupSub}>
                  Practice Santali vocabulary, numbers, and sentences with instant feedback.
                </Text>
              </View>

              {/* Class Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Select Class / कक्षा:</Text>
                <View style={styles.pillRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.pillBtn, classLevel === lvl && styles.pillBtnActive]}
                      onPress={() => setClassLevel(lvl)}
                    >
                      <Text style={[styles.pillText, classLevel === lvl && styles.pillTextActive]}>
                        Class {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Topic Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Select Topic / विषय:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  {TOPICS_LIST.map((top) => (
                    <TouchableOpacity
                      key={top}
                      style={[styles.topicChip, selectedTopic === top && styles.topicChipActive]}
                      onPress={() => setSelectedTopic(top)}
                    >
                      <Text
                        style={[styles.topicChipText, selectedTopic === top && styles.topicChipTextActive]}
                      >
                        {top}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Question Count Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Number of Questions / प्रश्नों की संख्या:</Text>
                <View style={styles.pillRow}>
                  {[5, 10, 15, 20].map((cnt) => (
                    <TouchableOpacity
                      key={cnt}
                      style={[styles.pillBtn, questionCount === cnt && styles.pillBtnActiveYellow]}
                      onPress={() => setQuestionCount(cnt)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          questionCount === cnt && styles.pillTextActiveYellow,
                        ]}
                      >
                        {cnt} Questions {cnt === 10 && '⭐'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Difficulty Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Difficulty / स्तर:</Text>
                <View style={styles.pillRow}>
                  {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                    <TouchableOpacity
                      key={diff}
                      style={[styles.pillBtn, difficulty === diff && styles.pillBtnActive]}
                      onPress={() => setDifficulty(diff)}
                    >
                      <Text style={[styles.pillText, difficulty === diff && styles.pillTextActive]}>
                        {diff}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Start Button */}
              <TouchableOpacity
                style={styles.startBtn}
                onPress={handleStartPractice}
                activeOpacity={0.85}
              >
                <Text style={styles.startBtnText}>Start Interactive Practice ▶️</Text>
              </TouchableOpacity>

              {/* View Past Progress Button */}
              {pastSessions.length > 0 && (
                <TouchableOpacity
                  style={styles.historyToggleBtn}
                  onPress={() => setShowProgressHistory((v) => !v)}
                >
                  <Text style={styles.historyToggleText}>
                    {showProgressHistory ? '▲ Hide Recent Progress' : '📊 View Recent Practice Progress (' + pastSessions.length + ' sessions)'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Past Sessions List */}
              {showProgressHistory && pastSessions.length > 0 && (
                <View style={styles.historyBox}>
                  <Text style={styles.historyTitle}>Recent Practice Sessions</Text>
                  {pastSessions.slice(0, 5).map((sess, i) => (
                    <View key={i} style={styles.historyItem}>
                      <View>
                        <Text style={styles.historyTopic}>
                          {sess.topic} (Class {sess.classLevel})
                        </Text>
                        <Text style={styles.historyDate}>{sess.date}</Text>
                      </View>
                      <View style={styles.historyScoreBadge}>
                        <Text style={styles.historyScoreText}>
                          {sess.score}/{sess.totalQuestions} ({sess.accuracy}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : isFinished ? (
            /* Practice Finished Screen */
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultEmoji}>🎉</Text>
                <Text style={styles.resultTitle}>Practice Complete!</Text>
                <Text style={styles.resultSantali}>ᱯᱟᱹᱨᱥᱤ ᱠᱟᱹᱢᱤ ᱯᱩᱨᱟᱹᱣ ᱮᱱᱟ ᱾</Text>
                <Text style={styles.resultTopicMeta}>
                  {selectedTopic} • Class {classLevel}
                </Text>
              </View>

              {/* Score Display */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{score} / {questions.length}</Text>
                  <Text style={styles.scoreLabel}>Final Score</Text>
                </View>
                <View style={[styles.scoreBox, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={[styles.scoreVal, { color: '#059669' }]}>
                    {Math.round((score / questions.length) * 100)}%
                  </Text>
                  <Text style={styles.scoreLabel}>Accuracy</Text>
                </View>
                <View style={[styles.scoreBox, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.scoreVal, { color: '#dc2626' }]}>
                    {questions.length - score}
                  </Text>
                  <Text style={styles.scoreLabel}>Incorrect</Text>
                </View>
              </View>

              {/* Message Banner */}
              <View style={styles.congratsBox}>
                <Text style={styles.congratsText}>
                  {score >= questions.length * 0.8
                    ? '🌟 Outstanding! You have great mastery of Santali words.'
                    : score >= questions.length * 0.5
                    ? '👍 Good job! Keep practicing to improve accuracy.'
                    : '🌱 Good effort! Review the words and try again.'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={handleStartPractice}
                >
                  <Text style={styles.actionBtnTextPrimary}>🔄 Retry Practice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => {
                    setIsPracticing(false);
                    setIsFinished(false);
                  }}
                >
                  <Text style={styles.actionBtnTextSecondary}>📚 Choose Another Topic</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Active Question Screen */
            <View style={styles.quizCard}>
              {/* Question Top Progress Header */}
              <View style={styles.quizHeader}>
                <View style={styles.quizMetaLeft}>
                  <Text style={styles.quizTopicTag}>
                    {currentQ.topic} • Class {currentQ.classLevel}
                  </Text>
                  <Text style={styles.quizCountText}>
                    Question {currentIndex + 1} of {questions.length}
                  </Text>
                </View>

                {/* Speaker Button */}
                <TouchableOpacity
                  style={[styles.speakerBtn, isPlayingAudio && styles.speakerBtnActive]}
                  onPress={handlePlayVoice}
                >
                  <Text style={styles.speakerBtnText}>
                    {isPlayingAudio ? '🔊 Playing...' : '🔊 Listen (Santali)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Visual Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              {/* Question Card Box */}
              <View style={styles.questionBox}>
                {/* Hindi Question */}
                <Text style={styles.hindiQuestionText}>{currentQ.hindiQuestion}</Text>

                {/* Santali Ol Chiki Question */}
                <Text style={styles.santaliQuestionText}>{currentQ.santaliQuestion}</Text>

                {/* English Subtitle */}
                {currentQ.englishQuestion && (
                  <Text style={styles.englishQuestionText}>{currentQ.englishQuestion}</Text>
                )}
              </View>

              {/* Answer Options */}
              <View style={styles.optionsList}>
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrectOpt = isSubmitted && opt.correct;
                  const isWrongOpt = isSubmitted && isSelected && !opt.correct;

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                        isCorrectOpt && styles.optionItemCorrect,
                        isWrongOpt && styles.optionItemWrong,
                      ]}
                      onPress={() => {
                        if (!isSubmitted) setSelectedOptionId(opt.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionLetterBox}>
                        <Text style={styles.optionLetter}>
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </View>
                      <View style={styles.optionTextCol}>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                            isCorrectOpt && styles.optionTextCorrect,
                            isWrongOpt && styles.optionTextWrong,
                          ]}
                        >
                          {opt.text}
                        </Text>
                        {opt.subText && (
                          <Text style={styles.optionSubText}>{opt.subText}</Text>
                        )}
                      </View>
                      {isCorrectOpt && (
                        <Text style={styles.correctCheckIcon}>✓</Text>
                      )}
                      {isWrongOpt && (
                        <Text style={styles.wrongCrossIcon}>✗</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feedback Banner */}
              {isSubmitted && (
                <View
                  style={[
                    styles.feedbackCard,
                    isCorrect ? styles.feedbackCardCorrect : styles.feedbackCardWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackTitle,
                      isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleWrong,
                    ]}
                  >
                    {isCorrect ? '✓ Correct! / ᱥᱟᱹᱨᱤ ᱜᱮᱭᱟ 🎉' : '✗ Not quite. / ᱟᱹᱣᱨᱤ ᱥᱟᱹᱨᱤᱜᱼᱟ'}
                  </Text>
                  {currentQ.explanation && (
                    <Text style={styles.feedbackDesc}>{currentQ.explanation}</Text>
                  )}
                </View>
              )}

              {/* Hint Box */}
              {showHint && currentQ.hint && (
                <View style={styles.hintCard}>
                  <Text style={styles.hintTitle}>💡 Hint / ᱫᱤᱥᱟᱹ:</Text>
                  <Text style={styles.hintText}>{currentQ.hint}</Text>
                </View>
              )}

              {/* Footer Buttons */}
              <View style={styles.quizFooter}>
                {!isSubmitted ? (
                  <View style={styles.btnRow}>
                    {currentQ.hint && !showHint && (
                      <TouchableOpacity
                        style={styles.hintBtn}
                        onPress={() => setShowHint(true)}
                      >
                        <Text style={styles.hintBtnText}>💡 Get Hint</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        selectedOptionId === null && styles.submitBtnDisabled,
                      ]}
                      onPress={handleSubmitAnswer}
                      disabled={selectedOptionId === null}
                    >
                      <Text style={styles.submitBtnText}>Submit Answer ✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    {!isCorrect && (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={handleTryAgain}
                      >
                        <Text style={styles.retryBtnText}>🔄 Try Again</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.nextBtn}
                      onPress={handleNextQuestion}
                    >
                      <Text style={styles.nextBtnText}>
                        {currentIndex + 1 === questions.length
                          ? 'Finish Practice 🎉'
                          : 'Next Question →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODE 2: PRINTABLE BILINGUAL WORKSHEET                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {mode === 'printable' && (
        <View style={styles.section}>
          {/* Printable Controls */}
          <View style={styles.printControlsCard}>
            <Text style={styles.controlsTitle}>📄 Printable Bilingual Worksheet Setup</Text>

            <View style={styles.controlsRow}>
              {/* Class */}
              <View style={styles.controlCol}>
                <Text style={styles.controlLabel}>Class:</Text>
                <View style={styles.pillRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.smallPill,
                        printableClass === lvl && styles.smallPillActive,
                      ]}
                      onPress={() => setPrintableClass(lvl)}
                    >
                      <Text
                        style={[
                          styles.smallPillText,
                          printableClass === lvl && styles.smallPillTextActive,
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Question Count */}
              <View style={styles.controlCol}>
                <Text style={styles.controlLabel}>Questions:</Text>
                <View style={styles.pillRow}>
                  {[5, 10, 15, 20].map((cnt) => (
                    <TouchableOpacity
                      key={cnt}
                      style={[
                        styles.smallPill,
                        printCount === cnt && styles.smallPillActive,
                      ]}
                      onPress={() => setPrintCount(cnt)}
                    >
                      <Text
                        style={[
                          styles.smallPillText,
                          printCount === cnt && styles.smallPillTextActive,
                        ]}
                      >
                        {cnt} Qs
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Topic selector */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.controlLabel}>Topic:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                {TOPICS_LIST.map((top) => (
                  <TouchableOpacity
                    key={top}
                    style={[
                      styles.topicChip,
                      printableTopic === top && styles.topicChipActive,
                    ]}
                    onPress={() => setPrintableTopic(top)}
                  >
                    <Text
                      style={[
                        styles.topicChipText,
                        printableTopic === top && styles.topicChipTextActive,
                      ]}
                    >
                      {top}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Action Print Buttons */}
            <View style={styles.printActionRow}>
              <TouchableOpacity
                style={styles.printBtn}
                onPress={handlePrint}
                activeOpacity={0.85}
              >
                <Text style={styles.printBtnText}>🖨️ Print Worksheet</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Printable Page View */}
          <View style={styles.printablePaper}>
            {/* Header */}
            <View style={styles.paperHeader}>
              <View style={styles.paperTitleBlock}>
                <Text style={styles.paperMainTitle}>JANANI BILINGUAL WORKSHEET</Text>
                <Text style={styles.paperSantaliTitle}>ᱵᱟᱨ ᱯᱟᱹᱨᱥᱤ ᱠᱟᱹᱢᱤ ᱥᱟᱠᱟᱢ</Text>
                <Text style={styles.paperSubMeta}>Govt. Primary Education • Foundational Learning</Text>
              </View>

              <View style={styles.paperDetailsGrid}>
                <Text style={styles.paperMetaItem}>
                  <Text style={styles.boldText}>Class:</Text> {printableClass}
                </Text>
                <Text style={styles.paperMetaItem}>
                  <Text style={styles.boldText}>Topic:</Text> {printableTopic}
                </Text>
                <Text style={styles.paperMetaItem}>
                  <Text style={styles.boldText}>Questions:</Text> {printableQuestions.length}
                </Text>
                <Text style={styles.paperMetaItem}>
                  <Text style={styles.boldText}>Date:</Text> _______________
                </Text>
              </View>

              <View style={styles.studentNameLine}>
                <Text style={styles.boldText}>Student Name / ᱪᱮᱛᱮᱫᱤᱭᱟᱹ ᱧᱩᱛᱩᱢ:</Text>
                <Text style={styles.blankLine}>_________________________________________</Text>
              </View>
            </View>

            {/* Questions List */}
            <View style={styles.paperQuestionsList}>
              {printableQuestions.map((q, idx) => (
                <View key={q.id || idx} style={styles.paperQuestionItem}>
                  <View style={styles.paperQNumBox}>
                    <Text style={styles.paperQNum}>Q{idx + 1}.</Text>
                  </View>
                  <View style={styles.paperQContent}>
                    <Text style={styles.paperQHindi}>{q.hindiQuestion}</Text>
                    <Text style={styles.paperQSantali}>{q.santaliQuestion}</Text>
                    {q.englishQuestion && (
                      <Text style={styles.paperQEnglish}>{q.englishQuestion}</Text>
                    )}

                    {/* Multiple choice options on paper */}
                    <View style={styles.paperOptionsRow}>
                      {q.options.map((opt, i) => (
                        <Text key={opt.id} style={styles.paperOptText}>
                          ({String.fromCharCode(65 + i)}) {opt.text}
                        </Text>
                      ))}
                    </View>

                    {/* Answer writing line */}
                    <View style={styles.paperAnswerBox}>
                      <Text style={styles.paperAnswerLabel}>Answer / ᱩᱛᱛᱚᱨ: </Text>
                      <View style={styles.paperDashedLine} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
    width: '100%',
  },
  section: {
    width: '100%',
  },

  // ── Mode Switch Header ──
  topTabsCard: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 5,
    marginBottom: 16,
    gap: 6,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabBtnActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  topTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // ── Setup Card ──
  setupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  setupHeader: {
    marginBottom: 18,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  setupSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pillBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  pillBtnActiveYellow: {
    backgroundColor: '#d97706',
    borderColor: '#b45309',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pillTextActiveYellow: {
    color: '#ffffff',
    fontWeight: '800',
  },
  hScroll: {
    flexDirection: 'row',
  },
  topicChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  topicChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  topicChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyToggleBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  historyToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  historyBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  historyTopic: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyScoreBadge: {
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  historyScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },

  // ── Active Practice / Quiz Card ──
  quizCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quizMetaLeft: {
    flex: 1,
  },
  quizTopicTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  quizCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  speakerBtn: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  speakerBtnActive: {
    backgroundColor: '#059669',
  },
  speakerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  questionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 18,
  },
  hindiQuestionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 24,
  },
  santaliQuestionText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 30,
  },
  englishQuestionText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
  },
  optionItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionItemCorrect: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  optionItemWrong: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  optionTextCol: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  optionTextSelected: {
    color: '#1e3a8a',
  },
  optionTextCorrect: {
    color: '#15803d',
  },
  optionTextWrong: {
    color: '#b91c1c',
  },
  optionSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  correctCheckIcon: {
    fontSize: 18,
    color: '#16a34a',
    fontWeight: '800',
    marginLeft: 8,
  },
  wrongCrossIcon: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: '800',
    marginLeft: 8,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  feedbackCardCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  feedbackCardWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  feedbackTitleCorrect: {
    color: '#15803d',
  },
  feedbackTitleWrong: {
    color: '#b91c1c',
  },
  feedbackDesc: {
    fontSize: 13,
    color: '#334155',
  },
  hintCard: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854d0e',
    marginBottom: 2,
  },
  hintText: {
    fontSize: 12,
    color: '#713f12',
  },
  quizFooter: {
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hintBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854d0e',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  retryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Result Screen ──
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultSantali: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 4,
  },
  resultTopicMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  congratsBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 22,
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
    textAlign: 'center',
  },
  resultActions: {
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
  },
  actionBtnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionBtnTextPrimary: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  actionBtnTextSecondary: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Printable Mode Styles ──
  printControlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  controlCol: {
    flex: 1,
    minWidth: 180,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  smallPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  smallPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  smallPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  printActionRow: {
    marginTop: 16,
  },
  printBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  // ── Printable Paper ──
  printablePaper: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  paperHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 16,
    marginBottom: 20,
  },
  paperTitleBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paperMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  paperSantaliTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 2,
  },
  paperSubMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  paperDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 12,
  },
  paperMetaItem: {
    fontSize: 13,
    color: '#1e293b',
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  studentNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  blankLine: {
    fontSize: 13,
    color: '#94a3b8',
    marginLeft: 6,
  },
  paperQuestionsList: {
    gap: 20,
  },
  paperQuestionItem: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  paperQNumBox: {
    width: 32,
  },
  paperQNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  paperQContent: {
    flex: 1,
  },
  paperQHindi: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  paperQSantali: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  paperQEnglish: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  paperOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 6,
  },
  paperOptText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  paperAnswerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  paperAnswerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  paperDashedLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderStyle: 'dashed',
    height: 12,
    marginLeft: 8,
  },
});
