"""
============================================================
SANTALI MOTHER-TONGUE TEACHING ASSISTANT - FASTAPI BACKEND
============================================================

Converts the working CLI pipeline (Whisper -> IndicTrans2 -> DhVaani)
into a stable FastAPI HTTP backend. Model logic, parameters, and
offline behavior are preserved exactly from the original CLI code.

Run:
    python main.py
    OR
    uvicorn main:app --host 0.0.0.0 --port 2004

Dependencies (install with pip):
    fastapi uvicorn[standard] python-multipart python-dotenv
    torch transformers openai-whisper IndicTransToolkit
    soundfile numpy

ffmpeg must be installed and available on PATH for audio-upload
endpoints (webm/mp3/m4a/ogg -> 16kHz mono wav conversion).
============================================================
"""

import os
import re
import sys
import time
import uuid
import shutil
import subprocess
import threading
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import torch
import whisper
import soundfile as sf

from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field

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
RECORDING_DIR = OUTPUT_DIR / "recordings"   # temp uploaded / converted audio
LESSON_DIR = OUTPUT_DIR / "lessons"         # generated lesson / tts wav files

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RECORDING_DIR.mkdir(parents=True, exist_ok=True)
LESSON_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv(BASE_DIR / ".env")

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

# IMPORTANT: never allow HuggingFace to retry internet requests.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


# ============================================================
# MODEL / LANGUAGE CONFIG
# ============================================================

INDICTRANS_MODEL_ID = "ai4bharat/indictrans2-indic-indic-dist-320M"
INDICTRANS_LOCAL_DIR = os.getenv("INDICTRANS_LOCAL_DIR", "").strip()
MODEL_BACKEND = os.getenv("MODEL_BACKEND", "int8").strip().lower()
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "small").strip()

# Whisper stays on CPU (matches working CLI behavior).
WHISPER_DEVICE = "cpu"

# Translation / TTS device selection, same logic as the CLI.
if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

# Natural TTS settings (optimized for crystal clear pronunciation)
TTS_STEPS = int(os.getenv("TTS_STEPS", "14"))
TTS_GUIDANCE = float(os.getenv("TTS_GUIDANCE", "1.1"))
TTS_SPEED = float(os.getenv("TTS_SPEED", "0.92"))
TTS_SEED = 666

LANG_ENGLISH = "eng_Latn"
LANG_HINDI = "hin_Deva"
LANG_SANTALI = "sat_Olck"
LANG_HO = "ho"
LANG_MUNDARI = "mundari"

WHISPER_ENGLISH = "en"
WHISPER_HINDI = "hi"

LANGUAGE_MAP = {
    "english": LANG_ENGLISH,
    "hindi": LANG_HINDI,
    "eng_latn": LANG_ENGLISH,
    "hin_deva": LANG_HINDI,
    LANG_ENGLISH.lower(): LANG_ENGLISH,
    LANG_HINDI.lower(): LANG_HINDI,
}

WHISPER_LANG_MAP = {
    LANG_ENGLISH: WHISPER_ENGLISH,
    LANG_HINDI: WHISPER_HINDI,
}


SUPPORTED_AUDIO_EXTENSIONS = {".wav", ".webm", ".mp3", ".m4a", ".ogg", ".mp4", ".flac"}

SILENCE_SECONDS = 0.12
CHUNK_WORD_SIZE = 10


# ============================================================
# GLOBAL MODEL STATE + CONCURRENCY LOCK
# ============================================================

# Serializes access to the AI inference pipeline (IndicTrans2 / DhVaani)
# so concurrent frontend requests never hit MPS at the same time.
MODEL_LOCK = threading.Lock()


class ModelState:
    whisper_model = None
    tokenizer = None
    translation_model = None
    processor = None
    tts = None
    ready = False


state = ModelState()


# ============================================================
# LOGGING HELPERS
# ============================================================

def print_header(title: str):
    print()
    print("=" * 70)
    print(f"{title:^70}")
    print("=" * 70)


# ============================================================
# STARTUP CHECKS
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
        raise RuntimeError(f"DhVaani directory not found: {DHVAANI_DIR}")

    if not (DHVAANI_DIR / "model.safetensors").exists():
        raise RuntimeError("DhVaani model.safetensors not found.")

    if not REFERENCE_WAV.exists():
        raise RuntimeError(f"DhVaani reference voice not found: {REFERENCE_WAV}")

    if IndicProcessor is None:
        raise RuntimeError("IndicTransToolkit is not installed.")

    print("\n✅ Environment OK")


# ============================================================
# WHISPER
# ============================================================

def load_whisper():
    print("\nLoading Whisper...")
    start = time.perf_counter()

    try:
        model = whisper.load_model(WHISPER_MODEL_NAME, device=WHISPER_DEVICE)
        elapsed = time.perf_counter() - start
        print(f"✅ Whisper ready ({elapsed:.2f}s)")
        return model

    except Exception as e:
        print("\n❌ Whisper failed:")
        print(e)
        raise RuntimeError(f"Whisper failed to load: {e}") from e


def transcribe_audio(whisper_model, audio_path: Path, whisper_language: str) -> str:
    result = whisper_model.transcribe(
        str(audio_path),
        language=whisper_language,
        task="transcribe",
        temperature=0,
        condition_on_previous_text=False,
        no_speech_threshold=0.3,
        compression_ratio_threshold=2.4,
        logprob_threshold=-1.0,
        fp16=False,
        verbose=False,
    )
    return clean_transcription(result.get("text", ""))


# ============================================================
# INDIC TRANS2
# ============================================================

def resolve_indictrans_source() -> str:
    if INDICTRANS_LOCAL_DIR:
        local_path = Path(INDICTRANS_LOCAL_DIR)
        if local_path.exists():
            print("\nUsing local IndicTrans2:")
            print(local_path)
            return str(local_path)

    return INDICTRANS_MODEL_ID


def load_indictrans():
    if MODEL_BACKEND == "int8":
        from services.translation_service import get_translation_engine
        engine = get_translation_engine(backend="int8")
        engine.load()
        return engine.tokenizer, engine.model, engine.processor

    print("\nLoading IndicTrans2...")
    source = resolve_indictrans_source()
    start = time.perf_counter()

    try:
        tokenizer = AutoTokenizer.from_pretrained(
            source, trust_remote_code=True, local_files_only=True
        )
        model = AutoModelForSeq2SeqLM.from_pretrained(
            source, trust_remote_code=True, local_files_only=True
        )
    except Exception as e:
        print("\n❌ IndicTrans2 failed.")
        print("The model must already be downloaded.")
        print(e)
        raise RuntimeError(f"IndicTrans2 failed to load: {e}") from e

    model = model.to(DEVICE)
    model.eval()

    processor = IndicProcessor(inference=True)

    elapsed = time.perf_counter() - start
    print(f"✅ IndicTrans2 ready ({elapsed:.2f}s)")

    return tokenizer, model, processor


def translate_sentence(sentence: str, source_language: str, tokenizer, model, processor) -> str:
    sentence = clean_text(sentence)
    if not sentence:
        return ""

    batch = processor.preprocess_batch(
        [sentence], src_lang=source_language, tgt_lang=LANG_SANTALI
    )

    inputs = tokenizer(
        batch, padding=True, truncation=True, max_length=128, return_tensors="pt"
    )
    model_device = next(model.parameters()).device
    inputs = {key: value.to(model_device) for key, value in inputs.items()}

    # Greedy decoding (num_beams=1) — fastest for real-time classroom use.
    # Beam=4 gave <5% quality improvement but 3-4x latency penalty on 320M CPU.
    with torch.inference_mode():
        generated_tokens = model.generate(
            **inputs,
            num_beams=1,
            num_return_sequences=1,
            max_new_tokens=128,
            do_sample=False,
            use_cache=True,
        )

    decoded = tokenizer.batch_decode(
        generated_tokens, skip_special_tokens=True, clean_up_tokenization_spaces=True
    )

    result = processor.postprocess_batch(decoded, lang=LANG_SANTALI)
    if not result:
        return ""

    return clean_text(result[0])


