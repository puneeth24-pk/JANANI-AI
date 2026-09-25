import csv
import math
import os
import re
import sys
import subprocess
import tempfile
from pathlib import Path
from collections import Counter

# Fix large CSV/TSV fields
csv.field_size_limit(sys.maxsize)

# ================================================================
# MUNDARI HINDI → SPEECH TEACHING ASSISTANT
#
# Pipeline:
# Hindi voice
#      ↓
# Whisper
#      ↓
# Hindi text
#      ↓
# Hindi → Mundari dataset
#      ↓
# Best Mundari match
#      ↓
# Mundari MMS TTS
#      ↓
# Speech
# ================================================================

# ----------------------------------------------------------------
# PATHS
# ----------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

DATASET = (
    BASE_DIR
    / "data"
    / "dataset-hindi-mundari-translation"
    / "translation-hi-unr.tsv"
)

AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------
# MODELS
# ----------------------------------------------------------------

WHISPER_MODEL = "small"

MUNDARI_TTS_MODEL = "facebook/mms-tts-unr"

# ----------------------------------------------------------------
# SETTINGS
# ----------------------------------------------------------------

# This is ONLY used to display confidence.
# It DOES NOT stop speech generation.
CONFIDENCE_THRESHOLD = 55.0

# Maximum number of alternative matches to display
TOP_MATCHES = 5


# ================================================================
# TEXT NORMALIZATION
# ================================================================

def normalize_text(text):
    """
    Normalize Hindi text before matching.
    """

    if not text:
        return ""

    text = str(text)

    # Unicode normalization
    import unicodedata

    text = unicodedata.normalize("NFC", text)

    # Remove zero-width characters
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e]", "", text)

    # Normalize punctuation
    text = text.replace("।", ".")
    text = text.replace("॥", ".")
    text = text.replace(",", " ")
    text = text.replace(";", " ")
    text = text.replace(":", " ")
    text = text.replace("?", " ")
    text = text.replace("!", " ")

    # Multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip().lower()


# ================================================================
# TOKENIZATION
# ================================================================

def tokenize(text):
    """
    Simple word tokenizer.
    """

    text = normalize_text(text)

    if not text:
        return []

    return text.split()


# ================================================================
# SIMILARITY
# ================================================================

def jaccard_similarity(a, b):

    a_tokens = set(tokenize(a))
    b_tokens = set(tokenize(b))

    if not a_tokens or not b_tokens:
        return 0.0

    intersection = len(a_tokens & b_tokens)
    union = len(a_tokens | b_tokens)

    if union == 0:
        return 0.0

    return intersection / union


def sequence_similarity(a, b):

    from difflib import SequenceMatcher

    a = normalize_text(a)
    b = normalize_text(b)

    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a, b).ratio()


def calculate_similarity(query, candidate):

    """
    Combined similarity.

    Gives more importance to sequence similarity,
    while also checking common words.
    """

    seq = sequence_similarity(query, candidate)
    jac = jaccard_similarity(query, candidate)

    score = (seq * 0.70) + (jac * 0.30)

    return score * 100.0


# ================================================================
# DATASET LOADING
# ================================================================

def load_dataset():

    print()
    print("=" * 70)
    print("             LOADING HINDI → MUNDARI DATASET")
    print("=" * 70)

    if not DATASET.exists():

        print()
        print("❌ Dataset not found:")
        print(DATASET)
        print()

        sys.exit(1)

    print()
    print("Dataset:")
    print(DATASET)

    pairs = []

    print()
    print("Reading dataset...")

    try:

        with open(
            DATASET,
            "r",
            encoding="utf-8",
            errors="replace",
            newline=""
        ) as f:

            reader = csv.reader(f, delimiter="\t")

            for row in reader:

                if not row:
                    continue

                if len(row) < 2:
                    continue

                hindi = row[0].strip()
                mundari = row[1].strip()

                if not hindi or not mundari:
                    continue

                # Skip possible header
                lower_hindi = hindi.lower()

                if lower_hindi in {
                    "hindi",
                    "source",
                    "src",
                    "sentence"
                }:
                    continue

                pairs.append(
                    {
                        "hindi": hindi,
                        "mundari": mundari
                    }
                )

    except Exception as e:

        print()
        print("❌ Dataset loading failed:")
        print(repr(e))
        sys.exit(1)

    if not pairs:

        print()
        print("❌ No valid Hindi → Mundari pairs found.")
        sys.exit(1)

    print()
    print(f"✅ Loaded {len(pairs):,} Hindi → Mundari pairs")

    return pairs


