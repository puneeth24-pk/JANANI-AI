import os
import sys
import re
import subprocess
import platform
import time
from pathlib import Path
from datetime import datetime

import numpy as np
import torch
import whisper
import sounddevice as sd
import soundfile as sf

from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

try:
    from IndicTransToolkit import IndicProcessor
except ImportError:
    IndicProcessor = None


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DHVAANI_DIR = BASE_DIR / "DhVaani-0.5"
REFERENCE_WAV = DHVAANI_DIR / "samples" / "hindi.wav"

OUTPUT_DIR = BASE_DIR / "outputs"
RECORDING_DIR = OUTPUT_DIR / "recordings"

OUTPUT_DIR.mkdir(exist_ok=True)
RECORDING_DIR.mkdir(exist_ok=True)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv(BASE_DIR / ".env")

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

# IMPORTANT:
# Do not allow HuggingFace to retry internet requests.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


# ============================================================
# MODELS
# ============================================================

INDICTRANS_MODEL_ID = (
    "ai4bharat/indictrans2-indic-indic-dist-320M"
)

INDICTRANS_LOCAL_DIR = os.getenv(
    "INDICTRANS_LOCAL_DIR",
    ""
).strip()

WHISPER_MODEL_NAME = os.getenv(
    "WHISPER_MODEL",
    "small"
).strip()


# ============================================================
# PERFORMANCE SETTINGS
# ============================================================

# Whisper CPU is stable on your Mac.
WHISPER_DEVICE = "cpu"

# MPS for translation/TTS when available.
if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"


# ============================================================
# FAST TTS SETTINGS
# ============================================================

# Your old value was 24.
#
# Try:
# 6  = fastest
# 8  = recommended balance
# 12 = better quality
#
# Start with 8.
TTS_STEPS = int(
    os.getenv("TTS_STEPS", "8")
)

TTS_GUIDANCE = float(
    os.getenv("TTS_GUIDANCE", "1.0")
)

TTS_SPEED = float(
    os.getenv("TTS_SPEED", "1.0")
)

TTS_SEED = 666


# ============================================================
# RECORDING
# ============================================================

SAMPLE_RATE = 16000
RECORD_SECONDS = 12


# ============================================================
# LANGUAGE CODES
# ============================================================

LANG_ENGLISH = "eng_Latn"
LANG_HINDI = "hin_Deva"
LANG_SANTALI = "sat_Olck"

WHISPER_ENGLISH = "en"
WHISPER_HINDI = "hi"

SUPPORTED_SOURCE_LANGS = {
    LANG_ENGLISH,
    LANG_HINDI
}


# ============================================================
# GLOBALS
# ============================================================

CURRENT_LESSON_NUMBER = 0


# ============================================================
# UI
# ============================================================

def print_header(title):

    print()
    print("=" * 70)
    print(f"{title:^70}")
    print("=" * 70)


# ============================================================
# SYSTEM CHECK
# ============================================================

def check_environment():

    print_header("SYSTEM CHECK")

    print("Python       :", sys.version.split()[0])
    print("PyTorch      :", torch.__version__)
    print("Device       :", DEVICE)
    print("Whisper      :", WHISPER_MODEL_NAME)
    print("TTS steps    :", TTS_STEPS)
    print("TTS speed    :", TTS_SPEED)
    print("Project      :", BASE_DIR)

    if not DHVAANI_DIR.exists():

        print("\n❌ DhVaani directory not found:")
        print(DHVAANI_DIR)

        sys.exit(1)

    if not (
        DHVAANI_DIR / "model.safetensors"
    ).exists():

        print("\n❌ DhVaani model.safetensors not found.")

        sys.exit(1)

    if not REFERENCE_WAV.exists():

        print("\n❌ DhVaani reference voice not found:")
        print(REFERENCE_WAV)

        sys.exit(1)

    if IndicProcessor is None:

        print("\n❌ IndicTransToolkit is not installed.")

        sys.exit(1)

    print("\n✅ Environment OK")


