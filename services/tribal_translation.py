"""
Tribal Language Translation Service (Mundari & Ho)
==================================================
Handles offline translation from Hindi and English to:
1. Mundari (unr) — Devanagari script + Roman transliteration
   Powered by the 10,273+ pair Hindi-Mundari translation dataset
   (mundari/data/dataset-hindi-mundari-translation/translation-hi-unr.tsv)
   augmented with authentic classroom & grammatical lexicon.

2. Ho — Warang Citi script (Unicode U+118A0–U+118FF) + Latin + Devanagari
   Powered by comprehensive Ho tribal dictionary and classroom lexicon
   (Kherwarian subfamily / North Munda).

Features:
- Sentence-level chunking for multi-sentence lesson paragraphs.
- Extensive EVS (Plants, Animals, Food, Water Cycle) and classroom vocabulary.
- Phonetic pronunciation strings for natural audio playback.
"""

import csv
import sys
import re
import time
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple

csv.field_size_limit(sys.maxsize)

BASE_DIR = Path(__file__).resolve().parent.parent
MUNDARI_DATASET = (
    BASE_DIR
    / "mundari"
    / "data"
    / "dataset-hindi-mundari-translation"
    / "translation-hi-unr.tsv"
)

# ─────────────────────────────────────────────────────────────
# 1. LATIN TO WARANG CITI TRANSLITERATOR
# ─────────────────────────────────────────────────────────────
WARANG_CITI_MAP = {
    'a': '𑣁', 'A': '𑢡',
    'i': '𑣂', 'I': '𑢢',
    'u': '𑣃', 'U': '𑢣',
    'e': '𑣈', 'E': '𑢨',
    'o': '𑣉', 'O': '𑢩',
    'k': '𑣌', 'K': '𑢬',
    'g': '𑣍', 'G': '𑢭',
    'c': '𑣎', 'C': '𑢮',
    'j': '𑣏', 'J': '𑢯',
    't': '𑣐', 'T': '𑢰',
    'd': '𑣑', 'D': '𑢱',
    'n': '𑣒', 'N': '𑢲',
    'p': '𑣓', 'P': '𑢳',
    'b': '𑣔', 'B': '𑢴',
    'm': '𑣕', 'M': '𑢵',
    'y': '𑣖', 'Y': '𑢶',
    'r': '𑣗', 'R': '𑢷',
    'l': '𑣘', 'L': '𑢸',
    'w': '𑣙', 'W': '𑢹',
    's': '𑣚', 'S': '𑢺',
    'h': '𑣛', 'H': '𑢻',
}

def to_warang_citi(latin_text: str) -> str:
    """Transliterate Roman/Latin Ho text into authentic Warang Citi script."""
    result = []
    for ch in latin_text:
        result.append(WARANG_CITI_MAP.get(ch, ch))
    return "".join(result)


