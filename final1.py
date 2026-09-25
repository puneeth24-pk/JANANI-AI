#!/usr/bin/env python3

# ============================================================
# SANTALI VOICE TRANSLATOR
#
# English / Hindi
#       ↓
# Whisper Base
#       ↓
# IndicTrans2 MPS
#       ↓
# Santali / Ol Chiki
#       ↓
# DhVaani INT8 ONNX
#       ↓
# Mac Speaker
#
# LOCAL / OFFLINE
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

# ------------------------------------------------------------
# IndicTrans2
# ------------------------------------------------------------

TRANSLATION_MODEL_DIR = (
    BASE_DIR
    / "models"
    / "indictrans2"
)

# ------------------------------------------------------------
# DhVaani ONNX
# ------------------------------------------------------------

DHVAANI_ONNX_DIR = (
    BASE_DIR
    / "DhVaani-ONNX"
)

DHVAANI_ONNX_SCRIPT = (
    DHVAANI_ONNX_DIR
    / "dhvaani_torchfree.py"
)

# ------------------------------------------------------------
# Reference voice
# ------------------------------------------------------------

REFERENCE_WAV = (
    BASE_DIR
    / "DhVaani-0.5"
    / "samples"
    / "hindi.wav"
)

# ------------------------------------------------------------
# Output
# ------------------------------------------------------------

