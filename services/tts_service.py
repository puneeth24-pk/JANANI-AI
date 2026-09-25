"""
JANANI Text-to-Speech Service (DhVaani)
Synthesizes Santali (Ol Chiki) text into natural audio using DhVaani voice cloning.
"""

import os
import sys
import re
import time
import threading
from pathlib import Path
from typing import Optional, List, Tuple
import numpy as np
from scipy.io import wavfile
import torch

BASE_DIR = Path(__file__).resolve().parent.parent
DHVAANI_DIR = BASE_DIR / "DhVaani-0.5"
DEFAULT_REF_WAV = DHVAANI_DIR / "samples" / "hindi.wav"
DEFAULT_REF_TEXT = "इसे कईबार मनचित भी की आगया है"

if torch.backends.mps.is_available():
    TTS_DEVICE = "mps"
elif torch.cuda.is_available():
    TTS_DEVICE = "cuda"
else:
    TTS_DEVICE = "cpu"

# Default synthesis hyperparameters (optimized for natural, clear articulation)
DEFAULT_STEPS = int(os.getenv("TTS_STEPS", "14"))
DEFAULT_GUIDANCE = float(os.getenv("TTS_GUIDANCE", "1.1"))
DEFAULT_SPEED = float(os.getenv("TTS_SPEED", "0.92"))
DEFAULT_SEED = 666
SILENCE_SECONDS = 0.14
CHUNK_WORD_SIZE = 12


def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_text_chunks(text: str, max_words: int = CHUNK_WORD_SIZE, min_words: int = 4) -> List[str]:
    """
    Intelligently splits Santali Ol Chiki / multilingual text into natural breath clauses.
    Preserves phrase context and punctuation so DhVaani sounds natural on large sentences.
    """
    text = clean_text(text)
    if not text:
        return []

    # First split by full sentence terminators
    sentences = re.split(r"(?<=[.!?।॥\n])\s+", text)
    chunks = []

    for s in sentences:
        s = clean_text(s)
        if not s:
            continue

        words = s.split()
        if len(words) <= max_words:
            chunks.append(s)
            continue

        # Split longer sentences by natural pause punctuation (comma, semicolon, dash, colon)
        subparts = re.split(r"(?<=[,;:\-–—])\s+", s)
        current = []
        for part in subparts:
            part_words = part.split()
            if not part_words:
                continue
            if len(current) + len(part_words) <= max_words:
                current.extend(part_words)
            else:
                if current:
                    chunks.append(" ".join(current))
                    current = []
                if len(part_words) <= max_words:
                    current.extend(part_words)
                else:
                    for w in part_words:
                        current.append(w)
                        if len(current) >= max_words:
                            chunks.append(" ".join(current))
                            current = []
        if current:
            # Merge trailing tiny fragment into previous chunk if within word budget
            if len(current) < min_words and chunks and (len(chunks[-1].split()) + len(current) <= max_words + 3):
                chunks[-1] = chunks[-1] + " " + " ".join(current)
            else:
                chunks.append(" ".join(current))

    return chunks if chunks else [text]