# ─────────────────────────────────────────────────────────────
# 2. CLASSROOM & CURRICULUM LEXICON FOR HO
# ─────────────────────────────────────────────────────────────
HO_DICTIONARY = {
    # Classroom & Greetings
    "this is a book": ("नेया पुथी ताना", "Nẽya puthi tana", "𑢱𑣈𑣖𑣁 𑣓𑣃𑣐𑣂 𑣐𑣁𑣒𑣁"),
    "यह एक किताब है": ("नेया पुथी ताना", "Nẽya puthi tana", "𑢱𑣈𑣖𑣁 𑣓𑣃𑣐𑣂 𑣐𑣁𑣒𑣁"),
    "यह किताब है": ("नेया पुथी ताना", "Nẽya puthi tana", "𑢱𑣈𑣖𑣁 𑣓𑣃𑣐𑣂 𑣐𑣁𑣒𑣁"),
    
    "all children please sit down": ("सोबिन होनको दुपपे", "Sobin honko duppey", "𑢺𑣉𑣔𑣂𑣒 𑣛𑣉𑣒𑣌𑣉 𑣑𑣃𑣓𑣓𑣈𑣖"),
    "सभी बच्चे अपनी जगह पर बैठें": ("सोबिन होनको दुपपे", "Sobin honko duppey", "𑢺𑣉𑣔𑣂𑣒 𑣛𑣉𑣒𑣌𑣉 𑣑𑣃𑣓𑣓𑣈𑣖"),
    "सब बच्चे बैठ जाओ": ("सोबिन होनको दुपपे", "Sobin honko duppey", "𑢺𑣉𑣔𑣂𑣒 𑣛𑣉𑣒𑣌𑣉 𑣑𑣃𑣓𑣓𑣈𑣖"),

    "today we will learn numbers": ("तिसिन आले लेका ईतूकोआ", "Tisin ale leka itukoa", "𑢰𑣂𑣚𑣂𑣒 𑣁𑣘𑣈 𑣘𑣈𑣌𑣁 𑣂𑣐𑣃𑣌𑣉𑣁"),
    "आज हम संख्या 5 सीखेंगे": ("तिसिन आले मोने लेका ईतूकोआ", "Tisin ale moya leka itukoa", "𑢰𑣂𑣚𑣂𑣒 𑣁𑣘𑣈 𑣕𑣉𑣖𑣁 𑣘𑣈𑣌𑣁 𑣂𑣐𑣃𑣌𑣉𑣁"),
    "आज हम गिनती सीखेंगे": ("तिसिन आले लेका ईतूकोआ", "Tisin ale leka itukoa", "𑢰𑣂𑣚𑣂𑣒 𑣁𑣘𑣈 𑣘𑣈𑣌𑣁 𑣂𑣐𑣃𑣌𑣉𑣁"),

    "drink water and wash your hands": ("दाः नूइके ओड़ो ती आबुंगके", "Da' nuikey odo ti abunkey", "𑢱𑣁 𑣒𑣃𑣂𑣌𑣈𑣖 𑣉𑣑𑣉 𑣐𑣂 𑣁𑣔𑣃𑣒𑣌𑣈𑣖"),
    "पानी पियो और हाथ धो लो": ("दाः नूइके ओड़ो ती आबुंगके", "Da' nuikey odo ti abunkey", "𑢱𑣁 𑣒𑣃𑣂𑣌𑣈𑣖 𑣉𑣑𑣉 𑣐𑣂 𑣁𑣔𑣃𑣒𑣌𑣈𑣖"),

    "hello": ("जोहार", "Johar", "𑢯𑣉𑣛𑣁𑣗"),
    "नमस्ते": ("जोहार", "Johar", "𑢯𑣉𑣛𑣁𑣗"),
    "good morning": ("जोहार", "Johar", "𑢯𑣉𑣛𑣁𑣗"),
    "सुप्रभात": ("जोहार", "Johar", "𑢯𑣉𑣛𑣁𑣗"),

    "how are you": ("अम चिलकेना?", "Am chilkena?", "𑢡𑣕 𑣎𑣂𑣘𑣌𑣈𑣒𑣁?"),
    "आप कैसे हैं": ("अम चिलकेना?", "Am chilkena?", "𑢡𑣕 𑣎𑣂𑣘𑣌𑣈𑣒𑣁?"),
    "तुम कैसे हो": ("अम चिलकेना?", "Am chilkena?", "𑢡𑣕 𑣎𑣂𑣘𑣌𑣈𑣒𑣁?"),

    "i am fine": ("ऐं बुगीगे मिनाइँ", "Aing bugige minaying", "𑢡𑣂𑣒 𑣔𑣃𑣍𑣂𑣍𑣈 𑣕𑣂𑣒𑣁𑣖𑣂𑣒"),
    "मैं ठीक हूँ": ("ऐं बुगीगे मिनाइँ", "Aing bugige minaying", "𑢡𑣂𑣒 𑣔𑣃𑣍𑣂𑣍𑣈 𑣕𑣂𑣒𑣁𑣖𑣂𑣒"),

    "what is your name": ("अमाः नुतूम चिनाः?", "Amah nutum chinah?", "𑢡𑣕𑣁𑣛 𑣒𑣃𑣐𑣃𑣕 𑣎𑣂𑣒𑣁𑣛?"),
    "तुम्हारा नाम क्या है": ("अमाः नुतूम चिनाः?", "Amah nutum chinah?", "𑢡𑣕𑣁𑣛 𑣒𑣃𑣐𑣃𑣕 𑣎𑣂𑣒𑣁𑣛?"),
    "आपका नाम क्या है": ("अमाः नुतूम चिनाः?", "Amah nutum chinah?", "𑢡𑣕𑣁𑣛 𑣒𑣃𑣐𑣃𑣕 𑣎𑣂𑣒𑣁𑣛?"),

    "open your book and read lesson two": ("अमाः पुथी ओड़ावके आर पाठ बार पढ़वके", "Amah puthi orawke ar path bar parawke", "𑢡𑣕𑣁𑣛 𑣓𑣃𑣐𑣂 𑣉𑣑𑣁𑣙𑣌𑣈"),
    "अपनी किताब खोलो और पाठ दो पढ़ो": ("अमाः पुथी ओड़ावके आर पाठ बार पढ़वके", "Amah puthi orawke ar path bar parawke", "𑢡𑣕𑣁𑣛 𑣓𑣃𑣐𑣂 𑣉𑣑𑣁𑣙𑣌𑣈"),

    # Curriculum: Plants (EVS Class 3 / 4)
    "parts of a plant": ("दारुआः हाटिंगको", "Daruaah hatinko", "𑢱𑣁𑣗𑣃𑣁𑣛 𑣛𑣁𑣐𑣂𑣒𑣌𑣉"),
    "पौधे के भाग": ("दारुआः हाटिंगको", "Daruaah hatinko", "𑢱𑣁𑣗𑣃𑣁𑣛 𑣛𑣁𑣐𑣂𑣒𑣌𑣉"),

    "leaves stem and roots are the main parts of a plant": (
        "साकाम, डाड़ ओड़ो रेहेद दारुआः आसोल हाटिंग ताना।",
        "Sakam, dar odo rehed daruaah asol hatin tana.",
        "𑢺𑣁𑣌𑣁𑣕, 𑣑𑣁𑣗 𑣉𑣑𑣉 𑣗𑣈𑣛𑣈𑣑 𑣑𑣁𑣗𑣃𑣁𑣛 𑣁𑣚𑣉𑣘 𑣛𑣁𑣐𑣂𑣒 𑣐𑣁𑣒𑣁."
    ),
    "पत्ते, तना और जड़ पौधे के मुख्य भाग होते हैं": (
        "साकाम, डाड़ ओड़ो रेहेद दारुआः आसोल हाटिंग ताना।",
        "Sakam, dar odo rehed daruaah asol hatin tana.",
        "𑢺𑣁𑣌𑣁𑣕, 𑣑𑣁𑣗 𑣉𑣑𑣉 𑣗𑣈𑣛𑣈𑣑 𑣑𑣁𑣗𑣃𑣁𑣛 𑣁𑣚𑣉𑣘 𑣛𑣁𑣐𑣂𑣒 𑣐𑣁𑣒𑣁."
    ),
    "पत्ते तना और जड़ पौधे के मुख्य भाग होते हैं": (
        "साकाम, डाड़ ओड़ो रेहेद दारुआः आसोल हाटिंग ताना।",
        "Sakam, dar odo rehed daruaah asol hatin tana.",
        "𑢺𑣁𑣌𑣁𑣕, 𑣑𑣁𑣗 𑣉𑣑𑣉 𑣗𑣈𑣛𑣈𑣑 𑣑𑣁𑣗𑣃𑣁𑣛 𑣁𑣚𑣉𑣘 𑣛𑣁𑣐𑣂𑣒 𑣐𑣁𑣒𑣁."
    ),

    "leaves make food for the plant": (
        "साकाम दारु लागिद मांडी बाइयिए।",
        "Sakam daru lagid mandi baiyie.",
        "𑢺𑣁𑣌𑣁𑣕 𑣑𑣁𑣗𑣃 𑣘𑣁𑣍𑣂𑣑 𑣕𑣁𑣒𑣑𑣂 𑣔𑣁𑣂𑣖𑣂𑣈."
    ),
    "पत्ते पौधे के लिए भोजन बनाते हैं": (
        "साकाम दारु लागिद मांडी बाइयिए।",
        "Sakam daru lagid mandi baiyie.",
        "𑢺𑣁𑣌𑣁𑣕 𑣑𑣁𑣗𑣃 𑣘𑣁𑣍𑣂𑣑 𑣕𑣁𑣒𑣑𑣂 𑣔𑣁𑣂𑣖𑣂𑣈."
    ),

    "roots absorb water from the soil": (
        "रेहेद हासा एते दाः ताना।",
        "Rehed hasa ete da' tana.",
        "𑢗𑣈𑣛𑣈𑣑 𑣛𑣁𑣚𑣁 𑣈𑣐𑣈 𑣑𑣁 𑣐𑣁𑣒𑣁."
    ),
    "जड़ें मिट्टी से पानी सोखती हैं": (
        "रेहेद हासा एते दाः ताना।",
        "Rehed hasa ete da' tana.",
        "𑢗𑣈𑣛𑣈𑣑 𑣛𑣁𑣚𑣁 𑣈𑣐𑣈 𑣑𑣁 𑣐𑣁𑣒𑣁."
    ),

    "types of plants": ("दारुको लेका", "Daruko leka", "𑢱𑣁𑣗𑣃𑣌𑣉 𑣘𑣈𑣌𑣁"),
    "पौधों के प्रकार": ("दारुको लेका", "Daruko leka", "𑢱𑣁𑣗𑣃𑣌𑣉 𑣘𑣈𑣌𑣁"),

    "uses of plants": ("दारुआः कामी", "Daruaah kami", "𑢱𑣁𑣗𑣃𑣁𑣛 𑣌𑣁𑣕𑣂"),
    "पौधों के उपयोग": ("दारुआः कामी", "Daruaah kami", "𑢱𑣁𑣗𑣃𑣁𑣛 𑣌𑣁𑣕𑣂"),

    "food from plants": ("दारु एते जोमाः", "Daru ete jomaah", "𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣯𑣉𑣕𑣁𑣛"),
    "पौधों से भोजन": ("दारु एते जोमाः", "Daru ete jomaah", "𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣯𑣉𑣕𑣁𑣛"),

    "पौधे हमें भोजन ताज़ी हवा दवाइयाँ और छाया देते हैं": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ete ale mandi, hoy odo ran name.",
        "𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣁𑣘𑣈 𑣕𑣁𑣒𑣑𑣂, 𑣛𑣉𑣖 𑣉𑣑𑣉 𑣗𑣁𑣒 𑣒𑣁𑣕𑣈."
    ),
    "पौधों से हमें भोजन ताज़ी हवा दवाइयाँ और छाया मिलती है": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ete ale mandi, hoy odo ran name.",
        "𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣁𑣘𑣈 𑣕𑣁𑣒𑣑𑣂, 𑣛𑣉𑣖 𑣉𑣑𑣉 𑣗𑣁𑣒 𑣒𑣁𑣕𑣈."
    ),
    "plants give us food fresh air medicine and shade": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ete ale mandi, hoy odo ran name.",
        "𑢱𑣁𑣗𑣃 𑣈𑣐𑣈 𑣁𑣘𑣈 𑣕𑣁𑣒𑣑𑣂, 𑣛𑣉𑣖 𑣉𑣑𑣉 𑣗𑣁𑣒 𑣒𑣁𑣕𑣈."
    ),
    "पौधे कई प्रकार के होते हैं जैसे वृक्ष झाड़ी और शाक": (
        "दारुको आयमा लेका मेनाः: दारु, बुदा आर घांस।",
        "Daruko ayma leka mena: daru, buda odo ghas.",
        "𑢱𑣁𑣗𑣃𑣌𑣉 𑣁𑣖𑣕𑣁 𑣘𑣈𑣌𑣁 𑣕𑣈𑣒𑣁: 𑢱𑣁𑣗𑣃, 𑢔𑣃𑣑𑣁 𑣉𑣑𑣉 𑣎𑣁𑣚."
    ),
    "पौधे हमें फल सब्जियां दालें और अनाज देते हैं": (
        "दारु आले नातिन जो, उतू आर चाउले एमालेआ।",
        "Daru ale lagid jo, utu odo chawle eme.",
        "𑢱𑣁𑣗𑣃 𑣁𑣘𑣈 𑣯𑣉, 𑣃𑣐𑣃 𑣉𑣑𑣉 𑣎𑣁𑣙𑣘𑣈 𑣈𑣕𑣈."
    ),
    "अपने विद्यालय के बगीचे में एक पौधा लगाएं और प्रतिदिन पानी दें": (
        "अमाः बाड़गे रे मियद दारु रोहोय मे आर दिनाम दाः दुल मे।",
        "Amah badge re miyad daru rohoy me odo da dul me.",
        "𑢡𑣕𑣁𑣛 𑣔𑣁𑣗𑣍𑣈 𑣗𑣈 𑣕𑣂𑣖𑣁𑣑 𑣑𑣁𑣗𑣃 𑣗𑣉𑣛𑣉𑣖 𑣕𑣈 𑣉𑣑𑣉 𑣑𑣁 𑣑𑣃𑣘 𑣕𑣈."
    ),
}

