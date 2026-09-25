/**
 * Comprehensive Verified Santali Practice Question Bank
 * Aligned with NIPUN Bharat Foundational Literacy & Numeracy (FLN)
 * Uses 100% verified Ol Chiki script, vocabulary, and grammar.
 */

import { PracticeQuestionItem } from '../types';

export const PRACTICE_QUESTIONS: PracticeQuestionItem[] = [
  // ─────────────────────────────────────────────────────────
  // 1. NUMBERS / ᱮᱞ (Class 1-3)
  // ─────────────────────────────────────────────────────────
  {
    id: 'num_1',
    classLevel: 1,
    topic: 'Numbers',
    difficulty: 'Easy',
    type: 'number_recognition',
    hindiQuestion: 'ओल चिकी में संख्या "1" को क्या कहते हैं?',
    englishQuestion: 'What is the number "1" called in Santali Ol Chiki?',
    santaliQuestion: 'ᱚᱞ ᱪᱤᱠᱤ ᱛᱮ "᱑" ᱮᱞ ᱫᱚ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: 'Ol Chiki te "1" el do ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱢᱤᱫ (1)', subText: 'Mid', correct: true },
      { id: 'b', text: 'ᱵᱟᱨ (2)', subText: 'Bar', correct: false },
      { id: 'c', text: 'ᱯᱮ (3)', subText: 'Pe', correct: false },
      { id: 'd', text: 'ᱯᱳᱱ (4)', subText: 'Pon', correct: false },
    ],
    correctAnswer: 'ᱢᱤᱫ (1)',
    hint: 'This is the very first number (One / एक).',
    explanation: '"ᱢᱤᱫ" (Mid / ᱑) represents 1 in Santali.',
    icon: '1️⃣',
  },
  {
    id: 'num_2',
    classLevel: 1,
    topic: 'Numbers',
    difficulty: 'Easy',
    type: 'multiple_choice',
    hindiQuestion: '"5" (पाँच) के लिए सही संथाली शब्द कौन सा है?',
    englishQuestion: 'Which is the correct Santali word for "5" (Five)?',
    santaliQuestion: '"᱕" (ᱢᱚᱬᱮ) ᱞᱟᱹᱜᱤᱫ ᱥᱟᱹᱨᱤ ᱥᱟᱱᱛᱟᱲᱤ ᱟᱹᱲᱟᱹ ᱚᱠᱟ ᱠᱟᱱᱟ?',
    romanPhonetic: '"5" (More) lagid sari Santali aara oka kana?',
    options: [
      { id: 'a', text: 'ᱢᱚᱬᱮ (5)', subText: 'More', correct: true },
      { id: 'b', text: 'ᱛᱩᱨᱩᱭ (6)', subText: 'Turui', correct: false },
      { id: 'c', text: 'ᱜᱮᱞ (10)', subText: 'Gel', correct: false },
      { id: 'd', text: 'ᱵᱟᱨ (2)', subText: 'Bar', correct: false },
    ],
    correctAnswer: 'ᱢᱚᱬᱮ (5)',
    hint: 'Count the fingers on one hand (5).',
    explanation: '"ᱢᱚᱬᱮ" (More / ᱕) means Five.',
    icon: '🖐️',
  },
  {
    id: 'num_3',
    classLevel: 2,
    topic: 'Numbers',
    difficulty: 'Medium',
    type: 'sentence_completion',
    hindiQuestion: '"2" (ᱵᱟᱨ) के बाद कौन सा अंक आता है?',
    englishQuestion: 'What number comes after "2" (ᱵᱟᱨ)?',
    santaliQuestion: '"᱒" (ᱵᱟᱨ) ᱛᱟᱭᱚᱢ ᱪᱮᱫ ᱮᱞ ᱦᱤᱡᱩᱜᱼᱟ?',
    romanPhonetic: '"2" (Bar) tayom ched el hijug-a?',
    options: [
      { id: 'a', text: 'ᱯᱮ (3)', subText: 'Pe', correct: true },
      { id: 'b', text: 'ᱢᱤᱫ (1)', subText: 'Mid', correct: false },
      { id: 'c', text: 'ᱯᱳᱱ (4)', subText: 'Pon', correct: false },
      { id: 'd', text: 'ᱜᱮᱞ (10)', subText: 'Gel', correct: false },
    ],
    correctAnswer: 'ᱯᱮ (3)',
    hint: '1, 2, ... ?',
    explanation: 'After 2 (ᱵᱟᱨ) comes 3 (ᱯᱮ / Pe).',
    icon: '🔢',
  },
  {
    id: 'num_4',
    classLevel: 2,
    topic: 'Numbers',
    difficulty: 'Medium',
    type: 'counting',
    hindiQuestion: 'चित्र में कितनी वस्तुएं हैं? (🍎 🍎 🍎)',
    englishQuestion: 'Count the apples: 🍎 🍎 🍎',
    santaliQuestion: 'ᱥᱮᱣ ᱞᱮᱠᱷᱟᱭ ᱢᱮ: 🍎 🍎 🍎',
    romanPhonetic: 'Sew lekhay me: 🍎 🍎 🍎',
    options: [
      { id: 'a', text: 'ᱯᱮ (3)', subText: 'Three / Pe', correct: true },
      { id: 'b', text: 'ᱵᱟᱨ (2)', subText: 'Two / Bar', correct: false },
      { id: 'c', text: 'ᱯᱳᱱ (4)', subText: 'Four / Pon', correct: false },
      { id: 'd', text: 'ᱢᱚᱬᱮ (5)', subText: 'Five / More', correct: false },
    ],
    correctAnswer: 'ᱯᱮ (3)',
    hint: 'One, Two, Three apples.',
    explanation: 'There are 3 (ᱯᱮ / Pe) apples.',
    icon: '🍎',
  },
  {
    id: 'num_5',
    classLevel: 2,
    topic: 'Numbers',
    difficulty: 'Easy',
    type: 'number_recognition',
    hindiQuestion: 'संख्या "10" को ओल चिकी में क्या लिखते हैं?',
    englishQuestion: 'How is number "10" written in Ol Chiki?',
    santaliQuestion: '"᱑᱐" (ᱜᱮᱞ) ᱫᱚ ᱚᱞ ᱪᱤᱠᱤ ᱛᱮ ᱪᱮᱫ ᱚᱞᱚᱜᱼᱟ?',
    romanPhonetic: '"10" (Gel) do Ol Chiki te ched olog-a?',
    options: [
      { id: 'a', text: '᱑᱐ (ᱜᱮᱞ)', subText: 'Gel (10)', correct: true },
      { id: 'b', text: '᱕ (ᱢᱚᱬᱮ)', subText: 'More (5)', correct: false },
      { id: 'c', text: '᱑ (ᱢᱤᱫ)', subText: 'Mid (1)', correct: false },
      { id: 'd', text: '᱔ (ᱯᱳᱱ)', subText: 'Pon (4)', correct: false },
    ],
    correctAnswer: '᱑᱐ (ᱜᱮᱞ)',
    hint: 'It has two digits (1 and 0).',
    explanation: '10 is written as ᱑᱐ and spoken as "ᱜᱮᱞ" (Gel).',
    icon: '🔟',
  },

  // ─────────────────────────────────────────────────────────
  // 2. ANIMALS / ᱡᱤᱭᱟᱹᱞᱤ
  // ─────────────────────────────────────────────────────────
  {
    id: 'anim_1',
    classLevel: 1,
    topic: 'Animals',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'कुत्ते (Dog) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Dog" called in Santali?',
    santaliQuestion: 'ᱥᱮᱛᱟ (Dog) ᱫᱚ ᱦᱤᱱᱫᱤ ᱛᱮ "कुत्ता" ᱠᱚ ᱢᱮᱛᱟᱭᱟ ᱾',
    romanPhonetic: 'Seta (Dog) do Hindi te "Kutta" ko metaya.',
    options: [
      { id: 'a', text: 'ᱥᱮᱛᱟ (Seta)', subText: 'Dog / कुत्ता', correct: true },
      { id: 'b', text: 'ᱯᱩᱥᱤ (Pusi)', subText: 'Cat / बिल्ली', correct: false },
      { id: 'c', text: 'ᱜᱟᱹᱭ (Gai)', subText: 'Cow / गाय', correct: false },
      { id: 'd', text: 'ᱛᱟᱹᱨᱩᱵ (Tarub)', subText: 'Tiger / बाघ', correct: false },
    ],
    correctAnswer: 'ᱥᱮᱛᱟ (Seta)',
    hint: 'Man\'s best friend that barks.',
    explanation: '"ᱥᱮᱛᱟ" (Seta) is Dog in Santali.',
    icon: '🐕',
  },
  {
    id: 'anim_2',
    classLevel: 1,
    topic: 'Animals',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'बिल्ली (Cat) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Cat" called in Santali?',
    santaliQuestion: '"बिल्ली" ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱭᱟ?',
    romanPhonetic: '"Billi" do Santali te ched ko metaya?',
    options: [
      { id: 'a', text: 'ᱯᱩᱥᱤ (Pusi)', subText: 'Cat', correct: true },
      { id: 'b', text: 'ᱥᱮᱛᱟ (Seta)', subText: 'Dog', correct: false },
      { id: 'c', text: 'ᱦᱟᱹᱛᱤ (Hati)', subText: 'Elephant', correct: false },
      { id: 'd', text: 'ᱥᱤᱢ (Sim)', subText: 'Hen', correct: false },
    ],
    correctAnswer: 'ᱯᱩᱥᱤ (Pusi)',
    hint: 'Says meow.',
    explanation: '"ᱯᱩᱥᱤ" (Pusi) means Cat in Santali.',
    icon: '🐈',
  },
  {
    id: 'anim_3',
    classLevel: 2,
    topic: 'Animals',
    difficulty: 'Medium',
    type: 'translation_choice',
    hindiQuestion: 'हमे दूध कौन सा जानवर देता है?',
    englishQuestion: 'Which domestic animal gives us milk?',
    santaliQuestion: 'ᱵᱚᱱ ᱛᱳᱣᱟ (दूध) ᱚᱠᱚᱭ ᱡᱤᱭᱟᱹᱞᱤ ᱮᱢᱟ ᱵᱚᱱᱟ?',
    romanPhonetic: 'Bon towa okoy jiyali ema bona?',
    options: [
      { id: 'a', text: 'ᱜᱟᱹᱭ (Gai / Cow)', subText: 'गाय', correct: true },
      { id: 'b', text: 'ᱛᱟᱹᱨᱩᱵ (Tarub / Tiger)', subText: 'बाघ', correct: false },
      { id: 'c', text: 'ᱥᱮᱛᱟ (Seta / Dog)', subText: 'कुत्ता', correct: false },
      { id: 'd', text: 'ᱦᱟᱹᱛᱤ (Hati / Elephant)', subText: 'हाथी', correct: false },
    ],
    correctAnswer: 'ᱜᱟᱹᱭ (Gai / Cow)',
    hint: 'Cow gives milk (ᱛᱳᱣᱟ).',
    explanation: '"ᱜᱟᱹᱭ" (Gai) gives milk (ᱛᱳᱣᱟ).',
    icon: '🐄',
  },
  {
    id: 'anim_4',
    classLevel: 2,
    topic: 'Animals',
    difficulty: 'Medium',
    type: 'vocabulary',
    hindiQuestion: 'जंगल का सबसे बड़ा जानवर "हाथी" को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is the word for "Elephant" in Santali?',
    santaliQuestion: '"हाथी" (Elephant) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱭᱟ?',
    romanPhonetic: '"Hathi" do Santali te ched ko metaya?',
    options: [
      { id: 'a', text: 'ᱦᱟᱹᱛᱤ (Hati)', subText: 'Elephant', correct: true },
      { id: 'b', text: 'ᱛᱟᱹᱨᱩᱵ (Tarub)', subText: 'Tiger', correct: false },
      { id: 'c', text: 'ᱜᱟᱹᱭ (Gai)', subText: 'Cow', correct: false },
      { id: 'd', text: 'ᱢᱮᱨᱚᱢ (Merom)', subText: 'Goat', correct: false },
    ],
    correctAnswer: 'ᱦᱟᱹᱛᱤ (Hati)',
    hint: 'Has large ears and a long trunk.',
    explanation: '"ᱦᱟᱹᱛᱤ" (Hati) means Elephant.',
    icon: '🐘',
  },

  // ─────────────────────────────────────────────────────────
  // 3. PLANTS & EVS / ᱫᱟᱨᱮ ᱱᱟᱹᱲᱤ
  // ─────────────────────────────────────────────────────────
  {
    id: 'plant_1',
    classLevel: 2,
    topic: 'Plants',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'पेड़ (Tree) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Tree" called in Santali?',
    santaliQuestion: '"पेड़" (Tree) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Tree" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱫᱟᱨᱮ (Dare)', subText: 'Tree', correct: true },
      { id: 'b', text: 'ᱥᱟᱠᱟᱢ (Sakam)', subText: 'Leaf', correct: false },
      { id: 'c', text: 'ᱵᱟᱦᱟ (Baha)', subText: 'Flower', correct: false },
      { id: 'd', text: 'ᱫᱟᱜ (Dag)', subText: 'Water', correct: false },
    ],
    correctAnswer: 'ᱫᱟᱨᱮ (Dare)',
    hint: 'A large perennial woody plant.',
    explanation: '"ᱫᱟᱨᱮ" (Dare) means Tree in Santali.',
    icon: '🌳',
  },
  {
    id: 'plant_2',
    classLevel: 3,
    topic: 'Plants',
    difficulty: 'Medium',
    type: 'multiple_choice',
    hindiQuestion: 'पौधे की पत्ती को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is a "Leaf" called in Santali?',
    santaliQuestion: 'ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ "पत्ता" (Leaf) ᱫᱚ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: 'Dare reyag "Leaf" do ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱥᱟᱠᱟᱢ (Sakam)', subText: 'Leaf / पत्ता', correct: true },
      { id: 'b', text: 'ᱨᱮᱦᱮᱫ (Rehed)', subText: 'Root / जड़', correct: false },
      { id: 'c', text: 'ᱰᱟᱹᱨ (Dar)', subText: 'Branch / तना', correct: false },
      { id: 'd', text: 'ᱡᱚ (Jo)', subText: 'Fruit / फल', correct: false },
    ],
    correctAnswer: 'ᱥᱟᱠᱟᱢ (Sakam)',
    hint: 'Green part that captures sunlight.',
    explanation: '"ᱥᱟᱠᱟᱢ" (Sakam) is Leaf in Santali.',
    icon: '🍃',
  },
  {
    id: 'plant_3',
    classLevel: 3,
    topic: 'Plants',
    difficulty: 'Hard',
    type: 'multiple_choice',
    hindiQuestion: 'मिट्टी से पानी सोखने वाला भाग कौन सा है?',
    englishQuestion: 'Which part of the plant absorbs water from the soil?',
    santaliQuestion: 'ᱦᱟᱥᱟ ᱠᱷᱚᱱ ᱫᱟᱜ ᱫᱚ ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱚᱠᱟ ᱦᱟᱹᱴᱤᱧ ᱮ ᱚᱨ-ᱟ?',
    romanPhonetic: 'Hasa khon dag do dare reyag oka hatinj e or-a?',
    options: [
      { id: 'a', text: 'ᱨᱮᱦᱮᱫ (Rehed / Root)', subText: 'जड़', correct: true },
      { id: 'b', text: 'ᱥᱟᱠᱟᱢ (Sakam / Leaf)', subText: 'पत्ता', correct: false },
      { id: 'c', text: 'ᱵᱟᱦᱟ (Baha / Flower)', subText: 'फूल', correct: false },
      { id: 'd', text: 'ᱡᱚ (Jo / Fruit)', subText: 'फल', correct: false },
    ],
    correctAnswer: 'ᱨᱮᱦᱮᱫ (Rehed / Root)',
    hint: 'Grows underground in the soil.',
    explanation: 'Roots (ᱨᱮᱦᱮᱫ / Rehed) absorb water and minerals from the soil (ᱦᱟᱥᱟ).',
    icon: '🌱',
  },
  {
    id: 'plant_4',
    classLevel: 2,
    topic: 'Plants',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'सुंदर "फूल" (Flower) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Flower" called in Santali?',
    santaliQuestion: '"फूल" (Flower) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Flower" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱵᱟᱦᱟ (Baha)', subText: 'Flower', correct: true },
      { id: 'b', text: 'ᱡᱚ (Jo)', subText: 'Fruit', correct: false },
      { id: 'c', text: 'ᱥᱟᱠᱟᱢ (Sakam)', subText: 'Leaf', correct: false },
      { id: 'd', text: 'ᱫᱟᱨᱮ (Dare)', subText: 'Tree', correct: false },
    ],
    correctAnswer: 'ᱵᱟᱦᱟ (Baha)',
    hint: 'Also the name of the famous Santali festival (Baha Parab).',
    explanation: '"ᱵᱟᱦᱟ" (Baha) means Flower.',
    icon: '🌸',
  },

  // ─────────────────────────────────────────────────────────
  // 4. COLOURS / ᱨᱚᱝ
  // ─────────────────────────────────────────────────────────
  {
    id: 'col_1',
    classLevel: 1,
    topic: 'Colours',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'लाल (Red) रंग को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Red" colour in Santali?',
    santaliQuestion: '"लाल" (Red) ᱨᱚᱝ ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Red" rong do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱟᱨᱟᱜ (Arag)', subText: 'Red', correct: true },
      { id: 'b', text: 'ᱦᱟᱹᱨᱭᱟᱹᱲ (Haryar)', subText: 'Green', correct: false },
      { id: 'c', text: 'ᱞᱤᱞ (Lil)', subText: 'Blue', correct: false },
      { id: 'd', text: 'ᱥᱟᱥᱟᱝ (Sasang)', subText: 'Yellow', correct: false },
    ],
    correctAnswer: 'ᱟᱨᱟᱜ (Arag)',
    hint: 'Colour of a ripe tomato or apple.',
    explanation: '"ᱟᱨᱟᱜ" (Arag) is Red in Santali.',
    icon: '🔴',
  },
  {
    id: 'col_2',
    classLevel: 1,
    topic: 'Colours',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'हरे (Green) रंग को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Green" colour in Santali?',
    santaliQuestion: '"हरा" (Green) ᱨᱚᱝ ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Green" rong do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱦᱟᱹᱨᱭᱟᱹᱲ (Haryar)', subText: 'Green', correct: true },
      { id: 'b', text: 'ᱥᱟᱥᱟᱝ (Sasang)', subText: 'Yellow', correct: false },
      { id: 'c', text: 'ᱯᱩᱸᱰ (Pund)', subText: 'White', correct: false },
      { id: 'd', text: 'ᱦᱮᱸᱫᱮ (Hende)', subText: 'Black', correct: false },
    ],
    correctAnswer: 'ᱦᱟᱹᱨᱭᱟᱹᱲ (Haryar)',
    hint: 'Colour of fresh leaves (ᱥᱟᱠᱟᱢ).',
    explanation: '"ᱦᱟᱹᱨᱭᱟᱹᱲ" (Haryar) means Green.',
    icon: '🟢',
  },
  {
    id: 'col_3',
    classLevel: 2,
    topic: 'Colours',
    difficulty: 'Medium',
    type: 'vocabulary',
    hindiQuestion: 'पीले (Yellow) रंग को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Yellow" in Santali?',
    santaliQuestion: '"पीला" (Yellow) ᱨᱚᱝ ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Yellow" rong do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱥᱟᱥᱟᱝ (Sasang)', subText: 'Yellow / हल्दी', correct: true },
      { id: 'b', text: 'ᱟᱨᱟᱜ (Arag)', subText: 'Red', correct: false },
      { id: 'c', text: 'ᱞᱤᱞ (Lil)', subText: 'Blue', correct: false },
      { id: 'd', text: 'ᱦᱮᱸᱫᱮ (Hende)', subText: 'Black', correct: false },
    ],
    correctAnswer: 'ᱥᱟᱥᱟᱝ (Sasang)',
    hint: 'Derived from turmeric (Sasang).',
    explanation: '"ᱥᱟᱥᱟᱝ" (Sasang) is Yellow.',
    icon: '🟡',
  },

  // ─────────────────────────────────────────────────────────
  // 5. SCHOOL / ᱟᱥᱲᱟ
  // ─────────────────────────────────────────────────────────
  {
    id: 'sch_1',
    classLevel: 1,
    topic: 'School',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'किताब (Book) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Book" called in Santali?',
    santaliQuestion: '"किताब" (Book) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Book" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱯᱚᱛᱚᱵ (Potob)', subText: 'Book', correct: true },
      { id: 'b', text: 'ᱠᱚᱞᱚᱢ (Kolom)', subText: 'Pen', correct: false },
      { id: 'c', text: 'ᱟᱥᱲᱟ (Asra)', subText: 'School', correct: false },
      { id: 'd', text: 'ᱢᱟᱪᱮᱛ (Machet)', subText: 'Teacher', correct: false },
    ],
    correctAnswer: 'ᱯᱚᱛᱚᱵ (Potob)',
    hint: 'You read stories and lessons in this.',
    explanation: '"ᱯᱚᱛᱚᱵ" (Potob) means Book.',
    icon: '📖',
  },
  {
    id: 'sch_2',
    classLevel: 2,
    topic: 'School',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'विद्यालय में पढ़ाने वाले "शिक्षक" (Teacher) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Teacher" called in Santali?',
    santaliQuestion: 'ᱟᱥᱲᱟ ᱨᱮ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱵᱚᱱ "शिक्षक" ᱫᱚ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱭᱟ?',
    romanPhonetic: 'Asra re parhaw ed bon "Teacher" do ched ko metaya?',
    options: [
      { id: 'a', text: 'ᱢᱟᱪᱮᱛ (Machet)', subText: 'Teacher', correct: true },
      { id: 'b', text: 'ᱯᱟᱹᱴᱷᱩᱣᱟᱹ (Pathuwa)', subText: 'Student', correct: false },
      { id: 'c', text: 'ᱵᱟᱵᱟ (Baba)', subText: 'Father', correct: false },
      { id: 'd', text: 'ᱵᱚᱭᱦᱟ (Boyha)', subText: 'Brother', correct: false },
    ],
    correctAnswer: 'ᱢᱟᱪᱮᱛ (Machet)',
    hint: 'Teaches in the classroom.',
    explanation: '"ᱢᱟᱪᱮᱛ" (Machet) means Teacher.',
    icon: '👨‍🏫',
  },
  {
    id: 'sch_3',
    classLevel: 2,
    topic: 'School',
    difficulty: 'Medium',
    type: 'vocabulary',
    hindiQuestion: 'स्कूल / विद्यालय को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "School" called in Santali?',
    santaliQuestion: '"विद्यालय / स्कूल" ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"School" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱟᱥᱲᱟ (Asra)', subText: 'School', correct: true },
      { id: 'b', text: 'ᱚᱲᱟᱜ (Orag)', subText: 'Home / House', correct: false },
      { id: 'c', text: 'ᱵᱤᱨ (Bir)', subText: 'Forest', correct: false },
      { id: 'd', text: 'ᱫᱟᱠᱟ (Daka)', subText: 'Food / Rice', correct: false },
    ],
    correctAnswer: 'ᱟᱥᱲᱟ (Asra)',
    hint: 'Place where children learn.',
    explanation: '"ᱟᱥᱲᱟ" (Asra) is School in Santali.',
    icon: '🏫',
  },

  // ─────────────────────────────────────────────────────────
  // 6. FAMILY / ᱜᱷᱟᱨᱚᱸᱡᱽ
  // ─────────────────────────────────────────────────────────
  {
    id: 'fam_1',
    classLevel: 1,
    topic: 'Family',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'माँ (Mother) को संथाली में प्यार से क्या कहते हैं?',
    englishQuestion: 'What is "Mother" called in Santali?',
    santaliQuestion: '"माँ" (Mother) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱭᱟ?',
    romanPhonetic: '"Mother" do Santali te ched ko metaya?',
    options: [
      { id: 'a', text: 'ᱟᱭᱳ (Ayo)', subText: 'Mother', correct: true },
      { id: 'b', text: 'ᱵᱟᱵᱟ (Baba)', subText: 'Father', correct: false },
      { id: 'c', text: 'ᱢᱤᱥᱤ (Misi)', subText: 'Sister', correct: false },
      { id: 'd', text: 'ᱵᱚᱭᱦᱟ (Boyha)', subText: 'Brother', correct: false },
    ],
    correctAnswer: 'ᱟᱭᱳ (Ayo)',
    hint: 'JANANI means Mother / Ayo.',
    explanation: '"ᱟᱭᱳ" (Ayo) means Mother.',
    icon: '👩',
  },
  {
    id: 'fam_2',
    classLevel: 1,
    topic: 'Family',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'पिताजी (Father) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Father" called in Santali?',
    santaliQuestion: '"पिताजी" (Father) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱭᱟ?',
    romanPhonetic: '"Father" do Santali te ched ko metaya?',
    options: [
      { id: 'a', text: 'ᱵᱟᱵᱟ (Baba)', subText: 'Father', correct: true },
      { id: 'b', text: 'ᱟᱭᱳ (Ayo)', subText: 'Mother', correct: false },
      { id: 'c', text: 'ᱵᱚᱭᱦᱟ (Boyha)', subText: 'Brother', correct: false },
      { id: 'd', text: 'ᱢᱟᱪᱮᱛ (Machet)', subText: 'Teacher', correct: false },
    ],
    correctAnswer: 'ᱵᱟᱵᱟ (Baba)',
    hint: 'Baba.',
    explanation: '"ᱵᱟᱵᱟ" (Baba) means Father.',
    icon: '👨',
  },

  // ─────────────────────────────────────────────────────────
  // 7. NATURE & WEATHER / ᱥᱤᱨᱡᱚᱱ
  // ─────────────────────────────────────────────────────────
  {
    id: 'nat_1',
    classLevel: 2,
    topic: 'Nature',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'पीने के जीवनदायी "पानी" (Water) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Water" called in Santali?',
    santaliQuestion: 'ᱧᱩ ᱨᱮᱭᱟᱜ "पानी" (Water) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: 'Nju reyag "Water" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱫᱟᱜ (Dag)', subText: 'Water', correct: true },
      { id: 'b', text: 'ᱫᱟᱠᱟ (Daka)', subText: 'Rice / Food', correct: false },
      { id: 'c', text: 'ᱥᱤᱸᱜᱤ (Singi)', subText: 'Sun', correct: false },
      { id: 'd', text: 'ᱪᱟᱸᱫᱚ (Chando)', subText: 'Moon', correct: false },
    ],
    correctAnswer: 'ᱫᱟᱜ (Dag)',
    hint: 'Essential clear liquid for life.',
    explanation: '"ᱫᱟᱜ" (Dag) is Water.',
    icon: '💧',
  },
  {
    id: 'nat_2',
    classLevel: 2,
    topic: 'Nature',
    difficulty: 'Medium',
    type: 'vocabulary',
    hindiQuestion: 'दिन में रोशनी देने वाले "सूरज" (Sun) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Sun" called in Santali?',
    santaliQuestion: 'ᱥᱤᱧ ᱵᱮᱲᱟ ᱢᱟᱨᱥᱟᱞ ᱮᱢᱚᱜ "सूरज" ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: 'Sinj bera marsal emog "Sun" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱥᱤᱸᱜᱤ (Singi)', subText: 'Sun / सूरज', correct: true },
      { id: 'b', text: 'ᱪᱟᱸᱫᱚ (Chando)', subText: 'Moon / चाँद', correct: false },
      { id: 'c', text: 'ᱫᱟᱜ (Dag)', subText: 'Water', correct: false },
      { id: 'd', text: 'ᱵᱟᱦᱟ (Baha)', subText: 'Flower', correct: false },
    ],
    correctAnswer: 'ᱥᱤᱸᱜᱤ (Singi)',
    hint: 'Rises in the morning and gives light.',
    explanation: '"ᱥᱤᱸᱜᱤ" (Singi) is the Sun.',
    icon: '☀️',
  },

  // ─────────────────────────────────────────────────────────
  // 8. FOOD & FRUITS / ᱡᱚᱢᱟᱜ ᱟᱨ ᱡᱚ
  // ─────────────────────────────────────────────────────────
  {
    id: 'food_1',
    classLevel: 1,
    topic: 'Food',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'भात / पके हुए चावल (Cooked Rice) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is cooked rice called in Santali?',
    santaliQuestion: '"भात / पका चावल" (Cooked Rice) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Rice" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱫᱟᱠᱟ (Daka)', subText: 'Cooked Rice / भात', correct: true },
      { id: 'b', text: 'ᱵᱩᱞᱩᱝ (Bulung)', subText: 'Salt / नमक', correct: false },
      { id: 'c', text: 'ᱛᱳᱣᱟ (Towa)', subText: 'Milk / दूध', correct: false },
      { id: 'd', text: 'ᱫᱟᱜ (Dag)', subText: 'Water / पानी', correct: false },
    ],
    correctAnswer: 'ᱫᱟᱠᱟ (Daka)',
    hint: 'Staple meal eaten daily.',
    explanation: '"ᱫᱟᱠᱟ" (Daka) means Cooked Rice / Meal.',
    icon: '🍚',
  },
  {
    id: 'food_2',
    classLevel: 2,
    topic: 'Fruits',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'फलों के राजा "आम" (Mango) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Mango" called in Santali?',
    santaliQuestion: '"आम" (Mango) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Mango" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱩᱞ (Ul)', subText: 'Mango', correct: true },
      { id: 'b', text: 'ᱠᱟᱭᱨᱟ (Kayra)', subText: 'Banana', correct: false },
      { id: 'c', text: 'ᱥᱮᱣ (Sew)', subText: 'Apple', correct: false },
      { id: 'd', text: 'ᱠᱚᱢᱚᱞᱟ (Komola)', subText: 'Orange', correct: false },
    ],
    correctAnswer: 'ᱩᱞ (Ul)',
    hint: 'Sweet yellow summer fruit.',
    explanation: '"ᱩᱞ" (Ul) is Mango in Santali.',
    icon: '🥭',
  },
  {
    id: 'food_3',
    classLevel: 2,
    topic: 'Fruits',
    difficulty: 'Easy',
    type: 'vocabulary',
    hindiQuestion: 'केले (Banana) को संथाली में क्या कहते हैं?',
    englishQuestion: 'What is "Banana" called in Santali?',
    santaliQuestion: '"केला" (Banana) ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱪᱮᱫ ᱠᱚ ᱢᱮᱛᱟᱜᱼᱟ?',
    romanPhonetic: '"Banana" do Santali te ched ko metag-a?',
    options: [
      { id: 'a', text: 'ᱠᱟᱭᱨᱟ (Kayra)', subText: 'Banana', correct: true },
      { id: 'b', text: 'ᱩᱞ (Ul)', subText: 'Mango', correct: false },
      { id: 'c', text: 'ᱥᱮᱣ (Sew)', subText: 'Apple', correct: false },
      { id: 'd', text: 'ᱟᱹᱞᱩ (Alu)', subText: 'Potato', correct: false },
    ],
    correctAnswer: 'ᱠᱟᱭᱨᱟ (Kayra)',
    hint: 'Yellow curved fruit peelable by hand.',
    explanation: '"ᱠᱟᱭᱨᱟ" (Kayra) means Banana.',
    icon: '🍌',
  },

  // ─────────────────────────────────────────────────────────
  // 9. SIMPLE SENTENCES / ᱟᱹᱭᱟᱹᱛ
  // ─────────────────────────────────────────────────────────
  {
    id: 'sent_1',
    classLevel: 2,
    topic: 'Simple Sentences',
    difficulty: 'Medium',
    type: 'true_false',
    hindiQuestion: 'संथाली अभिवादन "जोहार" (Johar) का अर्थ नमस्ते / Hello होता है।',
    englishQuestion: 'The Santali greeting "Johar" (ᱡᱚᱦᱟᱨ) means Hello / Namaste.',
    santaliQuestion: 'ᱥᱟᱱᱛᱟᱲᱤ ᱡᱚᱦᱟᱨ (Johar) ᱨᱮᱭᱟᱜ ᱢᱮᱱᱮᱛ ᱫᱚ "नमस्ते" ᱠᱟᱱᱟ ᱾',
    romanPhonetic: 'Santali Johar reyag menet do "Namaste" kana.',
    options: [
      { id: 'true', text: 'ᱥᱟᱹᱨᱤ (True / सही)', correct: true },
      { id: 'false', text: 'ᱮᱲᱮ (False / गलत)', correct: false },
    ],
    correctAnswer: 'ᱥᱟᱹᱨᱤ (True / सही)',
    hint: '"Johar" is the traditional respectful greeting.',
    explanation: '"ᱡᱚᱦᱟᱨ" (Johar) is the universal respectful greeting in Santali.',
    icon: '🙏',
  },
  {
    id: 'sent_2',
    classLevel: 3,
    topic: 'Simple Sentences',
    difficulty: 'Hard',
    type: 'sentence_completion',
    hindiQuestion: '"यह एक किताब है" का सही संथाली अनुवाद कौन सा है?',
    englishQuestion: 'What is the correct translation of "This is a book"?',
    santaliQuestion: '"यह एक किताब है" ᱨᱮᱭᱟᱜ ᱥᱟᱹᱨᱤ ᱥᱟᱱᱛᱟᱲᱤ ᱛᱚᱨᱡᱚᱢᱟ ᱚᱠᱟ ᱠᱟᱱᱟ?',
    romanPhonetic: '"This is a book" reyag sari Santali torjoma oka kana?',
    options: [
      { id: 'a', text: 'ᱱᱚᱶᱟ ᱫᱚ ᱢᱤᱫᱴᱟᱝ ᱯᱚᱛᱚᱵ ᱠᱟᱱᱟ ᱾', subText: 'Nowa do midtang potob kana.', correct: true },
      { id: 'b', text: 'ᱱᱚᱶᱟ ᱫᱚ ᱫᱟᱨᱮ ᱠᱟᱱᱟ ᱾', subText: 'Nowa do dare kana.', correct: false },
      { id: 'c', text: 'ᱟᱢ ᱫᱚ ᱚᱠᱚᱭ ᱠᱟᱱᱟᱢ?', subText: 'Am do okoy kanam?', correct: false },
      { id: 'd', text: 'ᱫᱟᱠᱟ ᱡᱚᱢ ᱢᱮ ᱾', subText: 'Daka jom me.', correct: false },
    ],
    correctAnswer: 'ᱱᱚᱶᱟ ᱫᱚ ᱢᱤᱫᱴᱟᱝ ᱯᱚᱛᱚᱵ ᱠᱟᱱᱟ ᱾',
    hint: 'Look for potob (ᱯᱚᱛᱚᱵ / book).',
    explanation: '"ᱱᱚᱶᱟ ᱫᱚ ᱢᱤᱫᱴᱟᱝ ᱯᱚᱛᱚᱵ ᱠᱟᱱᱟ ᱾" correctly means "This is a book."',
    icon: '📚',
  },
];

