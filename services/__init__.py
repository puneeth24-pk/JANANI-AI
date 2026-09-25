"""
JANANI Core Services
Modular service abstraction layer for the Santali Multilingual Education AI assistant.
"""

from .translation_service import IndicTransEngine, get_translation_engine
from .speech_service import SpeechService, get_speech_service
from .tts_service import TTSService, get_tts_service
from .model_manager import ModelManager, get_model_manager
from .pipeline_service import PipelineService, get_pipeline_service

__all__ = [
    "IndicTransEngine",
    "get_translation_engine",
    "SpeechService",
    "get_speech_service",
    "TTSService",
    "get_tts_service",
    "ModelManager",
    "get_model_manager",
    "PipelineService",
    "get_pipeline_service",
]