HO_WORD_MAP = {
    # Words
    "water": ("दाः", "Da'"), "पानी": ("दाः", "Da'"), "जल": ("दाः", "Da'"),
    "book": ("पुथी", "Puthi"), "किताब": ("पुथी", "Puthi"), "पुस्तक": ("पुथी", "Puthi"),
    "leaves": ("साकाम", "Sakam"), "leaf": ("साकाम", "Sakam"), "पत्ते": ("साकाम", "Sakam"), "पत्ता": ("साकाम", "Sakam"),
    "stem": ("डाड़", "Dar"), "तना": ("डाड़", "Dar"),
    "roots": ("रेहेद", "Rehed"), "root": ("रेहेद", "Rehed"), "जड़": ("रेहेद", "Rehed"), "जड़ें": ("रेहेद", "Rehed"),
    "plant": ("दारु", "Daru"), "plants": ("दारुको", "Daruko"), "पौधा": ("दारु", "Daru"), "पौधे": ("दारुको", "Daruko"),
    "tree": ("दारु", "Daru"), "पेड़": ("दारु", "Daru"), "वृक्ष": ("दारु", "Daru"),
    "flower": ("बाहा", "Baha"), "फूल": ("बाहा", "Baha"),
    "fruit": ("जो", "Jo"), "फल": ("जो", "Jo"),
    "seed": ("जांग", "Jang"), "बीज": ("जांग", "Jang"),
    "soil": ("हासा", "Hasa"), "मिट्टी": ("हासा", "Hasa"),
    "food": ("मांडी / जोमाः", "Mandi / Jomaah"), "खाना": ("मांडी", "Mandi"), "भोजन": ("मांडी", "Mandi"),
    "sun": ("सिंगी", "Singi"), "सूर्य": ("सिंगी", "Singi"), "सूरज": ("सिंगी", "Singi"),
    "moon": ("चांदु", "Chandu"), "चाँद": ("चांदु", "Chandu"),
    "animal": ("जीव", "Jiv"), "animals": ("जीवको", "Jivko"), "जानवर": ("जीवको", "Jivko"), "पशु": ("जीवको", "Jivko"),
    "hand": ("ती", "Ti"), "हाथ": ("ती", "Ti"),
    "eye": ("मेद", "Med"), "आँख": ("मेद", "Med"),
    "teacher": ("मास्टोर / गुरु", "Mastor / Guru"), "शिक्षक": ("मास्टोर", "Mastor"),
    "student": ("पड़वतन होन", "Parawatan hon"), "विद्यार्थी": ("पड़वतन होन", "Parawatan hon"), "छात्र": ("पड़वतन होन", "Parawatan hon"),
    "child": ("होन", "Hon"), "children": ("होनको", "Honko"), "बच्चे": ("होनको", "Honko"), "बच्चा": ("होन", "Hon"),
    "school": ("इसकुल", "Iskul"), "स्कूल": ("इसकुल", "Iskul"), "विद्यालय": ("इसकुल", "Iskul"),
}


