#!/usr/bin/env python3
# ============================================================
#        SANTALI TRANSLATOR — FASTAPI BACKEND
#
#        English / Hindi
#              ↓
#        Whisper STT (voice)
#              ↓
#        IndicTrans2 (MPS / CPU)
#              ↓
#        Santali · Ol Chiki
#              ↓
#        DhVaani TTS
#              ↓
#        WAV Audio
#
#        Run:
#        uvicorn api_final:app --reload --port 8000
#
#        Supported languages:
#        ✅ English
#        ✅ Hindi
#        ❌ Urdu
# ============================================================

import os
import re
import sys
import warnings
from pathlib import Path
from datetime import datetime
from typing import Optional

import numpy as np
import torch
import whisper
import soundfile as sf

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    HTTPException,
)

from fastapi.responses import FileResponse

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
)


# ============================================================
# ENVIRONMENT
# ============================================================

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

UPLOAD_DIR = (
    BASE_DIR
    / "uploads"
)


OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CONFIGURATION
# ============================================================

# ---------------- Whisper ----------------

WHISPER_MODEL = "base"


# ---------------- IndicTrans2 ----------------

TARGET_LANGUAGE = "sat_Olck"

NUM_BEAMS = 1

MAX_NEW_TOKENS = 256


# ---------------- DhVaani ----------------

TTS_STEPS = 6

TTS_SPEED = 0.90

TTS_GUIDANCE = 1.0


REFERENCE_TEXT = (
    "नमस्ते। मेरा नाम पुणीत कुमार है। "
    "आज हम एक सरल विषय के बारे में सीखेंगे।"
)


# ---------------- CPU ----------------

CPU_THREADS = max(
    4,
    min(
        8,
        os.cpu_count() or 4
    )
)


# ============================================================
# LANGUAGE CONFIGURATION
# ============================================================
#
# ONLY:
#
# English
# Hindi
#
# Urdu completely removed.
# ============================================================

WHISPER_TO_INDIC = {

    "en": "eng_Latn",

    "hi": "hin_Deva",
}


LANGUAGE_NAMES = {

    "en": "English",

    "hi": "Hindi",
}


# Allow API users to send either:
#
# "en"
# "english"
# "hi"
# "hindi"

LANGUAGE_ALIASES = {

    "en": "en",

    "english": "en",

    "hi": "hi",

    "hindi": "hi",
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

torch.set_grad_enabled(
    False
)


if hasattr(
    torch,
    "set_float32_matmul_precision"
):

    torch.set_float32_matmul_precision(
        "high"
    )


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text) -> str:

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
# LOCAL FILE CHECK
# ============================================================

def check_local_files():

    required_paths = [

        TRANSLATION_MODEL_DIR,

        DHVAANI_DIR,

        REFERENCE_WAV,
    ]

    for path in required_paths:

        if not path.exists():

            raise FileNotFoundError(
                f"Missing required file/folder: {path}"
            )


# ============================================================
# STARTUP
# ============================================================

print()
print("=" * 70)
print("        SANTALI TRANSLATOR — FASTAPI BACKEND")
print("=" * 70)

print()
print("Checking local files...")

check_local_files()

print("✅ All local files found.")


# ============================================================
# LOAD WHISPER
# ============================================================

print()
print("Loading Whisper...")

whisper_model = whisper.load_model(
    WHISPER_MODEL
)

print(
    f"✅ Whisper ready: {WHISPER_MODEL}"
)


# ============================================================
# LOAD INDIC TRANS2
# ============================================================

print()
print("Loading IndicTrans2...")


tokenizer = AutoTokenizer.from_pretrained(

    str(
        TRANSLATION_MODEL_DIR
    ),

    trust_remote_code=True,

    local_files_only=True,
)


translator = AutoModelForSeq2SeqLM.from_pretrained(

    str(
        TRANSLATION_MODEL_DIR
    ),

    trust_remote_code=True,

    local_files_only=True,
)


translator = translator.to(
    TRANSLATION_DEVICE
)

translator.eval()


# ============================================================
# INDIC PROCESSOR
# ============================================================

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


print(
    "✅ IndicTrans2 ready"
)

print(
    f"   Device: {TRANSLATION_DEVICE}"
)


# ============================================================
# LOAD DHVAANI
# ============================================================

print()
print("Loading DhVaani...")


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


print(
    "✅ DhVaani ready"
)


