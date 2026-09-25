"""
JANANI Offline TTS Benchmark & Selection System
Evaluates available offline TTS implementations (DhVaani).
Deterministically benchmarks warmup and measured latency.
"""

import time
import statistics
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

from services.tts_service import get_tts_service, TTSService

BASE_DIR = Path(__file__).resolve().parent.parent
BENCHMARK_OUTPUT_WAV = BASE_DIR / "outputs" / "benchmark_tts_sample.wav"
BENCHMARK_TEXT = "ᱦᱚᱞᱳ, ᱟᱢ ᱪᱮᱫ ᱞᱮᱠᱟ ᱠᱟᱱᱟ?"


def benchmark_dhvaani() -> Dict[str, Any]:
    """Benchmarks DhVaani offline TTS on standard short Santali sentence."""
    try:
        t_load = time.perf_counter()
        svc = get_tts_service()
        svc.load()
        load_time_s = round(time.perf_counter() - t_load, 2)

        BENCHMARK_OUTPUT_WAV.parent.mkdir(parents=True, exist_ok=True)

        # 3 Warmup runs
        warmup_times_ms = []
        for _ in range(3):
            t0 = time.perf_counter()
            svc.synthesize_chunk(BENCHMARK_TEXT, output_path=BENCHMARK_OUTPUT_WAV)
            warmup_times_ms.append(round((time.perf_counter() - t0) * 1000, 1))

        # 10 Measured runs
        latencies_ms = []
        for _ in range(10):
            t0 = time.perf_counter()
            svc.synthesize_chunk(BENCHMARK_TEXT, output_path=BENCHMARK_OUTPUT_WAV)
            latencies_ms.append(round((time.perf_counter() - t0) * 1000, 1))

        median_ms = round(float(statistics.median(latencies_ms)), 1)
        p95_ms = round(float(np.percentile(latencies_ms, 95)), 1)
        mean_ms = round(float(statistics.mean(latencies_ms)), 1)
        min_ms = round(float(min(latencies_ms)), 1)
        max_ms = round(float(max(latencies_ms)), 1)

        return {
            "name": "DhVaani",
            "status": "AVAILABLE",
            "reason": None,
            "load_time_s": load_time_s,
            "warmup_times_ms": warmup_times_ms,
            "latencies_ms": latencies_ms,
            "median_ms": median_ms,
            "p95_ms": p95_ms,
            "mean_ms": mean_ms,
            "min_ms": min_ms,
            "max_ms": max_ms,
            "instance": svc,
        }
    except Exception as e:
        return {
            "name": "DhVaani",
            "status": "UNAVAILABLE",
            "reason": str(e),
            "load_time_s": None,
            "warmup_times_ms": [],
            "latencies_ms": [],
            "median_ms": None,
            "p95_ms": None,
            "mean_ms": None,
            "min_ms": None,
            "max_ms": None,
            "instance": None,
        }


def run_tts_benchmark() -> Dict[str, Any]:
    """
    Evaluates offline TTS implementations.
    Selects the fastest valid candidate deterministically.
    """
    dhvaani_res = benchmark_dhvaani()

    valid_candidates = []
    if dhvaani_res["status"] == "AVAILABLE":
        valid_candidates.append(dhvaani_res)

    if not valid_candidates:
        raise RuntimeError(f"No valid TTS engine available. DhVaani: {dhvaani_res['reason']}")

    selected = min(valid_candidates, key=lambda c: c["median_ms"])

    return {
        "candidates": {
            "dhvaani": dhvaani_res,
        },
        "selected_engine_name": selected["name"],
        "selected_median_ms": selected["median_ms"],
        "selected_p95_ms": selected["p95_ms"],
        "selected_instance": selected["instance"],
    }