OUTPUT_DIR = (
    BASE_DIR
    / "outputs"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# WHISPER
# ============================================================

WHISPER_MODEL = "base"


# ============================================================
# INDIC TRANS2
# ============================================================

NUM_BEAMS = 1

MAX_NEW_TOKENS = 128


# ============================================================
# DHVAANI ONNX
# ============================================================

# 4 = current clear-quality setting
#
# 2 = faster but noisy
# 4 = current recommended
# 6/8 = better quality but slower
#
TTS_STEPS = 4


# ============================================================
# TEXT
# ============================================================

CHUNK_SIZE = 45


# ============================================================
# CPU
# ============================================================

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
# TRANSLATION DEVICE
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
print("             SANTALI VOICE TRANSLATOR")
print("=" * 70)

print(
    f"Translation : {TRANSLATION_DEVICE}"
)

print(
    "TTS         : DhVaani INT8 ONNX"
)

print(
    f"TTS steps   : {TTS_STEPS}"
)

print(
    f"Whisper     : {WHISPER_MODEL}"
)

print("=" * 70)


# ============================================================
# CHECK FILES
# ============================================================

required_paths = [

    TRANSLATION_MODEL_DIR,

    DHVAANI_ONNX_DIR,

    DHVAANI_ONNX_SCRIPT,

    REFERENCE_WAV
]


print()
print("Checking local files...")


for path in required_paths:

    if not path.exists():

        print()
        print("❌ Missing:")
        print(path)

        sys.exit(1)


print("✅ All required files found.")


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
# DHVAANI CHECK
# ============================================================

print()
print("=" * 70)
print("[3/3] Checking DhVaani ONNX...")
print("=" * 70)


print(
    f"ONNX directory:"
)

print(
    DHVAANI_ONNX_DIR
)


print(
    "✅ DhVaani ONNX ready"
)


print()
print("=" * 70)
print("SYSTEM READY")
print("=" * 70)

print()
print(
    "🎤 Whisper        : READY"
)

print(
    "🌐 IndicTrans2    : READY"
)

print(
    "🔊 DhVaani ONNX   : READY"
)

print(
    "🔈 Mac Speaker    : READY"
)

print()
print(
    "🚀 Offline translator ready."
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
# SPLIT TEXT
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


        if (
            len(current)
            + len(sentence)
            + 1
            <= max_chars
        ):

            if current:

                current += " "

            current += sentence

            continue


        if current:

            chunks.append(
                current
            )

            current = ""


        if len(sentence) > max_chars:

            words = sentence.split()

            temp = ""


            for word in words:

                if (
                    len(temp)
                    + len(word)
                    + 1
                    <= max_chars
                ):

                    if temp:

                        temp += " "

                    temp += word

                else:

                    if temp:

                        chunks.append(
                            temp
                        )

                    temp = word


            current = temp

        else:

            current = sentence


    if current:

        chunks.append(
            current
        )


    return chunks


# ============================================================
# INDIC TRANS2 TRANSLATION
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


    tgt_lang = TARGET_LANGUAGE


    try:

        # ----------------------------------------------------
        # Preprocess
        # ----------------------------------------------------

        batch = (
            indic_processor.preprocess_batch(

                [text],

                src_lang=src_lang,

                tgt_lang=tgt_lang
            )
        )


        # ----------------------------------------------------
        # Tokenize
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
        # Generate
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
        # Decode
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

                lang=tgt_lang
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
# DHVAANI ONNX TTS
# ============================================================

def generate_tts(
    text,
    output_path
):

    text = clean_text(
        text
    )


    if not text:

        return False


    print()
    print(
        "🔊 DhVaani ONNX generating..."
    )


    start = time.perf_counter()


    command = [

        sys.executable,

        str(
            DHVAANI_ONNX_SCRIPT
        ),

        "--prompt-wav",

        str(
            REFERENCE_WAV
        ),

        "--prompt-text",

        REFERENCE_TEXT,

        "--text",

        text,

        "--onnx-dir",

        str(
            DHVAANI_ONNX_DIR
        ),

        "--num-step",

        str(
            TTS_STEPS
        ),

        "--out",

        str(
            output_path
        )
    ]


    try:

        # ----------------------------------------------------
        # Run DhVaani ONNX
        #
        # stdout/stderr are kept so DhVaani errors are visible.
        # ----------------------------------------------------

        result = subprocess.run(

            command,

            cwd=str(
                DHVAANI_ONNX_DIR
            ),

            check=False
        )


        elapsed = (
            time.perf_counter()
            - start
        )


        if result.returncode != 0:

            print()
            print(
                "❌ DhVaani ONNX failed."
            )

            return False


        if not output_path.exists():

            print()
            print(
                "❌ DhVaani did not create WAV."
            )

            return False


        print()
        print(
            f"✅ Voice ready "
            f"({elapsed:.2f}s)"
        )


        return True


    except Exception as e:

        print()
        print(
            "❌ DhVaani ONNX error:"
        )

        print(e)

        return False


# ============================================================
# PLAY AUDIO
# ============================================================

def play_audio(
    path
):

    if not Path(
        path
    ).exists():

        return


    system = platform.system()


    try:

        if system == "Darwin":

            subprocess.run(

                [
                    "afplay",

                    str(path)
                ],

                check=False
            )


        elif system == "Linux":

            subprocess.run(

                [
                    "aplay",

                    str(path)
                ],

                check=False
            )


        elif system == "Windows":

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
                f"⚠️ Audio read error: "
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
# DELETE OLD PARTS
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
# VAD MICROPHONE
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


    min_speech_blocks = max(

        1,

        int(

            VAD_MIN_SPEECH
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
        # Calibration
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


        noise_floor = (

            float(
                np.median(
                    noise_values
                )
            )

            if noise_values

            else 0.0
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
        # Recording loop
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

                    and

                    len(frames)
                    >= min_speech_blocks

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
        "🔄 Whisper..."
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
        f"   Whisper: "
        f"{elapsed:.2f}s"
    )


    print()
    print(
        "👨‍🏫 Teacher:"
    )

    print(
        text
    )


    return text


# ============================================================
# SANTALI PIPELINE
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
        f"Chunks      : {len(chunks)}"
    )

    print(
        f"Translation : {TRANSLATION_DEVICE}"
    )

    print(
        "TTS         : DhVaani INT8 ONNX"
    )

    print(
        f"TTS steps   : {TTS_STEPS}"
    )


    clean_old_parts()


    pipeline_start = (
        time.perf_counter()
    )


    audio_files = []

    first_voice_time = None


    # ========================================================
    # CHUNKS
    # ========================================================

    for index, chunk in enumerate(
        chunks
    ):

        print()
        print("-" * 70)

        print(
            f"PART "
            f"{index + 1}/"
            f"{len(chunks)}"
        )


        print()
        print(
            "👨‍🏫 Input:"
        )

        print(
            chunk
        )


        # ====================================================
        # TRANSLATE
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
            "🟢 Santali:"
        )

        print(
            santali
        )

        print(
            f"   Translation: "
            f"{translation_time:.2f}s"
        )


        # ====================================================
        # TTS
        # ====================================================

        output_file = (
            OUTPUT_DIR
            / f"part_{index + 1}.wav"
        )


        tts_success = generate_tts(

            santali,

            output_file
        )


        if not tts_success:

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
        # PLAY IMMEDIATELY
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
            datetime.now().strftime(
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
            "❌ No speech recognized."
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


    print()
    print(
        "👨‍🏫 Teacher:"
    )

    print(
        text
    )


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
# RUN
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