"""
JANANI Deterministic Runtime Manager
Coordinates startup benchmarks, deterministic engine selection, and
hot-path low-latency offline inference execution.
"""

import os
import time
import uuid
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from services.quantization_utils import get_hardware_info, get_supported_quantization_engines
from services.translation_benchmark import run_translation_benchmark, display_translation_banner
from services.asr_benchmark import run_asr_benchmark
from services.tts_benchmark import run_tts_benchmark
from services.translation_service import IndicTransEngine
from services.speech_service import SpeechService
from services.tts_service import TTSService

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "outputs"
LESSON_DIR = OUTPUT_DIR / "lessons"
RECORDING_DIR = OUTPUT_DIR / "recordings"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LESSON_DIR.mkdir(parents=True, exist_ok=True)
RECORDING_DIR.mkdir(parents=True, exist_ok=True)


class RuntimeManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.is_initialized = False
        self.hardware_info: Dict[str, Any] = {}
        self.supported_quant_engines = []

        self.translation_benchmark_results: Dict[str, Any] = {}
        self.asr_benchmark_results: Dict[str, Any] = {}
        self.tts_benchmark_results: Dict[str, Any] = {}

        self.selected_translation_name: str = ""
        self.selected_translation_engine: Optional[IndicTransEngine] = None

        self.selected_asr_name: str = ""
        self.selected_asr_engine: Optional[SpeechService] = None

        self.selected_tts_name: str = ""
        self.selected_tts_engine: Optional[TTSService] = None

    @classmethod
    def get_instance(cls) -> "RuntimeManager":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def initialize(self, skip_asr_tts_benchmarks_if_cached: bool = False):
        """
        Runs once at startup:
        1. Detects hardware and supported quantization engines.
        2. Benchmarks Translation PATH 1 vs PATH 2 and selects the fastest valid path.
        3. Displays the required startup banner.
        4. Benchmarks ASR candidates (Whisper vs IndicConformer) and selects the fastest valid.
        5. Benchmarks TTS (DhVaani) and selects the fastest valid.
        6. Keeps selected engines loaded in memory for all future requests.
        """
        with self._lock:
            if self.is_initialized:
                return

            print("\n" + "=" * 60)
            print("🚀 JANANI RUNTIME STARTUP INITIALIZATION")
            print("=" * 60)

            # 1. Hardware & Quantization detection
            self.hardware_info = get_hardware_info()
            self.supported_quant_engines = get_supported_quantization_engines()

            # 2. Translation benchmark (displays required banner)
            trans_res = run_translation_benchmark(print_banner=True)
            self.translation_benchmark_results = trans_res
            self.selected_translation_name = trans_res["selected_engine_name"]
            self.selected_translation_engine = trans_res["selected_instance"]

            # 3. ASR benchmark
            print("🔍 Evaluating ASR Candidates (Whisper vs IndicConformer)...")
            asr_res = run_asr_benchmark()
            self.asr_benchmark_results = asr_res
            self.selected_asr_name = asr_res["selected_engine_name"]
            self.selected_asr_engine = asr_res["selected_instance"]
            print(f"✅ Selected ASR Engine: {self.selected_asr_name} (Median: {asr_res['selected_median_ms']} ms)")

            # 4. TTS benchmark
            print("🔍 Evaluating Offline TTS (DhVaani)...")
            tts_res = run_tts_benchmark()
            self.tts_benchmark_results = tts_res
            self.selected_tts_name = tts_res["selected_engine_name"]
            self.selected_tts_engine = tts_res["selected_instance"]
            print(f"✅ Selected TTS Engine: {self.selected_tts_name} (Median: {tts_res['selected_median_ms']} ms)")

            self.is_initialized = True
            print("\n🌟 JANANI SYSTEM READY FOR LOW-LATENCY INFERENCE\n")

    def run_pipeline(
        self,
        text: Optional[str] = None,
        audio_path: Optional[Path] = None,
        source_language: str = "eng_Latn",
    ) -> Dict[str, Any]:
        """
        High-performance deterministic hot path:
        AUDIO -> FASTEST VALID ASR -> TEXT -> FASTEST VALID INDIC TRANS2 -> TRANSLATED TEXT -> FASTEST VALID TTS -> AUDIO RESPONSE
        Measures real ms latency for each stage.
        """
        if not self.is_initialized:
            self.initialize()

        t_pipeline_start = time.perf_counter()
        stt_ms = 0.0
        transcription = None
        source_text = ""

        # Step 1: ASR (if audio input)
        if audio_path is not None:
            t0 = time.perf_counter()
            asr_lang = "hi" if "hin" in source_language.lower() else "en"
            stt_res = self.selected_asr_engine.transcribe(audio_path, language=asr_lang)
            stt_ms = round((time.perf_counter() - t0) * 1000, 1)
            transcription = stt_res.get("text", "").strip()
            source_text = transcription
        else:
            source_text = (text or "").strip()

        if not source_text:
            raise ValueError("No speech or text provided to pipeline.")

        # Step 2: Translation
        t0 = time.perf_counter()
        santali_text = self.selected_translation_engine.translate(
            text=source_text,
            src_lang=source_language,
            tgt_lang="sat_Olck",
            num_beams=1,
            max_new_tokens=64,
        )
        translation_ms = round((time.perf_counter() - t0) * 1000, 1)

        # Step 3: TTS (Full synthesis with natural clause chunking & anti-click pauses)
        t0 = time.perf_counter()
        output_filename = f"lesson_{uuid.uuid4().hex[:12]}.wav"
        output_path = LESSON_DIR / output_filename
        self.selected_tts_engine.synthesize_full(
            text=santali_text,
            output_path=output_path,
        )
        tts_ms = round((time.perf_counter() - t0) * 1000, 1)

        total_ms = round((time.perf_counter() - t_pipeline_start) * 1000, 1)
        audio_url = f"/api/audio/{output_filename}"

        return {
            "success": True,
            "text": source_text,
            "translation": santali_text,
            "audio": audio_url,
            "engine": {
                "asr": self.selected_asr_name,
                "translation": self.selected_translation_name,
                "tts": self.selected_tts_name,
            },
            "timing": {
                "stt_ms": stt_ms,
                "translation_ms": translation_ms,
                "tts_ms": tts_ms,
                "total_ms": total_ms,
            },
            # Backwards compatibility fields for React Native frontend
            "source_text": source_text,
            "santali_text": santali_text,
            "audio_url": audio_url,
            "transcription": transcription,
            "source_language": source_language,
        }

    def get_system_status(self) -> Dict[str, Any]:
        """Provides comprehensive system, benchmark, and readiness details for GET /system/status."""
        if not self.is_initialized:
            self.initialize()

        p1 = self.translation_benchmark_results.get("path1", {})
        p2 = self.translation_benchmark_results.get("path2", {})
        asr_cands = self.asr_benchmark_results.get("candidates", {})
        tts_cands = self.tts_benchmark_results.get("candidates", {})

        return {
            "hardware": self.hardware_info,
            "supported_quantization_engines": self.supported_quant_engines,
            "available_asr_engines": {
                k: {
                    "name": v.get("name"),
                    "status": v.get("status"),
                    "reason": v.get("reason"),
                    "median_ms": v.get("median_ms"),
                    "p95_ms": v.get("p95_ms"),
                }
                for k, v in asr_cands.items()
            },
            "available_translation_engines": {
                "path1_cpu_int8": {
                    "name": p1.get("name"),
                    "status": p1.get("status"),
                    "reason": p1.get("reason"),
                    "median_ms": p1.get("median_ms"),
                    "p95_ms": p1.get("p95_ms"),
                },
                "path2_qnnpack_int8": {
                    "name": p2.get("name"),
                    "status": p2.get("status"),
                    "reason": p2.get("reason"),
                    "median_ms": p2.get("median_ms"),
                    "p95_ms": p2.get("p95_ms"),
                },
            },
            "available_tts_engines": {
                k: {
                    "name": v.get("name"),
                    "status": v.get("status"),
                    "reason": v.get("reason"),
                    "median_ms": v.get("median_ms"),
                    "p95_ms": v.get("p95_ms"),
                }
                for k, v in tts_cands.items()
            },
            "selected_asr": self.selected_asr_name,
            "selected_translation": self.selected_translation_name,
            "selected_tts": self.selected_tts_name,
            "benchmark_results": {
                "translation": {
                    "path1": {
                        k: v for k, v in p1.items() if k != "engine_instance"
                    },
                    "path2": {
                        k: v for k, v in p2.items() if k != "engine_instance"
                    },
                },
                "asr": {
                    k: {k2: v2 for k2, v2 in v.items() if k2 != "instance"}
                    for k, v in asr_cands.items()
                },
                "tts": {
                    k: {k2: v2 for k2, v2 in v.items() if k2 != "instance"}
                    for k, v in tts_cands.items()
                },
            },
            "offline_mode": True,
            "model_readiness": {
                "translation": bool(self.selected_translation_engine and self.selected_translation_engine.is_ready),
                "asr": bool(self.selected_asr_engine and self.selected_asr_engine.is_ready),
                "tts": bool(self.selected_tts_engine and self.selected_tts_engine.is_ready),
                "all_ready": True,
            },
        }


def get_runtime_manager() -> RuntimeManager:
    return RuntimeManager.get_instance()