# ================================================================
# SEARCH INDEX
# ================================================================

def build_index(pairs):

    print()
    print("Building Hindi search index...")

    index = {}

    for pair in pairs:

        key = normalize_text(pair["hindi"])

        if key and key not in index:
            index[key] = pair

    print(f"✅ Search index ready")
    print(f"Unique Hindi sentences: {len(index):,}")

    return index


# ================================================================
# EXACT MATCH
# ================================================================

def exact_match(query, index):

    key = normalize_text(query)

    if key in index:

        return index[key]

    return None


# ================================================================
# FUZZY SEARCH
# ================================================================

def find_best_matches(query, pairs, top_n=TOP_MATCHES):

    results = []

    for pair in pairs:

        score = calculate_similarity(
            query,
            pair["hindi"]
        )

        results.append(
            {
                "hindi": pair["hindi"],
                "mundari": pair["mundari"],
                "similarity": score
            }
        )

    results.sort(
        key=lambda x: x["similarity"],
        reverse=True
    )

    return results[:top_n]


# ================================================================
# TRANSLATION
# ================================================================

def translate_hindi(query, pairs, index):

    print()
    print("=" * 70)
    print("                 MUNDARI TRANSLATION")
    print("=" * 70)

    print()
    print("Hindi:")
    print(query)

    # ------------------------------------------------------------
    # EXACT MATCH
    # ------------------------------------------------------------

    exact = exact_match(query, index)

    if exact:

        print()
        print("Best matching Hindi:")
        print(exact["hindi"])

        print()
        print("Mundari:")
        print(exact["mundari"])

        print()
        print("Similarity: 100.0%")
        print("Method: EXACT MATCH")

        return {
            "hindi": exact["hindi"],
            "mundari": exact["mundari"],
            "similarity": 100.0,
            "method": "EXACT MATCH",
            "alternatives": []
        }

    # ------------------------------------------------------------
    # FUZZY MATCH
    # ------------------------------------------------------------

    matches = find_best_matches(
        query,
        pairs,
        TOP_MATCHES
    )

    if not matches:

        print()
        print("❌ No dataset match found.")

        return None

    best = matches[0]

    print()
    print("Best matching Hindi:")
    print(best["hindi"])

    print()
    print("Mundari:")
    print(best["mundari"])

    print()
    print(
        f"Similarity: {best['similarity']:.1f}%"
    )

    print()
    print("Method: SIMILARITY MATCH")

    # ------------------------------------------------------------
    # CONFIDENCE DISPLAY
    # ------------------------------------------------------------

    print()

    if best["similarity"] >= CONFIDENCE_THRESHOLD:

        print("🟢 HIGH/ACCEPTABLE CONFIDENCE")

    else:

        print("🟡 LOW CONFIDENCE")
        print()
        print(
            "⚠️ No strong dataset match was found."
        )
        print(
            "🔊 The best available Mundari match will STILL be spoken."
        )

    # ------------------------------------------------------------
    # ALTERNATIVES
    # ------------------------------------------------------------

    if len(matches) > 1:

        print()
        print("-" * 70)
        print("ALTERNATIVE MATCHES")
        print("-" * 70)

        for i, match in enumerate(matches[1:], 2):

            print()
            print(
                f"{i}. {match['similarity']:.1f}%"
            )

            print(
                f"Hindi   : {match['hindi']}"
            )

            print(
                f"Mundari : {match['mundari']}"
            )

    return {
        "hindi": best["hindi"],
        "mundari": best["mundari"],
        "similarity": best["similarity"],
        "method": "SIMILARITY MATCH",
        "alternatives": matches[1:]
    }


# ================================================================
# WHISPER
# ================================================================

_whisper_model = None