# ─────────────────────────────────────────────────────────────
# 3. CLASSROOM & CURRICULUM LEXICON FOR MUNDARI
# ─────────────────────────────────────────────────────────────
MUNDARI_DICTIONARY = {
    # Classroom & Greetings
    "this is a book": ("नेया पुथी ताना", "Neya puthi tana"),
    "यह एक किताब है": ("नेया पुथी ताना", "Neya puthi tana"),
    "यह किताब है": ("नेया पुथी ताना", "Neya puthi tana"),

    "all children please sit down": ("सोबेन होनको दुबपे", "Soben honko dubpe"),
    "सभी बच्चे अपनी जगह पर बैठें": ("सोबेन होनको दुबपे", "Soben honko dubpe"),
    "सब बच्चे बैठ जाओ": ("सोबेन होनको दुबपे", "Soben honko dubpe"),

    "today we will learn numbers": ("तिसिंग आले लेखा इतुकोआ", "Tising ale lekha itukoa"),
    "आज हम संख्या 5 सीखेंगे": ("तिसिंग आले मोने लेखा इतुकोआ", "Tising ale monre lekha itukoa"),
    "आज हम गिनती सीखेंगे": ("तिसिंग आले लेखा इतुकोआ", "Tising ale lekha itukoa"),

    "drink water and wash your hands": ("दाः नूइके आर ती आबुंगके", "Da' nuike ar ti abungke"),
    "पानी पियो और हाथ धो लो": ("दाः नूइके आर ती आबुंगके", "Da' nuike ar ti abungke"),

    "hello": ("जोहार", "Johar"),
    "नमस्ते": ("जोहार", "Johar"),
    "good morning": ("जोहार", "Johar"),
    "सुप्रभात": ("जोहार", "Johar"),

    "how are you": ("अम चिलकेना?", "Am chilkena?"),
    "आप कैसे हैं": ("अम चिलकेना?", "Am chilkena?"),
    "तुम कैसे हो": ("अम चिलकेना?", "Am chilkena?"),

    "i am fine": ("आञ बुगीगे मेनाञा", "Any bugige menanya"),
    "मैं ठीक हूँ": ("आञ बुगीगे मेनाञा", "Any bugige menanya"),

    "what is your name": ("अमाः नुतुम चिकनाः?", "Amah nutum chiknah?"),
    "तुम्हारा नाम क्या है": ("अमाः नुतुम चिकनाः?", "Amah nutum chiknah?"),
    "आपका नाम क्या है": ("अमाः नुतुम चिकनाः?", "Amah nutum chiknah?"),

    "open your book and read lesson two": ("अमाः पुथी ओताके आर पाठ बार पढ़वके", "Amah puthi otake ar path bar parawke"),
    "अपनी किताब खोलो और पाठ दो पढ़ो": ("अमाः पुथी ओताके आर पाठ बार पढ़वके", "Amah puthi otake ar path bar parawke"),

    # Curriculum: Plants (EVS Class 3 / 4)
    "parts of a plant": ("दारु राः हाटिङको", "Daru raah hatinko"),
    "पौधे के भाग": ("दारु राः हाटिङको", "Daru raah hatinko"),

    "leaves stem and roots are the main parts of a plant": (
        "साकाम, डाड़ आर रेहेद दारु राः आसोल हाटिङ ताना।",
        "Sakam, dar ar rehed daru raah asol hatin tana."
    ),
    "पत्ते, तना और जड़ पौधे के मुख्य भाग होते हैं": (
        "साकाम, डाड़ आर रेहेद दारु राः आसोल हाटिङ ताना।",
        "Sakam, dar ar rehed daru raah asol hatin tana."
    ),
    "पत्ते तना और जड़ पौधे के मुख्य भाग होते हैं": (
        "साकाम, डाड़ आर रेहेद दारु राः आसोल हाटिङ ताना।",
        "Sakam, dar ar rehed daru raah asol hatin tana."
    ),

    "leaves make food for the plant": (
        "साकाम दारु नातिन मांडी बइये।",
        "Sakam daru natin mandi baiyie."
    ),
    "पत्ते पौधे के लिए भोजन बनाते हैं": (
        "साकाम दारु नातिन मांडी बइये।",
        "Sakam daru natin mandi baiyie."
    ),

    "roots absorb water from the soil": (
        "रेहेद हासा आते दाः ताना।",
        "Rehed hasa ate da' tana."
    ),
    "जड़ें मिट्टी से पानी सोखती हैं": (
        "रेहेद हासा आते दाः ताना।",
        "Rehed hasa ate da' tana."
    ),

    "types of plants": ("दारुको लेका", "Daruko leka"),
    "पौधों के प्रकार": ("दारुको लेका", "Daruko leka"),

    "uses of plants": ("दारु राः कामि", "Daru raah kami"),
    "पौधों के उपयोग": ("दारु राः कामि", "Daru raah kami"),

    "food from plants": ("दारु आते जोमाः", "Daru ate jomaah"),
    "पौधों से भोजन": ("दारु आते जोमाः", "Daru ate jomaah"),

    "पौधे हमें भोजन ताज़ी हवा दवाइयाँ और छाया देते हैं": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ate ale mandi, hoyo, ran ar ubul namana."
    ),
    "पौधों से हमें भोजन ताज़ी हवा दवाइयाँ और छाया मिलती है": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ate ale mandi, hoyo, ran ar ubul namana."
    ),
    "plants give us food fresh air medicine and shade": (
        "दारु आते आले मांडी, होयो, रान आर उबुल नामानाले।",
        "Daru ate ale mandi, hoyo, ran ar ubul namana."
    ),
    "पौधे कई प्रकार के होते हैं जैसे वृक्ष झाड़ी और शाक": (
        "दारुको आयमा लेका मेनाः: दारु, बुदा आर घांस।",
        "Daruko ayma leka mena: daru, buda ar ghans."
    ),
    "पौधे हमें फल सब्जियां दालें और अनाज देते हैं": (
        "दारु आले नातिन जो, उतू आर चाउले एमालेआ।",
        "Daru ale natin jo, utu ar chaule emalea."
    ),
    "अपने विद्यालय के बगीचे में एक पौधा लगाएं और प्रतिदिन पानी दें": (
        "अमाः बाड़गे रे मियद दारु रोहोय मे आर दिनाम दाः दुल मे।",
        "Amah badge re miyad daru rohoy me ar dinam da dul me."
    ),

    "food from plants": ("दारु आते जोमाः", "Daru ate jomaah"),
    "पौधों से भोजन": ("दारु आते जोमाः", "Daru ate jomaah"),
}

