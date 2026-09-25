import csv
import sys
from pathlib import Path
from collections import Counter

# ================================================================
# MUNDARI DATASET QUALITY CHECK
# ================================================================

csv.field_size_limit(sys.maxsize)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

print("=" * 70)
print("              MUNDARI DATASET QUALITY CHECK")
print("=" * 70)

# ================================================================
# FIND DATASET RECURSIVELY
# ================================================================

files = (
    list(DATA_DIR.rglob("*.csv"))
    + list(DATA_DIR.rglob("*.tsv"))
)

if not files:
    print("\n❌ No CSV/TSV dataset found.")
    print("Checked:")
    print(DATA_DIR)
    sys.exit(1)

print("\n✅ Dataset files found:")

for i, file in enumerate(files, 1):
    print(f"  [{i}] {file}")

# Prefer Hindi → Mundari dataset
preferred = [
    f for f in files
    if "translation-hi-unr" in f.name.lower()
]

if preferred:
    DATASET = preferred[0]
else:
    DATASET = files[0]

print("\nUsing dataset:")
print(DATASET)

# ================================================================
# DETECT DELIMITER
# ================================================================

def detect_delimiter(path):

    with open(
        path,
        "r",
        encoding="utf-8-sig",
        errors="replace"
    ) as f:

        sample = f.read(20000)

    if "\t" in sample:
        return "\t"

    if "," in sample:
        return ","

    if ";" in sample:
        return ";"

    return "\t"


delimiter = detect_delimiter(DATASET)

print("\nDelimiter:", repr(delimiter))

# ================================================================
# LOAD DATASET
# ================================================================

rows = []

print("\nLoading Hindi → Mundari dataset...")

with open(
    DATASET,
    "r",
    encoding="utf-8-sig",
    errors="replace",
    newline=""
) as f:

    reader = csv.reader(
        f,
        delimiter=delimiter
    )

    for row_number, row in enumerate(reader, 1):

        if len(row) < 2:
            continue

        hindi = row[0].strip()
        mundari = row[1].strip()

        if not hindi or not mundari:
            continue

        # Skip header
        h_lower = hindi.lower()
        m_lower = mundari.lower()

        if (
            h_lower in {
                "hindi",
                "source",
                "sentence",
                "text",
                "src"
            }
            and
            m_lower in {
                "mundari",
                "target",
                "translation",
                "tgt"
            }
        ):
            continue

        rows.append(
            (hindi, mundari)
        )

print(f"✅ Loaded pairs: {len(rows):,}")

if not rows:
    print("\n❌ No usable translation pairs found.")
    sys.exit(1)

# ================================================================
# BASIC STATISTICS
# ================================================================

hindi_sentences = [
    h for h, m in rows
]

mundari_sentences = [
    m for h, m in rows
]

print("\n" + "=" * 70)
print("                    BASIC STATISTICS")
print("=" * 70)

print(
    f"\nTotal Hindi → Mundari pairs : "
    f"{len(rows):,}"
)

print(
    f"Unique Hindi sentences      : "
    f"{len(set(hindi_sentences)):,}"
)

print(
    f"Unique Mundari sentences    : "
    f"{len(set(mundari_sentences)):,}"
)

# ================================================================
# DUPLICATES
# ================================================================

hindi_counts = Counter(
    hindi_sentences
)

pair_counts = Counter(
    rows
)

duplicate_hindi = {
    h: count
    for h, count in hindi_counts.items()
    if count > 1
}

duplicate_pairs = {
    pair: count
    for pair, count in pair_counts.items()
    if count > 1
}

print("\n" + "=" * 70)
print("                       DUPLICATES")
print("=" * 70)

print(
    f"\nHindi sentences appearing multiple times : "
    f"{len(duplicate_hindi):,}"
)

print(
    f"Exact duplicate Hindi-Mundari pairs      : "
    f"{len(duplicate_pairs):,}"
)

# ================================================================
# SHORT SENTENCES
# ================================================================

short_hindi = []
short_mundari = []

for hindi, mundari in rows:

    if len(hindi.strip()) < 3:
        short_hindi.append(
            (hindi, mundari)
        )

    if len(mundari.strip()) < 3:
        short_mundari.append(
            (hindi, mundari)
        )

print("\n" + "=" * 70)
print("                   SHORT SENTENCES")
print("=" * 70)

print(
    f"\nVery short Hindi   : "
    f"{len(short_hindi):,}"
)

print(
    f"Very short Mundari : "
    f"{len(short_mundari):,}"
)

# ================================================================
# WORD LENGTH
# ================================================================

hindi_lengths = [
    len(h.split())
    for h in hindi_sentences
]

mundari_lengths = [
    len(m.split())
    for m in mundari_sentences
]

print("\n" + "=" * 70)
print("                  SENTENCE LENGTH")
print("=" * 70)

print(
    f"\nHindi average words   : "
    f"{sum(hindi_lengths) / len(hindi_lengths):.2f}"
)

print(
    f"Mundari average words : "
    f"{sum(mundari_lengths) / len(mundari_lengths):.2f}"
)

print(
    f"\nHindi shortest        : "
    f"{min(hindi_lengths)} words"
)

print(
    f"Hindi longest         : "
    f"{max(hindi_lengths)} words"
)

print(
    f"Mundari shortest      : "
    f"{min(mundari_lengths)} words"
)

print(
    f"Mundari longest       : "
    f"{max(mundari_lengths)} words"
)

# ================================================================
# DEVANAGARI CHECK
# ================================================================

def devanagari_ratio(text):

    chars = [
        c for c in text
        if not c.isspace()
    ]

    if not chars:
        return 0

    devanagari = sum(
        1
        for c in chars
        if "\u0900" <= c <= "\u097F"
    )

    return devanagari / len(chars)