print()
print("=" * 70)
print("              🚀 SERVER READY")
print("=" * 70)
print()
print("Supported:")
print("  ✅ English")
print("  ✅ Hindi")
print("  ❌ Urdu")
print()
print(
    f"Target: Santali · Ol Chiki ({TARGET_LANGUAGE})"
)
print(
    f"Translation device: {TRANSLATION_DEVICE}"
)
print("=" * 70)
print()


# ============================================================
# LANGUAGE DETECTION — TEXT
# ============================================================

def detect_text_language(
    text: str
) -> str:

    """
    Detect only English or Hindi.

    Devanagari → Hindi
    Otherwise → English
    """

    if re.search(
        r"[\u0900-\u097F]",
        text
    ):

        return "hi"

    return "en"


# ============================================================
# LANGUAGE DETECTION — AUDIO
# ============================================================

def detect_audio_language(
    audio: np.ndarray
) -> str:

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


    detected = ranked[0][0]


    # --------------------------------------------------------
    # ONLY ENGLISH / HINDI
    # --------------------------------------------------------

    if detected not in WHISPER_TO_INDIC:

        detected = "en"


    return detected


# ============================================================
# WHISPER TRANSCRIPTION
# ============================================================

def transcribe(

    audio: np.ndarray,

    language_code: str

) -> str:

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

        no_speech_threshold=0.6,
    )


    return clean_text(
        result.get(
            "text",
            ""
        )
    )


# ============================================================
# TRANSLATE → SANTALI
# ============================================================

def translate_to_santali(

    text: str,

    language_code: str

) -> str:

    if language_code not in WHISPER_TO_INDIC:

        raise ValueError(
            f"Unsupported language: {language_code}"
        )


    source_language = (
        WHISPER_TO_INDIC[
            language_code
        ]
    )


    # --------------------------------------------------------
    # PREPROCESS
    # --------------------------------------------------------

    processed = (
        indic_processor.preprocess_batch(

            [text],

            src_lang=source_language,

            tgt_lang=TARGET_LANGUAGE
        )
    )


    # --------------------------------------------------------
    # TOKENIZE
    # --------------------------------------------------------

    inputs = tokenizer(

        processed,

        truncation=True,

        padding=True,

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


    # --------------------------------------------------------
    # TRANSLATE
    # --------------------------------------------------------

    with torch.inference_mode():

        output_tokens = (
            translator.generate(

                **inputs,

                use_cache=True,

                max_new_tokens=MAX_NEW_TOKENS,

                num_beams=NUM_BEAMS,

                num_return_sequences=1,

                do_sample=False,
            )
        )


    # --------------------------------------------------------
    # DECODE
    # --------------------------------------------------------

    decoded = tokenizer.batch_decode(

        output_tokens.detach().cpu(),

        skip_special_tokens=True,

        clean_up_tokenization_spaces=True,
    )


    # --------------------------------------------------------
    # POSTPROCESS
    # --------------------------------------------------------

    translated = (
        indic_processor.postprocess_batch(

            decoded,

            lang=TARGET_LANGUAGE
        )[0]
    )


    return clean_text(
        translated
    )


# ============================================================
# DHVAANI TTS
# ============================================================

def synthesize_santali(

    text: str

) -> Path:

    timestamp = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S_%f"
        )
    )


    output_file = (
        OUTPUT_DIR
        / f"santali_{timestamp}.wav"
    )


    # --------------------------------------------------------
    # FULL SENTENCE
    # --------------------------------------------------------

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

            speed=TTS_SPEED,
        )


    except TypeError:

        # ----------------------------------------------------
        # FALLBACK FOR OLDER DHVAANI API
        # ----------------------------------------------------

        tts.synthesize(

            text=text,

            prompt_wav=str(
                REFERENCE_WAV
            ),

            prompt_text=REFERENCE_TEXT,

            out_path=str(
                output_file
            ),
        )


    if not output_file.exists():

        raise RuntimeError(
            "DhVaani did not produce an audio file."
        )


    return output_file


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(

    title="Santali Voice/Text Translator",

    description=(
        "English/Hindi to Santali "
        "Ol Chiki translator with DhVaani TTS."
    ),

    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class TextRequest(
    BaseModel
):

    text: str

    # Examples:
    #
    # "en"
    # "english"
    # "hi"
    # "hindi"
    #
    # If omitted → automatically detected.

    language: Optional[str] = None


# ============================================================
# RESPONSE MODEL
# ============================================================

class TranslateResponse(
    BaseModel
):

    input_text: str

    detected_language: str

    santali_text: str

    audio_file: str


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health"
)
def health():

    return {

        "status": "ok",

        "device": TRANSLATION_DEVICE,

        "supported_languages": [

            "English",

            "Hindi",
        ],

        "target_language":
            "Santali · Ol Chiki",
    }


