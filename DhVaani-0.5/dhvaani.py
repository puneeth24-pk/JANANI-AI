"""DhVaani — zero-shot multilingual TTS for 27 Indian languages.

A small, self-contained wrapper around a fine-tuned ZipVoice model. Clone a voice
from a few seconds of reference audio + its transcript, and speak any target text.

Python
------
    from dhvaani import DhVaani

    tts = DhVaani()                       # loads the model next to this file
    tts.synthesize(
        text="നമസ്‌കാരം, സുഖമാണോ?",
        prompt_wav="ref.wav",
        prompt_text="reference transcript",
        out_path="out.wav",
    )

Command line
------------
    python dhvaani.py --prompt-wav ref.wav --prompt-text "…" \
                      --text "…" --out out.wav
"""
import json
import os
import sys
from pathlib import Path

import torch

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE / "_backend"))          # bundled model code (package: zipvoice)
os.environ.setdefault("HF_HOME", str(_HERE / ".cache"))

import safetensors.torch as _st  # noqa: E402

from zipvoice.bin.infer_zipvoice import generate_sentence, get_vocoder  # noqa: E402
from zipvoice.models.zipvoice import ZipVoice  # noqa: E402
from zipvoice.tokenizer.tokenizer import SimpleTokenizer  # noqa: E402
from zipvoice.utils.feature import VocosFbank  # noqa: E402


def _pick_device(device=None):
    if device:
        return torch.device(device)
    if torch.cuda.is_available():
        return torch.device("cuda", 0)
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class DhVaani:
    """A loaded DhVaani TTS model ready to synthesize speech."""

    def __init__(self, model_dir=None, device=None):
        model_dir = Path(model_dir) if model_dir else _HERE
        self.device = _pick_device(device)

        cfg = json.loads((model_dir / "model.json").read_text())
        self.sampling_rate = cfg["feature"]["sampling_rate"]

        self.tokenizer = SimpleTokenizer(token_file=str(model_dir / "tokens.txt"))
        self.model = ZipVoice(
            **cfg["model"],
            vocab_size=self.tokenizer.vocab_size,
            pad_id=self.tokenizer.pad_id,
        )
        sd = _st.load_file(str(model_dir / "model.safetensors"))
        sd = {k[len("model."):]: v for k, v in sd.items() if k.startswith("model.")}
        self.model.load_state_dict(sd, strict=True)
        self.model = self.model.to(self.device).eval()

        self.feature_extractor = VocosFbank()
        self.vocoder = get_vocoder().to(self.device).eval()

    @torch.inference_mode()
    def synthesize(self, text, prompt_wav, prompt_text, out_path="out.wav",
                   num_step=16, guidance_scale=1.0, speed=1.0, seed=666):
        """Speak `text` in the voice of `prompt_wav`. Writes `out_path`, returns it."""
        torch.manual_seed(seed)
        generate_sentence(
            save_path=str(out_path),
            prompt_text=prompt_text,
            prompt_wav=str(prompt_wav),
            text=text,
            model=self.model,
            vocoder=self.vocoder,
            tokenizer=self.tokenizer,
            feature_extractor=self.feature_extractor,
            device=self.device,
            num_step=num_step,
            guidance_scale=guidance_scale,
            speed=speed,
            sampling_rate=self.sampling_rate,
        )
        return out_path


def _cli():
    import argparse
    p = argparse.ArgumentParser(description="DhVaani zero-shot TTS")
    p.add_argument("--prompt-wav", required=True, help="reference voice clip")
    p.add_argument("--prompt-text", required=True, help="transcript of the reference clip")
    p.add_argument("--text", required=True, help="text to speak")
    p.add_argument("--out", default="out.wav", help="output wav path")
    p.add_argument("--num-step", type=int, default=16, help="16=quality, 8=faster")
    p.add_argument("--guidance-scale", type=float, default=1.0)
    p.add_argument("--speed", type=float, default=1.0)
    p.add_argument("--seed", type=int, default=666)
    p.add_argument("--model-dir", default=None)
    p.add_argument("--device", default=None, help="cuda / cpu / mps (auto if unset)")
    a = p.parse_args()

    tts = DhVaani(model_dir=a.model_dir, device=a.device)
    tts.synthesize(a.text, a.prompt_wav, a.prompt_text, a.out,
                   num_step=a.num_step, guidance_scale=a.guidance_scale,
                   speed=a.speed, seed=a.seed)
    print("saved:", a.out)


if __name__ == "__main__":
    _cli()
