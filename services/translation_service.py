"""
JANANI Translation Service
Supports both INT8 Quantized IndicTrans2 (1.1B Dynamic INT8 via QNNPACK) and FP32/FP16 (320M) backends.
"""

import os
import re
import time
import threading
from pathlib import Path
from typing import Optional, Tuple

import torch
from transformers import AutoConfig, AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

BASE_DIR = Path(__file__).resolve().parent.parent
INT8_DIR = BASE_DIR / "indictrans2-int8"
INT8_MODEL_DIR = INT8_DIR / "kairos_model"
INT8_WEIGHTS = INT8_DIR / "indictrans2-int8.pth"

MODEL_320M_DIR = BASE_DIR / "models" / "indictrans2"

LANG_ENGLISH = "eng_Latn"
LANG_HINDI = "hin_Deva"
LANG_SANTALI = "sat_Olck"


class IndicTransEngine:
    def __init__(self, backend: str = "int8", quant_engine: Optional[str] = None):
        self.backend = backend.lower()
        self.quant_engine = quant_engine.lower() if quant_engine else None
        self.model = None
        self.tokenizer = None
        self.processor = None
        self.is_ready = False
        self._lock = threading.Lock()
        self.actual_quant_engine = None

    def load(self):
        with self._lock:
            if self.is_ready:
                return

            if self.backend == "int8":
                self._load_int8()
            else:
                self._load_standard()

            self.is_ready = True

    def _load_int8(self):
        t0 = time.perf_counter()

        if not INT8_WEIGHTS.exists():
            raise FileNotFoundError(f"INT8 weights not found at: {INT8_WEIGHTS}")
        if not INT8_MODEL_DIR.exists():
            raise FileNotFoundError(f"INT8 model files not found at: {INT8_MODEL_DIR}")

        # Programmatically determine and set supported quantization engine
        from services.quantization_utils import get_supported_quantization_engines, can_set_quantization_engine

        supported_engines = get_supported_quantization_engines()
        
        target_engine = self.quant_engine
        if target_engine:
            if not can_set_quantization_engine(target_engine):
                raise RuntimeError(
                    f"quantized engine {target_engine.upper()} is not supported on this platform. "
                    f"Supported engines: {supported_engines}"
                )
            torch.backends.quantized.engine = target_engine
            self.actual_quant_engine = target_engine
        else:
            # Auto-detect best supported engine
            if "qnnpack" in [e.lower() for e in supported_engines]:
                torch.backends.quantized.engine = "qnnpack"
                self.actual_quant_engine = "qnnpack"
            elif "fbgemm" in [e.lower() for e in supported_engines]:
                torch.backends.quantized.engine = "fbgemm"
                self.actual_quant_engine = "fbgemm"
            else:
                raise RuntimeError(
                    f"No supported quantization engine found. Supported engines: {supported_engines}"
                )

        print(f"⚡ Loading IndicTrans2 INT8 Quantized Model (engine: {self.actual_quant_engine})...")

        config = AutoConfig.from_pretrained(
            str(INT8_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True
        )

        model = AutoModelForSeq2SeqLM.from_config(
            config,
            trust_remote_code=True
        )
        model.eval()

        # Dynamic INT8 Quantization
        model = torch.ao.quantization.quantize_dynamic(
            model,
            {torch.nn.Linear},
            dtype=torch.qint8
        )

        state_dict = torch.load(
            str(INT8_WEIGHTS),
            map_location="cpu",
            weights_only=False
        )
        model.load_state_dict(state_dict)
        model.eval()

        tokenizer = AutoTokenizer.from_pretrained(
            str(INT8_MODEL_DIR),
            trust_remote_code=True,
            local_files_only=True
        )

        processor = IndicProcessor(inference=True)

        self.model = model
        self.tokenizer = tokenizer
        self.processor = processor

        elapsed = time.perf_counter() - t0
        print(f"✅ IndicTrans2 INT8 Ready ({self.actual_quant_engine}) in {elapsed:.2f}s")

    def _load_standard(self):
        print("Loading IndicTrans2 320M Model...")
        t0 = time.perf_counter()

        device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

        tokenizer = AutoTokenizer.from_pretrained(
            str(MODEL_320M_DIR),
            trust_remote_code=True,
            local_files_only=True
        )
        model = AutoModelForSeq2SeqLM.from_pretrained(
            str(MODEL_320M_DIR),
            trust_remote_code=True,
            local_files_only=True
        )
        model = model.to(device)
        model.eval()

        processor = IndicProcessor(inference=True)

        self.model = model
        self.tokenizer = tokenizer
        self.processor = processor
        self.actual_quant_engine = "none"

        elapsed = time.perf_counter() - t0
        print(f"✅ IndicTrans2 320M Ready in {elapsed:.2f}s")

    def unload(self):
        """Unloads model weights to free RAM on memory-constrained devices."""
        with self._lock:
            if not self.is_ready:
                return
            print(f"🧹 Unloading IndicTrans2 ({self.backend}) to free memory...")
            self.model = None
            self.tokenizer = None
            self.processor = None
            self.is_ready = False
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def translate(
        self,
        text: str,
        src_lang: str = LANG_ENGLISH,
        tgt_lang: str = LANG_SANTALI,
        max_length: int = 256,
        num_beams: int = 1,
        max_new_tokens: int = 64,
    ) -> str:
        if not self.is_ready:
            self.load()

        text = text.strip()
        if not text:
            return ""

        # Multi-sentence splitting for long compound text
        sentences = re.split(r"(?<=[.!?।॥\n])\s+", text)
        if len(sentences) > 1:
            translated_chunks = []
            for s in sentences:
                s = s.strip()
                if not s:
                    continue
                tr = self._translate_single_sentence(
                    s,
                    src_lang=src_lang,
                    tgt_lang=tgt_lang,
                    max_length=max_length,
                    num_beams=num_beams,
                    max_new_tokens=max_new_tokens,
                )
                if tr:
                    translated_chunks.append(tr)
            return " ".join(translated_chunks)

        return self._translate_single_sentence(
            text,
            src_lang=src_lang,
            tgt_lang=tgt_lang,
            max_length=max_length,
            num_beams=num_beams,
            max_new_tokens=max_new_tokens,
        )

    def _translate_single_sentence(
        self,
        text: str,
        src_lang: str,
        tgt_lang: str,
        max_length: int = 256,
        num_beams: int = 1,
        max_new_tokens: int = 64,
    ) -> str:
        batch = self.processor.preprocess_batch(
            [text],
            src_lang=src_lang,
            tgt_lang=tgt_lang
        )

        inputs = self.tokenizer(
            batch,
            padding="longest",
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        )

        if self.backend != "int8":
            device = next(self.model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}

        gen_kwargs = {
            "use_cache": True,
            "max_new_tokens": max_new_tokens,
            "num_beams": num_beams,
            "num_return_sequences": 1,
            "no_repeat_ngram_size": 3,
            "repetition_penalty": 1.2,
        }
        if num_beams > 1:
            gen_kwargs["early_stopping"] = True

        with torch.inference_mode():
            generated_tokens = self.model.generate(
                **inputs,
                **gen_kwargs
            )

        decoded = self.tokenizer.batch_decode(
            generated_tokens,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )

        output = self.processor.postprocess_batch(
            decoded,
            lang=tgt_lang
        )

        res = output[0].strip() if output else ""
        # Clean repetitive quote loops
        res = re.sub(r'(\s*["\']\s*){3,}', ' ', res).strip()
        return res


def is_valid_olchiki(text: str) -> bool:
    """Validates that text contains Ol Chiki script (U+1C50 - U+1C7F)."""
    import re
    if not text:
        return False
    olchiki_chars = len(re.findall(r"[\u1C50-\u1C7F]", text))
    total_letters = len(re.findall(r"\S", text))
    if total_letters == 0:
        return False
    # Generous threshold to avoid rejecting short valid phrases
    return (olchiki_chars / total_letters) >= 0.35


# Singleton instance
_engine_instance: Optional[IndicTransEngine] = None


def get_translation_engine(backend: Optional[str] = None, quant_engine: Optional[str] = None) -> IndicTransEngine:
    global _engine_instance
    if backend is None:
        backend = os.getenv("MODEL_BACKEND", "int8")

    if _engine_instance is None:
        _engine_instance = IndicTransEngine(backend=backend, quant_engine=quant_engine)
    elif backend is not None and (_engine_instance.backend != backend or (quant_engine and _engine_instance.quant_engine != quant_engine)):
        _engine_instance.unload()
        _engine_instance = IndicTransEngine(backend=backend, quant_engine=quant_engine)
    return _engine_instance