def load_whisper():

    global _whisper_model

    if _whisper_model is not None:
        return _whisper_model

    print()
    print("=" * 70)
    print("                         WHISPER")
    print("=" * 70)

    print()
    print("Loading speech recognition model...")

    try:

        from faster_whisper import WhisperModel

    except ImportError:

        print()
        print("❌ faster-whisper is not installed.")
        print()
        print("Install:")
        print(
            "pip install faster-whisper"
        )

        sys.exit(1)

    print(
        f"Model: {WHISPER_MODEL}"
    )

    # IMPORTANT:
    # faster-whisper / CTranslate2 does NOT support MPS.
    # Therefore use CPU.
    print("Device: cpu")
    print("Compute type: int8")

    try:

        _whisper_model = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type="int8"
        )

    except Exception as e:

        print()
        print("❌ Whisper loading failed.")
        print(repr(e))

        sys.exit(1)

    print()
    print("✅ Whisper ready")

    return _whisper_model


# ================================================================
# SPEECH RECORDING
# ================================================================

def record_hindi_audio():

    print()
    print("=" * 70)
    print("                    HINDI VOICE INPUT")
    print("=" * 70)

    print()
    print("Speak Hindi after recording starts.")
    print()
    print("Recording for 8 seconds...")
    print()

    output = AUDIO_DIR / "teacher_input.wav"

    try:

        import sounddevice as sd
        from scipy.io import wavfile
        import numpy as np

    except ImportError:

        print()
        print("❌ Missing audio packages.")

        print()
        print("Install:")
        print(
            "pip install sounddevice scipy numpy"
        )

        return None

    sample_rate = 16000
    duration = 8

    try:

        recording = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype="float32"
        )

        sd.wait()

        wavfile.write(
            str(output),
            sample_rate,
            recording
        )

    except Exception as e:

        print()
        print("❌ Recording failed:")
        print(repr(e))

        return None

    print()
    print("✅ Recording saved:")
    print(output)

    return output


# ================================================================
# WHISPER TRANSCRIPTION
# ================================================================

def transcribe_hindi(audio_file):

    model = load_whisper()

    print()
    print("=" * 70)
    print("                 HINDI SPEECH RECOGNITION")
    print("=" * 70)

    print()
    print("Audio:")
    print(audio_file)

    print()
    print("Transcribing Hindi...")

    try:

        segments, info = model.transcribe(
            str(audio_file),
            language="hi",
            beam_size=5,
            best_of=5,
            temperature=0.0,
            vad_filter=True
        )

        segments = list(segments)

        text_parts = []

        for segment in segments:

            text_parts.append(
                segment.text.strip()
            )

        text = " ".join(
            x for x in text_parts if x
        ).strip()

    except Exception as e:

        print()
        print("❌ Whisper transcription failed:")
        print(repr(e))

        return None

    if not text:

        print()
        print("❌ Whisper produced empty text.")

        return None

    print()
    print("Recognized Hindi:")
    print(text)

    print()
    print(
        f"Detected language: {info.language}"
    )

    if info.language_probability is not None:

        print(
            f"Language probability: "
            f"{info.language_probability:.2f}"
        )

    return text


# ================================================================
# MUNDARI TTS
# ================================================================

_tts_tokenizer = None
_tts_model = None


def load_mundari_tts():

    global _tts_tokenizer
    global _tts_model

    if (
        _tts_tokenizer is not None
        and _tts_model is not None
    ):

        return (
            _tts_tokenizer,
            _tts_model
        )

    print()
    print("=" * 70)
    print("                    MUNDARI TTS")
    print("=" * 70)

    print()
    print(
        f"Model: {MUNDARI_TTS_MODEL}"
    )

    print()
    print("Loading tokenizer and model...")

    try:

        import torch
        from transformers import (
            AutoTokenizer,
            VitsModel
        )

    except ImportError:

        print()
        print("❌ Missing TTS packages.")

        print()
        print("Install:")
        print(
            "pip install torch transformers"
        )

        sys.exit(1)

    try:

        _tts_tokenizer = (
            AutoTokenizer.from_pretrained(
                MUNDARI_TTS_MODEL
            )
        )

        _tts_model = (
            VitsModel.from_pretrained(
                MUNDARI_TTS_MODEL
            )
        )

    except Exception as e:

        print()
        print("❌ Mundari TTS model loading failed.")
        print(repr(e))

        sys.exit(1)

    # ------------------------------------------------------------
    # MPS FOR TTS
    # ------------------------------------------------------------

    if torch.backends.mps.is_available():

        device = torch.device("mps")

    else:

        device = torch.device("cpu")

    _tts_model = _tts_model.to(device)

    _tts_model.eval()

    print()
    print(f"Device: {device}")

    print()
    print("✅ Mundari TTS ready")

    return (
        _tts_tokenizer,
        _tts_model
    )