# ============================================================
# TEXT TRANSLATION
# ============================================================

@app.post(

    "/translate/text",

    response_model=TranslateResponse
)
def translate_text(
    req: TextRequest
):

    # --------------------------------------------------------
    # CLEAN INPUT
    # --------------------------------------------------------

    text = clean_text(
        req.text
    )


    if not text:

        raise HTTPException(

            status_code=400,

            detail="text is empty"
        )


    # --------------------------------------------------------
    # DETECT / NORMALIZE LANGUAGE
    # --------------------------------------------------------

    if req.language:

        requested_language = (
            req.language
            .lower()
            .strip()
        )

        language = LANGUAGE_ALIASES.get(
            requested_language
        )

        if language is None:

            raise HTTPException(

                status_code=400,

                detail=(
                    "Unsupported language. "
                    "Only English and Hindi are supported."
                )
            )

    else:

        language = detect_text_language(
            text
        )


    # --------------------------------------------------------
    # TRANSLATE
    # --------------------------------------------------------

    try:

        santali = translate_to_santali(

            text,

            language
        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=f"Translation failed: {str(e)}"
        )


    if not santali:

        raise HTTPException(

            status_code=500,

            detail="Translation produced empty output."
        )


    # --------------------------------------------------------
    # TTS
    # --------------------------------------------------------

    try:

        audio_path = synthesize_santali(
            santali
        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=f"TTS failed: {str(e)}"
        )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return TranslateResponse(

        input_text=text,

        detected_language=language,

        santali_text=santali,

        audio_file=audio_path.name,
    )


# ============================================================
# VOICE TRANSLATION
# ============================================================

@app.post(

    "/translate/voice",

    response_model=TranslateResponse
)
async def translate_voice(

    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # SAVE UPLOADED AUDIO
    # --------------------------------------------------------

    suffix = (
        Path(
            file.filename or "input.wav"
        ).suffix
        or ".wav"
    )


    upload_path = (

        UPLOAD_DIR
        /
        (
            "upload_"
            +
            datetime.now().strftime(
                "%Y%m%d_%H%M%S_%f"
            )
            +
            suffix
        )
    )


    with open(
        upload_path,
        "wb"
    ) as f:

        f.write(
            await file.read()
        )


    # --------------------------------------------------------
    # LOAD AUDIO
    # --------------------------------------------------------

    try:

        audio = whisper.load_audio(
            str(upload_path)
        )

    except Exception as e:

        raise HTTPException(

            status_code=400,

            detail=f"Could not read audio: {str(e)}"
        )


    # --------------------------------------------------------
    # LANGUAGE DETECTION
    # --------------------------------------------------------

    language = detect_audio_language(
        audio
    )


    # --------------------------------------------------------
    # SPEECH → TEXT
    # --------------------------------------------------------

    text = transcribe(

        audio,

        language
    )


    if not text:

        raise HTTPException(

            status_code=422,

            detail="No speech recognized."
        )


    # --------------------------------------------------------
    # TRANSLATE
    # --------------------------------------------------------

    try:

        santali = translate_to_santali(

            text,

            language
        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=f"Translation failed: {str(e)}"
        )


    # --------------------------------------------------------
    # TTS
    # --------------------------------------------------------

    try:

        audio_path = synthesize_santali(
            santali
        )

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=f"TTS failed: {str(e)}"
        )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return TranslateResponse(

        input_text=text,

        detected_language=language,

        santali_text=santali,

        audio_file=audio_path.name,
    )


# ============================================================
# AUDIO DOWNLOAD / PLAYBACK
# ============================================================

@app.get(
    "/audio/{filename}"
)
def get_audio(
    filename: str
):

    file_path = (
        OUTPUT_DIR
        / filename
    )


    if not file_path.exists():

        raise HTTPException(

            status_code=404,

            detail="Audio file not found."
        )


    return FileResponse(

        str(file_path),

        media_type="audio/wav",

        filename=filename,
    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "name":
            "Santali Translator API",

        "status":
            "running",

        "supported_languages": [

            "English",

            "Hindi",
        ],

        "target":
            "Santali · Ol Chiki",

        "endpoints": {

            "health":
                "/health",

            "text":
                "/translate/text",

            "voice":
                "/translate/voice",

            "audio":
                "/audio/{filename}",
        },
    }


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        app,

        host="0.0.0.0",

        port=8000,
    )