"""
JANANI Unified Offline Pipeline Service
Coordinates end-to-end execution:
Input Speech/Text -> Whisper STT -> IndicTrans2 (INT8) -> DhVaani TTS -> Santali Audio
"""

import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from .model_manager import get_model_manager

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "outputs"
LESSON_AUDIO_DIR = BASE_DIR / "lesson_audio"


class PipelineService:
    def __init__(self):
        self.manager = get_model_manager()

    def process_text(
        self,
        text: str,
        source_language: str = "hin_Deva",
        generate_audio: bool = True,
        output_filename: Optional[str] = None,
        tts_steps: int = 24,
        tts_speed: float = 0.92,
    ) -> Dict[str, Any]:
        """Translates text from Hindi/English into Santali and synthesizes audio."""
        start_time = time.perf_counter()
        timing: Dict[str, float] = {}

        # 1. Translate
        t0 = time.perf_counter()
        santali_text = self.manager.translation.translate(
            text=text,
            src_lang=source_language,
            tgt_lang="sat_Olck",
            num_beams=4,
        )
        timing["translation_seconds"] = round(time.perf_counter() - t0, 3)

        audio_path_str = None
        if generate_audio and santali_text:
            t1 = time.perf_counter()
            if not output_filename:
                output_filename = f"janani_{uuid.uuid4().hex[:8]}.wav"

            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            out_file = OUTPUT_DIR / output_filename

            tts_result = self.manager.tts.synthesize_full(
                text=santali_text,
                output_path=out_file,
                steps=tts_steps,
                speed=tts_speed,
            )
            timing["tts_seconds"] = round(time.perf_counter() - t1, 3)
            audio_path_str = str(out_file)

        total_time = round(time.perf_counter() - start_time, 3)
        timing["total_seconds"] = total_time

        return {
            "source_text": text,
            "source_language": source_language,
            "santali_text": santali_text,
            "audio_path": audio_path_str,
            "audio_filename": output_filename if audio_path_str else None,
            "timing": timing,
        }

    def process_audio(
        self,
        audio_path: str | Path,
        source_language: str = "hin_Deva",
        generate_audio: bool = True,
        output_filename: Optional[str] = None,
        tts_steps: int = 24,
        tts_speed: float = 0.92,
    ) -> Dict[str, Any]:
        """Transcribes input speech, translates to Santali, and generates Santali speech."""
        start_time = time.perf_counter()
        timing: Dict[str, float] = {}

        # 1. Speech to Text
        t0 = time.perf_counter()
        transcription_res = self.manager.speech.transcribe(
            audio_path=audio_path,
            language=source_language,
        )
        timing["transcription_seconds"] = round(time.perf_counter() - t0, 3)
        input_text = transcription_res["text"]

        if not input_text:
            return {
                "source_text": "",
                "source_language": source_language,
                "santali_text": "",
                "audio_path": None,
                "audio_filename": None,
                "timing": timing,
                "error": "No speech detected in audio",
            }

        # 2. Text pipeline
        res = self.process_text(
            text=input_text,
            source_language=source_language,
            generate_audio=generate_audio,
            output_filename=output_filename,
            tts_steps=tts_steps,
            tts_speed=tts_speed,
        )

        res["timing"]["transcription_seconds"] = timing["transcription_seconds"]
        res["timing"]["total_seconds"] = round(time.perf_counter() - start_time, 3)
        return res


_pipeline_instance: Optional[PipelineService] = None


def get_pipeline_service() -> PipelineService:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = PipelineService()
    return _pipeline_instance