# ================================================================
# GENERATE MUNDARI AUDIO
# ================================================================

def generate_mundari_tts(text):

    print()
    print("=" * 70)
    print("                 MUNDARI SPEECH GENERATION")
    print("=" * 70)

    print()
    print("Mundari text:")
    print(text)

    if not text or not text.strip():

        print()
        print("❌ Empty Mundari text.")
        return None

    try:

        import torch
        import numpy as np
        from scipy.io import wavfile

    except ImportError:

        print()
        print("❌ Missing audio/TTS packages.")

        print()
        print(
            "pip install numpy scipy torch"
        )

        return None

    tokenizer, model = load_mundari_tts()

    print()
    print("Checking tokenizer...")

    try:

        inputs = tokenizer(
            text,
            return_tensors="pt"
        )

    except Exception as e:

        print()
        print("❌ Tokenizer failed:")
        print(repr(e))

        return None

    input_ids = inputs.get(
        "input_ids"
    )

    if input_ids is None:

        print()
        print("❌ Tokenizer returned no input_ids.")

        return None

    print()
    print(
        f"Input IDs shape: {input_ids.shape}"
    )

    # ------------------------------------------------------------
    # CRITICAL CHECK
    # ------------------------------------------------------------

    if input_ids.numel() == 0 or input_ids.shape[-1] == 0:

        print()
        print("❌ TTS tokenizer produced ZERO tokens.")

        print()
        print(
            "The Mundari text is not supported by this tokenizer."
        )

        return None

    # Move tensors to same device as model

    device = next(
        model.parameters()
    ).device

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    print()
    print("🔊 Generating speech...")

    try:

        with torch.inference_mode():

            output = model(
                **inputs
            )

    except Exception as e:

        print()
        print("❌ TTS generation failed:")
        print(repr(e))

        return None

    try:

        audio = (
            output.waveform
            .squeeze()
            .detach()
            .cpu()
            .numpy()
        )

    except Exception as e:

        print()
        print("❌ Could not extract audio:")
        print(repr(e))

        return None

    if audio.size == 0:

        print()
        print("❌ Generated audio is empty.")

        return None

    # ------------------------------------------------------------
    # NORMALIZE
    # ------------------------------------------------------------

    max_value = np.max(
        np.abs(audio)
    )

    if max_value > 0:

        audio = (
            audio / max_value
        )

    # ------------------------------------------------------------
    # SAVE
    # ------------------------------------------------------------

    existing = list(
        AUDIO_DIR.glob(
            "mundari_*.wav"
        )
    )

    number = len(existing) + 1

    output_file = (
        AUDIO_DIR
        / f"mundari_{number}.wav"
    )

    try:

        wavfile.write(
            str(output_file),
            model.config.sampling_rate,
            audio.astype(np.float32)
        )

    except Exception as e:

        print()
        print("❌ Could not save WAV:")
        print(repr(e))

        return None

    duration = (
        len(audio)
        / model.config.sampling_rate
    )

    print()
    print("✅ AUDIO GENERATED")

    print()
    print("File:")
    print(output_file)

    print()
    print(
        f"Duration: {duration:.2f} seconds"
    )

    # ------------------------------------------------------------
    # PLAY AUDIO
    # ------------------------------------------------------------

    print()
    print("▶️ Playing Mundari audio...")

    try:

        subprocess.run(
            ["afplay", str(output_file)],
            check=False
        )

    except Exception as e:

        print()
        print(
            "⚠️ Could not automatically play audio:"
        )
        print(repr(e))

    print()
    print("✅ MUNDARI SPEECH TEST FINISHED")

    return output_file