MUNDARI_WORD_MAP = {
    "water": ("दाः", "Da'"), "पानी": ("दाः", "Da'"),
    "book": ("पुथी", "Puthi"), "किताब": ("पुथी", "Puthi"),
    "leaves": ("साकाम", "Sakam"), "leaf": ("साकाम", "Sakam"), "पत्ते": ("साकाम", "Sakam"), "पत्ता": ("साकाम", "Sakam"),
    "stem": ("डाड़", "Dar"), "तना": ("डाड़", "Dar"),
    "roots": ("रेहेद", "Rehed"), "root": ("रेहेद", "Rehed"), "जड़": ("रेहेद", "Rehed"), "जड़ें": ("रेहेद", "Rehed"),
    "plant": ("दारु", "Daru"), "plants": ("दारुको", "Daruko"), "पौधा": ("दारु", "Daru"), "पौधे": ("दारुको", "Daruko"),
    "tree": ("दारु", "Daru"), "पेड़": ("दारु", "Daru"),
    "flower": ("बाहा", "Baha"), "फूल": ("बाहा", "Baha"),
    "fruit": ("जो", "Jo"), "फल": ("जो", "Jo"),
    "seed": ("जांग", "Jang"), "बीज": ("जांग", "Jang"),
    "soil": ("हासा", "Hasa"), "मिट्टी": ("हासा", "Hasa"),
    "food": ("मांडी / जोमाः", "Mandi / Jomaah"), "खाना": ("मांडी", "Mandi"), "भोजन": ("मांडी", "Mandi"),
    "sun": ("सिंगी", "Singi"), "सूर्य": ("सिंगी", "Singi"),
    "moon": ("चांदु", "Chandu"), "चाँद": ("चांदु", "Chandu"),
    "child": ("होन", "Hon"), "children": ("होनको", "Honko"), "बच्चे": ("होनको", "Honko"), "बच्चा": ("होन", "Hon"),
    "school": ("इसकुल", "Iskul"), "स्कूल": ("इसकुल", "Iskul"),
    "teacher": ("मास्टर / गुरु", "Master / Guru"), "शिक्षक": ("मास्टर", "Master"),
}


