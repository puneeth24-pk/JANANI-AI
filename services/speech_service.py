"""
JANANI Speech-to-Text Service (Whisper)
Transcribes Hindi and English speech audio to text.
"""

import os
import re
import time
import threading
from pathlib import Path
from typing import Optional, Dict

import whisper
import torch

BASE_DIR = Path(__file__).resolve().parent.parent

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = "cpu"

LANG_MAP = {
    "eng_Latn": "en",
    "hin_Deva": "hi",
    "english": "en",
    "hindi": "hi",
    "en": "en",
    "hi": "hi",
}


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


class SpeechService:
    def __init__(self, model_name: str = WHISPER_MODEL_NAME):
        self.model_name = model_name
        self.model = None
        self.is_ready = False
        self._lock = threading.Lock()

    def load(self):
        with self._lock:
            if self.is_ready:
                return

            print(f"🎙️ Loading Whisper ({self.model_name}) on {WHISPER_DEVICE}...")
            start = time.perf_counter()
            self.model = whisper.load_model(self.model_name, device=WHISPER_DEVICE)
            elapsed = time.perf_counter() - start
            self.is_ready = True
            print(f"✅ Whisper ready ({elapsed:.2f}s)")

    def unload(self):
        """Unloads Whisper model to free RAM on memory-constrained devices."""
        with self._lock:
            if not self.is_ready:
                return
            print("🧹 Unloading Whisper STT to free memory...")
            self.model = None
            self.is_ready = False
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def transcribe(self, audio_path: str | Path, language: str = "hi") -> Dict[str, str]:
        if not self.is_ready:
            self.load()

        whisper_lang = LANG_MAP.get(language, "hi")
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        start = time.perf_counter()
        with self._lock:
            result = self.model.transcribe(
                str(audio_path),
                language=whisper_lang,
                task="transcribe",
                temperature=0,
                condition_on_previous_text=False,
                no_speech_threshold=0.3,
                compression_ratio_threshold=2.4,
                logprob_threshold=-1.0,
                fp16=False,
                verbose=False,
            )

        elapsed = time.perf_counter() - start
        raw_text = result.get("text", "")
        cleaned = clean_transcription(raw_text)

        return {
            "text": cleaned,
            "language": whisper_lang,
            "elapsed_seconds": round(elapsed, 3),
        }


_speech_instance: Optional[SpeechService] = None


def get_speech_service() -> SpeechService:
    global _speech_instance
    if _speech_instance is None:
        _speech_instance = SpeechService()
    return _speech_instance
