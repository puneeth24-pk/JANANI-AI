#!/usr/bin/env python3
"""
JANANI End-to-End Pipeline Benchmark CLI
Measures:
  ASR → Translation → TTS
Reports:
  - Model loading time
  - Warmup time
  - Median, Mean, P95 latency
  - Breakdown: stt_ms, translation_ms, tts_ms, total_ms
"""

import sys
import time
import statistics
from pathlib import Path
import numpy as np

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from services.runtime_manager import get_runtime_manager

SAMPLE_AUDIO_PATH = BASE_DIR / "DhVaani-0.5" / "samples" / "hindi.wav"


def main():
    print("=" * 60)
    print("JANANI END-TO-END PIPELINE BENCHMARK")
    print("=" * 60)

    t_load_start = time.perf_counter()
    mgr = get_runtime_manager()
    mgr.initialize()
    total_model_load_time = round(time.perf_counter() - t_load_start, 2)
    print(f"\n📦 All models loaded and verified in {total_model_load_time:.2f}s")

    print("\n--- Running 3 Pipeline Warmups ---")
    warmup_times = []
    for i in range(3):
        t0 = time.perf_counter()
        out = mgr.run_pipeline(
            audio_path=SAMPLE_AUDIO_PATH,
            source_language="hin_Deva",
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 1)
        warmup_times.append(elapsed)
        print(f"Warmup {i+1}: {elapsed} ms (STT: {out['timing']['stt_ms']}ms, Trans: {out['timing']['translation_ms']}ms, TTS: {out['timing']['tts_ms']}ms)")

    print("\n--- Running 10 Measured Pipeline Requests ---")
    runs = []
    for i in range(10):
        t0 = time.perf_counter()
        out = mgr.run_pipeline(
            audio_path=SAMPLE_AUDIO_PATH,
            source_language="hin_Deva",
        )
        elapsed = round((time.perf_counter() - t0) * 1000, 1)
        runs.append({
            "total_ms": elapsed,
            "stt_ms": out["timing"]["stt_ms"],
            "translation_ms": out["timing"]["translation_ms"],
            "tts_ms": out["timing"]["tts_ms"],
            "text": out["text"],
            "translation": out["translation"],
        })
        print(
            f"Run {i+1:2d}: {elapsed:6.1f} ms | "
            f"ASR: {out['timing']['stt_ms']:5.1f} ms | "
            f"Trans: {out['timing']['translation_ms']:5.1f} ms | "
            f"TTS: {out['timing']['tts_ms']:5.1f} ms"
        )

    totals = [r["total_ms"] for r in runs]
    stt_times = [r["stt_ms"] for r in runs]
    trans_times = [r["translation_ms"] for r in runs]
    tts_times = [r["tts_ms"] for r in runs]

    print("\n" + "=" * 60)
    print("PIPELINE BENCHMARK RESULTS")
    print("=" * 60)
    print(f"Model Loading Time : {total_model_load_time} s")
    print(f"Warmup Times       : {warmup_times} ms")
    print()
    print("END-TO-END LATENCY (ASR → Translation → TTS):")
    print(f"  Minimum : {min(totals):.1f} ms")
    print(f"  Maximum : {max(totals):.1f} ms")
    print(f"  Mean    : {statistics.mean(totals):.1f} ms")
    print(f"  Median  : {statistics.median(totals):.1f} ms")
    print(f"  P95     : {np.percentile(totals, 95):.1f} ms")
    print()
    print("STAGE MEDIAN BREAKDOWN:")
    print(f"  ASR (Whisper)        : {statistics.median(stt_times):.1f} ms")
    print(f"  Translation (INT8)   : {statistics.median(trans_times):.1f} ms")
    print(f"  TTS (DhVaani)        : {statistics.median(tts_times):.1f} ms")
    print("=" * 60)


if __name__ == "__main__":
    main()