def translate_text_full(text: str, source_language: str, tokenizer, model, processor) -> str:
    """Chunk arbitrary-length text, translate each chunk, return one combined string."""
    chunks = split_fast(text)
    if not chunks:
        return ""

    translated_parts = []
    for index, chunk in enumerate(chunks, start=1):
        result = translate_sentence(chunk, source_language, tokenizer, model, processor)
        if not result:
            raise RuntimeError(f"Empty translation for chunk {index}.")
        translated_parts.append(result)

    return clean_text(" ".join(translated_parts))


# ============================================================
# DHVAANI
# ============================================================

def load_dhvaani():
    print("\nLoading DhVaani...")
    sys.path.insert(0, str(DHVAANI_DIR))

    start = time.perf_counter()

    try:
        from dhvaani import DhVaani

        tts = DhVaani(model_dir=DHVAANI_DIR, device=DEVICE)

        elapsed = time.perf_counter() - start
        print(f"✅ DhVaani ready ({elapsed:.2f}s)")
        return tts

    except Exception as e:
        print("\n❌ DhVaani failed:")
        print(e)
        raise RuntimeError(f"DhVaani failed to load: {e}") from e


def get_reference_text() -> str:
    return "इसे कईबार मनचित भी की आगया है"


def generate_tts_chunk(tts, santali_text: str, output_path: Path) -> float:
    start = time.perf_counter()

    tts.synthesize(
        text=santali_text,
        prompt_wav=str(REFERENCE_WAV),
        prompt_text=get_reference_text(),
        out_path=str(output_path),
        num_step=TTS_STEPS,
        guidance_scale=TTS_GUIDANCE,
        speed=TTS_SPEED,
        seed=TTS_SEED,
    )

    return time.perf_counter() - start


# ============================================================
# TEXT HELPERS
# ============================================================

def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_transcription(text: str) -> str:
    text = clean_text(text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return text


def is_valid_olchiki(text: str) -> bool:
    if not text:
        return False

    olchiki_chars = len(re.findall(r"[\u1C50-\u1C7F]", text))
    total_letters = len(re.findall(r"\S", text))

    if total_letters == 0:
        return False

    return (olchiki_chars / total_letters) >= 0.45


def split_fast(text: str):
    """Linguistic clause chunking: split into sentences, then by punctuation clauses (~12 words max)."""
    text = clean_text(text)
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?।॥\n])\s+", text)
    result = []

    for sentence in sentences:
        sentence = clean_text(sentence)
        if not sentence:
            continue

        words = sentence.split()
        if len(words) <= CHUNK_WORD_SIZE:
            result.append(sentence)
            continue

        subparts = re.split(r"(?<=[,;:\-–—])\s+", sentence)
        current = []
        for part in subparts:
            part_words = part.split()
            if not part_words:
                continue
            if len(current) + len(part_words) <= CHUNK_WORD_SIZE:
                current.extend(part_words)
            else:
                if current:
                    result.append(" ".join(current))
                    current = []
                if len(part_words) <= CHUNK_WORD_SIZE:
                    current.extend(part_words)
                else:
                    for w in part_words:
                        current.append(w)
                        if len(current) >= CHUNK_WORD_SIZE:
                            result.append(" ".join(current))
                            current = []
        if current:
            result.append(" ".join(current))

    return result if result else [text]


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0:
        return audio

    peak = np.max(np.abs(audio))
    if peak > 0.98:
        audio = audio / peak * 0.98

    return audio


# ============================================================
# LANGUAGE VALIDATION
# ============================================================

def normalize_source_language(value: Optional[str]) -> str:
    if not value or not value.strip():
        raise ValueError("source_language is required.")

    key = value.strip().lower()
    if key not in LANGUAGE_MAP:
        raise ValueError(
            f"Unsupported source_language '{value}'. "
            f"Allowed values: english, hindi, eng_Latn, hin_Deva."
        )

    return LANGUAGE_MAP[key]


def get_whisper_language_code(flores_code: str) -> str:
    return WHISPER_LANG_MAP[flores_code]


def get_language_label(flores_code: str) -> str:
    labels = {
        LANG_ENGLISH: "english",
        LANG_HINDI: "hindi",
    }
    return labels.get(flores_code, flores_code)


# ============================================================
# AUDIO UPLOAD HANDLING
# ============================================================

def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def convert_to_wav(input_path: Path, output_path: Path):
    """Convert an uploaded audio file to 16kHz mono WAV using ffmpeg."""
    if not ffmpeg_available():
        raise RuntimeError(
            "ffmpeg is not installed or not available on PATH. "
            "Please install ffmpeg to process uploaded audio."
        )

    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-ar", "16000",
        "-ac", "1",
        "-f", "wav",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0 or not output_path.exists():
        raise RuntimeError(f"Audio conversion failed: {result.stderr.strip()[:500]}")


def save_upload_to_disk(upload: UploadFile) -> Path:
    if not upload.filename:
        raise ValueError("Uploaded audio file is missing a filename.")

    suffix = Path(upload.filename).suffix.lower()
    if suffix not in SUPPORTED_AUDIO_EXTENSIONS:
        raise ValueError(
            f"Unsupported audio format '{suffix or 'unknown'}'. "
            f"Supported formats: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}."
        )

    temp_path = RECORDING_DIR / f"upload_{uuid.uuid4().hex}{suffix}"

    upload.file.seek(0)
    content = upload.file.read()

    if not content:
        raise ValueError("Uploaded audio file is empty.")

    with open(temp_path, "wb") as f:
        f.write(content)

    return temp_path


# ============================================================
# FULL LESSON PIPELINE (translate chunks -> tts chunks -> combine)
# ============================================================

def run_full_pipeline(source_text, source_language, tokenizer, translation_model, processor, tts):
    """
    Chunk source text, translate each chunk to Santali, synthesize each
    chunk with DhVaani, combine into one WAV with short silence gaps.

    Returns: (combined_santali_text, output_filename)
    """
    chunks = split_fast(source_text)
    if not chunks:
        raise ValueError("No valid text to process.")

    translated_parts = []
    audio_segments = []
    sample_rate = None

    session_id = uuid.uuid4().hex
    temp_chunk_paths = []

    try:
        for index, chunk in enumerate(chunks, start=1):
            santali = translate_sentence(
                chunk, source_language, tokenizer, translation_model, processor
            )

            if not santali:
                raise RuntimeError(f"Empty translation for chunk {index}.")

            if not is_valid_olchiki(santali):
                print(f"⚠️ Ol Chiki validation warning for chunk {index}.")

            translated_parts.append(santali)

            chunk_path = OUTPUT_DIR / f"_chunk_{session_id}_{index}.wav"
            temp_chunk_paths.append(chunk_path)

            generate_tts_chunk(tts, santali, chunk_path)

            audio, sr = sf.read(str(chunk_path), dtype="float32")
            if audio.ndim > 1:
                audio = np.mean(audio, axis=1)

            if sample_rate is None:
                sample_rate = sr

            audio_segments.append(audio)

        pieces = []
        for i, audio in enumerate(audio_segments):
            pieces.append(normalize_audio(audio))
            if i < len(audio_segments) - 1:
                pieces.append(np.zeros(int(sample_rate * SILENCE_SECONDS), dtype=np.float32))

        final_audio = np.concatenate(pieces) if pieces else np.array([], dtype=np.float32)

        output_filename = f"lesson_{uuid.uuid4().hex}.wav"
        output_path = LESSON_DIR / output_filename

        sf.write(str(output_path), final_audio, sample_rate, subtype="PCM_16")

        combined_santali_text = clean_text(" ".join(translated_parts))

        return combined_santali_text, output_filename

    finally:
        for path in temp_chunk_paths:
            try:
                path.unlink()
            except Exception:
                pass


