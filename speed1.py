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

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

warnings.filterwarnings("ignore")


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path("/Users/puneeth/Downloads/SANTALI")

# ------------------------------------------------------------
# LOCAL MODELS
# ------------------------------------------------------------

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
# SPEED SETTINGS
# ============================================================

WHISPER_MODEL = "base"

# Faster than beam search
NUM_BEAMS = 1

# Keep this reasonably high for sentences
MAX_NEW_TOKENS = 128

# Very low latency TTS
TTS_STEPS = 2
TTS_GUIDANCE = 1.0
TTS_SPEED = 1.12

# Smaller = faster first voice
CHUNK_SIZE = 45

CPU_THREADS = max(
    4,
    min(8, os.cpu_count() or 4)
)


# ============================================================
# LANGUAGE CODES
# ============================================================

LANGUAGES = {
    "english": "eng_Latn",
    "hindi": "hin_Deva",
}

TARGET_LANGUAGE = "sat_Olck"


# ============================================================
# DEVICE
# ============================================================

if torch.backends.mps.is_available():

    TRANSLATION_DEVICE = "mps"

else:

    TRANSLATION_DEVICE = "cpu"


TTS_DEVICE = "cpu"

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

print("=" * 70)
print(
    "        SANTALI MOTHER-TONGUE TEACHING ASSISTANT"
)
print("=" * 70)

print(
    "⚡ EXTREME LOW-LATENCY STREAMING MODE"
)

print()

print("=" * 70)
print("SYSTEM")
print("=" * 70)

print(
    f"Python       : {platform.python_version()}"
)

print(
    f"PyTorch      : {torch.__version__}"
)

print(
    f"Translation  : {TRANSLATION_DEVICE}"
)

print(
    f"TTS          : {TTS_DEVICE}"
)

print(
    f"Whisper      : {WHISPER_MODEL}"
)

print(
    f"TTS steps    : {TTS_STEPS}"
)

print(
    f"TTS speed    : {TTS_SPEED}"
)

print(
    f"Chunk size   : {CHUNK_SIZE}"
)

print(
    f"CPU threads  : {CPU_THREADS}"
)


# ============================================================
# LOAD WHISPER
# ============================================================

print()
print("=" * 70)
print("LOADING WHISPER")
print("=" * 70)

t0 = time.perf_counter()

whisper_model = whisper.load_model(
    WHISPER_MODEL
)

print(
    f"✅ Whisper ready "
    f"({time.perf_counter() - t0:.2f}s)"
)


# ============================================================
# LOAD INDIC TRANS2
# ============================================================

print()
print("=" * 70)
print("LOADING LOCAL INDIC TRANS2")
print("=" * 70)

print(
    f"Path: {TRANSLATION_MODEL_DIR}"
)

