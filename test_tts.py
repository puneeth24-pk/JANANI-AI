#!/usr/bin/env python3
# ============================================================
#       SANTALI OFFLINE VOICE TRANSLATOR
#
#       English / Hindi / Urdu
#                  ↓
#              Whisper STT
#                  ↓
#          IndicTrans2 (MPS)
#                  ↓
#          Santali - Ol Chiki
#                  ↓
#             DhVaani TTS
#                  ↓
#              Mac Speaker
#
#       FULL SENTENCE MODE
#       NO TEXT CHUNKING
#       SLIGHTLY SLOW / NATURAL VOICE
# ============================================================

import os
import re
import sys
import time
import platform
import warnings
import textwrap
from pathlib import Path
from datetime import datetime

import numpy as np
import torch
import whisper
import sounddevice as sd
import soundfile as sf

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
)

warnings.filterwarnings("ignore")
os.environ.setdefault(
    "TOKENIZERS_PARALLELISM",
    "false"
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(
    "/Users/puneeth/Downloads/SANTALI"
)

TRANSLATION_MODEL_DIR = (
    BASE_DIR / "models" / "indictrans2"
)

DHVAANI_DIR = (
    BASE_DIR / "DhVaani-0.5"
)

REFERENCE_WAV = (
    DHVAANI_DIR / "samples" / "hindi.wav"
)

OUTPUT_DIR = (
    BASE_DIR / "outputs"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CONFIG
# ============================================================

# ---------------- Whisper ----------------

WHISPER_MODEL = "base"

# ---------------- IndicTrans2 ----------------

TARGET_LANGUAGE = "sat_Olck"

NUM_BEAMS = 1

# Supports longer sentences
MAX_NEW_TOKENS = 256

# ---------------- DhVaani ----------------

TTS_STEPS = 6

# 1.0 = normal
# 0.95 = slightly slow
# 0.90 = slow + natural
# 0.85 = noticeably slow

TTS_SPEED = 0.90

TTS_GUIDANCE = 1.0

REFERENCE_TEXT = (
    "नमस्ते। मेरा नाम पुणीत कुमार है। "
    "आज हम एक सरल विषय के बारे में सीखेंगे।"
)

# ---------------- VAD ----------------

SAMPLE_RATE = 16000

VAD_BLOCK = 512

VAD_CALIBRATION = 0.30

VAD_SILENCE = 0.75

VAD_MIN_SPEECH = 0.30

VAD_MAX_RECORD = 30.0

VAD_PREROLL = 0.25

VAD_FLOOR = 0.008

# ---------------- CPU ----------------

CPU_THREADS = max(
    4,
    min(
        8,
        os.cpu_count() or 4
    )
)

WIDTH = 72


# ============================================================
# LANGUAGE MAP
# ============================================================

WHISPER_TO_INDIC = {

    "en": "eng_Latn",

    "hi": "hin_Deva",

    "ur": "urd_Arab",
}


LANGUAGE_NAMES = {

    "en": "English",

    "hi": "Hindi",

    "ur": "Urdu",
}


# ============================================================
# DEVICE
# ============================================================

if torch.backends.mps.is_available():

    TRANSLATION_DEVICE = "mps"

else:

    TRANSLATION_DEVICE = "cpu"


torch.set_num_threads(
    CPU_THREADS
)

torch.set_grad_enabled(False)

if hasattr(
    torch,
    "set_float32_matmul_precision"
):

    torch.set_float32_matmul_precision(
        "high"
    )


# ============================================================
# DISPLAY HELPERS
# ============================================================

def rule(char="─"):

    print(
        char * WIDTH
    )


def header(
    title,
    char="═"
):

    print()
    print(
        char * WIDTH
    )
    print(
        f"  {title}"
    )
    print(
        char * WIDTH
    )


def block(
    title,
    body="",
    char="─"
):

    print()
    print(
        char * WIDTH
    )
    print(
        f"  {title}"
    )
    print(
        char * WIDTH
    )

    if body:

        for para in str(body).split("\n"):

            lines = textwrap.wrap(
                para,
                WIDTH - 4
            )

            if not lines:

                print()

            for line in lines:

                print(
                    f"  {line}"
                )


def field(
    label,
    value
):

    print(
        f"  {label:<18}: {value}"
    )


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):

    if text is None:

        return ""

    text = str(text)

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# FILE CHECK
# ============================================================

header(
    "SANTALI OFFLINE VOICE TRANSLATOR"
)

field(
    "Translation",
    TRANSLATION_DEVICE.upper()
)

field(
    "Whisper",
    WHISPER_MODEL
)

field(
    "TTS",
    f"DhVaani · {TTS_STEPS} steps"
)

field(
    "Voice speed",
    TTS_SPEED
)

field(
    "Mode",
    "FULL SENTENCE · NO CHUNKS"
)

field(
    "Target",
    "Santali · Ol Chiki"
)

print(
    "\nChecking local files..."
)

for path in [
    TRANSLATION_MODEL_DIR,
    DHVAANI_DIR,
    REFERENCE_WAV,
]:

    if not path.exists():

        print(
            f"\n❌ Missing:\n{path}"
        )

        sys.exit(1)

print(
    "✅ All local files found."
)


# ============================================================
# LOAD WHISPER
# ============================================================

header(
    "[1/3] Loading Whisper..."
)

_t = time.perf_counter()

try:

    whisper_model = whisper.load_model(
        WHISPER_MODEL
    )

except Exception as e:

    print(
        f"\n❌ Whisper failed:\n{e}"
    )

    sys.exit(1)

print(
    f"✅ Whisper ready "
    f"({time.perf_counter() - _t:.2f}s)"
)


# ============================================================
# LOAD INDIC TRANS2
# ============================================================

header(
    "[2/3] Loading IndicTrans2..."
)

_t = time.perf_counter()

try:

    tokenizer = (
        AutoTokenizer.from_pretrained(
            str(TRANSLATION_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True,
        )
    )

    translator = (
        AutoModelForSeq2SeqLM.from_pretrained(
            str(TRANSLATION_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True,
        )
    )

    translator = translator.to(
        TRANSLATION_DEVICE
    )

    translator.eval()

except Exception as e:

    print(
        f"\n❌ IndicTrans2 failed:\n{e}"
    )

    sys.exit(1)


try:

    try:

        from IndicTransToolkit import (
            IndicProcessor
        )

    except ImportError:

        from IndicTransTokenizer import (
            IndicProcessor
        )

    indic_processor = IndicProcessor(
        inference=True
    )

except Exception as e:

    print(
        f"\n❌ IndicProcessor failed:\n{e}"
    )

    sys.exit(1)

print(
    f"✅ IndicTrans2 ready "
    f"({time.perf_counter() - _t:.2f}s)"
)


# ============================================================
# LOAD DHVAANI
# ============================================================

header(
    "[3/3] Loading Python DhVaani..."
)

_t = time.perf_counter()

try:

    sys.path.insert(
        0,
        str(DHVAANI_DIR)
    )

    from dhvaani import DhVaani

    try:

        tts = DhVaani(
            model_dir=DHVAANI_DIR,
            device="cpu"
        )

    except TypeError:

        tts = DhVaani()

except Exception as e:

    print(
        f"\n❌ DhVaani failed:\n{e}"
    )

    sys.exit(1)

print(
    f"✅ DhVaani ready "
    f"({time.perf_counter() - _t:.2f}s)"
)


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(audio):

    header(
        "🌍 AUTOMATIC LANGUAGE DETECTION"
    )

    try:

        padded = whisper.pad_or_trim(
            audio
        )

        mel = whisper.log_mel_spectrogram(
            padded,
            n_mels=whisper_model.dims.n_mels
        ).to(
            whisper_model.device
        )

        _, probabilities = (
            whisper_model.detect_language(
                mel
            )
        )

        ranked = sorted(
            probabilities.items(),
            key=lambda x: x[1],
            reverse=True
        )

        print(
            "\n  Top languages:"
        )

        for lang, probability in ranked[:5]:

            name = LANGUAGE_NAMES.get(
                lang,
                lang
            )

            print(
                f"    {name:<12} "
                f"{probability:.2%}"
            )

        detected = ranked[0][0]

        confidence = ranked[0][1]

        if detected not in WHISPER_TO_INDIC:

            print(
                "\n⚠️ Unsupported language."
            )

            detected = "en"

        print()

        field(
            "Detected",
            LANGUAGE_NAMES[detected]
        )

        field(
            "Confidence",
            f"{confidence:.2%}"
        )

        return detected

    except Exception as e:

        print(
            f"\n⚠️ Detection error: {e}"
        )

        return "en"


# ============================================================
# RECORD AUDIO
# ============================================================

def record_audio():

    header(
        "🎤 VOICE INPUT"
    )

    print(
        "  Speak now — recording stops automatically."
    )

    frames = []

    preroll = []

    preroll_blocks = max(
        1,
        int(
            VAD_PREROLL *
            SAMPLE_RATE /
            VAD_BLOCK
        )
    )

    silence_blocks = max(
        1,
        int(
            VAD_SILENCE *
            SAMPLE_RATE /
            VAD_BLOCK
        )
    )

    min_blocks = max(
        1,
        int(
            VAD_MIN_SPEECH *
            SAMPLE_RATE /
            VAD_BLOCK
        )
    )

    max_blocks = max(
        1,
        int(
            VAD_MAX_RECORD *
            SAMPLE_RATE /
            VAD_BLOCK
        )
    )

    try:

        stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=VAD_BLOCK
        )

    except Exception as e:

        print(
            f"\n❌ Microphone error:\n{e}"
        )

        return None

    with stream:

        noise = []

        calibration_blocks = max(
            1,
            int(
                VAD_CALIBRATION *
                SAMPLE_RATE /
                VAD_BLOCK
            )
        )

        for _ in range(
            calibration_blocks
        ):

            audio_block, _ = (
                stream.read(
                    VAD_BLOCK
                )
            )

            level = float(
                np.sqrt(
                    np.mean(
                        audio_block ** 2
                    )
                )
            )

            noise.append(level)

        noise_floor = float(
            np.median(noise)
        )

        threshold = max(
            VAD_FLOOR,
            noise_floor * 3.0
        )

        field(
            "Threshold",
            f"{threshold:.4f}"
        )

        speaking = False

        silent = 0

        total = 0

        while total < max_blocks:

            audio_block, _ = (
                stream.read(
                    VAD_BLOCK
                )
            )

            audio_block = (
                audio_block.copy()
            )

            total += 1

            level = float(
                np.sqrt(
                    np.mean(
                        audio_block ** 2
                    )
                )
            )

            if not speaking:

                preroll.append(
                    audio_block
                )

                if len(preroll) > preroll_blocks:

                    preroll.pop(0)

                if level > threshold:

                    speaking = True

                    frames.extend(
                        preroll
                    )

                    frames.append(
                        audio_block
                    )

                    silent = 0

                    print(
                        "    🎙️ Speech detected"
                    )

                continue

            frames.append(
                audio_block
            )

            if level < threshold:

                silent += 1

            else:

                silent = 0

            if (
                silent >= silence_blocks
                and len(frames) >= min_blocks
            ):

                break

    if not frames:

        print(
            "  ❌ No speech detected."
        )

        return None

    audio = np.concatenate(
        frames,
        axis=0
    ).reshape(-1).astype(
        np.float32
    )

    peak = np.max(
        np.abs(audio)
    )

    if peak > 0.95:

        audio = (
            audio * 0.95 / peak
        )

    input_file = (
        OUTPUT_DIR /
        "latest_input.wav"
    )

    sf.write(
        str(input_file),
        audio,
        SAMPLE_RATE,
        subtype="PCM_16"
    )

    field(
        "Captured",
        f"{len(audio) / SAMPLE_RATE:.2f}s"
    )

    return audio


# ============================================================
# WHISPER STT
# ============================================================

def transcribe(
    audio,
    language_code
):

    header(
        "📝 SPEECH → TEXT"
    )

    start = time.perf_counter()

    result = whisper_model.transcribe(

        audio,

        language=language_code,

        fp16=False,

        temperature=0,

        condition_on_previous_text=False,

        beam_size=1,

        best_of=1,

        without_timestamps=True,

        compression_ratio_threshold=2.4,

        logprob_threshold=-1.0,

        no_speech_threshold=0.6
    )

    elapsed = (
        time.perf_counter()
        - start
    )

    text = clean_text(
        result.get(
            "text",
            ""
        )
    )

    field(
        "Whisper",
        f"{elapsed:.2f}s"
    )

    print()

    print(
        "  FULL RECOGNIZED TEXT:"
    )

    rule()

    print(
        text
    )

    rule()

    return text


# ============================================================
# TRANSLATE
#
# NO CHUNKS
# ============================================================

def translate_to_santali(
    text,
    language_code
):

    header(
        "🌐 TRANSLATION → SANTALI"
    )

    source_language = (
        WHISPER_TO_INDIC[
            language_code
        ]
    )

    field(
        "Source",
        LANGUAGE_NAMES[
            language_code
        ]
    )

    field(
        "Target",
        "Santali · Ol Chiki"
    )

    print()

    print(
        "  FULL INPUT:"
    )

    rule()

    print(
        text
    )

    rule()

    start = time.perf_counter()

    try:

        # FULL SENTENCE ONLY
        processed = (
            indic_processor.preprocess_batch(

                [text],

                src_lang=source_language,

                tgt_lang=TARGET_LANGUAGE
            )
        )

        inputs = tokenizer(

            processed,

            truncation=True,

            padding=True,

            return_tensors="pt",

            return_attention_mask=True
        )

        inputs = {
            key:
            value.to(
                TRANSLATION_DEVICE
            )

            for key, value
            in inputs.items()
        }

        with torch.inference_mode():

            output_tokens = (
                translator.generate(

                    **inputs,

                    use_cache=True,

                    max_new_tokens=MAX_NEW_TOKENS,

                    num_beams=NUM_BEAMS,

                    num_return_sequences=1,

                    do_sample=False
                )
            )

        output_tokens = (
            output_tokens
            .detach()
            .cpu()
        )

        decoded = (
            tokenizer.batch_decode(

                output_tokens,

                skip_special_tokens=True,

                clean_up_tokenization_spaces=True
            )
        )

        translated = (
            indic_processor
            .postprocess_batch(

                decoded,

                lang=TARGET_LANGUAGE
            )[0]
        )

        translated = clean_text(
            translated
        )

    except Exception as e:

        print(
            f"\n❌ Translation error:\n{e}"
        )

        return None

    elapsed = (
        time.perf_counter()
        - start
    )

    print()

    print(
        "  🌳 FULL SANTALI OUTPUT:"
    )

    rule()

    print(
        translated
    )

    rule()

    field(
        "Translation",
        f"{elapsed:.2f}s"
    )

    return translated


# ============================================================
# DHVAANI TTS
#
# FULL SANTALI SENTENCE
# ============================================================

def synthesize_santali(
    text
):

    header(
        "🔊 SANTALI TEXT → VOICE"
    )

    print(
        "  Voice speed : 0.90"
    )

    print()

    print(
        "  FULL TTS INPUT:"
    )

    rule()

    print(
        text
    )

    rule()

    timestamp = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    output_file = (
        OUTPUT_DIR /
        f"santali_{timestamp}.wav"
    )

    start = time.perf_counter()

    try:

        tts.synthesize(

            text=text,

            prompt_wav=str(
                REFERENCE_WAV
            ),

            prompt_text=REFERENCE_TEXT,

            out_path=str(
                output_file
            ),

            num_step=TTS_STEPS,

            guidance_scale=TTS_GUIDANCE,

            speed=TTS_SPEED
        )

    except TypeError as e:

        print(
            f"\n⚠️ DhVaani API issue: {e}"
        )

        print(
            "Retrying basic API..."
        )

        try:

            tts.synthesize(

                text=text,

                prompt_wav=str(
                    REFERENCE_WAV
                ),

                prompt_text=REFERENCE_TEXT,

                out_path=str(
                    output_file
                )

            )

        except Exception as e2:

            print(
                f"\n❌ DhVaani failed:\n{e2}"
            )

            import traceback

            traceback.print_exc()

            return None

    except Exception as e:

        print(
            f"\n❌ DhVaani failed:\n{e}"
        )

        import traceback

        traceback.print_exc()

        return None

    elapsed = (
        time.perf_counter()
        - start
    )

    if not output_file.exists():

        print(
            "\n❌ No WAV generated."
        )

        return None

    try:

        audio, sr = sf.read(
            str(output_file)
        )

        duration = (
            len(audio) / sr
        )

    except Exception as e:

        print(
            f"\n❌ WAV validation failed:\n{e}"
        )

        return None

    field(
        "TTS generation",
        f"{elapsed:.2f}s"
    )

    field(
        "Audio duration",
        f"{duration:.2f}s"
    )

    field(
        "Sample rate",
        f"{sr} Hz"
    )

    field(
        "Voice speed",
        "0.90"
    )

    field(
        "Voice file",
        output_file.name
    )

    return output_file


# ============================================================
# PLAY AUDIO
# ============================================================

def play_audio(
    audio_file
):

    header(
        "🔊 NOW SPEAKING"
    )

    try:

        if platform.system() == "Darwin":

            subprocess = __import__(
                "subprocess"
            )

            subprocess.run(
                [
                    "afplay",
                    str(audio_file)
                ],
                check=False
            )

        elif platform.system() == "Linux":

            subprocess = __import__(
                "subprocess"
            )

            subprocess.run(
                [
                    "aplay",
                    str(audio_file)
                ],
                check=False
            )

        elif platform.system() == "Windows":

            import winsound

            winsound.PlaySound(
                str(audio_file),
                winsound.SND_FILENAME
            )

    except Exception as e:

        print(
            f"\n❌ Playback error:\n{e}"
        )


# ============================================================
# COMPLETE VOICE PIPELINE
# ============================================================

def voice_pipeline():

    total_start = (
        time.perf_counter()
    )

    # --------------------------------------------------------
    # RECORD
    # --------------------------------------------------------

    audio = record_audio()

    if audio is None:

        return

    # --------------------------------------------------------
    # DETECT LANGUAGE
    # --------------------------------------------------------

    detected_language = (
        detect_language(
            audio
        )
    )

    # --------------------------------------------------------
    # STT
    # --------------------------------------------------------

    text = transcribe(

        audio,

        detected_language
    )

    if not text:

        print(
            "\n❌ No text recognized."
        )

        return

    # --------------------------------------------------------
    # TRANSLATION
    # --------------------------------------------------------

    santali = (
        translate_to_santali(

            text,

            detected_language
        )
    )

    if not santali:

        return

    # --------------------------------------------------------
    # TTS
    # --------------------------------------------------------

    voice_file = (
        synthesize_santali(
            santali
        )
    )

    if voice_file is None:

        return

    # --------------------------------------------------------
    # PLAY
    # --------------------------------------------------------

    play_audio(
        voice_file
    )

    # --------------------------------------------------------
    # FINAL
    # --------------------------------------------------------

    total_time = (
        time.perf_counter()
        - total_start
    )

    header(
        "✅ PIPELINE COMPLETE"
    )

    field(
        "Language",
        LANGUAGE_NAMES[
            detected_language
        ]
    )

    print()

    print(
        "INPUT / STT:"
    )

    print(
        text
    )

    print()

    print(
        "SANTALI:"
    )

    print(
        santali
    )

    print()

    field(
        "Total time",
        f"{total_time:.2f}s"
    )

    field(
        "Voice speed",
        "0.90"
    )

    field(
        "Voice file",
        voice_file.name
    )

    rule("═")


# ============================================================
# TEXT MODE
# ============================================================

def text_mode():

    header(
        "⌨️ TEXT MODE"
    )

    print(
        "  Enter English / Hindi / Urdu."
    )

    print(
        "  Complete text is processed at once."
    )

    print(
        "  Type Q to return."
    )

    while True:

        try:

            text = input(
                "\n  > "
            ).strip()

        except (
            EOFError,
            KeyboardInterrupt
        ):

            return

        if text.lower() == "q":

            return

        if not text:

            continue

        # Urdu script
        if re.search(
            r"[\u0600-\u06FF]",
            text
        ):

            language = "ur"

        # Devanagari
        elif re.search(
            r"[\u0900-\u097F]",
            text
        ):

            language = "hi"

        # Latin
        else:

            language = "en"

        print()

        field(
            "Detected",
            LANGUAGE_NAMES[
                language
            ]
        )

        santali = (
            translate_to_santali(
                text,
                language
            )
        )

        if not santali:

            continue

        voice_file = (
            synthesize_santali(
                santali
            )
        )

        if voice_file:

            play_audio(
                voice_file
            )


# ============================================================
# MAIN MENU
# ============================================================

def main():

    while True:

        header(
            "TEACHER CONTROL PANEL"
        )

        print(
            "  [1] 🎤 Voice → Santali"
        )

        print(
            "  [2] ⌨️  Text → Santali"
        )

        print(
            "  [Q] ❌ Quit"
        )

        rule("═")

        try:

            choice = input(
                "\n  Choose: "
            ).strip().lower()

        except (
            EOFError,
            KeyboardInterrupt
        ):

            break

        if choice == "1":

            try:

                voice_pipeline()

            except KeyboardInterrupt:

                sd.stop()

                print(
                    "\n⏹ Cancelled."
                )

        elif choice == "2":

            text_mode()

        elif choice == "q":

            break

        else:

            print(
                "\n⚠️ Invalid option."
            )

    print(
        "\n👋 Exiting..."
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        sd.stop()

        print(
            "\n👋 Stopped safely."
        )

    except Exception as e:

        print(
            f"\n❌ Fatal error:\n{e}"
        )

        import traceback

        traceback.print_exc()