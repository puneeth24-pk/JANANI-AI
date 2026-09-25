"""
Santali Mother-Tongue Teaching Assistant — Streamlit version
--------------------------------------------------------------
English/Hindi (speech or text) -> Whisper -> IndicTrans2 -> Santali (Ol Chiki)
-> DhVaani TTS -> playable/downloadable Santali voice.

Run with:
    streamlit run app.py

Folder layout expected (same as the original CLI script):
    app.py
    .env                        (optional)
    DhVaani-0.5/
        model.safetensors
        samples/hindi.wav
        dhvaani.py               (the DhVaani model code)
    outputs/                    (auto-created)
    outputs/recordings/         (auto-created)
"""

import os
import re
import sys
import time
import numpy as np
from pathlib import Path
from datetime import datetime

import torch
import whisper
import soundfile as sf
import streamlit as st

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
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


# ============================================================
# MODEL / DEVICE CONFIG
# ============================================================

INDICTRANS_MODEL_ID = "ai4bharat/indictrans2-indic-indic-dist-320M"
INDICTRANS_LOCAL_DIR = os.getenv("INDICTRANS_LOCAL_DIR", "").strip()
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "small").strip()

WHISPER_DEVICE = "cpu"  # matches the stable CLI setup

if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

TTS_STEPS = int(os.getenv("TTS_STEPS", "8"))
TTS_GUIDANCE = float(os.getenv("TTS_GUIDANCE", "1.0"))
TTS_SPEED = float(os.getenv("TTS_SPEED", "1.0"))
TTS_SEED = 666

SAMPLE_RATE = 16000

LANG_ENGLISH = "eng_Latn"
LANG_HINDI = "hin_Deva"
LANG_SANTALI = "sat_Olck"

WHISPER_ENGLISH = "en"
WHISPER_HINDI = "hi"


# ============================================================
# TEXT HELPERS
# ============================================================

def clean_text(text):
    if not text:
        return ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_transcription(text):
    text = clean_text(text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return text


def is_valid_olchiki(text):
    if not text:
        return False
    olchiki_chars = len(re.findall(r"[\u1C50-\u1C7F]", text))
    total_letters = len(re.findall(r"\S", text))
    if total_letters == 0:
        return False
    return (olchiki_chars / total_letters) >= 0.45


def split_fast(text):
    """Break input into small ~8-14 word chunks so TTS can start early."""
    text = clean_text(text)
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?।॥])\s+", text)
    result = []

    for sentence in sentences:
        sentence = clean_text(sentence)
        if not sentence:
            continue

        words = sentence.split()
        current = []

        for word in words:
            current.append(word)
            if len(current) >= 10:
                result.append(" ".join(current))
                current = []

        if current:
            result.append(" ".join(current))

    return result


def normalize_audio(audio):
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0:
        return audio
    peak = np.max(np.abs(audio))
    if peak > 0.98:
        audio = audio / peak * 0.98
    return audio


def get_reference_text():
    return "इसे कईबार मनचित भी की आगया है"


# ============================================================
# CACHED MODEL LOADERS (loaded once per server process)
# ============================================================

@st.cache_resource(show_spinner=False)
def load_whisper_model():
    return whisper.load_model(WHISPER_MODEL_NAME, device=WHISPER_DEVICE)


def resolve_indictrans_source():
    if INDICTRANS_LOCAL_DIR:
        local_path = Path(INDICTRANS_LOCAL_DIR)
        if local_path.exists():
            return str(local_path)
    return INDICTRANS_MODEL_ID


