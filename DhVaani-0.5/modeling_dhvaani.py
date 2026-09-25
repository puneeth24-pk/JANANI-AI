"""DhVaani — HuggingFace `AutoModel` wrapper for the 27-language Indic TTS model.

    from transformers import AutoModel
    model = AutoModel.from_pretrained("ARTPARK-IISc/DhVaani",
                                      trust_remote_code=True).to("cuda").eval()
    audio = model.synthesize(
        text="നമസ്‌കാരം, സുഖമാണോ?",
        prompt_wav="reference.wav",
        prompt_text="reference transcript",
    )                                          # -> float32 numpy array @ 24 kHz
    # model.sampling_rate == 24000

The bundled model code lives in ``_backend/`` and is imported dynamically (via
importlib, after being put on sys.path) so it needs no pip package.
"""
import importlib
import os
import sys
import tempfile

import numpy as np  # noqa: F401  (used by callers / kept for parity)
import torch
from transformers import PretrainedConfig, PreTrainedModel


def _bootstrap_backend(name_or_path):
    """Put the bundled ZipVoice code (``_backend/``) on sys.path, whether the model
    is loaded from a local dir or downloaded from the Hub."""
    repo_dir = name_or_path
    if not (repo_dir and os.path.isdir(os.path.join(repo_dir, "_backend"))):
        from huggingface_hub import snapshot_download
        repo_dir = snapshot_download(name_or_path, token=os.environ.get("HF_TOKEN"))
    backend = os.path.join(repo_dir, "_backend")
    if backend not in sys.path:
        sys.path.insert(0, backend)
    return repo_dir


def _imp(module, attr):
    return getattr(importlib.import_module(module), attr)


class DhVaaniConfig(PretrainedConfig):
    model_type = "dhvaani"

    def __init__(self, vocab_size=1058, pad_id=0, sampling_rate=24000,
                 zipvoice_config=None, **kwargs):
        self.vocab_size = vocab_size
        self.pad_id = pad_id
        self.sampling_rate = sampling_rate
        self.zipvoice_config = zipvoice_config or {}
        super().__init__(**kwargs)


class DhVaaniModel(PreTrainedModel):
    config_class = DhVaaniConfig
    base_model_prefix = "dhvaani"
    _tied_weights_keys = []          # no tied weights
    all_tied_weights_keys = {}       # transformers>=5.x compatibility

    def __init__(self, config: DhVaaniConfig):
        super().__init__(config)
        self._repo_dir = _bootstrap_backend(getattr(config, "_name_or_path", None))
        ZipVoice = _imp("zipvoice.models.zipvoice", "ZipVoice")

        # The actual acoustic model; weights load into this via from_pretrained.
        self.model = ZipVoice(
            **config.zipvoice_config,
            vocab_size=config.vocab_size,
            pad_id=config.pad_id,
        )
        self.sampling_rate = config.sampling_rate
        self._rt = {}  # runtime, non-parameter pieces (kept out of the state_dict)

    # --- lazily build tokenizer / vocoder / feature extractor on first use ---
    def _runtime(self):
        if not self._rt:
            get_vocoder = _imp("zipvoice.bin.infer_zipvoice", "get_vocoder")
            SimpleTokenizer = _imp("zipvoice.tokenizer.tokenizer", "SimpleTokenizer")
            VocosFbank = _imp("zipvoice.utils.feature", "VocosFbank")
            tok_file = os.path.join(self._repo_dir, "tokens.txt")
            self._rt["tokenizer"] = SimpleTokenizer(token_file=tok_file)
            self._rt["feature"] = VocosFbank()
            self._rt["vocoder"] = get_vocoder().to(self.device).eval()
        return self._rt

    @torch.inference_mode()
    def synthesize(self, text, prompt_wav, prompt_text, out_path=None,
                   num_step=16, guidance_scale=1.0, speed=1.0, seed=666):
        """Speak `text` in the voice of `prompt_wav`.

        Returns a float32 numpy waveform at ``self.sampling_rate``. If `out_path`
        is given, the wav is also written there.
        """
        import soundfile as sf
        generate_sentence = _imp("zipvoice.bin.infer_zipvoice", "generate_sentence")

        rt = self._runtime()
        torch.manual_seed(seed)
        save_path = out_path or tempfile.mktemp(suffix=".wav")
        generate_sentence(
            save_path=save_path,
            prompt_text=prompt_text,
            prompt_wav=str(prompt_wav),
            text=text,
            model=self.model,
            vocoder=rt["vocoder"],
            tokenizer=rt["tokenizer"],
            feature_extractor=rt["feature"],
            device=self.device,
            num_step=num_step,
            guidance_scale=guidance_scale,
            speed=speed,
            sampling_rate=self.sampling_rate,
        )
        audio, _ = sf.read(save_path, dtype="float32")
        if out_path is None:
            os.remove(save_path)
        return audio

    def __call__(self, *args, **kwargs):
        return self.synthesize(*args, **kwargs)
