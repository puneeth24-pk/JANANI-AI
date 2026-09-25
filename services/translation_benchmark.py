"""
JANANI Translation Engine Benchmark & Selection System
Deterministically benchmarks:
  PATH 1: IndicTrans2 INT8 CPU
  PATH 2: IndicTrans2 INT8 QNNPACK/ARM
Selects fastest valid path based on measured median warm latency.
"""

import time
import statistics
from typing import Dict, Any, List, Optional
import numpy as np

from services.quantization_utils import (
    get_hardware_info,
    get_supported_quantization_engines,
    can_set_quantization_engine,
)
from services.translation_service import IndicTransEngine

BENCHMARK_SENTENCES = [
    "Hello, how are you?",
    "I am going to school today.",
    "Today we are learning about computers and artificial intelligence.",
]


def benchmark_single_engine(engine_name: str, quant_engine: str) -> Dict[str, Any]:
    """
    Tests and benchmarks a single IndicTrans2 INT8 execution path.
    Runs 3 warmup runs and 10 measured runs across the standard benchmark sentences.
    """
    supported_engines = get_supported_quantization_engines()
    
    # Check if the requested quantization engine is supported
    if quant_engine.lower() not in [e.lower() for e in supported_engines]:
        return {
            "name": engine_name,
            "quant_engine": quant_engine,
            "status": "UNAVAILABLE",
            "reason": f"quantized engine {quant_engine.upper()} is not supported on this platform",
            "load_time_s": None,
            "warmup_times_ms": [],
            "latencies_ms": [],
            "median_ms": None,
            "p95_ms": None,
            "mean_ms": None,
            "min_ms": None,
            "max_ms": None,
            "engine_instance": None,
        }

    try:
        t_load_start = time.perf_counter()
        engine = IndicTransEngine(backend="int8", quant_engine=quant_engine)
        engine.load()
        load_time_s = round(time.perf_counter() - t_load_start, 2)

        # 3 Warmup runs
        warmup_times_ms = []
        for i in range(3):
            sent = BENCHMARK_SENTENCES[i % len(BENCHMARK_SENTENCES)]
            t0 = time.perf_counter()
            engine.translate(sent, src_lang="eng_Latn", tgt_lang="sat_Olck", num_beams=1)
            warmup_times_ms.append(round((time.perf_counter() - t0) * 1000, 1))

        # 10 Measured runs
        latencies_ms = []
        for i in range(10):
            sent = BENCHMARK_SENTENCES[i % len(BENCHMARK_SENTENCES)]
            t0 = time.perf_counter()
            engine.translate(sent, src_lang="eng_Latn", tgt_lang="sat_Olck", num_beams=1)
            latencies_ms.append(round((time.perf_counter() - t0) * 1000, 1))

        median_ms = round(float(statistics.median(latencies_ms)), 1)
        p95_ms = round(float(np.percentile(latencies_ms, 95)), 1)
        mean_ms = round(float(statistics.mean(latencies_ms)), 1)
        min_ms = round(float(min(latencies_ms)), 1)
        max_ms = round(float(max(latencies_ms)), 1)

        return {
            "name": engine_name,
            "quant_engine": quant_engine,
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
            "engine_instance": engine,
        }

    except Exception as e:
        return {
            "name": engine_name,
            "quant_engine": quant_engine,
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
            "engine_instance": None,
        }


def run_translation_benchmark(print_banner: bool = True) -> Dict[str, Any]:
    """
    Executes the complete translation benchmark across both paths:
      PATH 1: IndicTrans2 INT8 CPU (fbgemm)
      PATH 2: IndicTrans2 INT8 QNNPACK/ARM (qnnpack)
    Selects the fastest valid engine deterministically by lowest median latency.
    """
    hw = get_hardware_info()
    supported_engines = get_supported_quantization_engines()

    # Benchmark PATH 1: IndicTrans2 INT8 CPU (FBGEMM)
    path1_res = benchmark_single_engine(
        engine_name="IndicTrans2 INT8 CPU",
        quant_engine="fbgemm"
    )

    # Benchmark PATH 2: IndicTrans2 INT8 QNNPACK/ARM (QNNPACK)
    path2_res = benchmark_single_engine(
        engine_name="IndicTrans2 INT8 QNNPACK/ARM",
        quant_engine="qnnpack"
    )

    valid_candidates = []
    if path1_res["status"] == "AVAILABLE":
        valid_candidates.append(path1_res)
    if path2_res["status"] == "AVAILABLE":
        valid_candidates.append(path2_res)

    if not valid_candidates:
        # Fallback error handling if both INT8 paths are unavailable
        raise RuntimeError(
            f"Both IndicTrans2 INT8 execution paths failed. "
            f"PATH 1 reason: {path1_res['reason']}; PATH 2 reason: {path2_res['reason']}"
        )

    # Deterministic selection: fastest valid measured latency
    selected = min(valid_candidates, key=lambda c: c["median_ms"])

    # If both candidates were loaded, unload the non-selected one to save RAM
    for cand in valid_candidates:
        if cand["name"] != selected["name"] and cand["engine_instance"] is not None:
            cand["engine_instance"].unload()
            cand["engine_instance"] = None

    result = {
        "hardware": hw,
        "supported_engines": supported_engines,
        "path1": path1_res,
        "path2": path2_res,
        "selected_engine_name": selected["name"],
        "selected_quant_engine": selected["quant_engine"],
        "selected_median_ms": selected["median_ms"],
        "selected_p95_ms": selected["p95_ms"],
        "selected_instance": selected["engine_instance"],
    }

    if print_banner:
        display_translation_banner(result)

    return result


def display_translation_banner(result: Dict[str, Any]):
    """Displays the exact startup banner specified in the requirements."""
    hw = result["hardware"]
    p1 = result["path1"]
    p2 = result["path2"]

    print()
    print("========================================")
    print("JANANI TRANSLATION ENGINE BENCHMARK")
    print("========================================")
    print()
    print(f"Hardware: {hw['cpu']} ({hw['cpu_count']} cores)")
    print(f"OS: {hw['os']}")
    print(f"Architecture: {hw['architecture']}")
    print(f"CPU: {hw['cpu']}")
    print(f"MPS: {'AVAILABLE' if hw['mps_available'] else 'UNAVAILABLE'}")
    print(f"Supported quantized engines: {result['supported_engines']}")
    print()
    print("PATH 1:")
    print("IndicTrans2 INT8 CPU")
    print(f"Status: {p1['status']}")
    if p1["status"] == "AVAILABLE":
        print(f"Median: {p1['median_ms']} ms")
        print(f"P95: {p1['p95_ms']} ms")
    else:
        print(f"Reason: {p1['reason']}")
    print()
    print("PATH 2:")
    print("IndicTrans2 INT8 QNNPACK/ARM")
    print(f"Status: {p2['status']}")
    if p2["status"] == "AVAILABLE":
        print(f"Median: {p2['median_ms']} ms")
        print(f"P95: {p2['p95_ms']} ms")
    else:
        print(f"Reason: {p2['reason']}")
    print()
    print("========================================")
    print("SELECTED FASTEST ENGINE:")
    print(result["selected_engine_name"])
    print("========================================")
    print()