# ============================================================
# WHISPER
# ============================================================

def load_whisper():

    print("\nLoading Whisper...")

    start = time.perf_counter()

    try:

        model = whisper.load_model(
            WHISPER_MODEL_NAME,
            device=WHISPER_DEVICE
        )

        elapsed = time.perf_counter() - start

        print(
            f"✅ Whisper ready "
            f"({elapsed:.2f}s)"
        )

        return model

    except Exception as e:

        print("\n❌ Whisper failed:")
        print(e)

        sys.exit(1)


# ============================================================
# INDIC TRANS SOURCE
# ============================================================

def resolve_indictrans_source():

    if INDICTRANS_LOCAL_DIR:

        local_path = Path(
            INDICTRANS_LOCAL_DIR
        )

        if local_path.exists():

            print(
                "\nUsing local IndicTrans2:"
            )

            print(local_path)

            return str(local_path)

    return INDICTRANS_MODEL_ID


# ============================================================
# LOAD INDIC TRANS
# ============================================================

def load_indictrans():

    print("\nLoading IndicTrans2...")

    source = resolve_indictrans_source()

    start = time.perf_counter()

    try:

        tokenizer = AutoTokenizer.from_pretrained(
            source,
            trust_remote_code=True,
            local_files_only=True
        )

        model = AutoModelForSeq2SeqLM.from_pretrained(
            source,
            trust_remote_code=True,
            local_files_only=True
        )

    except Exception as e:

        print("\n❌ IndicTrans2 failed.")

        print()
        print(
            "The model must already be downloaded."
        )

        print()
        print(e)

        sys.exit(1)

    model = model.to(DEVICE)
    model.eval()

    processor = IndicProcessor(
        inference=True
    )

    elapsed = time.perf_counter() - start

    print(
        f"✅ IndicTrans2 ready "
        f"({elapsed:.2f}s)"
    )

    return (
        tokenizer,
        model,
        processor
    )


# ============================================================
# LOAD DHVAANI
# ============================================================