try:

    t0 = time.perf_counter()

    tokenizer = (
        AutoTokenizer.from_pretrained(
            str(TRANSLATION_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True
        )
    )

    translator = (
        AutoModelForSeq2SeqLM.from_pretrained(
            str(TRANSLATION_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True
        )
    )

    translator = translator.to(
        TRANSLATION_DEVICE
    )

    translator.eval()

    print(
        "✅ IndicTrans2 LOCAL ready"
    )

    print(
        f"Load time: "
        f"{time.perf_counter() - t0:.2f}s"
    )

except Exception as e:

    print()
    print(
        "❌ IndicTrans2 loading failed."
    )

    print(e)

    sys.exit(1)


# ============================================================
# LOAD INDIC PROCESSOR
# ============================================================
#
# IndicTrans2 requires IndicProcessor preprocessing.
#
# It creates the proper language-tagged input for the
# tokenizer/model.
#
# ============================================================

print()
print("=" * 70)
print("LOADING INDIC PROCESSOR")
print("=" * 70)

try:

    from IndicTransTokenizer import (
        IndicProcessor
    )

    indic_processor = IndicProcessor(
        inference=True
    )

    print(
        "✅ IndicProcessor ready"
    )

except Exception as e:

    print(
        "❌ IndicProcessor not available."
    )

    print(
        "Install with:"
    )

    print(
        "pip install IndicTransTokenizer"
    )

    print()
    print(e)

    sys.exit(1)


# ============================================================
# LOAD DHVAANI
# ============================================================

print()
print("=" * 70)
print("LOADING DHVAANI")
print("=" * 70)

sys.path.insert(
    0,
    str(DHVAANI_DIR)
)

try:

    from dhvaani import DhVaani

    print(
        "✅ DhVaani Python module imported"
    )

except Exception as e:

    print(
        "❌ Could not import DhVaani"
    )

    print(e)

    sys.exit(1)


try:

    t0 = time.perf_counter()

    tts = DhVaani(
        model_dir=DHVAANI_DIR,
        device=TTS_DEVICE
    )

    print(
        "✅ DhVaani LOCAL ready"
    )

    print(
        f"Load time: "
        f"{time.perf_counter() - t0:.2f}s"
    )

except Exception as e:

    print(
        "❌ DhVaani loading failed"
    )

    print(e)

    sys.exit(1)


# ============================================================
# REFERENCE TEXT
# ============================================================

def get_reference_text():

    return (
        "नमस्ते। मेरा नाम पुणीत कुमार है। "
        "आज हम एक सरल विषय के बारे में सीखेंगे।"
    )


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(text):

    if text is None:

        return ""

    text = str(text)

    text = text.strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# ============================================================
# SMART CHUNKING
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
    # First split sentences.
    # Supports English + Hindi punctuation.
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
        # Sentence fits current chunk
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

            continue

        # ----------------------------------------------------
        # Save current chunk
        # ----------------------------------------------------

        if current:

            chunks.append(
                current
            )

            current = ""

        # ----------------------------------------------------
        # Long sentence
        # ----------------------------------------------------

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
# TRANSLATION
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

    if not src_lang:

        raise ValueError(
            f"Unsupported source language: "
            f"{source_language}"
        )

    tgt_lang = TARGET_LANGUAGE

    try:

        # ----------------------------------------------------
        # CRITICAL FIX
        #
        # Do NOT pass src_lang/tgt_lang directly into the
        # custom tokenizer.
        #
        # IndicTrans2 requires IndicProcessor to preprocess
        # the sentence first.
        # ----------------------------------------------------

        batch = (
            indic_processor.preprocess_batch(
                [text],
                src_lang=src_lang,
                tgt_lang=tgt_lang
            )
        )

        # ----------------------------------------------------
        # Tokenize preprocessed sentence
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
            for key, value in inputs.items()
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

                    max_length=256,

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
            .tolist()
        )

        with tokenizer.as_target_tokenizer():

            translations = (
                tokenizer.batch_decode(
                    generated_tokens,
                    skip_special_tokens=True,
                    clean_up_tokenization_spaces=True
                )
            )

        # ----------------------------------------------------
        # IndicTrans2 post-processing
        # ----------------------------------------------------

        translations = (
            indic_processor.postprocess_batch(
                translations,
                lang=tgt_lang
            )
        )

        result = clean_text(
            translations[0]
        )

        # ----------------------------------------------------
        # Release tensors
        # ----------------------------------------------------

        del inputs
        del generated_tokens

        return result

    except Exception as e:

        print()
        print(
            "❌ TRANSLATION ERROR:"
        )

        print(e)

        return ""


# ============================================================
# TTS
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

    try:

        start = time.perf_counter()

        with torch.inference_mode():

            tts.synthesize(

                text=text,

                prompt_wav=str(
                    REFERENCE_WAV
                ),

                prompt_text=get_reference_text(),

                out_path=str(
                    output_path
                ),

                num_step=TTS_STEPS,

                guidance_scale=TTS_GUIDANCE,

                speed=TTS_SPEED,

                seed=666
            )

        elapsed = (
            time.perf_counter()
            - start
        )

        print(
            f"   🔊 TTS: "
            f"{elapsed:.2f}s"
        )

        return True

    except Exception as e:

        print()
        print(
            "❌ TTS ERROR:"
        )

        print(e)

        return False


# ============================================================
# PLAY AUDIO
# ============================================================

def play_audio(
    path
):

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

    arrays = []

    sample_rate = None

    for file in files:

        try:

            audio, sr = sf.read(
                file,
                dtype="float32"
            )

            if sample_rate is None:

                sample_rate = sr

            arrays.append(
                audio
            )

        except Exception as e:

            print(
                f"Could not read {file}: {e}"
            )

    if not arrays:

        return None

    final_audio = np.concatenate(
        arrays
    )

    sf.write(
        final_path,
        final_audio,
        sample_rate
    )

    return final_path


# ============================================================
# VOICE PIPELINE
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
        text,
        CHUNK_SIZE
    )

    print()
    print("=" * 70)
    print(
        "EXTREME LOW-LATENCY SANTALI VOICE"
    )
    print("=" * 70)

    print(
        f"Input chunks : "
        f"{len(chunks)}"
    )

    print()

    print(
        "⚡ Translation → TTS → Playback"
    )

    print(
        "⚡ Local IndicTrans2"
    )

    print(
        "⚡ CPU DhVaani"
    )

    print(
        "⚡ 2-step TTS"
    )

    print(
        "⚡ Beam search OFF"
    )

    print(
        "⚡ Immediate playback"
    )

    print()

    audio_files = []

    pipeline_start = (
        time.perf_counter()
    )

    first_voice_time = None

    for index, chunk in enumerate(
        chunks
    ):

        print(
            "─" * 70
        )

        print(
            f"PART "
            f"{index + 1}/"
            f"{len(chunks)}"
        )

        print()

        print(
            "👨‍🏫 Teacher:"
        )

        print(
            chunk
        )

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

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
                "⚠️ Translation "
                "returned empty text."
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

        # ----------------------------------------------------
        # TTS
        # ----------------------------------------------------

        output_file = (
            OUTPUT_DIR
            / f"part_{index + 1}.wav"
        )

        print()

        print(
            "🔊 Generating voice..."
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

        # ----------------------------------------------------
        # FIRST VOICE
        # ----------------------------------------------------

        if first_voice_time is None:

            first_voice_time = (
                time.perf_counter()
                - pipeline_start
            )

            print()

            print(
                "🚀 FIRST SANTALI VOICE: "
                f"{first_voice_time:.2f}s"
            )

        # ----------------------------------------------------
        # PLAY IMMEDIATELY
        # ----------------------------------------------------

        print(
            f"▶️ Playing "
            f"{index + 1}/"
            f"{len(chunks)}"
        )

        play_audio(
            output_file
        )

    # ========================================================
    # COMBINE
    # ========================================================

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

    total_time = (
        time.perf_counter()
        - pipeline_start
    )

    print()
    print("=" * 70)
    print(
        "VOICE PIPELINE COMPLETE"
    )
    print("=" * 70)

    if first_voice_time is not None:

        print(
            f"🚀 First voice : "
            f"{first_voice_time:.2f}s"
        )

    print(
        f"⏱️ Total       : "
        f"{total_time:.2f}s"
    )

    print()

    print(
        "TTS configuration:"
    )

    print(
        f"Steps    : "
        f"{TTS_STEPS}"
    )

    print(
        f"Guidance : "
        f"{TTS_GUIDANCE}"
    )

    print(
        f"Speed    : "
        f"{TTS_SPEED}"
    )


# ============================================================
# RECORD MICROPHONE
# ============================================================

def record_audio():

    print()
    print("=" * 70)
    print(
        "VOICE INPUT"
    )
    print("=" * 70)

    print()
    print(
        "🎤 Speak now..."
    )

    duration = 8

    sample_rate = 16000

    recording = sd.rec(
        int(
            duration
            * sample_rate
        ),
        samplerate=sample_rate,
        channels=1,
        dtype="float32"
    )

    sd.wait()

    path = (
        OUTPUT_DIR
        / "input.wav"
    )

    sf.write(
        path,
        recording,
        sample_rate
    )

    return path


# ============================================================
# WHISPER TRANSCRIPTION
# ============================================================

def transcribe_audio(
    path,
    language
):

    print()
    print(
        "🔄 Transcribing..."
    )

    start = (
        time.perf_counter()
    )

    # --------------------------------------------------------
    # Give Whisper an explicit language.
    #
    # This prevents wrong-language hallucinations when teacher
    # selects English or Hindi.
    # --------------------------------------------------------

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
        result["text"]
    )

    print(
        f"Whisper time: "
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
# TEXT LESSON
# ============================================================

def text_lesson(
    language
):

    print()
    print("=" * 70)
    print(
        "TEXT LESSON"
    )
    print("=" * 70)

    if language == "hindi":

        print(
            "⌨️ हिंदी में पाठ लिखें।"
        )

    else:

        print(
            "⌨️ Enter English lesson."
        )

    print()

    text = input(
        "> "
    )

    if not text.strip():

        return

    print()
    print("=" * 70)
    print(
        "TEACHER LESSON"
    )
    print("=" * 70)

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
# VOICE LESSON
# ============================================================

def voice_lesson(
    language
):

    path = record_audio()

    text = transcribe_audio(
        path,
        language
    )

    if text:

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
        print(
            "TEACHER MODE"
        )
        print("=" * 70)

        if language == "hindi":

            print(
                "[1] 🎤 हिंदी में बोलें"
            )

            print(
                "[2] ⌨️ हिंदी में लिखें"
            )

        else:

            print(
                "[1] 🎤 Speak English"
            )

            print(
                "[2] ⌨️ Type English"
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

    print()
    print("=" * 70)
    print(
        "SYSTEM READY"
    )
    print("=" * 70)

    print(
        "Whisper     : READY"
    )

    print(
        "IndicTrans2 : READY"
    )

    print(
        "DhVaani     : READY"
    )

    print()

    print(
        "🚀 Ready for teacher."
    )

    while True:

        print()
        print("=" * 70)
        print(
            "TEACHER CONTROL PANEL"
        )
        print("=" * 70)

        print(
            "[1] 🇬🇧 English"
        )

        print(
            "[2] 🇮🇳 Hindi"
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

            break


# ============================================================
# SAFE EXIT
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print()

        print(
            "👋 Application stopped safely."
        )

    except Exception as e:

        print()

        print(
            "❌ Application error:"
        )

        print(e)