# ============================================================
# PYDANTIC MODELS
# ============================================================

class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text in English or Hindi to translate.")
    source_language: str = Field(..., description="'english' or 'hindi' (also accepts eng_Latn / hin_Deva).")
    target_language: Optional[str] = Field("sat_Olck", description="Target language: sat_Olck (Santali), ho, mundari")


class TTSRequest(BaseModel):
    text: str = Field(..., description="Santali (Ol Chiki) text to synthesize.")


# ============================================================
# LIFESPAN (LOAD MODELS ONCE AT STARTUP)
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print_header("SANTALI FASTAPI BACKEND - STARTING UP")

    try:
        check_environment()

        print_header("INITIALIZING DETERMINISTIC RUNTIME BENCHMARK")
        from services.runtime_manager import get_runtime_manager
        mgr = get_runtime_manager()
        mgr.initialize()

        # Connect state references for backward-compatible access
        if mgr.selected_asr_engine and mgr.selected_asr_engine.model:
            state.whisper_model = mgr.selected_asr_engine.model
        if mgr.selected_translation_engine:
            state.translation_model = mgr.selected_translation_engine.model
            state.tokenizer = mgr.selected_translation_engine.tokenizer
            state.processor = mgr.selected_translation_engine.processor
        if mgr.selected_tts_engine and mgr.selected_tts_engine.tts:
            state.tts = mgr.selected_tts_engine.tts
        state.ready = True

        print()
        print("=" * 50)
        print("SANTALI FASTAPI BACKEND READY")
        print("=" * 50)
        print("Whisper     :", mgr.selected_asr_name)
        print("Translation :", mgr.selected_translation_name)
        print("TTS         :", mgr.selected_tts_name)
        print("Device      :", DEVICE)
        print("Offline     :", "YES")
        print("Port        :", 2004)
        print("Status      :", "READY")
        print("=" * 50)

    except Exception as e:
        state.ready = False
        print("\n❌ STARTUP FAILED")
        print(f"Reason: {e}")
        raise

    yield

    print("\nShutting down Santali FastAPI backend...")


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Santali Mother-Tongue Teaching Assistant",
    description="FastAPI backend for English/Hindi -> Santali (Ol Chiki) translation and speech pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional direct static access to generated lesson audio.
app.mount("/static/lessons", StaticFiles(directory=str(LESSON_DIR)), name="lessons")


# ============================================================
# EXCEPTION HANDLERS (consistent {"success": false, "error": ...} shape)
# ============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"success": False, "error": exc.errors()},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )


def ensure_ready():
    if not state.ready:
        raise HTTPException(status_code=503, detail="Models are still loading. Please try again shortly.")


# ============================================================
# SYSTEM STATUS & BENCHMARK (NEW ENDPOINT)
# ============================================================

@app.get("/system/status")
@app.get("/api/status")
def system_status():
    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()
    return mgr.get_system_status()


# ============================================================
# 1. HEALTH CHECK
# ============================================================

@app.get("/health")
@app.get("/api/health")
def health():
    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()
    return {
        "status": "ok" if state.ready else "starting",
        "service": "Santali Mother-Tongue Teaching Assistant",
        "port": 2004,
        "whisper": mgr.selected_asr_name or WHISPER_MODEL_NAME,
        "translation": mgr.selected_translation_name or "IndicTrans2",
        "tts": mgr.selected_tts_name or "DhVaani",
        "offline": True,
    }


# ============================================================
# 2. SYSTEM INFO
# ============================================================

@app.get("/api/info")
def api_info():
    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()
    return {
        "whisper_model": mgr.selected_asr_name or WHISPER_MODEL_NAME,
        "translation_model": mgr.selected_translation_name or INDICTRANS_MODEL_ID,
        "source_languages": ["English", "Hindi"],
        "target_language": "Santali",
        "script": "Ol Chiki",
        "tts": mgr.selected_tts_name or "DhVaani",
        "device": DEVICE,
        "offline": True,
    }


# ============================================================
# 3. TEXT TRANSLATION ONLY
# ============================================================