# ================================================================
# COMPLETE PIPELINE
# ================================================================

def process_hindi_text(
    hindi_text,
    pairs,
    index
):

    if not hindi_text:
        return

    hindi_text = hindi_text.strip()

    if not hindi_text:
        return

    result = translate_hindi(
        hindi_text,
        pairs,
        index
    )

    if not result:

        print()
        print(
            "❌ No Mundari output available."
        )

        return

    # ------------------------------------------------------------
    # ALWAYS TTS
    # ------------------------------------------------------------

    print()
    print("=" * 70)
    print("                    TTS FALLBACK POLICY")
    print("=" * 70)

    if result["similarity"] < CONFIDENCE_THRESHOLD:

        print()
        print(
            "🟡 Confidence is low."
        )

        print(
            "⚠️ Translation may not be semantically accurate."
        )

        print(
            "🔊 But speech generation WILL continue."
        )

    else:

        print()
        print(
            "🟢 Confidence is acceptable."
        )

        print(
            "🔊 Generating Mundari speech."
        )

    generate_mundari_tts(
        result["mundari"]
    )


# ================================================================
# VOICE INPUT
# ================================================================

def handle_voice_input(
    pairs,
    index
):

    audio = record_hindi_audio()

    if audio is None:
        return

    hindi = transcribe_hindi(
        audio
    )

    if not hindi:
        return

    process_hindi_text(
        hindi,
        pairs,
        index
    )


# ================================================================
# TYPED INPUT
# ================================================================

def handle_text_input(
    pairs,
    index
):

    print()
    print("=" * 70)
    print("                       HINDI TEXT")
    print("=" * 70)

    print()
    print(
        "Enter Hindi sentence."
    )

    print(
        "Type Q to return."
    )

    print()

    try:

        text = input(
            "Hindi > "
        ).strip()

    except KeyboardInterrupt:

        print()
        return

    if text.lower() == "q":
        return

    if not text:
        return

    process_hindi_text(
        text,
        pairs,
        index
    )


# ================================================================
# MAIN MENU
# ================================================================

def main():

    print()
    print("=" * 70)
    print("              MUNDARI TEACHING ASSISTANT")
    print("=" * 70)

    print()
    print("Pipeline:")
    print()
    print("Hindi Voice / Text")
    print("        ↓")
    print("      Whisper")
    print("        ↓")
    print(" Hindi → Mundari Dataset")
    print("        ↓")
    print("   Best Match")
    print("        ↓")
    print("    Mundari TTS")
    print("        ↓")
    print("      🔊 Speech")

    # ------------------------------------------------------------
    # DATASET
    # ------------------------------------------------------------

    pairs = load_dataset()

    index = build_index(
        pairs
    )

    # ------------------------------------------------------------
    # MAIN LOOP
    # ------------------------------------------------------------

    while True:

        print()
        print("=" * 70)
        print("                     TEACHER CONTROL")
        print("=" * 70)

        print()
        print("[1] 🎤 Speak Hindi")
        print("[2] ⌨️ Type Hindi")
        print("[Q] Quit")

        print()

        try:

            choice = input(
                "Choose: "
            ).strip().lower()

        except KeyboardInterrupt:

            print()
            print()
            print("=" * 70)
            print("👋 Closing Mundari Teaching Assistant.")
            print("=" * 70)
            print()

            break

        # --------------------------------------------------------
        # QUIT
        # --------------------------------------------------------

        if choice == "q":

            print()
            print("=" * 70)
            print("👋 Closing Mundari Teaching Assistant.")
            print("=" * 70)
            print()

            break

        # --------------------------------------------------------
        # VOICE
        # --------------------------------------------------------

        elif choice == "1":

            handle_voice_input(
                pairs,
                index
            )

        # --------------------------------------------------------
        # TEXT
        # --------------------------------------------------------

        elif choice == "2":

            handle_text_input(
                pairs,
                index
            )

        else:

            print()
            print(
                "❌ Invalid choice."
            )

            print(
                "Choose 1, 2, or Q."
            )


# ================================================================
# ENTRY POINT
# ================================================================

if __name__ == "__main__":

    main()