@st.cache_resource(show_spinner=False)
def load_indictrans_model():
    source = resolve_indictrans_source()

    tokenizer = AutoTokenizer.from_pretrained(
        source, trust_remote_code=True, local_files_only=True
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(
        source, trust_remote_code=True, local_files_only=True
    )
    model = model.to(DEVICE)
    model.eval()

    processor = IndicProcessor(inference=True)
    return tokenizer, model, processor


@st.cache_resource(show_spinner=False)
def load_dhvaani_model():
    sys.path.insert(0, str(DHVAANI_DIR))
    from dhvaani import DhVaani  # local module inside DhVaani-0.5

    return DhVaani(model_dir=DHVAANI_DIR, device=DEVICE)


# ============================================================
# TRANSLATION
# ============================================================

def translate_sentence(sentence, source_language, tokenizer, model, processor):
    sentence = clean_text(sentence)
    if not sentence:
        return ""

    batch = processor.preprocess_batch(
        [sentence], src_lang=source_language, tgt_lang=LANG_SANTALI
    )

    inputs = tokenizer(
        batch, padding=True, truncation=True, max_length=128, return_tensors="pt"
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

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


# ============================================================
# TTS
# ============================================================

def generate_tts_chunk(tts, santali_text, output_path):
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


# ============================================================
# FULL PIPELINE (translate + speak, chunk by chunk)
# ============================================================

def run_pipeline(teacher_text, source_language, tokenizer, translation_model,
                  processor, tts, status_box, progress_bar):
    chunks = split_fast(teacher_text)
    if not chunks:
        return None, None

    translated_chunks = []
    all_audio = []
    sample_rate_out = None
    total = len(chunks)

    for i, chunk in enumerate(chunks, start=1):
        status_box.markdown(f"**Part {i}/{total}** — 👨‍🏫 _{chunk}_")

        t0 = time.perf_counter()
        santali = translate_sentence(
            chunk, source_language, tokenizer, translation_model, processor
        )
        t1 = time.perf_counter()

        if not santali:
            status_box.markdown(f"❌ Empty translation for part {i}, skipped.")
            progress_bar.progress(i / total)
            continue

        if not is_valid_olchiki(santali):
            status_box.markdown(f"⚠️ Ol Chiki validation warning on part {i}.")

        status_box.markdown(f"📚 Santali ({t1 - t0:.2f}s): {santali}")
        translated_chunks.append(santali)

        temp_path = OUTPUT_DIR / f"_fast_{i}.wav"
        t2 = time.perf_counter()
        try:
            generate_tts_chunk(tts, santali, temp_path)
        except Exception as e:
            status_box.markdown(f"❌ TTS failed on part {i}: {e}")
            progress_bar.progress(i / total)
            continue
        t3 = time.perf_counter()
        status_box.markdown(f"🔊 Voice generated in {t3 - t2:.2f}s")

        try:
            audio, sr = sf.read(str(temp_path), dtype="float32")
            if audio.ndim > 1:
                audio = np.mean(audio, axis=1)
            all_audio.append((audio, sr))
            sample_rate_out = sr
        except Exception as e:
            status_box.markdown(f"⚠️ Could not read generated audio: {e}")

        try:
            temp_path.unlink()
        except Exception:
            pass

        progress_bar.progress(i / total)

    translated_text = "\n".join(translated_chunks) if translated_chunks else None

    if not all_audio:
        return translated_text, None

    pieces = []
    for idx, (audio, sr) in enumerate(all_audio):
        pieces.append(normalize_audio(audio))
        if idx < len(all_audio) - 1:
            pieces.append(np.zeros(int(sr * 0.12), dtype=np.float32))

    final_audio = np.concatenate(pieces)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_path = OUTPUT_DIR / f"santali_{timestamp}.wav"
    sf.write(str(final_path), final_audio, sample_rate_out, subtype="PCM_16")

    return translated_text, str(final_path)


# ============================================================
# ENVIRONMENT CHECK
# ============================================================

def environment_errors():
    errors = []

    if not DHVAANI_DIR.exists():
        errors.append(f"DhVaani directory not found: `{DHVAANI_DIR}`")

    if not (DHVAANI_DIR / "model.safetensors").exists():
        errors.append("DhVaani `model.safetensors` not found.")

    if not REFERENCE_WAV.exists():
        errors.append(f"DhVaani reference voice not found: `{REFERENCE_WAV}`")

    if IndicProcessor is None:
        errors.append("`IndicTransToolkit` is not installed (`pip install IndicTransToolkit`).")

    return errors


# ============================================================
# STREAMLIT APP
# ============================================================

def main():
    st.set_page_config(
        page_title="Santali Mother-Tongue Teaching Assistant",
        page_icon="🗣️",
        layout="centered",
    )

    st.title("🗣️ Santali Mother-Tongue Teaching Assistant")
    st.caption("English / Hindi ➜ Whisper ➜ IndicTrans2 ➜ Santali (Ol Chiki) ➜ DhVaani Voice")

    errors = environment_errors()
    if errors:
        st.error("Environment check failed — fix these before continuing:")
        for e in errors:
            st.markdown(f"- {e}")
        st.stop()

    if "models_loaded" not in st.session_state:
        with st.spinner("Loading Whisper, IndicTrans2 and DhVaani (only happens once)..."):
            st.session_state["whisper_model"] = load_whisper_model()
            (
                st.session_state["tokenizer"],
                st.session_state["translation_model"],
                st.session_state["processor"],
            ) = load_indictrans_model()
            st.session_state["tts"] = load_dhvaani_model()
            st.session_state["models_loaded"] = True

    whisper_model = st.session_state["whisper_model"]
    tokenizer = st.session_state["tokenizer"]
    translation_model = st.session_state["translation_model"]
    processor = st.session_state["processor"]
    tts = st.session_state["tts"]

    with st.sidebar:
        st.header("⚙️ System")
        st.write(f"**Device:** {DEVICE}")
        st.write(f"**Whisper model:** {WHISPER_MODEL_NAME}")
        st.write(f"**TTS steps:** {TTS_STEPS}")
        st.write(f"**TTS guidance:** {TTS_GUIDANCE}")
        st.write(f"**TTS speed:** {TTS_SPEED}")
        st.success("✅ All models loaded")

    st.divider()

    language_label = st.radio(
        "Teacher's language", ["English", "Hindi"], horizontal=True
    )
    source_language = LANG_ENGLISH if language_label == "English" else LANG_HINDI
    whisper_language = WHISPER_ENGLISH if language_label == "English" else WHISPER_HINDI

    mode = st.radio("Input mode", ["🎤 Speak", "⌨️ Type"], horizontal=True)

    if "teacher_text" not in st.session_state:
        st.session_state["teacher_text"] = ""

    # --------------------------------------------------------
    # SPEECH INPUT
    # --------------------------------------------------------
    if mode == "🎤 Speak":
        prompt = "🎤 Speak English." if language_label == "English" else "🎤 हिंदी में बोलें।"
        st.write(prompt)

        audio_value = st.audio_input("Record your lesson")

        if audio_value is not None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            audio_path = RECORDING_DIR / f"teacher_{timestamp}.wav"
            with open(audio_path, "wb") as f:
                f.write(audio_value.getbuffer())

            if st.button("📝 Transcribe recording", type="primary"):
                with st.spinner("Transcribing..."):
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
                    text = clean_transcription(result.get("text", ""))

                if not text:
                    st.error("❌ No speech detected. Please record again, closer to the mic.")
                else:
                    st.session_state["teacher_text"] = text

    # --------------------------------------------------------
    # TEXT INPUT
    # --------------------------------------------------------
    else:
        label = "⌨️ Enter English lesson" if language_label == "English" else "⌨️ हिंदी में पाठ लिखें"
        typed = st.text_area(label, height=120, value=st.session_state.get("typed_text", ""))
        st.session_state["typed_text"] = typed

        if st.button("Use this text", type="primary"):
            if typed.strip():
                st.session_state["teacher_text"] = clean_text(typed)
            else:
                st.warning("Please type something first.")

    # --------------------------------------------------------
    # SHOW TEACHER TEXT + RUN PIPELINE
    # --------------------------------------------------------
    if st.session_state["teacher_text"]:
        st.divider()
        st.subheader("👨‍🏫 Teacher text")
        st.write(st.session_state["teacher_text"])

        if st.button("🚀 Translate & Speak in Santali", type="primary"):
            st.divider()
            st.subheader("⚡ Pipeline")
            status_box = st.empty()
            log_lines = st.container()
            progress_bar = st.progress(0.0)

            start_time = time.perf_counter()
            translated_text, final_audio_path = run_pipeline(
                st.session_state["teacher_text"],
                source_language,
                tokenizer,
                translation_model,
                processor,
                tts,
                log_lines,
                progress_bar,
            )
            total_time = time.perf_counter() - start_time

            st.divider()
            if translated_text:
                st.subheader("📚 Santali translation (Ol Chiki)")
                st.write(translated_text)
            else:
                st.error("Translation failed for all parts.")

            if final_audio_path:
                st.subheader("🔊 Santali voice")
                st.audio(final_audio_path)
                with open(final_audio_path, "rb") as f:
                    st.download_button(
                        "⬇️ Download Santali audio",
                        f,
                        file_name=Path(final_audio_path).name,
                        mime="audio/wav",
                    )
            else:
                st.warning("No audio was generated.")

            st.caption(f"⏱️ Total pipeline time: {total_time:.2f}s")


if __name__ == "__main__":
    main()