def load_dhvaani():

    print("\nLoading DhVaani...")

    sys.path.insert(
        0,
        str(DHVAANI_DIR)
    )

    start = time.perf_counter()

    try:

        from dhvaani import DhVaani

        tts = DhVaani(
            model_dir=DHVAANI_DIR,
            device=DEVICE
        )

        elapsed = time.perf_counter() - start

        print(
            f"✅ DhVaani ready "
            f"({elapsed:.2f}s)"
        )

        return tts

    except Exception as e:

        print("\n❌ DhVaani failed:")
        print(e)

        sys.exit(1)


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):

    if not text:
        return ""

    text = text.replace(
        "\n",
        " "
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def clean_transcription(text):

    text = clean_text(text)

    text = re.sub(
        r"\s+([,.!?;:])",
        r"\1",
        text
    )

    return text


# ============================================================
# OL CHIKI VALIDATION
# ============================================================

def is_valid_olchiki(text):

    if not text:
        return False

    olchiki_chars = len(
        re.findall(
            r"[\u1C50-\u1C7F]",
            text
        )
    )

    total_letters = len(
        re.findall(
            r"\S",
            text
        )
    )

    if total_letters == 0:
        return False

    return (
        olchiki_chars /
        total_letters
    ) >= 0.45


# ============================================================
# FAST CHUNKING
# ============================================================

def split_fast(text):

    text = clean_text(text)

    if not text:
        return []

    # First split naturally.
    sentences = re.split(
        r"(?<=[.!?।॥])\s+",
        text
    )

    result = []

    for sentence in sentences:

        sentence = clean_text(
            sentence
        )

        if not sentence:
            continue

        words = sentence.split()

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # Don't send huge paragraphs to TTS.
        #
        # Short chunks allow the first voice to start much
        # earlier.
        # ----------------------------------------------------

        current = []

        for word in words:

            current.append(word)

            current_text = " ".join(
                current
            )

            # Around 8-14 words per TTS chunk.
            #
            # This is intentionally small.
            if len(current) >= 10:

                result.append(
                    current_text
                )

                current = []

        if current:

            result.append(
                " ".join(current)
            )

    return result


# ============================================================
# RECORD TEACHER
# ============================================================

def record_teacher(language):

    print_header(
        "TEACHER SPEECH"
    )

    if language == LANG_ENGLISH:

        print(
            "🎤 Speak English."
        )

        whisper_language = (
            WHISPER_ENGLISH
        )

    else:

        print(
            "🎤 हिंदी में बोलें।"
        )

        whisper_language = (
            WHISPER_HINDI
        )

    print(
        f"\nMaximum recording: "
        f"{RECORD_SECONDS} seconds"
    )

    try:

        input(
            "\nPress ENTER to record..."
        )

    except KeyboardInterrupt:

        return None

    print(
        "\n🔴 Recording..."
    )

    try:

        audio = sd.rec(
            int(
                RECORD_SECONDS *
                SAMPLE_RATE
            ),
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32"
        )

        sd.wait()

    except KeyboardInterrupt:

        sd.stop()

        return None

    except Exception as e:

        print("\n❌ Microphone error:")
        print(e)

        return None

    audio = np.asarray(
        audio,
        dtype=np.float32
    ).reshape(-1)

    peak = float(
        np.max(
            np.abs(audio)
        )
    )

    rms = float(
        np.sqrt(
            np.mean(
                audio ** 2
            )
        )
    )

    print(
        f"\nAudio peak : {peak:.4f}"
    )

    print(
        f"Audio RMS  : {rms:.4f}"
    )

    if peak < 0.005 or rms < 0.001:

        print(
            "\n❌ Recording too quiet."
        )

        return None

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    path = (
        RECORDING_DIR /
        f"teacher_{timestamp}.wav"
    )

    sf.write(
        str(path),
        audio,
        SAMPLE_RATE,
        subtype="PCM_16"
    )

    print(
        "\n✅ Recording saved:"
    )

    print(path)

    return (
        str(path),
        whisper_language
    )


# ============================================================
# TRANSCRIBE
# ============================================================

def transcribe_audio(
    whisper_model,
    audio_path,
    whisper_language
):

    print("\n🔄 Transcribing...")

    start = time.perf_counter()

    try:

        result = whisper_model.transcribe(

            audio_path,

            language=whisper_language,

            task="transcribe",

            temperature=0,

            condition_on_previous_text=False,

            no_speech_threshold=0.3,

            compression_ratio_threshold=2.4,

            logprob_threshold=-1.0,

            fp16=False,

            verbose=False
        )

        text = clean_transcription(
            result.get(
                "text",
                ""
            )
        )

        elapsed = (
            time.perf_counter()
            - start
        )

        print(
            f"Whisper time: "
            f"{elapsed:.2f}s"
        )

        if not text:

            print(
                "❌ No speech detected."
            )

            return None

        print(
            "\n👨‍🏫 Teacher:"
        )

        print(text)

        return text

    except Exception as e:

        print(
            "\n❌ Transcription failed:"
        )

        print(e)

        return None


# ============================================================
# TRANSLATE ONE CHUNK
# ============================================================

def translate_sentence(
    sentence,
    source_language,
    tokenizer,
    model,
    processor
):

    sentence = clean_text(
        sentence
    )

    if not sentence:
        return ""

    batch = processor.preprocess_batch(
        [sentence],
        src_lang=source_language,
        tgt_lang=LANG_SANTALI
    )

    inputs = tokenizer(
        batch,
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors="pt"
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    with torch.inference_mode():

        generated_tokens = model.generate(

            **inputs,

            # FASTEST MODE
            num_beams=1,

            num_return_sequences=1,

            max_new_tokens=128,

            do_sample=False,

            use_cache=True
        )

    decoded = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True
    )

    result = processor.postprocess_batch(
        decoded,
        lang=LANG_SANTALI
    )

    if not result:
        return ""

    return clean_text(
        result[0]
    )


# ============================================================
# TRANSLATE ALL CHUNKS
# ============================================================

def translate_chunks(
    chunks,
    source_language,
    tokenizer,
    model,
    processor
):

    translated = []

    for index, chunk in enumerate(
        chunks,
        start=1
    ):

        print(
            f"\n⚡ Translating "
            f"{index}/{len(chunks)}..."
        )

        start = time.perf_counter()

        result = translate_sentence(
            chunk,
            source_language,
            tokenizer,
            model,
            processor
        )

        elapsed = (
            time.perf_counter()
            - start
        )

        print(
            f"Translation time: "
            f"{elapsed:.2f}s"
        )

        if not result:

            raise RuntimeError(
                f"Empty translation "
                f"for chunk {index}"
            )

        print(
            "📚",
            result
        )

        translated.append(
            result
        )

    return translated


# ============================================================
# REFERENCE TEXT
# ============================================================

def get_reference_text():

    return (
        "इसे कईबार मनचित भी की आगया है"
    )


# ============================================================
# NORMALIZE AUDIO
# ============================================================

def normalize_audio(audio):

    audio = np.asarray(
        audio,
        dtype=np.float32
    )

    if audio.size == 0:
        return audio

    peak = np.max(
        np.abs(audio)
    )

    if peak > 0.98:

        audio = (
            audio /
            peak *
            0.98
        )

    return audio


# ============================================================
# GENERATE ONE TTS CHUNK
# ============================================================

def generate_tts_chunk(
    tts,
    santali_text,
    output_path
):

    start = time.perf_counter()

    tts.synthesize(

        text=santali_text,

        prompt_wav=str(
            REFERENCE_WAV
        ),

        prompt_text=get_reference_text(),

        out_path=str(
            output_path
        ),

        # MAIN SPEED CONTROL
        num_step=TTS_STEPS,

        guidance_scale=TTS_GUIDANCE,

        speed=TTS_SPEED,

        seed=TTS_SEED
    )

    elapsed = (
        time.perf_counter()
        - start
    )

    return elapsed


# ============================================================
# PLAY ONE AUDIO
# ============================================================

def play_audio_file(path):

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
# ULTRA FAST VOICE PIPELINE
# ============================================================

def fast_voice_pipeline(
    teacher_text,
    source_language,
    tokenizer,
    translation_model,
    processor,
    tts
):

    print_header(
        "ULTRA LOW-LATENCY SANTALI VOICE"
    )

    # --------------------------------------------------------
    # CHUNK INPUT
    # --------------------------------------------------------

    chunks = split_fast(
        teacher_text
    )

    if not chunks:

        print(
            "❌ No input chunks."
        )

        return

    print(
        f"\nInput chunks: "
        f"{len(chunks)}"
    )

    print(
        "\n⚡ FAST MODE"
    )

    print(
        "Translation → TTS → immediate playback"
    )

    print(
        "TTS steps:",
        TTS_STEPS
    )

    print(
        "MPS operations are serialized."
    )

    first_voice_latency = None

    all_audio = []

    # --------------------------------------------------------
    # PROCESS ONE CHUNK AT A TIME
    # --------------------------------------------------------

    for index, chunk in enumerate(
        chunks,
        start=1
    ):

        print()
        print(
            "━" * 70
        )

        print(
            f"PART {index}/{len(chunks)}"
        )

        print(
            "Teacher:",
            chunk
        )

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

        translation_start = (
            time.perf_counter()
        )

        santali = translate_sentence(
            chunk,
            source_language,
            tokenizer,
            translation_model,
            processor
        )

        translation_time = (
            time.perf_counter()
            - translation_start
        )

        print(
            f"\nTranslation: "
            f"{translation_time:.2f}s"
        )

        if not santali:

            print(
                "❌ Empty translation."
            )

            continue

        print(
            "📚",
            santali
        )

        if not is_valid_olchiki(
            santali
        ):

            print(
                "⚠️ Ol Chiki validation warning."
            )

        # ----------------------------------------------------
        # TTS
        # ----------------------------------------------------

        print(
            "\n🔊 Generating voice..."
        )

        temp_path = (
            OUTPUT_DIR /
            f"_fast_{index}.wav"
        )

        tts_start = (
            time.perf_counter()
        )

        tts_time = generate_tts_chunk(
            tts,
            santali,
            temp_path
        )

        total_first_time = (
            time.perf_counter()
            - translation_start
        )

        print(
            f"TTS time: "
            f"{tts_time:.2f}s"
        )

        # ----------------------------------------------------
        # FIRST VOICE
        # ----------------------------------------------------

        if first_voice_latency is None:

            first_voice_latency = (
                time.perf_counter()
                - pipeline_start
            )

            print()
            print(
                "🚀 FIRST SANTALI VOICE READY:"
                f" {first_voice_latency:.2f}s"
            )

        # ----------------------------------------------------
        # PLAY IMMEDIATELY
        # ----------------------------------------------------

        print(
            f"\n▶️ Playing "
            f"part {index}/{len(chunks)}"
        )

        play_audio_file(
            temp_path
        )

        # ----------------------------------------------------
        # SAVE AUDIO DATA
        # ----------------------------------------------------

        try:

            audio, sr = sf.read(
                str(temp_path),
                dtype="float32"
            )

            if audio.ndim > 1:

                audio = np.mean(
                    audio,
                    axis=1
                )

            all_audio.append(
                (
                    audio,
                    sr
                )
            )

        except Exception:

            pass

    # --------------------------------------------------------
    # COMBINE AUDIO
    # --------------------------------------------------------

    if all_audio:

        try:

            sample_rate = (
                all_audio[0][1]
            )

            pieces = []

            for index, (
                audio,
                sr
            ) in enumerate(
                all_audio
            ):

                pieces.append(
                    normalize_audio(
                        audio
                    )
                )

                if index < len(
                    all_audio
                ) - 1:

                    pieces.append(
                        np.zeros(
                            int(
                                sr * 0.12
                            ),
                            dtype=np.float32
                        )
                    )

            final_audio = np.concatenate(
                pieces
            )

            timestamp = datetime.now().strftime(
                "%Y%m%d_%H%M%S"
            )

            final_path = (
                OUTPUT_DIR /
                f"santali_{timestamp}.wav"
            )

            sf.write(
                str(final_path),
                final_audio,
                sample_rate,
                subtype="PCM_16"
            )

            print()
            print(
                "📁 Final audio:"
            )

            print(final_path)

        except Exception as e:

            print(
                "⚠️ Could not combine audio:"
            )

            print(e)

    # --------------------------------------------------------
    # CLEAN TEMP FILES
    # --------------------------------------------------------

    for index in range(
        1,
        len(chunks) + 1
    ):

        path = (
            OUTPUT_DIR /
            f"_fast_{index}.wav"
        )

        try:

            path.unlink()

        except Exception:

            pass

    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

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

    if first_voice_latency is not None:

        print(
            f"\n🚀 First voice latency: "
            f"{first_voice_latency:.2f}s"
        )

    print(
        f"⏱️ Total pipeline: "
        f"{total_time:.2f}s"
    )

    print(
        "\n⚡ TTS configuration:"
    )

    print(
        f"   Steps    : {TTS_STEPS}"
    )

    print(
        f"   Guidance : {TTS_GUIDANCE}"
    )

    print(
        f"   Speed    : {TTS_SPEED}"
    )


# ============================================================
# TEXT MODE
# ============================================================

def text_mode(
    tokenizer,
    translation_model,
    processor,
    tts,
    language
):

    print_header(
        "TEXT LESSON"
    )

    if language == LANG_HINDI:

        print(
            "⌨️ हिंदी में पाठ लिखें।"
        )

    else:

        print(
            "⌨️ Enter English lesson."
        )

    print(
        "\nType your lesson:"
    )

    try:

        text = input(
            "> "
        ).strip()

    except KeyboardInterrupt:

        return

    if not text:

        print(
            "❌ Empty lesson."
        )

        return

    global pipeline_start

    pipeline_start = (
        time.perf_counter()
    )

    fast_voice_pipeline(
        text,
        language,
        tokenizer,
        translation_model,
        processor,
        tts
    )


# ============================================================
# SPEECH MODE
# ============================================================

def speech_mode(
    whisper_model,
    tokenizer,
    translation_model,
    processor,
    tts,
    language
):

    result = record_teacher(
        language
    )

    if not result:

        return

    audio_path, whisper_language = (
        result
    )

    text = transcribe_audio(
        whisper_model,
        audio_path,
        whisper_language
    )

    if not text:

        return

    global pipeline_start

    pipeline_start = (
        time.perf_counter()
    )

    fast_voice_pipeline(
        text,
        language,
        tokenizer,
        translation_model,
        processor,
        tts
    )


# ============================================================
# LANGUAGE MENU
# ============================================================

def language_menu(
    language,
    whisper_model,
    tokenizer,
    translation_model,
    processor,
    tts
):

    while True:

        print_header(
            "TEACHER MODE"
        )

        if language == LANG_HINDI:

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

            speech_mode(
                whisper_model,
                tokenizer,
                translation_model,
                processor,
                tts,
                language
            )

        elif choice == "2":

            text_mode(
                tokenizer,
                translation_model,
                processor,
                tts,
                language
            )

        elif choice == "b":

            break

        else:

            print(
                "❌ Invalid choice."
            )


# ============================================================
# MAIN
# ============================================================

def main():

    print_header(
        "SANTALI MOTHER-TONGUE TEACHING ASSISTANT"
    )

    print(
        "⚡ ULTRA LOW-LATENCY MODE"
    )

    check_environment()

    # --------------------------------------------------------
    # LOAD ONCE
    # --------------------------------------------------------

    print_header(
        "LOADING AI MODELS"
    )

    whisper_model = load_whisper()

    (
        tokenizer,
        translation_model,
        processor
    ) = load_indictrans()

    tts = load_dhvaani()

    # --------------------------------------------------------
    # READY
    # --------------------------------------------------------

    print_header(
        "SYSTEM READY"
    )

    print(
        "Whisper  :",
        WHISPER_MODEL_NAME
    )

    print(
        "Device   :",
        DEVICE
    )

    print(
        "TTS      :",
        TTS_STEPS,
        "steps"
    )

    print(
        "\n✅ All models loaded locally."
    )

    # --------------------------------------------------------
    # MAIN MENU
    # --------------------------------------------------------

    while True:

        print_header(
            "TEACHER CONTROL PANEL"
        )

        print(
            "[1] 🇬🇧 English"
        )

        print(
            "[2] 🇮🇳 Hindi"
        )

        print(
            "[Q] Quit"
        )

        try:

            choice = input(
                "\nChoose: "
            ).strip().lower()

        except KeyboardInterrupt:

            print(
                "\n👋 Closing."
            )

            break

        if choice == "1":

            language_menu(
                LANG_ENGLISH,
                whisper_model,
                tokenizer,
                translation_model,
                processor,
                tts
            )

        elif choice == "2":

            language_menu(
                LANG_HINDI,
                whisper_model,
                tokenizer,
                translation_model,
                processor,
                tts
            )

        elif choice == "q":

            print(
                "\n👋 Closing Santali Assistant."
            )

            break

        else:

            print(
                "\n❌ Invalid option."
            )


# ============================================================
# ENTRY
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print(
            "\n👋 Application stopped."
        )

    except Exception as e:

        print(
            "\n❌ UNEXPECTED ERROR"
        )

        print(e)