export const TOPICS_LIST = [
  'All Topics',
  'Numbers',
  'Animals',
  'Plants',
  'Colours',
  'School',
  'Family',
  'Nature',
  'Food',
  'Fruits',
  'Simple Sentences',
];

export function getFilteredQuestions(params: {
  topic?: string;
  classLevel?: number;
  difficulty?: string;
  limit?: number;
}): PracticeQuestionItem[] {
  let list = [...PRACTICE_QUESTIONS];

  if (params.topic && params.topic !== 'All Topics') {
    list = list.filter((q) => q.topic.toLowerCase() === params.topic!.toLowerCase());
  }

  if (params.classLevel && params.classLevel > 0) {
    // Include questions for current or previous class level for good coverage
    list = list.filter((q) => q.classLevel <= params.classLevel!);
  }

  if (params.difficulty && params.difficulty !== 'All') {
    list = list.filter((q) => q.difficulty.toLowerCase() === params.difficulty!.toLowerCase());
  }

  // If filtered list is smaller than needed, fill from all questions to reach desired count
  if (params.limit && list.length < params.limit) {
    const ids = new Set(list.map((q) => q.id));
    const extra = PRACTICE_QUESTIONS.filter((q) => !ids.has(q.id));
    list = [...list, ...extra];
  }

  if (params.limit && params.limit > 0) {
    list = list.slice(0, params.limit);
  }

  return list;
}