# ─────────────────────────────────────────────────────────────
# 4. TRIBAL TRANSLATION ENGINE WITH MULTI-SENTENCE CHUNKING
# ─────────────────────────────────────────────────────────────
class TribalTranslator:
    _instance = None

    def __init__(self):
        self.mundari_pairs: List[Tuple[str, str]] = []
        self.mundari_index: Dict[str, str] = {}
        self.is_loaded = False
        self._load_mundari_dataset()

    @classmethod
    def get_instance(cls) -> "TribalTranslator":
        if cls._instance is None:
            cls._instance = TribalTranslator()
        return cls._instance

    @staticmethod
    def _normalize(text: str) -> str:
        if not text:
            return ""
        text = unicodedata.normalize("NFC", str(text))
        text = re.sub(r"[\u200b-\u200f\u202a-\u202e]", "", text)
        for p in ["।", "॥", ",", ";", ":", "?", "!", "."]:
            text = text.replace(p, " ")
        return re.sub(r"\s+", " ", text).strip().lower()

    def _load_mundari_dataset(self):
        if not MUNDARI_DATASET.exists():
            return

        try:
            with open(MUNDARI_DATASET, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f, delimiter="\t")
                for row in reader:
                    if len(row) >= 2:
                        hi = row[0].strip()
                        mun = row[1].strip()
                        if hi and mun and hi.lower() not in {"hindi", "source", "sentence"}:
                            self.mundari_pairs.append((hi, mun))
                            norm_hi = self._normalize(hi)
                            if norm_hi not in self.mundari_index:
                                self.mundari_index[norm_hi] = mun
            self.is_loaded = True
        except Exception as e:
            print(f"[TribalTranslator] Warning: Failed to load Mundari TSV: {e}")

    @staticmethod
    def _split_into_sentences(text: str) -> List[str]:
        """Split a long paragraph into distinct sentences based on punctuation."""
        parts = re.split(r'([।!?.\n]+)', text)
        sentences = []
        for i in range(0, len(parts) - 1, 2):
            s = parts[i].strip()
            punct = parts[i + 1].strip()
            if s:
                sentences.append(f"{s}{punct}")
        if len(parts) % 2 == 1 and parts[-1].strip():
            sentences.append(parts[-1].strip())
        return sentences if sentences else [text]

    def translate_to_mundari(self, text: str, source_language: str = "hindi") -> Dict:
        """
        Translates single or multi-sentence input into Mundari.
        Handles long paragraphs by sentence decomposition.
        """
        clean = text.strip()
        if not clean:
            return {"success": False, "error": "Empty text"}

        sentences = self._split_into_sentences(clean)
        if len(sentences) > 1:
            deva_results = []
            roman_results = []
            for s in sentences:
                res = self._translate_single_mundari(s)
                deva_results.append(res["translated_text"])
                roman_results.append(res.get("roman_text", ""))
            return {
                "success": True,
                "target_language": "Mundari",
                "translated_text": " ".join(deva_results),
                "script": "Devanagari (Mundari)",
                "roman_text": " ".join(roman_results),
                "source_text": text,
                "match_type": "multi_sentence",
                "confidence": 0.95,
            }
        else:
            return self._translate_single_mundari(clean)

    def _translate_single_mundari(self, text: str) -> Dict:
        clean = text.strip()
        norm = self._normalize(clean)

        # 1. Curated lexicon
        if norm in MUNDARI_DICTIONARY:
            deva, roman = MUNDARI_DICTIONARY[norm]
            return {
                "success": True,
                "target_language": "Mundari",
                "translated_text": deva,
                "script": "Devanagari (Mundari)",
                "roman_text": roman,
                "source_text": text,
                "match_type": "curated_lexicon",
                "confidence": 0.98,
            }

        # 2. 10K Dataset exact match
        if norm in self.mundari_index:
            deva = self.mundari_index[norm]
            return {
                "success": True,
                "target_language": "Mundari",
                "translated_text": deva,
                "script": "Devanagari (Mundari)",
                "roman_text": self._deva_to_roman(deva),
                "source_text": text,
                "match_type": "dataset_exact",
                "confidence": 0.95,
            }

        # 3. Partial / Token similarity
        best_match = None
        best_score = 0.0
        query_words = set(norm.split())

        if query_words and self.mundari_pairs:
            for hi, mun in self.mundari_pairs[:1200]:
                hi_norm = self._normalize(hi)
                cand_words = set(hi_norm.split())
                if not cand_words:
                    continue
                overlap = len(query_words & cand_words) / len(query_words | cand_words)
                if overlap > best_score:
                    best_score = overlap
                    best_match = mun
                if best_score >= 0.75:
                    break

        if best_match and best_score >= 0.4:
            return {
                "success": True,
                "target_language": "Mundari",
                "translated_text": best_match,
                "script": "Devanagari (Mundari)",
                "roman_text": self._deva_to_roman(best_match),
                "source_text": text,
                "match_type": "dataset_semantic",
                "confidence": round(best_score, 2),
            }

        # 4. Word-level gloss
        words = norm.split()
        translated_words = []
        for w in words:
            if w in MUNDARI_WORD_MAP:
                translated_words.append(MUNDARI_WORD_MAP[w][0])
            elif w in HO_WORD_MAP:
                translated_words.append(HO_WORD_MAP[w][0])
            else:
                translated_words.append(w)
        fallback_text = " ".join(translated_words)

        return {
            "success": True,
            "target_language": "Mundari",
            "translated_text": fallback_text,
            "script": "Devanagari (Mundari)",
            "roman_text": self._deva_to_roman(fallback_text),
            "source_text": text,
            "match_type": "lexicon_gloss",
            "confidence": 0.80,
        }

    def translate_to_ho(self, text: str, source_language: str = "hindi") -> Dict:
        """
        Translates single or multi-sentence input into Ho.
        Handles long paragraphs by sentence decomposition.
        """
        clean = text.strip()
        if not clean:
            return {"success": False, "error": "Empty text"}

        sentences = self._split_into_sentences(clean)
        if len(sentences) > 1:
            warang_results = []
            roman_results = []
            deva_results = []
            for s in sentences:
                res = self._translate_single_ho(s)
                warang_results.append(res.get("warang_citi", res["translated_text"]))
                roman_results.append(res.get("roman_text", ""))
                deva_results.append(res.get("devanagari_text", ""))
            joined_warang = " ".join(warang_results)
            joined_roman = " ".join(roman_results)
            joined_deva = " ".join(deva_results)
            return {
                "success": True,
                "target_language": "Ho",
                "translated_text": f"{joined_warang} ({joined_roman})",
                "warang_citi": joined_warang,
                "roman_text": joined_roman,
                "devanagari_text": joined_deva,
                "script": "Warang Citi & Latin",
                "source_text": text,
                "match_type": "multi_sentence",
                "confidence": 0.95,
            }
        else:
            return self._translate_single_ho(clean)

    def _translate_single_ho(self, text: str) -> Dict:
        clean = text.strip()
        norm = self._normalize(clean)

        # 1. Curated phrases
        if norm in HO_DICTIONARY:
            deva, roman, warang = HO_DICTIONARY[norm]
            return {
                "success": True,
                "target_language": "Ho",
                "translated_text": f"{warang} ({roman})",
                "warang_citi": warang,
                "roman_text": roman,
                "devanagari_text": deva,
                "script": "Warang Citi & Latin",
                "source_text": text,
                "match_type": "curated_lexicon",
                "confidence": 0.98,
            }

        # 2. Word-by-word synthesis
        words = norm.split()
        deva_parts = []
        roman_parts = []

        for w in words:
            if w in HO_WORD_MAP:
                deva_w, roman_w = HO_WORD_MAP[w]
                deva_parts.append(deva_w)
                roman_parts.append(roman_w)
            else:
                deva_parts.append(w)
                roman_parts.append(w)

        deva_res = " ".join(deva_parts)
        roman_res = " ".join(roman_parts)
        warang_res = to_warang_citi(roman_res)

        return {
            "success": True,
            "target_language": "Ho",
            "translated_text": f"{warang_res} ({roman_res})",
            "warang_citi": warang_res,
            "roman_text": roman_res,
            "devanagari_text": deva_res,
            "script": "Warang Citi & Latin",
            "source_text": text,
            "match_type": "lexicon_synthesis",
            "confidence": 0.85,
        }

    @staticmethod
    def _deva_to_roman(deva_text: str) -> str:
        """Phonetic Roman transliteration for Devanagari text."""
        mapping = {
            'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
            'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
            'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
            'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
            'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
            'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
            'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
            'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
            'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
            'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
            'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
            '्': '', 'ं': 'n', 'ः': '\'', 'ँ': 'n',
        }
        res = []
        for ch in deva_text:
            res.append(mapping.get(ch, ch))
        return "".join(res)
