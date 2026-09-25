---
license: apache-2.0
pipeline_tag: text-to-speech
library_name: dhvaani
tags:
  - text-to-speech
  - tts
  - zero-shot
  - voice-cloning
  - flow-matching
  - indic
  - multilingual
language:
  - as
  - bn
  - brx
  - doi
  - en
  - gu
  - hi
  - hne
  - bho
  - kn
  - ks
  - kok
  - mai
  - mag
  - ml
  - mni
  - mr
  - ne
  - or
  - pa
  - raj
  - sa
  - sat
  - sd
  - ta
  - te
  - ur
base_model: k2-fsa/ZipVoice
---

# DhVaani — TTS for 27 Indian languages

**DhVaani** is a fast, zero-shot voice-cloning text-to-speech model covering **27
Indian languages**. Give it a few seconds of reference audio + its transcript and any
target text, and it speaks that text in the reference voice — at 24 kHz.

Fine-tuned from [ZipVoice](https://github.com/k2-fsa/ZipVoice) (a 123M-parameter
flow-matching TTS), with a character-level tokenizer that handles **Indian script**.

## Quick start

```bash
# install torch/torchaudio for your machine first (GPU shown; use /whl/cpu for CPU):
pip install torch torchaudio 
pip install -r requirements.txt
```
### `transformers` AutoModel (recommended)

```python
import os,torch, soundfile as sf
from transformers import AutoModel
os.environ.setdefault("HF_TOKEN", "<your-hf-token>")
DEV = "cuda" if torch.cuda.is_available() else "cpu"
model = AutoModel.from_pretrained("ARTPARK-IISc/DhVaani-0.5",
                                  trust_remote_code=True).to(DEV).eval()

audio = model.synthesize(
    text="നമസ്‌കാരം, സുഖമാണോ?",
    prompt_wav="reference.wav",          # a few seconds of the voice to clone
    prompt_text="reference transcript",
)                                        # float32 numpy @ model.sampling_rate (24 kHz)
sf.write("out.wav", audio, model.sampling_rate)
```

### Or standalone (no `transformers`)

```python
from dhvaani import DhVaani
tts = DhVaani()                          # auto GPU/CPU
tts.synthesize(text="வணக்கம்!", prompt_wav="ref.wav",
               prompt_text="…", out_path="out.wav")
```

```bash
python dhvaani.py --prompt-wav ref.wav --prompt-text "…" --text "…" --out out.wav
```

Knobs: `num_step` (16 = quality, 8 = faster), `guidance_scale`, `speed`, `seed`.

## Languages & data

Trained pooled from multiple TTS datasets like IISc SYSPIN, IndicTTS (SPRINGLab)and Rasa  at 16 kHz.

| well-represented  | mid | low-resource  |
|---|---|---|
| English, Hindi, Bengali, Marathi, Kannada, Telugu, Maithili, Magahi, Chhattisgarhi, Bhojpuri, Assamese, Tamil | Gujarati, Malayalam, Manipuri, Odia, Punjabi, Nepali, Sindhi, Konkani, Santali, Bodo, Urdu | Sanskrit, Dogri, Kashmiri, Rajasthani |

Scripts: Devanagari, Bengali–Assamese, Tamil, Telugu, Kannada, Malayalam, Gujarati,
Gurmukhi, Odia, Perso-Arabic, Ol Chiki, Latin.
## What's in this repo

| file | what |
|---|---|
| `config.json` · `modeling_dhvaani.py` | the `AutoModel` (trust_remote_code) wrapper |
| `dhvaani.py` | standalone API + CLI (no `transformers` needed) |
| `model.safetensors` | weights (491 MB) |
| `model.json` · `tokens.txt` | architecture config · 1058-char vocabulary |
| `requirements.txt` | dependencies |
| `_backend/` | the trimmed, inference-only model code DhVaani runs on |
| `samples/` | example outputs |

## Training

- Fine-tuned from `k2-fsa/ZipVoice`; the base Chinese+English text embedding (360 tokens)
  was re-initialised for the 1058-token Indic character vocab, the flow-matching acoustic
  backbone transferred.


## Limitations

- **Code-switching** (English words inside Indic text) runs — Latin is in the vocab — but
  wasn't explicitly trained, so mixed-language prosody can be rough at boundaries.
- **Data imbalance:** low-resource languages (Rajasthani, Kashmiri, Dogri, Sanskrit) are
  ~10× smaller and weaker.
- Out-of-vocabulary characters (rare diacritics, emoji) are silently dropped.
- Best with a clean, single-speaker, 3–10 s reference clip.

## Credits & license

Apache-2.0, following the base model. Built on
[ZipVoice](https://github.com/k2-fsa/ZipVoice) (k2-fsa). Please also respect the licenses
of the training corpora (IndicTTS, Rasa, IISc SYSPIN).
