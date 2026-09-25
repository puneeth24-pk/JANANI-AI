"""
JANANI Hardware & Quantization Detection Utilities
Detects host platform, architecture, CPU/MPS hardware, and PyTorch supported quantization engines.
"""

import os
import platform
import torch
from typing import Dict, List, Any


def get_hardware_info() -> Dict[str, Any]:
    """Detects system hardware and PyTorch execution targets."""
    return {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "cpu": platform.processor() or "Unknown CPU",
        "cpu_count": os.cpu_count() or 1,
        "torch_version": torch.__version__,
        "mps_available": bool(torch.backends.mps.is_available()),
        "cuda_available": bool(torch.cuda.is_available()),
    }


def get_supported_quantization_engines() -> List[str]:
    """Returns the list of quantization engines supported by this PyTorch build."""
    try:
        engines = list(torch.backends.quantized.supported_engines)
        return engines
    except Exception:
        return []


def can_set_quantization_engine(engine_name: str) -> bool:
    """Safely checks whether a quantization engine can be activated without crashing."""
    if not engine_name:
        return False
    supported = get_supported_quantization_engines()
    if engine_name.lower() not in [e.lower() for e in supported]:
        return False
    
    current_engine = getattr(torch.backends.quantized, "engine", "none")
    try:
        torch.backends.quantized.engine = engine_name
        return True
    except Exception:
        return False
    finally:
        # Restore previous engine if valid
        if current_engine and current_engine != "none":
            try:
                torch.backends.quantized.engine = current_engine
            except Exception:
                pass