class TTSService:
    def __init__(self, device: str = TTS_DEVICE):
        self.device = device
        self.tts = None
        self.is_ready = False
        self._lock = threading.Lock()

    def load(self):
        with self._lock:
            if self.is_ready:
                return

            if not DHVAANI_DIR.exists():
                raise FileNotFoundError(f"DhVaani directory not found: {DHVAANI_DIR}")

            if str(DHVAANI_DIR) not in sys.path:
                sys.path.insert(0, str(DHVAANI_DIR))

            print(f"🔊 Loading DhVaani TTS on {self.device}...")
            start = time.perf_counter()

            try:
                from dhvaani import DhVaani
                self.tts = DhVaani(model_dir=DHVAANI_DIR, device=self.device)
                self.is_ready = True
                elapsed = time.perf_counter() - start
                print(f"✅ DhVaani TTS ready ({elapsed:.2f}s)")
            except Exception as e:
                print(f"❌ DhVaani failed to load: {e}")
                raise RuntimeError(f"DhVaani loading error: {e}") from e

    def unload(self):
        """Unloads DhVaani model to free RAM on memory-constrained devices."""
        with self._lock:
            if not self.is_ready:
                return
            print("🧹 Unloading DhVaani TTS to free memory...")
            self.tts = None
            self.is_ready = False
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def synthesize_chunk(
        self,
        text: str,
        output_path: str | Path,
        ref_wav: Optional[Path] = None,
        ref_text: Optional[str] = None,
        steps: int = DEFAULT_STEPS,
        guidance: float = DEFAULT_GUIDANCE,
        speed: float = DEFAULT_SPEED,
        seed: int = DEFAULT_SEED,
    ) -> float:
        if not self.is_ready:
            self.load()

        ref_wav = ref_wav or DEFAULT_REF_WAV
        ref_text = ref_text or DEFAULT_REF_TEXT

        start = time.perf_counter()
        with self._lock:
            self.tts.synthesize(
                text=text,
                prompt_wav=str(ref_wav),
                prompt_text=ref_text,
                out_path=str(output_path),
                num_step=steps,
                guidance_scale=guidance,
                speed=speed,
                seed=seed,
            )
        return time.perf_counter() - start

    def synthesize_full(
        self,
        text: str,
        output_path: str | Path,
        ref_wav: Optional[Path] = None,
        steps: int = DEFAULT_STEPS,
        speed: float = DEFAULT_SPEED,
    ) -> dict:
        """Synthesizes arbitrary length Santali text, joining chunks with natural pauses."""
        if not self.is_ready:
            self.load()

        chunks = split_text_chunks(text)
        if not chunks:
            raise ValueError("No text provided for TTS synthesis")

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Single chunk fast-path
        if len(chunks) == 1:
            elapsed = self.synthesize_chunk(
                text=chunks[0],
                output_path=output_path,
                ref_wav=ref_wav,
                steps=steps,
                speed=speed,
            )
            try:
                sr, d = wavfile.read(str(output_path))
                d = d.astype(np.float32)
                p = np.max(np.abs(d))
                if p > 0:
                    d = (d / p) * 0.89
                wavfile.write(str(output_path), sr, (d * 32767).astype(np.int16))
            except Exception:
                pass
            return {
                "output_path": str(output_path),
                "chunks": 1,
                "elapsed_seconds": round(elapsed, 2),
            }

        # Multi-chunk synthesis
        temp_dir = output_path.parent / f"tmp_{output_path.stem}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        chunk_files = []
        t0 = time.perf_counter()

        try:
            for i, chunk in enumerate(chunks):
                chunk_file = temp_dir / f"chunk_{i:03d}.wav"
                self.synthesize_chunk(
                    text=chunk,
                    output_path=chunk_file,
                    ref_wav=ref_wav,
                    steps=steps,
                    speed=speed,
                )
                chunk_files.append(chunk_file)

            # Concatenate with natural acoustic pauses and anti-click micro-fades
            merged_audio = []
            sample_rate = 24000

            for i, (c_file, c_text) in enumerate(zip(chunk_files, chunks)):
                sr, data = wavfile.read(str(c_file))
                sample_rate = sr
                data = data.astype(np.float32)

                # Micro 5ms fade-in/out to prevent audio pops at boundaries
                fade_len = int(0.005 * sr)
                if len(data) > 2 * fade_len:
                    fade_in = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
                    fade_out = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
                    data[:fade_len] *= fade_in
                    data[-fade_len:] *= fade_out

                merged_audio.append(data)

                if i < len(chunk_files) - 1:
                    # Natural breath pause: 220ms for full sentence stop, 120ms for comma/clause
                    stripped = c_text.strip()
                    if stripped.endswith((".", "!", "?", "।", "॥")):
                        pause_sec = 0.22
                    elif stripped.endswith((",", ";", ":", "-")):
                        pause_sec = 0.12
                    else:
                        pause_sec = 0.14

                    silence = np.zeros(int(sample_rate * pause_sec), dtype=np.float32)
                    merged_audio.append(silence)

            final_data = np.concatenate(merged_audio)

            # Peak normalization (-1.0 dB / 0.89) to prevent clipping & ensure crystal clear volume
            peak = np.max(np.abs(final_data))
            if peak > 0:
                final_data = (final_data / peak) * 0.89

            # Convert back to int16 for universal player compatibility
            final_int16 = (final_data * 32767).astype(np.int16)
            wavfile.write(str(output_path), sample_rate, final_int16)

            total_elapsed = time.perf_counter() - t0
            return {
                "output_path": str(output_path),
                "chunks": len(chunks),
                "elapsed_seconds": round(total_elapsed, 2),
            }
        finally:
            # Clean up temp chunks
            for f in chunk_files:
                if f.exists():
                    f.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()


_tts_instance: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = TTSService()
    return _tts_instance
