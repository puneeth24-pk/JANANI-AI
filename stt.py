#!/usr/bin/env python3

# ============================================================
# SANTALI OFFLINE VOICE TRANSLATOR
#
# Microphone
#    ↓
# Whisper
#    ↓
# IndicTrans2 MPS
#    ↓
# Santali / Ol Chiki
#    ↓
# Python DhVaani
#    ↓
# Mac Speaker
# ============================================================

import os
import sys
import re
import time
import platform
import subprocess
import warnings
from pathlib import Path
from datetime import datetime

import numpy as np
import torch
import whisper
import sounddevice as sd
import soundfile as sf

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM
)

warnings.filterwarnings("ignore")


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(
    "/Users/puneeth/Downloads/SANTALI"
)

TRANSLATION_MODEL_DIR = (
    BASE_DIR
    / "models"
    / "indictrans2"
)

DHVAANI_DIR = (
    BASE_DIR
    / "DhVaani-0.5"
)

REFERENCE_WAV = (
    DHVAANI_DIR
    / "samples"
    / "hindi.wav"
)

OUTPUT_DIR = (
    BASE_DIR
    / "outputs"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CONFIG
# ============================================================

WHISPER_MODEL = "base"

NUM_BEAMS = 1

MAX_NEW_TOKENS = 128


# ------------------------------------------------------------
# DHVAANI
# ------------------------------------------------------------

# 6 = good quality
# 8 = higher quality but slower
# 4 = faster but lower quality
TTS_STEPS = 6

# NORMAL SPEECH SPEED
TTS_SPEED = 1.0

TTS_GUIDANCE = 1.0


# ------------------------------------------------------------
# SENTENCE SIZE
# ------------------------------------------------------------

# Large enough to keep a complete sentence together.
CHUNK_SIZE = 160


# ------------------------------------------------------------
# CPU
# ------------------------------------------------------------

CPU_THREADS = max(
    4,
    min(
        8,
        os.cpu_count() or 4
    )
)


# ============================================================
# VAD
# ============================================================

SAMPLE_RATE = 16000

VAD_BLOCK = 512

VAD_CALIBRATION = 0.30

VAD_SILENCE = 0.65

VAD_MIN_SPEECH = 0.30

VAD_MAX_RECORD = 12.0

VAD_PREROLL = 0.25

VAD_FLOOR = 0.010


# ============================================================
# LANGUAGES
# ============================================================

LANGUAGES = {

    "english": "eng_Latn",

    "hindi": "hin_Deva"
}

TARGET_LANGUAGE = "sat_Olck"


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


if hasattr(
    torch,
    "set_float32_matmul_precision"
):

    torch.set_float32_matmul_precision(
        "high"
    )


# ============================================================
# HEADER
# ============================================================

print()
print("=" * 70)
print("             SANTALI OFFLINE VOICE TRANSLATOR")
print("=" * 70)

print(
    f"Translation : {TRANSLATION_DEVICE}"
)

print(
    "TTS         : Python DhVaani"
)

print(
    f"TTS steps   : {TTS_STEPS}"
)

print(
    f"TTS speed   : {TTS_SPEED}"
)

print(
    f"Whisper     : {WHISPER_MODEL}"
)

print("=" * 70)


# ============================================================
# CHECK FILES
# ============================================================

required_files = [

    TRANSLATION_MODEL_DIR,

    DHVAANI_DIR,

    REFERENCE_WAV
]


print()
print("Checking local files...")

for path in required_files:

    if not path.exists():

        print()
        print("❌ Missing:")
        print(path)

        sys.exit(1)


print("✅ All local files found.")


# ============================================================
# LOAD WHISPER
# ============================================================

print()
print("=" * 70)
print("[1/3] Loading Whisper...")
print("=" * 70)

start = time.perf_counter()

whisper_model = whisper.load_model(
    WHISPER_MODEL
)

print(
    f"✅ Whisper ready "
    f"({time.perf_counter() - start:.2f}s)"
)


# ============================================================
# LOAD INDIC TRANS2
# ============================================================

print()
print("=" * 70)
print("[2/3] Loading IndicTrans2...")
print("=" * 70)

start = time.perf_counter()

try:

    tokenizer = (
        AutoTokenizer.from_pretrained(

            str(
                TRANSLATION_MODEL_DIR
            ),

            trust_remote_code=True,

            local_files_only=True
        )
    )


    translator = (
        AutoModelForSeq2SeqLM.from_pretrained(

            str(
                TRANSLATION_MODEL_DIR
            ),

            trust_remote_code=True,

            local_files_only=True
        )
    )


    translator = translator.to(
        TRANSLATION_DEVICE
    )


    translator.eval()


except Exception as e:

    print()
    print(
        "❌ IndicTrans2 failed:"
    )

    print(e)

    sys.exit(1)


print(
    f"✅ IndicTrans2 ready "
    f"({time.perf_counter() - start:.2f}s)"
)


# ============================================================
# INDIC PROCESSOR
# ============================================================

try:

    try:

        from IndicTransToolkit import (
            IndicProcessor
        )

    except ImportError:

        from IndicTransTokenizer import (
            IndicProcessor
        )


    indic_processor = (
        IndicProcessor(
            inference=True
        )
    )


except Exception as e:

    print()
    print(
        "❌ IndicProcessor failed:"
    )

    print(e)

    sys.exit(1)


print(
    "✅ IndicProcessor ready"
)


# ============================================================
# LOAD PYTHON DHVAANI
# ============================================================

print()
print("=" * 70)
print("[3/3] Loading Python DhVaani...")
print("=" * 70)

start = time.perf_counter()

try:

    # Local DhVaani only
    sys.path.insert(
        0,
        str(DHVAANI_DIR)
    )


    from dhvaani import DhVaani


    # IMPORTANT:
    # Keep this CPU version because
    # this was your known-good setup.

    tts = DhVaani(

        model_dir=DHVAANI_DIR,

        device="cpu"
    )


except Exception as e:

    print()
    print(
        "❌ DhVaani failed:"
    )

    print(e)

    sys.exit(1)


print(
    f"✅ DhVaani ready "
    f"({time.perf_counter() - start:.2f}s)"
)


# ============================================================
# REFERENCE TEXT
# ============================================================

REFERENCE_TEXT = (
    "नमस्ते। मेरा नाम पुणीत कुमार है। "
    "आज हम एक सरल विषय के बारे में सीखेंगे।"
)


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(text):

    if text is None:

        return ""

    text = str(
        text
    ).strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# ============================================================
# SENTENCE SPLITTER
# ============================================================

def split_text(
    text,
    max_chars=CHUNK_SIZE
):

    text = clean_text(
        text
    )

    if not text:

        return []


    # --------------------------------------------------------
    # First try proper sentence boundaries.
    # --------------------------------------------------------

    sentences = re.split(

        r"(?<=[.!?।॥])\s+",

        text
    )


    chunks = []

    current = ""


    for sentence in sentences:

        sentence = sentence.strip()


        if not sentence:

            continue


        # ----------------------------------------------------
        # Keep complete sentence together.
        # ----------------------------------------------------

        if (
            len(current)
            + len(sentence)
            + 1
            <= max_chars
        ):

            if current:

                current += " "

            current += sentence

        else:

            if current:

                chunks.append(
                    current
                )

            current = sentence


    if current:

        chunks.append(
            current
        )


    # --------------------------------------------------------
    # Safety fallback for extremely long text.
    # --------------------------------------------------------

    final_chunks = []


    for chunk in chunks:

        if len(chunk) <= max_chars:

            final_chunks.append(
                chunk
            )

            continue


        words = chunk.split()

        current = ""


        for word in words:

            if (
                len(current)
                + len(word)
                + 1
                <= max_chars
            ):

                if current:

                    current += " "

                current += word

            else:

                if current:

                    final_chunks.append(
                        current
                    )

                current = word


        if current:

            final_chunks.append(
                current
            )


    return final_chunks


# ============================================================
# TRANSLATE
# ============================================================

def translate_to_santali(
    text,
    source_language
):

    text = clean_text(
        text
    )


    if not text:

        return ""


    src_lang = LANGUAGES.get(
        source_language
    )


    if src_lang is None:

        return ""


    try:

        # ----------------------------------------------------
        # PREPROCESS
        # ----------------------------------------------------

        batch = (
            indic_processor.preprocess_batch(

                [text],

                src_lang=src_lang,

                tgt_lang=TARGET_LANGUAGE
            )
        )


        # ----------------------------------------------------
        # TOKENIZE
        # ----------------------------------------------------

        inputs = tokenizer(

            batch,

            truncation=True,

            padding="longest",

            return_tensors="pt",

            return_attention_mask=True
        )


        inputs = {

            key: value.to(
                TRANSLATION_DEVICE
            )

            for key, value
            in inputs.items()
        }


        # ----------------------------------------------------
        # GENERATE
        # ----------------------------------------------------

        with torch.inference_mode():

            generated_tokens = (
                translator.generate(

                    **inputs,

                    use_cache=True,

                    min_length=0,

                    max_new_tokens=MAX_NEW_TOKENS,

                    num_beams=NUM_BEAMS,

                    num_return_sequences=1,

                    do_sample=False
                )
            )


        # ----------------------------------------------------
        # CPU DECODE
        # ----------------------------------------------------

        generated_tokens = (
            generated_tokens
            .detach()
            .cpu()
        )


        translations = (
            tokenizer.batch_decode(

                generated_tokens,

                skip_special_tokens=True,

                clean_up_tokenization_spaces=True
            )
        )


        translations = (
            indic_processor.postprocess_batch(

                translations,

                lang=TARGET_LANGUAGE
            )
        )


        return clean_text(
            translations[0]
        )


    except Exception as e:

        print()
        print(
            "❌ Translation error:"
        )

        print(e)

        return ""


# ============================================================
# PYTHON DHVAANI TTS
# ============================================================

def generate_tts(
    text,
    output_path
):

    # IMPORTANT:
    # Complete sentence goes directly to DhVaani.

    text = clean_text(
        text
    )


    if not text:

        return False


    print()
    print("=" * 65)
    print("🔊 DHVAANI")
    print("=" * 65)

    print(
        "Full text:"
    )

    print(
        text
    )

    print(
        f"Characters: {len(text)}"
    )

    print(
        f"Steps: {TTS_STEPS}"
    )

    print(
        f"Speed: {TTS_SPEED}"
    )

    print("=" * 65)


    start = time.perf_counter()


    try:

        # ----------------------------------------------------
        # THIS IS THE ORIGINAL PYTHON DHVAANI API
        # ----------------------------------------------------

        result = tts.synthesize(

            text=text,

            prompt_wav=str(
                REFERENCE_WAV
            ),

            prompt_text=REFERENCE_TEXT,

            out_path=str(
                output_path
            ),

            num_step=TTS_STEPS,

            guidance_scale=TTS_GUIDANCE,

            speed=TTS_SPEED
        )


        elapsed = (
            time.perf_counter()
            - start
        )


        # ----------------------------------------------------
        # Verify file
        # ----------------------------------------------------

        if not output_path.exists():

            print()
            print(
                "❌ DhVaani did not create "
                "the output WAV."
            )

            return False


        # ----------------------------------------------------
        # Audio information
        # ----------------------------------------------------

        audio, sr = sf.read(

            str(output_path),

            dtype="float32"
        )


        if audio.ndim > 1:

            audio_mono = np.mean(

                audio,

                axis=1
            )

        else:

            audio_mono = audio


        duration = (
            len(audio_mono)
            / sr
        )


        print()
        print(
            f"✅ Voice generated"
        )

        print(
            f"Audio duration : "
            f"{duration:.2f}s"
        )

        print(
            f"TTS time       : "
            f"{elapsed:.2f}s"
        )


        # ----------------------------------------------------
        # IMPORTANT DEBUG
        # ----------------------------------------------------

        if duration < 0.5:

            print()
            print(
                "⚠️ WARNING:"
            )

            print(
                "Generated audio is very short."
            )

            print(
                "DhVaani may have received "
                "an incomplete text."
            )


        return True


    except TypeError:

        # ----------------------------------------------------
        # Compatibility fallback for older DhVaani builds.
        #
        # Some local versions may not expose every keyword.
        # ----------------------------------------------------

        print()
        print(
            "⚠️ Using compatibility "
            "DhVaani call..."
        )


        try:

            result = tts.synthesize(

                text=text,

                prompt_wav=str(
                    REFERENCE_WAV
                ),

                prompt_text=REFERENCE_TEXT,

                out_path=str(
                    output_path
                )
            )


            elapsed = (
                time.perf_counter()
                - start
            )


            if not output_path.exists():

                print(
                    "❌ Output WAV not created."
                )

                return False


            audio, sr = sf.read(

                str(output_path),

                dtype="float32"
            )


            duration = (
                len(audio)
                / sr
            )


            print(
                f"✅ Voice generated "
                f"({duration:.2f}s)"
            )


            print(
                f"TTS time: "
                f"{elapsed:.2f}s"
            )


            return True


        except Exception as e:

            print()
            print(
                "❌ Compatibility "
                "DhVaani failed:"
            )

            print(e)

            return False


    except Exception as e:

        print()
        print(
            "❌ DhVaani error:"
        )

        print(e)

        return False


# ============================================================
# PLAY AUDIO
# ============================================================

def play_audio(
    path
):

    path = Path(
        path
    )


    if not path.exists():

        return


    try:

        if platform.system() == "Darwin":

            subprocess.run(

                [
                    "afplay",

                    str(path)
                ],

                check=False
            )


        elif platform.system() == "Linux":

            subprocess.run(

                [
                    "aplay",

                    str(path)
                ],

                check=False
            )


        elif platform.system() == "Windows":

            import winsound

            winsound.PlaySound(

                str(path),

                winsound.SND_FILENAME
            )


    except Exception as e:

        print(
            "Playback error:",
            e
        )


# ============================================================
# COMBINE AUDIO
# ============================================================

def combine_audio(
    files,
    final_path
):

    if not files:

        return None


    parts = []

    sample_rate = None


    for file in files:

        try:

            audio, sr = sf.read(

                str(file),

                dtype="float32"
            )


            if audio.ndim > 1:

                audio = np.mean(

                    audio,

                    axis=1
                )


            if sample_rate is None:

                sample_rate = sr


            parts.append(
                audio
            )


        except Exception as e:

            print(
                f"⚠️ Audio error: "
                f"{e}"
            )


    if not parts:

        return None


    final_audio = np.concatenate(
        parts
    )


    sf.write(

        str(final_path),

        final_audio,

        sample_rate,

        subtype="PCM_16"
    )


    return final_path


# ============================================================
# CLEAN OLD PART FILES
# ============================================================

def clean_old_parts():

    for file in OUTPUT_DIR.glob(
        "part_*.wav"
    ):

        try:

            file.unlink()

        except Exception:

            pass


# ============================================================
# RECORD MICROPHONE
# ============================================================

def record_audio():

    print()
    print("=" * 70)
    print("VOICE INPUT")
    print("=" * 70)

    print()
    print(
        "🎤 Speak now..."
    )

    print(
        "   Stop speaking when finished."
    )


    output_path = (
        OUTPUT_DIR
        / "input.wav"
    )


    frames = []

    preroll = []


    preroll_blocks = max(

        1,

        int(

            VAD_PREROLL
            * SAMPLE_RATE
            / VAD_BLOCK
        )
    )


    silence_blocks = max(

        1,

        int(

            VAD_SILENCE
            * SAMPLE_RATE
            / VAD_BLOCK
        )
    )


    max_blocks = max(

        1,

        int(

            VAD_MAX_RECORD
            * SAMPLE_RATE
            / VAD_BLOCK
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

        print()
        print(
            "❌ Microphone error:"
        )

        print(e)

        return None


    with stream:

        # ----------------------------------------------------
        # CALIBRATION
        # ----------------------------------------------------

        print(
            "   Calibrating..."
        )


        noise_values = []


        calibration_blocks = max(

            1,

            int(

                VAD_CALIBRATION
                * SAMPLE_RATE
                / VAD_BLOCK
            )
        )


        for _ in range(
            calibration_blocks
        ):

            block, _ = (
                stream.read(
                    VAD_BLOCK
                )
            )


            rms = float(

                np.sqrt(

                    np.mean(
                        block ** 2
                    )
                )
            )


            noise_values.append(
                rms
            )


        noise_floor = float(

            np.median(
                noise_values
            )
        )


        threshold = max(

            VAD_FLOOR,

            noise_floor * 3.0
        )


        print(
            f"   Threshold: "
            f"{threshold:.4f}"
        )


        speaking = False

        silent_count = 0

        total_blocks = 0


        # ----------------------------------------------------
        # RECORD
        # ----------------------------------------------------

        while (

            total_blocks
            < max_blocks

        ):

            block, _ = (
                stream.read(
                    VAD_BLOCK
                )
            )


            total_blocks += 1


            rms = float(

                np.sqrt(

                    np.mean(
                        block ** 2
                    )
                )
            )


            if not speaking:

                preroll.append(
                    block.copy()
                )


                if (
                    len(preroll)
                    > preroll_blocks
                ):

                    preroll.pop(0)


                if rms > threshold:

                    speaking = True


                    frames.extend(
                        preroll
                    )


                    frames.append(
                        block.copy()
                    )


                    silent_count = 0


                    print(
                        "   🎙️ Speech detected."
                    )


            else:

                frames.append(
                    block.copy()
                )


                if rms < threshold:

                    silent_count += 1

                else:

                    silent_count = 0


                if (
                    silent_count
                    >= silence_blocks
                ):

                    break


    if not frames:

        print(
            "❌ No speech detected."
        )

        return None


    audio = np.concatenate(

        frames,

        axis=0
    )


    sf.write(

        str(output_path),

        audio,

        SAMPLE_RATE,

        subtype="PCM_16"
    )


    duration = (
        len(audio)
        / SAMPLE_RATE
    )


    print(
        f"   🎤 Captured: "
        f"{duration:.2f}s"
    )


    return output_path


# ============================================================
# WHISPER
# ============================================================

def transcribe_audio(
    path,
    language
):

    print()
    print(
        "🔄 Whisper recognizing..."
    )


    start = time.perf_counter()


    whisper_language = (

        "en"

        if language == "english"

        else "hi"
    )


    result = (
        whisper_model.transcribe(

            str(path),

            fp16=False,

            language=whisper_language,

            temperature=0,

            condition_on_previous_text=False,

            beam_size=1,

            best_of=1,

            without_timestamps=True
        )
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


    print(
        f"   Whisper time: "
        f"{elapsed:.2f}s"
    )


    print()
    print(
        "👨‍🏫 Recognized:"
    )

    print(
        text
    )


    return text


# ============================================================
# COMPLETE PIPELINE
# ============================================================

def santali_voice_pipeline(
    text,
    source_language
):

    text = clean_text(
        text
    )


    if not text:

        return


    chunks = split_text(
        text
    )


    print()
    print("=" * 70)
    print("SANTALI VOICE PIPELINE")
    print("=" * 70)


    print(
        f"Input chunks : "
        f"{len(chunks)}"
    )


    clean_old_parts()


    pipeline_start = (
        time.perf_counter()
    )


    audio_files = []


    first_voice_time = None


    # ========================================================
    # EACH SENTENCE
    # ========================================================

    for index, chunk in enumerate(
        chunks
    ):

        print()
        print("=" * 70)

        print(
            f"PART "
            f"{index + 1}/"
            f"{len(chunks)}"
        )

        print("=" * 70)


        print()
        print(
            "👨‍🏫 Input:"
        )

        print(
            chunk
        )


        # ====================================================
        # TRANSLATION
        # ====================================================

        translation_start = (
            time.perf_counter()
        )


        santali = (
            translate_to_santali(

                chunk,

                source_language
            )
        )


        translation_time = (
            time.perf_counter()
            - translation_start
        )


        if not santali:

            print(
                "⚠️ Empty translation."
            )

            continue


        print()
        print(
            "🟢 FULL SANTALI:"
        )

        print(
            santali
        )


        print(
            f"Translation: "
            f"{translation_time:.2f}s"
        )


        # ====================================================
        # TTS
        # ====================================================

        output_file = (

            OUTPUT_DIR
            / f"part_{index + 1}.wav"

        )


        success = generate_tts(

            santali,

            output_file
        )


        if not success:

            continue


        audio_files.append(
            output_file
        )


        # ====================================================
        # FIRST VOICE
        # ====================================================

        if first_voice_time is None:

            first_voice_time = (

                time.perf_counter()
                - pipeline_start
            )


            print()
            print(
                "🚀 FIRST VOICE: "
                f"{first_voice_time:.2f}s"
            )


        # ====================================================
        # PLAY
        # ====================================================

        print()
        print(
            "▶️ Playing..."
        )


        play_audio(
            output_file
        )


    # ========================================================
    # COMBINE
    # ========================================================

    final_file = None


    if audio_files:

        timestamp = (

            datetime.now()
            .strftime(
                "%Y%m%d_%H%M%S"
            )
        )


        final_file = (

            OUTPUT_DIR
            / f"santali_{timestamp}.wav"

        )


        combine_audio(

            audio_files,

            final_file
        )


    # ========================================================
    # TIMING
    # ========================================================

    total_time = (

        time.perf_counter()
        - pipeline_start
    )


    print()
    print("=" * 70)
    print("PIPELINE COMPLETE")
    print("=" * 70)


    if first_voice_time:

        print(
            f"🚀 First voice : "
            f"{first_voice_time:.2f}s"
        )


    print(
        f"⏱️ Total       : "
        f"{total_time:.2f}s"
    )


    if final_file:

        print()
        print(
            "💾 Final audio:"
        )

        print(
            final_file
        )


# ============================================================
# VOICE MODE
# ============================================================

def voice_lesson(
    language
):

    path = record_audio()


    if path is None:

        return


    text = transcribe_audio(

        path,

        language
    )


    if not text:

        print(
            "❌ Nothing recognized."
        )

        return


    santali_voice_pipeline(

        text,

        language
    )


# ============================================================
# TEXT MODE
# ============================================================

def text_lesson(
    language
):

    print()
    print("=" * 70)
    print("TEXT INPUT")
    print("=" * 70)


    if language == "english":

        print(
            "Enter English:"
        )

    else:

        print(
            "Enter Hindi:"
        )


    text = input(
        "\n> "
    ).strip()


    if not text:

        return


    santali_voice_pipeline(

        text,

        language
    )


# ============================================================
# TEACHER MODE
# ============================================================

def teacher_mode(
    language
):

    while True:

        print()
        print("=" * 70)
        print("TEACHER MODE")
        print("=" * 70)


        if language == "english":

            print(
                "[1] 🎤 Speak English"
            )

            print(
                "[2] ⌨️ Type English"
            )

        else:

            print(
                "[1] 🎤 Speak Hindi"
            )

            print(
                "[2] ⌨️ Type Hindi"
            )


        print(
            "[B] Back"
        )


        choice = input(
            "\nChoose: "
        ).strip().lower()


        if choice == "1":

            voice_lesson(
                language
            )


        elif choice == "2":

            text_lesson(
                language
            )


        elif choice == "b":

            break


# ============================================================
# MAIN
# ============================================================

def main():

    while True:

        print()
        print("=" * 70)
        print("TEACHER CONTROL PANEL")
        print("=" * 70)


        print(
            "[1] 🇬🇧 English → Santali"
        )

        print(
            "[2] 🇮🇳 Hindi → Santali"
        )

        print(
            "[Q] Quit"
        )


        choice = input(
            "\nChoose: "
        ).strip().lower()


        if choice == "1":

            teacher_mode(
                "english"
            )


        elif choice == "2":

            teacher_mode(
                "hindi"
            )


        elif choice == "q":

            print()
            print(
                "👋 Exiting..."
            )

            break


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print()
        print(
            "👋 Stopped safely."
        )

    except Exception as e:

        print()
        print(
            "❌ Fatal error:"
        )

        print(e)