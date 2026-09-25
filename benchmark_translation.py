#!/usr/bin/env python3
"""
JANANI Translation Engine Benchmark CLI
Benchmarks:
  1. IndicTrans2 INT8 CPU
  2. IndicTrans2 INT8 QNNPACK/ARM
Selects fastest valid path deterministically based on measured warm latency.
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from services.translation_benchmark import run_translation_benchmark


def main():
    print("Starting JANANI Translation Benchmark...\n")
    try:
        results = run_translation_benchmark(print_banner=True)
        print("\nBenchmark Summary:")
        print(f"Selected Fastest Engine: {results['selected_engine_name']}")
        print(f"Warm Median Latency   : {results['selected_median_ms']} ms")
        print(f"Warm P95 Latency      : {results['selected_p95_ms']} ms")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Benchmark execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
