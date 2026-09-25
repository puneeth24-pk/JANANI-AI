"""
JANANI Model Lifecycle Manager
Coordinates lazy loading, status reporting, memory monitoring, and thread-safe pipeline execution.
"""

import os
import psutil
import threading
from typing import Dict, Any, Optional

from .speech_service import get_speech_service
from .translation_service import get_translation_engine
from .tts_service import get_tts_service


class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.speech = get_speech_service()
        self.translation = get_translation_engine()
        self.tts = get_tts_service()
        self.pipeline_lock = threading.Lock()
        self._initialized = True

    def is_installed(self) -> Dict[str, bool]:
        base_dir = self.translation.backend  # check files
        from pathlib import Path
        root = Path(__file__).resolve().parent.parent
        dhvaani_ok = (root / "DhVaani-0.5" / "model.safetensors").exists()
        indictrans_int8_ok = (root / "indictrans2-int8" / "indictrans2-int8.pth").exists()
        indictrans_320m_ok = (root / "models" / "indictrans2" / "model.safetensors").exists()
        return {
            "whisper": True,  # Whisper small model cache
            "indictrans2_int8": indictrans_int8_ok,
            "indictrans2_320m": indictrans_320m_ok,
            "dhvaani": dhvaani_ok,
            "all_installed": indictrans_int8_ok and indictrans_320m_ok and dhvaani_ok,
        }

    def get_model_info(self) -> Dict[str, Any]:
        installed = self.is_installed()
        return {
            "name": "JANANI Offline AI Core",
            "whisper": {
                "name": "Whisper (small)",
                "device": "cpu",
                "installed": installed["whisper"],
                "ready": self.speech.is_ready,
            },
            "indictrans2_int8": {
                "name": "IndicTrans2 Dynamic INT8",
                "size": "~1.5 GB",
                "installed": installed["indictrans2_int8"],
                "ready": self.translation.is_ready and self.translation.backend == "int8",
            },
            "indictrans2_320m": {
                "name": "IndicTrans2 320M Distilled",
                "size": "~1.28 GB",
                "installed": installed["indictrans2_320m"],
                "ready": self.translation.is_ready and self.translation.backend == "standard",
            },
            "dhvaani": {
                "name": "DhVaani 0.5 TTS",
                "size": "~490 MB",
                "device": self.tts.device,
                "installed": installed["dhvaani"],
                "ready": self.tts.is_ready,
            },
            "offline_ready": installed["all_installed"],
        }

    def load_translation_model(self, backend: Optional[str] = None):
        with self.pipeline_lock:
            if backend:
                self.translation.backend = backend
            self.translation.load()

    def unload_translation_model(self):
        with self.pipeline_lock:
            self.translation.unload()

    def load_speech_model(self):
        with self.pipeline_lock:
            self.speech.load()

    def unload_speech_model(self):
        with self.pipeline_lock:
            self.speech.unload()

    def load_tts_model(self):
        with self.pipeline_lock:
            self.tts.load()

    def unload_tts_model(self):
        with self.pipeline_lock:
            self.tts.unload()

    def unload_all(self):
        """Releases all model weights to achieve minimal memory footprint (~100 MB)."""
        with self.pipeline_lock:
            print("🧹 Unloading all JANANI models to free system memory...")
            self.speech.unload()
            self.translation.unload()
            self.tts.unload()
            print("✅ All models unloaded.")

    def get_status(self) -> Dict[str, Any]:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        sys_mem = psutil.virtual_memory()

        return {
            "models": {
                "whisper": {
                    "ready": self.speech.is_ready,
                    "model_name": self.speech.model_name,
                },
                "indictrans2": {
                    "ready": self.translation.is_ready,
                    "backend": self.translation.backend,
                },
                "dhvaani": {
                    "ready": self.tts.is_ready,
                    "device": self.tts.device,
                },
            },
            "memory": {
                "process_rss_mb": round(mem_info.rss / (1024 * 1024), 1),
                "system_total_mb": round(sys_mem.total / (1024 * 1024), 1),
                "system_available_mb": round(sys_mem.available / (1024 * 1024), 1),
                "system_percent_used": sys_mem.percent,
            },
            "installed": self.is_installed(),
            "ready_for_inference": (
                self.speech.is_ready and self.translation.is_ready and self.tts.is_ready
            ),
        }

    def preload_all(self):
        """Preloads all models sequentially with thread safety."""
        with self.pipeline_lock:
            print("🚀 Preloading all JANANI offline models...")
            self.speech.load()
            self.translation.load()
            self.tts.load()
            print("🎉 All JANANI models loaded and ready!")


def get_model_manager() -> ModelManager:
    return ModelManager()