@app.post("/api/translate")
def api_translate(payload: TranslateRequest):
    text = clean_text(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty.")

    try:
        source_language = normalize_source_language(payload.source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    tgt = (payload.target_language or "sat_Olck").lower().strip()
    t0 = time.perf_counter()

    # Route to Ho
    if tgt in {"ho", "ho_warang", "ho_demo"}:
        from services.tribal_translation import TribalTranslator
        tt = TribalTranslator.get_instance()
        res = tt.translate_to_ho(text, source_language)
        translation_ms = round((time.perf_counter() - t0) * 1000, 1)
        return {
            "success": True,
            "source_language": get_language_label(source_language),
            "source_text": text,
            "target_language": "Ho",
            "santali_text": res.get("warang_citi", res["translated_text"]),
            "translated_text": res["translated_text"],
            "warang_citi": res.get("warang_citi"),
            "roman_text": res.get("roman_text"),
            "devanagari_text": res.get("devanagari_text"),
            "script": res.get("script", "Warang Citi & Latin"),
            "engine": {"translation": "TribalTranslator-Ho"},
            "timing": {"translation_ms": translation_ms},
        }

    # Route to Mundari
    if tgt in {"mundari", "mundari_demo", "mundari_bani", "unr"}:
        from services.tribal_translation import TribalTranslator
        tt = TribalTranslator.get_instance()
        res = tt.translate_to_mundari(text, source_language)
        translation_ms = round((time.perf_counter() - t0) * 1000, 1)
        return {
            "success": True,
            "source_language": get_language_label(source_language),
            "source_text": text,
            "target_language": "Mundari",
            "santali_text": res["translated_text"],
            "translated_text": res["translated_text"],
            "roman_text": res.get("roman_text"),
            "script": res.get("script", "Devanagari (Mundari)"),
            "engine": {"translation": "TribalTranslator-Mundari (10K Dataset)"},
            "timing": {"translation_ms": translation_ms},
        }

    # Default: Santali Ol Chiki via IndicTrans2
    ensure_ready()
    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    try:
        with MODEL_LOCK:
            santali_text = mgr.selected_translation_engine.translate(
                text=text,
                src_lang=source_language,
                tgt_lang=LANG_SANTALI,
                num_beams=1,
                max_new_tokens=64,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

    translation_ms = round((time.perf_counter() - t0) * 1000, 1)

    if not santali_text:
        raise HTTPException(status_code=500, detail="Translation returned an empty result.")

    return {
        "success": True,
        "source_language": get_language_label(source_language),
        "source_text": text,
        "target_language": "Santali",
        "santali_text": santali_text,
        "translated_text": santali_text,
        "script": "Ol Chiki",
        "engine": {"translation": mgr.selected_translation_name},
        "timing": {"translation_ms": translation_ms},
    }


@app.post("/api/translate/ho")
def api_translate_ho(payload: TranslateRequest):
    payload.target_language = "ho"
    return api_translate(payload)


@app.post("/api/translate/mundari")
def api_translate_mundari(payload: TranslateRequest):
    payload.target_language = "mundari"
    return api_translate(payload)


# ============================================================
# 4. TEXT -> SANTALI TEXT + VOICE
# ============================================================

@app.post("/api/lesson/text")
def api_lesson_text(
    text: str = Form(...),
    source_language: str = Form(...),
):
    ensure_ready()

    clean_input_text = clean_text(text)
    if not clean_input_text:
        raise HTTPException(status_code=400, detail="text must not be empty.")

    try:
        source_language_code = normalize_source_language(source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    try:
        with MODEL_LOCK:
            result = mgr.run_pipeline(
                text=clean_input_text,
                source_language=source_language_code,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson generation failed: {e}")

    return {
        "success": True,
        "source_language": get_language_label(source_language_code),
        "source_text": clean_input_text,
        "santali_text": result["translation"],
        "audio_url": result["audio"],
        "engine": result["engine"],
        "timing": result["timing"],
    }


# ============================================================
# 5. SPEECH -> SANTALI TEXT + VOICE
# ============================================================

@app.post("/api/lesson/speech")
def api_lesson_speech(
    audio: UploadFile = File(...),
    source_language: str = Form(...),
):
    ensure_ready()

    try:
        source_language_code = normalize_source_language(source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    raw_path = None
    wav_path = None

    try:
        raw_path = save_upload_to_disk(audio)
        wav_path = RECORDING_DIR / f"conv_{uuid.uuid4().hex}.wav"
        convert_to_wav(raw_path, wav_path)

        with MODEL_LOCK:
            result = mgr.run_pipeline(
                audio_path=wav_path,
                source_language=source_language_code,
            )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech lesson pipeline failed: {e}")
    finally:
        for p in (raw_path, wav_path):
            if p:
                try:
                    p.unlink()
                except Exception:
                    pass

    return {
        "success": True,
        "source_language": get_language_label(source_language_code),
        "transcription": result["transcription"],
        "santali_text": result["translation"],
        "audio_url": result["audio"],
        "engine": result["engine"],
        "timing": result["timing"],
    }


# ============================================================
# 6. SPEECH -> TEXT ONLY
# ============================================================

@app.post("/api/transcribe")
def api_transcribe(
    audio: UploadFile = File(...),
    source_language: str = Form(...),
):
    ensure_ready()

    try:
        source_language_code = normalize_source_language(source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    raw_path = None
    wav_path = None

    t0 = time.perf_counter()
    try:
        raw_path = save_upload_to_disk(audio)
        wav_path = RECORDING_DIR / f"conv_{uuid.uuid4().hex}.wav"
        convert_to_wav(raw_path, wav_path)

        whisper_language = get_whisper_language_code(source_language_code)

        with MODEL_LOCK:
            stt_res = mgr.selected_asr_engine.transcribe(wav_path, language=whisper_language)
            transcription = stt_res.get("text", "").strip()

        if not transcription:
            raise HTTPException(status_code=400, detail="No speech detected in the uploaded audio.")

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        for p in (raw_path, wav_path):
            if p:
                try:
                    p.unlink()
                except Exception:
                    pass

    stt_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "success": True,
        "source_language": get_language_label(source_language_code),
        "transcription": transcription,
        "engine": {"asr": mgr.selected_asr_name},
        "timing": {"stt_ms": stt_ms},
    }


# ============================================================
# 7. SANTALI TEXT -> VOICE
# ============================================================

@app.post("/api/tts")
def api_tts(payload: TTSRequest):
    ensure_ready()

    text = clean_text(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty.")

    output_filename = f"tts_{uuid.uuid4().hex}.wav"
    output_path = LESSON_DIR / output_filename

    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    t0 = time.perf_counter()
    try:
        with MODEL_LOCK:
            # Use synthesize_full so long sentences get natural chunking + normalization.
            mgr.selected_tts_engine.synthesize_full(text, output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {e}")

    tts_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "success": True,
        "text": text,
        "audio_url": f"/api/audio/{output_filename}",
        "engine": {"tts": mgr.selected_tts_name},
        "timing": {"tts_ms": tts_ms},
    }



# ============================================================
# 8. AUDIO FILE SERVING
# ============================================================

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = LESSON_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(str(file_path), media_type="audio/wav", filename=filename)


# ============================================================
# 9. COMPLETE PIPELINE ENDPOINT
# ============================================================

@app.post("/api/process")
def api_process(
    input_type: str = Form(...),
    source_language: str = Form(...),
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
):
    ensure_ready()

    normalized_input_type = (input_type or "").strip().lower()
    if normalized_input_type not in ("text", "audio"):
        raise HTTPException(status_code=400, detail="input_type must be 'text' or 'audio'.")

    try:
        source_language_code = normalize_source_language(source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from services.runtime_manager import get_runtime_manager
    mgr = get_runtime_manager()

    raw_path = None
    wav_path = None

    try:
        if normalized_input_type == "text":
            source_text = clean_text(text)
            if not source_text:
                raise HTTPException(status_code=400, detail="text is required when input_type is 'text'.")

            with MODEL_LOCK:
                res = mgr.run_pipeline(
                    text=source_text,
                    source_language=source_language_code,
                )
        else:
            if audio is None:
                raise HTTPException(status_code=400, detail="audio file is required when input_type is 'audio'.")

            raw_path = save_upload_to_disk(audio)
            wav_path = RECORDING_DIR / f"conv_{uuid.uuid4().hex}.wav"
            convert_to_wav(raw_path, wav_path)

            with MODEL_LOCK:
                res = mgr.run_pipeline(
                    audio_path=wav_path,
                    source_language=source_language_code,
                )

        return {
            "success": True,
            "text": res["text"],
            "translation": res["translation"],
            "audio": res["audio"],
            "engine": res["engine"],
            "timing": res["timing"],
            # Preserve all legacy fields for React Native frontend
            "input_type": normalized_input_type,
            "source_language": get_language_label(source_language_code),
            "transcription": res.get("transcription"),
            "source_text": res["source_text"],
            "santali_text": res["santali_text"],
            "audio_url": res["audio_url"],
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")
    finally:
        for p in (raw_path, wav_path):
            if p:
                try:
                    p.unlink()
                except Exception:
                    pass


# ============================================================
# 10. MODEL STATUS & MEMORY
# ============================================================

@app.get("/api/models/status")
def api_model_status():
    import psutil
    from services.model_manager import get_model_manager
    from services.runtime_manager import get_runtime_manager

    manager = get_model_manager()
    mgr = get_runtime_manager()

    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    sys_mem = psutil.virtual_memory()

    trans_ready = bool(mgr.selected_translation_engine and mgr.selected_translation_engine.is_ready)
    asr_ready = bool(mgr.selected_asr_engine and mgr.selected_asr_engine.is_ready)
    tts_ready = bool(mgr.selected_tts_engine and mgr.selected_tts_engine.is_ready)

    return {
        "success": True,
        "models": {
            "whisper": {
                "ready": asr_ready,
                "model_name": "small",
                "engine": mgr.selected_asr_name,
            },
            "indictrans2": {
                "ready": trans_ready,
                "backend": "int8",
                "engine": mgr.selected_translation_name,
            },
            "dhvaani": {
                "ready": tts_ready,
                "device": "mps" if torch.backends.mps.is_available() else "cpu",
                "engine": mgr.selected_tts_name,
            },
        },
        "memory": {
            "process_rss_mb": round(mem_info.rss / (1024 * 1024), 1),
            "system_total_mb": round(sys_mem.total / (1024 * 1024), 1),
            "system_available_mb": round(sys_mem.available / (1024 * 1024), 1),
            "system_percent_used": sys_mem.percent,
        },
        "installed": manager.is_installed(),
        "ready_for_inference": trans_ready and asr_ready and tts_ready,
        "info": manager.get_model_info(),
    }


@app.post("/api/models/unload")
def api_model_unload():
    from services.model_manager import get_model_manager
    manager = get_model_manager()
    manager.unload_all()
    return {"success": True, "message": "All models unloaded from memory."}


# ============================================================
# 11. VISUAL FLASHCARDS (13 FOUNDATIONAL CATEGORIES)
# ============================================================

FLASHCARDS_DATA = {
    "Alphabet": [
        {"id": "a1", "front": "ᱚ (La)", "hindi": "ल (ओल चिकी)", "santali": "ᱚ", "ho": "ᱚ (𑲏)", "mundari": "ᱚ", "english": "Ol Chiki 'La'", "icon": "🔤"},
        {"id": "a2", "front": "ᱛ (At)", "hindi": "त (ओल चिकी)", "santali": "ᱛ", "ho": "ᱛ (𑲉)", "mundari": "ᱛ", "english": "Ol Chiki 'At'", "icon": "🔤"},
        {"id": "a3", "front": "ᱜ (Ag)", "hindi": "ग (ओल चिकी)", "santali": "ᱜ", "ho": "ᱜ (𑲖)", "mundari": "ᱜ", "english": "Ol Chiki 'Ag'", "icon": "🔤"},
        {"id": "a4", "front": "ᱝ (Ang)", "hindi": "ङ (ओल चिकी)", "santali": "ᱝ", "ho": "ᱝ (𑲓)", "mundari": "ᱝ", "english": "Ol Chiki 'Ang'", "icon": "🔤"},
        {"id": "a5", "front": "ᱞ (Ol)", "hindi": "ल (ओल चिकी)", "santali": "ᱞ", "ho": "ᱞ (𑲌)", "mundari": "ᱞ", "english": "Ol Chiki 'Ol'", "icon": "🔤"},
    ],
    "Numbers": [
        {"id": "n1", "front": "1 / ᱑", "hindi": "एक (1)", "santali": "ᱢᱤᱫ (᱑)", "ho": "ᱢᱤᱭᱟᱹᱫᱽ (᱑)", "mundari": "ᱢᱤᱭᱟᱹᱫᱽ (᱑)", "english": "One", "icon": "1️⃣"},
        {"id": "n2", "front": "2 / ᱒", "hindi": "दो (2)", "santali": "ᱵᱟᱨ (᱒)", "ho": "ᱵᱟᱨᱤᱭᱟ (᱒)", "mundari": "ᱵᱟᱨᱤᱭᱟ (᱒)", "english": "Two", "icon": "2️⃣"},
        {"id": "n3", "front": "3 / ᱓", "hindi": "तीन (3)", "santali": "ᱯᱮ (᱓)", "ho": "ᱟᱹᱯᱤᱭᱟ (᱓)", "mundari": "ᱟᱹᱯᱤᱭᱟ (᱓)", "english": "Three", "icon": "3️⃣"},
        {"id": "n4", "front": "4 / ᱔", "hindi": "चार (4)", "santali": "ᱯᱳᱱ (᱔)", "ho": "ᱩᱯᱩᱱᱤᱭᱟ (᱔)", "mundari": "ᱩᱯᱩᱱᱤᱭᱟ (᱔)", "english": "Four", "icon": "4️⃣"},
        {"id": "n5", "front": "5 / ᱕", "hindi": "पाँच (5)", "santali": "ᱢᱚᱬᱮ (᱕)", "ho": "ᱢᱚᱬᱮᱭᱟ (᱕)", "mundari": "ᱢᱚᱬᱮᱭᱟ (᱕)", "english": "Five", "icon": "5️⃣"},
        {"id": "n6", "front": "10 / ᱑᱐", "hindi": "दस (10)", "santali": "ᱜᱮᱞ (᱑᱐)", "ho": "ᱜᱮᱞᱮᱭᱟ (᱑᱐)", "mundari": "ᱜᱮᱞᱮᱭᱟ (᱑᱐)", "english": "Ten", "icon": "🔟"},
    ],
    "Colours": [
        {"id": "c1", "front": "Red", "hindi": "लाल", "santali": "ᱟᱨᱟᱜ", "ho": "ᱟᱨᱟᱜ", "mundari": "ᱟᱨᱟᱜ", "english": "Red", "icon": "🔴"},
        {"id": "c2", "front": "Green", "hindi": "हरा", "santali": "ᱦᱟᱹᱨᱭᱟᱹᱲ", "ho": "ᱦᱟᱹᱨᱭᱟᱹᱲ", "mundari": "ᱦᱟᱹᱨᱭᱟᱹᱲ", "english": "Green", "icon": "🟢"},
        {"id": "c3", "front": "Blue", "hindi": "नीला", "santali": "ᱞᱤᱞ", "ho": "ᱞᱤᱞ", "mundari": "ᱞᱤᱞ", "english": "Blue", "icon": "🔵"},
        {"id": "c4", "front": "Yellow", "hindi": "पीला", "santali": "ᱥᱟᱥᱟᱝ", "ho": "ᱥᱟᱥᱟᱝ", "mundari": "ᱥᱟᱥᱟᱝ", "english": "Yellow", "icon": "🟡"},
        {"id": "c5", "front": "White", "hindi": "सफ़ेद", "santali": "ᱯᱩᱸᱰ", "ho": "ᱯᱩᱸᱰ", "mundari": "ᱯᱩᱸᱰ", "english": "White", "icon": "⚪"},
        {"id": "c6", "front": "Black", "hindi": "काला", "santali": "ᱦᱮᱸᱫᱮ", "ho": "ᱦᱮᱸᱫᱮ", "mundari": "ᱦᱮᱸᱫᱮ", "english": "Black", "icon": "⚫"},
    ],
    "Shapes": [
        {"id": "sh1", "front": "Circle", "hindi": "गोला", "santali": "ᱜᱩᱞᱟᱹᱴ", "ho": "ᱜᱩᱞᱟᱹᱴ", "mundari": "ᱜᱩᱞᱟᱹᱴ", "english": "Circle", "icon": "⭕"},
        {"id": "sh2", "front": "Square", "hindi": "चौकोर", "santali": "ᱯᱳᱱᱠᱳᱬ", "ho": "ᱯᱳᱱᱠᱳᱬ", "mundari": "ᱯᱳᱱᱠᱳᱬ", "english": "Square", "icon": "⬛"},
        {"id": "sh3", "front": "Triangle", "hindi": "त्रिकोण", "santali": "ᱯᱮᱠᱳᱬ", "ho": "ᱯᱮᱠᱳᱬ", "mundari": "ᱯᱮᱠᱳᱬ", "english": "Triangle", "icon": "🔺"},
    ],
    "Animals": [
        {"id": "an1", "front": "Dog", "hindi": "कुत्ता", "santali": "ᱥᱮᱛᱟ", "ho": "ᱥᱮᱛᱟ", "mundari": "ᱥᱮᱛᱟ", "english": "Dog", "icon": "🐕"},
        {"id": "an2", "front": "Cat", "hindi": "बिल्ली", "santali": "ᱯᱩᱥᱤ", "ho": "ᱯᱩᱥᱤ", "mundari": "ᱯᱩᱥᱤ", "english": "Cat", "icon": "🐈"},
        {"id": "an3", "front": "Cow", "hindi": "गाय", "santali": "ᱜᱟᱹᱭ", "ho": "ᱜᱟᱹᱭ", "mundari": "ᱜᱟᱹᱭ / ᱩᱨᱤᱜ", "english": "Cow", "icon": "🐄"},
        {"id": "an4", "front": "Tiger", "hindi": "बाघ", "santali": "ᱛᱟᱹᱨᱩᱵ", "ho": "ᱠᱩᱞᱟ", "mundari": "ᱠᱩᱞᱟ", "english": "Tiger", "icon": "🐅"},
        {"id": "an5", "front": "Elephant", "hindi": "हाथी", "santali": "ᱦᱟᱹᱛᱤ", "ho": "ᱦᱟᱹᱛᱤ", "mundari": "ᱦᱟᱹᱛᱤ", "english": "Elephant", "icon": "🐘"},
    ],
    "Birds": [
        {"id": "b1", "front": "Crow", "hindi": "कौआ", "santali": "ᱠᱟᱣᱟ", "ho": "ᱠᱟᱣᱟ", "mundari": "ᱠᱟᱣᱟ", "english": "Crow", "icon": "🐦‍⬛"},
        {"id": "b2", "front": "Pigeon", "hindi": "कबूतर", "santali": "ᱯᱩᱛᱟᱹᱢ", "ho": "ᱯᱩᱛᱟᱹᱢ", "mundari": "ᱯᱩᱛᱟᱹᱢ", "english": "Pigeon", "icon": "🕊️"},
        {"id": "b3", "front": "Peacock", "hindi": "मोर", "santali": "ᱢᱟᱨᱟᱜ", "ho": "ᱢᱟᱨᱟᱜ", "mundari": "ᱢᱟᱨᱟᱜ", "english": "Peacock", "icon": "🦚"},
        {"id": "b4", "front": "Hen", "hindi": "मुर्गी", "santali": "ᱥᱤᱢ", "ho": "ᱥᱤᱢ", "mundari": "ᱥᱤᱢ", "english": "Hen", "icon": "🐔"},
    ],
    "Fruits": [
        {"id": "f1", "front": "Apple", "hindi": "सेब", "santali": "ᱥᱮᱣ", "ho": "ᱥᱮᱣ", "mundari": "ᱥᱮᱣ", "english": "Apple", "icon": "🍎"},
        {"id": "f2", "front": "Mango", "hindi": "आम", "santali": "ᱩᱞ", "ho": "ᱩᱞ", "mundari": "ᱩᱞ", "english": "Mango", "icon": "🥭"},
        {"id": "f3", "front": "Banana", "hindi": "केला", "santali": "ᱠᱟᱭᱨᱟ", "ho": "ᱠᱟᱫᱟᱞ", "mundari": "ᱠᱟᱫᱟᱞ", "english": "Banana", "icon": "🍌"},
        {"id": "f4", "front": "Orange", "hindi": "संतरा", "santali": "ᱠᱚᱢᱚᱞᱟ", "ho": "ᱠᱚᱢᱚᱞᱟ", "mundari": "ᱠᱚᱢᱚᱞᱟ", "english": "Orange", "icon": "🍊"},
    ],
    "Vegetables": [
        {"id": "v1", "front": "Potato", "hindi": "आलू", "santali": "ᱟᱹᱞᱩ", "ho": "ᱟᱹᱞᱩ", "mundari": "ᱟᱹᱞᱩ", "english": "Potato", "icon": "🥔"},
        {"id": "v2", "front": "Tomato", "hindi": "टमाटर", "santali": "ᱵᱤᱞᱟᱹᱛᱤ", "ho": "ᱵᱤᱞᱟᱹᱛᱤ", "mundari": "ᱵᱤᱞᱟᱹᱛᱤ", "english": "Tomato", "icon": "🍅"},
        {"id": "v3", "front": "Onion", "hindi": "प्याज़", "santali": "ᱯᱮᱭᱟᱸᱡᱽ", "ho": "ᱯᱮᱭᱟᱸᱡᱽ", "mundari": "ᱯᱮᱭᱟᱸᱡᱽ", "english": "Onion", "icon": "🧅"},
    ],
    "Body parts": [
        {"id": "bp1", "front": "Eye", "hindi": "आँख", "santali": "ᱢᱮᱫ", "ho": "ᱢᱮᱫ", "mundari": "ᱢᱮᱫ", "english": "Eye", "icon": "👁️"},
        {"id": "bp2", "front": "Ear", "hindi": "कान", "santali": "ᱞᱩᱛᱩᱨ", "ho": "ᱞᱩᱛᱩᱨ", "mundari": "ᱞᱩᱛᱩᱨ", "english": "Ear", "icon": "👂"},
        {"id": "bp3", "front": "Nose", "hindi": "नाक", "santali": "ᱢᱩᱸ", "ho": "ᱢᱩᱸ", "mundari": "ᱢᱩᱸ", "english": "Nose", "icon": "👃"},
        {"id": "bp4", "front": "Hand", "hindi": "हाथ", "santali": "ᱛᱤ", "ho": "ᱛᱤ", "mundari": "ᱛᱤ", "english": "Hand", "icon": "✋"},
        {"id": "bp5", "front": "Leg", "hindi": "पैर", "santali": "ᱡᱟᱝᱜᱟ", "ho": "ᱠᱟᱴᱟ", "mundari": "ᱠᱟᱴᱟ", "english": "Leg", "icon": "🦵"},
        {"id": "bp6", "front": "Head", "hindi": "सिर", "santali": "ᱵᱚᱦᱚᱜ", "ho": "ᱵᱚ", "mundari": "ᱵᱚᱦᱚᱜ", "english": "Head", "icon": "👦"},
    ],
    "Family": [
        {"id": "fm1", "front": "Father", "hindi": "पिता / बाबा", "santali": "ᱵᱟᱵᱟ", "ho": "ᱟᱯᱟ", "mundari": "ᱟᱯᱩ", "english": "Father", "icon": "👨"},
        {"id": "fm2", "front": "Mother", "hindi": "माँ / अयो", "santali": "ᱟᱭᱳ", "ho": "ᱮᱸᱜᱟ", "mundari": "ᱮᱸᱜᱟ", "english": "Mother", "icon": "👩"},
        {"id": "fm3", "front": "Brother", "hindi": "भाई", "santali": "ᱵᱚᱭᱦᱟ", "ho": "ᱦᱟᱜᱟ", "mundari": "ᱦᱟᱜᱟ", "english": "Brother", "icon": "👦"},
        {"id": "fm4", "front": "Sister", "hindi": "बहन", "santali": "ᱢᱤᱥᱤ", "ho": "ᱢᱤᱥᱤ", "mundari": "ᱢᱤᱥᱤ", "english": "Sister", "icon": "👧"},
    ],
    "School": [
        {"id": "sc1", "front": "Book", "hindi": "किताब", "santali": "ᱯᱚᱛᱚᱵ", "ho": "ᱯᱚᱛᱚᱵ", "mundari": "ᱯᱚᱛᱚᱵ", "english": "Book", "icon": "📖"},
        {"id": "sc2", "front": "Pen", "hindi": "कलम", "santali": "ᱠᱚᱞᱚᱢ", "ho": "ᱠᱚᱞᱚᱢ", "mundari": "ᱠᱚᱞᱚᱢ", "english": "Pen", "icon": "🖊️"},
        {"id": "sc3", "front": "School", "hindi": "विद्यालय", "santali": "ᱟᱥᱲᱟ", "ho": "ᱟᱥᱲᱟ", "mundari": "ᱟᱥᱲᱟ", "english": "School", "icon": "🏫"},
        {"id": "sc4", "front": "Teacher", "hindi": "शिक्षक", "santali": "ᱢᱟᱪᱮᱛ", "ho": "ᱢᱟᱪᱮᱛ", "mundari": "ᱢᱟᱪᱮᱛ", "english": "Teacher", "icon": "👨‍🏫"},
        {"id": "sc5", "front": "Student", "hindi": "छात्र", "santali": "ᱯᱟᱹᱴᱷᱩᱣᱟᱹ", "ho": "ᱪᱮᱛᱮᱫᱤᱭᱟᱹ", "mundari": "ᱪᱮᱛᱮᱫᱤᱭᱟᱹ", "english": "Student", "icon": "🎒"},
    ],
    "Nature": [
        {"id": "nt1", "front": "Water", "hindi": "पानी", "santali": "ᱫᱟᱜ", "ho": "ᱫᱟᱜ", "mundari": "ᱫᱟᱜ", "english": "Water", "icon": "💧"},
        {"id": "nt2", "front": "Tree", "hindi": "पेड़", "santali": "ᱫᱟᱨᱮ", "ho": "ᱫᱟᱨᱩ", "mundari": "ᱫᱟᱨᱩ", "english": "Tree", "icon": "🌳"},
        {"id": "nt3", "front": "Sun", "hindi": "सूरज", "santali": "ᱥᱤᱸᱜᱤ", "ho": "ᱥᱤᱝᱜᱤ", "mundari": "ᱥᱤᱝᱜᱤ", "english": "Sun", "icon": "☀️"},
        {"id": "nt4", "front": "Moon", "hindi": "चाँद", "santali": "ᱪᱟᱸᱫᱚ", "ho": "ᱪᱟᱱᱫᱩ", "mundari": "ᱪᱟᱸᱫᱚ", "english": "Moon", "icon": "🌙"},
        {"id": "nt5", "front": "Flower", "hindi": "फूल", "santali": "ᱵᱟᱦᱟ", "ho": "ᱵᱟᱦᱟ", "mundari": "ᱵᱟᱦᱟ", "english": "Flower", "icon": "🌸"},
    ],
    "Food": [
        {"id": "fd1", "front": "Rice", "hindi": "चावल / भात", "santali": "ᱫᱟᱠᱟ", "ho": "ᱢᱟᱱᱰᱤ", "mundari": "ᱢᱟᱱᱰᱤ", "english": "Rice", "icon": "🍚"},
        {"id": "fd2", "front": "Salt", "hindi": "नमक", "santali": "ᱵᱩᱞᱩᱝ", "ho": "ᱵᱩᱞᱩᱝ", "mundari": "ᱵᱩᱞᱩᱝ", "english": "Salt", "icon": "🧂"},
        {"id": "fd3", "front": "Milk", "hindi": "दूध", "santali": "ᱛᱳᱣᱟ", "ho": "ᱛᱳᱣᱟ", "mundari": "ᱛᱳᱣᱟ", "english": "Milk", "icon": "🥛"},
    ],
}


@app.get("/api/flashcards")
def api_get_flashcards(category: Optional[str] = None):
    if category and category in FLASHCARDS_DATA:
        return {"success": True, "category": category, "cards": FLASHCARDS_DATA[category]}
    return {
        "success": True,
        "categories": list(FLASHCARDS_DATA.keys()),
        "data": FLASHCARDS_DATA,
    }


# ============================================================
# 12. BILINGUAL WORKSHEET GENERATOR
# ============================================================

class WorksheetRequest(BaseModel):
    class_level: int = Field(default=2, ge=1, le=5)
    subject: str = Field(default="Language")
    topic: str = Field(default="Numbers")
    difficulty: str = Field(default="Medium")
    num_questions: int = Field(default=4, ge=1, le=10)


WORKSHEET_TEMPLATES = {
    "Numbers": [
        {"q_en": "Write the number 5.", "q_hi": "संख्या 5 लिखिए।", "q_sat": "ᱮᱞ ᱕ ᱚᱞ ᱢᱮ ᱾", "ans": "᱕ (5)"},
        {"q_en": "Count the objects and write.", "q_hi": "वस्तुओं को गिनिए और लिखिए।", "q_sat": "ᱡᱤᱱᱤᱥ ᱠᱚ ᱞᱮᱠᱷᱟᱭ ᱢᱮ ᱟᱨ ᱚᱞ ᱢᱮ ᱾", "ans": "ᱞᱮᱠᱷᱟ"},
        {"q_en": "What comes after 2?", "q_hi": "2 के बाद क्या आता है?", "q_sat": "᱒ ᱛᱟᱭᱚᱢ ᱪᱮᱫ ᱦᱤᱡᱩᱜᱼᱟ?", "ans": "᱓ (3)"},
        {"q_en": "How many hands do you have?", "q_hi": "आपके कितने हाथ हैं?", "q_sat": "ᱟᱢᱟᱜ ᱛᱤᱱᱟᱹᱜ ᱛᱤ ᱢᱮᱱᱟᱜᱼᱟ?", "ans": "ᱵᱟᱨ (2)"},
        {"q_en": "Write number 10 in Ol Chiki.", "q_hi": "ओल चिकी में 10 लिखिए।", "q_sat": "ᱚᱞ ᱪᱤᱠᱤ ᱛᱮ ᱑᱐ ᱚᱞ ᱢᱮ ᱾", "ans": "᱑᱐"},
    ],
    "Animals": [
        {"q_en": "Name the domestic animal that barks.", "q_hi": "भौंकने वाले पालतू जानवर का नाम लिखिए।", "q_sat": "ᱵᱷᱩᱜᱼᱟᱱ ᱚᱲᱟᱜ ᱡᱤᱭᱟᱹᱞᱤ ᱧᱩᱛᱩᱢ ᱚᱞ ᱢᱮ ᱾", "ans": "ᱥᱮᱛᱟ (Dog)"},
        {"q_en": "Which animal gives us milk?", "q_hi": "हमें दूध कौन सा जानवर देता है?", "q_sat": "ᱵᱚᱱ ᱛᱳᱣᱟ ᱚᱠᱚᱭ ᱡᱤᱭᱟᱹᱞᱤ ᱮᱢᱟ ᱵᱚᱱᱟ?", "ans": "ᱜᱟᱹᱭ (Cow)"},
        {"q_en": "Who is the king of the jungle?", "q_hi": "जंगल का राजा कौन है?", "q_sat": "ᱵᱤᱨ ᱨᱤᱱᱤᱡ ᱨᱟᱡᱟ ᱫᱚ ᱚᱠᱚᱭ ᱠᱟᱱᱟᱭ?", "ans": "ᱛᱟᱹᱨᱩᱵ (Tiger/Lion)"},
        {"q_en": "Match Cat with Santali name.", "q_hi": "बिल्ली को संताली नाम से मिलाइए।", "q_sat": "ᱵᱤᱞᱞᱤ ᱫᱚ ᱥᱟᱱᱛᱟᱲᱤ ᱧᱩᱛᱩᱢ ᱥᱟᱶ ᱡᱚᱲᱟᱣ ᱢᱮ ᱾", "ans": "ᱯᱩᱥᱤ"},
    ],
    "School": [
        {"q_en": "What do you read in school?", "q_hi": "आप स्कूल में क्या पढ़ते हैं?", "q_sat": "ᱟᱥᱲᱟ ᱨᱮ ᱟᱢ ᱪᱮᱫ ᱮᱢ ᱯᱟᱲᱦᱟᱣᱼᱟ?", "ans": "ᱯᱚᱛᱚᱵ (Book)"},
        {"q_en": "Who teaches you in school?", "q_hi": "विद्यालय में आपको कौन पढ़ाता है?", "q_sat": "ᱟᱥᱲᱟ ᱨᱮ ᱚᱠᱚᱭ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱢᱮᱭᱟ?", "ans": "ᱢᱟᱪᱮᱛ (Teacher)"},
        {"q_en": "What do you use to write?", "q_hi": "लिखने के लिए आप क्या उपयोग करते हैं?", "q_sat": "ᱚᱞ ᱞᱟᱹᱜᱤᱫ ᱪᱮᱫ ᱮᱢ ᱵᱮᱵᱷᱟᱨᱟ?", "ans": "ᱠᱚᱞᱚᱢ (Pen/Pencil)"},
    ],
    "Nature": [
        {"q_en": "What gives us light during daytime?", "q_hi": "दिन में हमें रोशनी कौन देता है?", "q_sat": "ᱥᱤᱧ ᱵᱮᱲᱟ ᱚᱠᱚᱭ ᱢᱟᱨᱥᱟᱞ ᱮᱢᱟ ᱵᱚᱱᱟ?", "ans": "ᱥᱤᱸᱜᱤ (Sun)"},
        {"q_en": "What is essential for life to drink?", "q_hi": "पीने के लिए जीवन के लिए क्या आवश्यक है?", "q_sat": "ᱧᱩ ᱞᱟᱹᱜᱤᱫ ᱡᱤᱣᱤ ᱨᱮ ᱪᱮᱫ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ?", "ans": "ᱫᱟᱜ (Water)"},
    ]
}


@app.post("/api/worksheet/generate")
def api_generate_worksheet(req: WorksheetRequest):
    questions_pool = WORKSHEET_TEMPLATES.get(req.topic, WORKSHEET_TEMPLATES["Numbers"])
    selected = questions_pool[:req.num_questions]

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>JANANI Bilingual Worksheet - Class {req.class_level}</title>
        <style>
            body {{ font-family: sans-serif; margin: 40px; color: #1e293b; }}
            .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }}
            .title {{ font-size: 24px; font-weight: bold; color: #1e3a8a; }}
            .meta {{ font-size: 14px; color: #64748b; margin-top: 4px; }}
            .question-box {{ margin-bottom: 24px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }}
            .q-num {{ font-weight: bold; color: #2563eb; }}
            .q-hi {{ font-size: 16px; margin: 4px 0; color: #334155; }}
            .q-sat {{ font-size: 20px; font-weight: bold; color: #0f172a; margin: 6px 0; font-family: 'Nirmala UI', sans-serif; }}
            .answer-line {{ margin-top: 14px; border-bottom: 1px dashed #94a3b8; height: 30px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">JANANI Bilingual Worksheet / ᱵᱟᱨ ᱯᱟᱹᱨᱥᱤ ᱠᱟᱹᱢᱤ ᱥᱟᱠᱟᱢ</div>
            <div class="meta">Class: {req.class_level} | Subject: {req.subject} | Topic: {req.topic} | Difficulty: {req.difficulty}</div>
            <div class="meta">Student Name / ᱪᱮᱛᱮᱫᱤᱭᱟᱹ ᱧᱩᱛᱩᱢ: ___________________ Date / ᱢᱟᱹᱦᱤᱛ: _________</div>
        </div>
    """
    for i, q in enumerate(selected, start=1):
        html_content += f"""
        <div class="question-box">
            <div class="q-num">Q{i}. {q['q_en']}</div>
            <div class="q-hi">Hindi: {q['q_hi']}</div>
            <div class="q-sat">Santali (Ol Chiki): {q['q_sat']}</div>
            <div class="answer-line">Answer / ᱛᱮᱞᱟ: </div>
        </div>
        """
    html_content += "</body></html>"

    worksheet_id = f"ws_{uuid.uuid4().hex[:8]}"
    worksheet_file = OUTPUT_DIR / f"{worksheet_id}.html"
    with open(worksheet_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    return {
        "success": True,
        "worksheet_id": worksheet_id,
        "class_level": req.class_level,
        "subject": req.subject,
        "topic": req.topic,
        "difficulty": req.difficulty,
        "questions": selected,
        "html_url": f"/outputs/{worksheet_file.name}",
    }


# ============================================================
# 13. LESSON GENERATOR WITH NIPUN BHARAT ALIGNMENT
# ============================================================

class LessonGenRequest(BaseModel):
    class_level: int = Field(default=2, ge=1, le=5)
    subject: str = Field(default="Language")
    topic: str = Field(default="Numbers")
    learning_outcome: str = Field(default="Foundational Numeracy")
    source_language: str = Field(default="hin_Deva")
    source_text: str = Field(...)
    target_language: str = Field(default="Santali")


@app.post("/api/lesson/generate")
def api_generate_lesson(req: LessonGenRequest):
    ensure_ready()
    clean_text_input = clean_text(req.source_text)
    if not clean_text_input:
        raise HTTPException(status_code=400, detail="source_text cannot be empty.")

    try:
        source_language_code = normalize_source_language(req.source_language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Generate Santali translation & DhVaani Audio
    audio_filename = None
    try:
        with MODEL_LOCK:
            santali_text, audio_filename = run_full_pipeline(
                clean_text_input, source_language_code,
                state.tokenizer, state.translation_model, state.processor, state.tts,
            )
    except Exception as e:
        print(f"Pipeline error in lesson generator: {e}")
        santali_text = clean_text_input

    # 2. Generate Ho and Mundari translations via TribalTranslator
    try:
        from services.tribal_translation import TribalTranslator
        tt = TribalTranslator.get_instance()
        ho_res = tt.translate_to_ho(clean_text_input, source_language_code)
        ho_text = ho_res.get("warang_citi") or ho_res.get("translated_text", "")
        ho_roman = ho_res.get("roman_text", "")

        mun_res = tt.translate_to_mundari(clean_text_input, source_language_code)
        mundari_text = mun_res.get("translated_text", "")
        mun_roman = mun_res.get("roman_text", "")
    except Exception as e:
        print(f"Tribal translation error: {e}")
        ho_text = ""
        ho_roman = ""
        mundari_text = ""
        mun_roman = ""

    # Generate structured bilingual activities and assessments
    activities = [
        {"name": "Oral Echo / ᱞᱟᱹᱭ ᱟᱹᱨᱩ / ᱫᱩᱨᱟᱹᱝ", "instruction": "Teacher reads aloud in tribal language, children repeat with rhythm and intonation three times."},
        {"name": "Word Card Match / ᱠᱟᱨᱰ ᱡᱚᱲᱟᱣ", "instruction": "Match the tribal language card with the physical object or classroom illustration."},
        {"name": "Action Game / ᱠᱟᱹᱢᱤ ᱠᱷᱮᱞᱚᱸᱰ", "instruction": "Children demonstrate or count items physically in the classroom."}
    ]

    target_lang = req.target_language.capitalize()
    primary_text = santali_text
    if "Ho" in target_lang:
        primary_text = ho_text or ho_roman
    elif "Mundari" in target_lang:
        primary_text = mundari_text or mun_roman

    assessments = [
        {"q": f"What is the {target_lang} expression for: '{clean_text_input[:40]}'?", "ans": primary_text},
        {"q": f"Recognize and point to the corresponding {target_lang} script symbol on the board.", "ans": "Visual evaluation"}
    ]

    lesson_record = {
        "id": f"les_{uuid.uuid4().hex[:8]}",
        "date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "class_level": req.class_level,
        "subject": req.subject,
        "topic": req.topic,
        "learning_outcome": req.learning_outcome,
        "source_language": get_language_label(source_language_code),
        "source_text": clean_text_input,
        "target_language": target_lang,
        "santali_text": santali_text,
        "ho_text": ho_text,
        "ho_roman": ho_roman,
        "mundari_text": mundari_text,
        "mundari_roman": mun_roman,
        "audio_url": f"/api/audio/{audio_filename}" if audio_filename else None,
        "activities": activities,
        "assessments": assessments,
    }

    return {"success": True, "lesson": lesson_record}


# ============================================================
# 14. LOCAL LESSON HISTORY (OFFLINE PERSISTENCE)
# ============================================================

LESSON_HISTORY_FILE = OUTPUT_DIR / "lesson_history.json"


def read_history():
    import json
    if LESSON_HISTORY_FILE.exists():
        try:
            with open(LESSON_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def write_history(records):
    import json
    with open(LESSON_HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


@app.get("/api/history")
def api_get_history():
    records = read_history()
    return {"success": True, "count": len(records), "history": records}


@app.post("/api/history")
def api_save_history(record: dict):
    records = read_history()
    if "id" not in record:
        record["id"] = f"hist_{uuid.uuid4().hex[:8]}"
    if "date" not in record:
        record["date"] = time.strftime("%Y-%m-%d %H:%M:%S")
    records.insert(0, record)
    # keep last 100
    write_history(records[:100])
    return {"success": True, "record": record}


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=2004, reload=False)