def latin_ratio(text):

    chars = [
        c
        for c in text
        if not c.isspace()
    ]

    if not chars:
        return 0

    latin = sum(
        1
        for c in chars
        if c.isascii()
        and c.isalpha()
    )

    return latin / len(chars)


non_devanagari_hindi = []
mixed_hindi = []

for hindi, mundari in rows:

    d = devanagari_ratio(hindi)
    l = latin_ratio(hindi)

    if d < 0.5:
        non_devanagari_hindi.append(
            (hindi, mundari)
        )

    if d > 0.20 and l > 0.20:
        mixed_hindi.append(
            (hindi, mundari)
        )

print("\n" + "=" * 70)
print("                    HINDI SCRIPT CHECK")
print("=" * 70)

print(
    f"\nHindi with low Devanagari content : "
    f"{len(non_devanagari_hindi):,}"
)

print(
    f"Mixed-script Hindi                : "
    f"{len(mixed_hindi):,}"
)

# ================================================================
# MUNDARI SCRIPT DISTRIBUTION
# ================================================================

mundari_devanagari = 0
mundari_latin = 0
mundari_other = 0

for mundari in mundari_sentences:

    d = devanagari_ratio(mundari)
    l = latin_ratio(mundari)

    if d >= 0.5:

        mundari_devanagari += 1

    elif l >= 0.5:

        mundari_latin += 1

    else:

        mundari_other += 1

print("\n" + "=" * 70)
print("                  MUNDARI SCRIPT CHECK")
print("=" * 70)

print(
    f"\nDevanagari dominant : "
    f"{mundari_devanagari:,}"
)

print(
    f"Latin dominant      : "
    f"{mundari_latin:,}"
)

print(
    f"Other / mixed       : "
    f"{mundari_other:,}"
)

# ================================================================
# CLASSROOM KEYWORDS
# ================================================================

keywords = [
    "पढ़",
    "पढ़ाई",
    "पढ़ें",
    "सिख",
    "सीख",
    "गिन",
    "संख्या",
    "नंबर",
    "किताब",
    "स्कूल",
    "बच्च",
    "शिक्षक",
    "कक्षा",
    "प्रश्न",
    "उत्तर",
    "लिख",
    "बोल",
    "सुन",
    "देख",
    "खेल",
    "अभ्यास",
    "गणित",
    "अक्षर",
    "शब्द",
    "सीखें",
    "बताइए",
]

keyword_counts = Counter()

for hindi in hindi_sentences:

    for keyword in keywords:

        if keyword in hindi:

            keyword_counts[keyword] += 1

print("\n" + "=" * 70)
print("                 CLASSROOM COVERAGE")
print("=" * 70)

for keyword in keywords:

    print(
        f"{keyword:<12} : "
        f"{keyword_counts[keyword]:>6,}"
    )

# ================================================================
# FIRST 10 PAIRS
# ================================================================

print("\n" + "=" * 70)
print("                    SAMPLE PAIRS")
print("=" * 70)

for i, (hindi, mundari) in enumerate(
    rows[:10],
    1
):

    print(f"\n{i}. Hindi   : {hindi}")
    print(f"   Mundari : {mundari}")

# ================================================================
# DUPLICATE EXAMPLES
# ================================================================

print("\n" + "=" * 70)
print("              DUPLICATE HINDI EXAMPLES")
print("=" * 70)

shown = 0

for hindi, count in duplicate_hindi.items():

    print(
        f"\nHindi "
        f"({count} occurrences):"
    )

    print(hindi)

    matches = [
        m
        for h, m in rows
        if h == hindi
    ]

    for mundari in matches[:5]:

        print(
            "  →",
            mundari
        )

    shown += 1

    if shown >= 10:
        break

# ================================================================
# LONG SENTENCES
# ================================================================

print("\n" + "=" * 70)
print("                 LONG SENTENCE EXAMPLES")
print("=" * 70)

longest = sorted(
    rows,
    key=lambda x: len(x[0].split()),
    reverse=True
)

for i, (hindi, mundari) in enumerate(
    longest[:5],
    1
):

    print(
        f"\n{i}. Hindi "
        f"({len(hindi.split())} words):"
    )

    print(hindi)

    print(
        f"Mundari "
        f"({len(mundari.split())} words):"
    )

    print(mundari)

# ================================================================
# FINAL REPORT
# ================================================================

print("\n" + "=" * 70)
print("                    QUALITY SUMMARY")
print("=" * 70)

print()

print(
    f"Dataset pairs              : "
    f"{len(rows):,}"
)

print(
    f"Unique Hindi               : "
    f"{len(set(hindi_sentences)):,}"
)

print(
    f"Unique Mundari             : "
    f"{len(set(mundari_sentences)):,}"
)

print(
    f"Duplicate Hindi            : "
    f"{len(duplicate_hindi):,}"
)

print(
    f"Duplicate exact pairs      : "
    f"{len(duplicate_pairs):,}"
)

print(
    f"Short Hindi                : "
    f"{len(short_hindi):,}"
)

print(
    f"Short Mundari              : "
    f"{len(short_mundari):,}"
)

print(
    f"Low-Devanagari Hindi       : "
    f"{len(non_devanagari_hindi):,}"
)

print(
    f"Mixed-script Hindi         : "
    f"{len(mixed_hindi):,}"
)

print(
    f"Mundari Devanagari         : "
    f"{mundari_devanagari:,}"
)

print(
    f"Mundari Latin              : "
    f"{mundari_latin:,}"
)

print(
    f"Mundari other/mixed        : "
    f"{mundari_other:,}"
)

print("\n" + "=" * 70)
print("                    CHECK COMPLETE")
print("=" * 70)