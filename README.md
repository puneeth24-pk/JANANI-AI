# JANANI AI — Santali Mother-Tongue Education Assistant

<div align="center">

**🌿 Teach every child in their mother tongue 🌿**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-offline%20backend-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB?logo=react)](https://expo.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Model](https://img.shields.io/badge/INT8%20Model-Custom%20Quantized-orange)](https://github.com/puneeth24-pk/QUANTIZE8_INDICTRANS2/releases/tag/v1.0.0)
[![Offline](https://img.shields.io/badge/Runs-100%25%20Offline-brightgreen)](#)

</div>

---

## 🎯 What is JANANI?

**JANANI** is an entirely **offline, on-device AI teaching assistant** built for primary-school teachers in Santali-speaking regions of India. Many teachers are trained in Hindi or English but need to instruct students in **Santali** — their mother tongue written in the **Ol Chiki** script.

JANANI bridges this gap with a real-time pipeline:

```
Teacher speaks Hindi/English
         ↓  Whisper (local STT)
   Transcribed text
         ↓  IndicTrans2 INT8 (custom quantized)
  Santali (Ol Chiki script)
         ↓  DhVaani 0.5 (local TTS)
  Natural Santali audio played to students
```

**No internet. No cloud. No data leaves the device.**

---

## 🏆 Key Features

| Feature | Description |
|---|---|
| 🎤 **Classroom Mode** | Speak Hindi/English → instant Santali voice for students |
| 🔤 **Text Translator** | Type any text → Santali (Ol Chiki) with audio |
| 📚 **Lesson Generator** | NIPUN Bharat aligned bilingual lesson plans |
| 📝 **Worksheet Maker** | Printable Ol Chiki exercises |
| 🃏 **Flashcards** | 13 categories with one-tap Santali audio |
| 🕘 **History** | All lessons & audio saved locally |
| ⚙️ **Settings** | Memory control for low-RAM tablets |
| 🛡️ **100% Offline** | Zero cloud dependency after setup |

---

## 🤖 AI Pipeline Details

### 1. Speech Recognition — Whisper (`small`)
- **Source**: [OpenAI Whisper](https://github.com/openai/whisper)
- **Device**: CPU (stable multilingual decoding)
- **Languages**: Hindi (`hin_Deva`), English (`eng_Latn`)
- **Latency**: ~1.9s median

### 2. Translation — IndicTrans2 (Custom INT8 Quantized ⭐)
> **The translation model used here is a custom INT8 dynamic quantization of IndicTrans2, quantized and released by the project author.**
>
> 📦 **Download**: [QUANTIZE8_INDICTRANS2 v1.0.0](https://github.com/puneeth24-pk/QUANTIZE8_INDICTRANS2/releases/tag/v1.0.0)

- **Original Model**: [`ai4bharat/indictrans2-en-indic-1B`](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B)
- **Quantization**: `torch.ao.quantization.quantize_dynamic` → `torch.qint8`
- **Engine**: `qnnpack` (ARM/Apple Silicon optimized)
- **Size**: 1.59 GB (vs 4.8 GB original FP32)
- **Latency**: ~1.1s median (vs ~3-4s FP32)
- **Target Script**: Ol Chiki (`U+1C50`–`U+1C7F`)
- **Decoding**: Greedy (`num_beams=1`) for real-time use

### 3. Voice Synthesis — DhVaani 0.5
- **Engine**: DhVaani neural voice cloning
- **Reference Voice**: `DhVaani-0.5/samples/hindi.wav`
- **Parameters**: Steps: `14`, Guidance: `1.1`, Speed: `0.92`, Seed: `666`
- **Audio Quality**: 24kHz PCM-16 with natural clause chunking & anti-click fades
- **Latency**: ~4.8s for a full sentence

---

## 📊 Verified Performance

| Component | Operation | Target | Measured | Status |
|---|---|---|---|---|
| Whisper | Hindi/English STT | < 2.0s | **1.9s** | ✅ |
| IndicTrans2 INT8 | English → Santali | < 1.5s | **1.1s** | ✅ |
| DhVaani | Santali voice synthesis | < 6.0s | **4.8s** | ✅ |
| **Full Pipeline** | Voice in → Santali voice out | < 10s | **~8s** | ✅ |

---

## 🚀 Local Web App Setup (Anyone Can Run This)

> **Prerequisites**: Python 3.10+, Node.js 18+, ffmpeg

### Step 1 — Clone the repository
```bash
git clone https://github.com/puneeth24-pk/JANANI-AI.git
cd JANANI-AI
```

### Step 2 — Download the custom INT8 model
Go to the [QUANTIZE8_INDICTRANS2 v1.0.0 release](https://github.com/puneeth24-pk/QUANTIZE8_INDICTRANS2/releases/tag/v1.0.0) and download:

```
indictrans2-int8.pth   →  place in  JANANI-AI/indictrans2-int8/
```

Also download the tokenizer/config from HuggingFace (already included in repo):
```bash
# Tokenizer files are already in indictrans2-int8/kairos_model/
# No additional download needed for that part
```

### Step 3 — Download DhVaani model weights
```bash
# Download model.safetensors (~491 MB) from HuggingFace:
# https://huggingface.co/ai4bharat/dhvaani
# Place at: DhVaani-0.5/model.safetensors
```

### Step 4 — Set up Python environment
```bash
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate

pip install -r requirements.txt     # or run: pip install fastapi uvicorn[standard] \
                                    # openai-whisper torch transformers \
                                    # soundfile numpy scipy python-multipart \
                                    # python-dotenv IndicTransToolkit
```

### Step 5 — Start the AI backend
```bash
source .venv/bin/activate
uvicorn api:app --port 2004 --reload
```

Wait for the startup banner:
```
==================================================
SANTALI FASTAPI BACKEND READY
==================================================
Whisper     : Whisper
Translation : IndicTrans2 INT8 QNNPACK/ARM
TTS         : DhVaani
Device      : mps/cpu
Offline     : YES
Port        : 2004
Status      : READY
==================================================
```

### Step 6 — Start the web app
```bash
cd frontend/janani
npm install
npm run web
# Open http://localhost:8081 in your browser
```

> 🎉 That's it! Open `http://localhost:8081` and the app is fully functional.

---

## 🗂️ Project Structure

```
JANANI-AI/
├── api.py                    # FastAPI backend — single unified offline server
├── services/
│   ├── runtime_manager.py    # Deterministic model selection + pipeline
│   ├── translation_service.py# IndicTrans2 INT8 wrapper
│   ├── tts_service.py        # DhVaani with clause chunking + normalization
│   ├── speech_service.py     # Whisper ASR wrapper
│   └── ...benchmarks
├── DhVaani-0.5/              # DhVaani engine code + samples
├── indictrans2-int8/
│   ├── indictrans2-int8.pth  # ← DOWNLOAD from releases (not in git)
│   └── kairos_model/         # Tokenizer + config (in git)
├── models/
│   └── indictrans2/          # 320M distilled fallback model
├── frontend/janani/
│   ├── src/
│   │   ├── screens/          # ClassroomScreen, HomeScreen, etc.
│   │   ├── services/         # ApiClient (120s timeout), SpeechService, etc.
│   │   ├── components/       # MicButton, OlChikiCard, Header
│   │   └── utils/            # Ol Chiki Unicode validator
│   ├── android/              # Android 9+ config (largeHeap=true)
│   └── App.tsx
└── README.md
```

---

## 🌐 Web App Architecture

The web app communicates with the local backend over loopback (`localhost:2004`). No external network calls are made:

```
Browser (http://localhost:8081)
        │
        │  POST /api/lesson/speech   ← single unified call (voice path)
        │  POST /api/lesson/text     ← single unified call (text path)
        │  GET  /api/audio/{file}    ← audio playback
        ▼
FastAPI Backend (http://localhost:2004)
        │
        ├── Whisper STT (CPU)
        ├── IndicTrans2 INT8 (ARM/CPU via qnnpack)
        └── DhVaani TTS (MPS/CPU)
```

**Key design decisions:**
- **1 HTTP call per request** (previously 3 — caused "fail to get" timeouts)
- **120s AbortController timeout** in the frontend — AI inference takes time
- **`MODEL_LOCK`** serializes GPU/MPS access so concurrent requests don't crash
- **`synthesize_full`** chunks long sentences for natural-sounding Santali voice

---

## 📱 Android APK Build

```bash
cd frontend/janani/android
./gradlew assembleRelease
# APK: frontend/janani/android/app/build/outputs/apk/release/app-release.apk
```

**Target device:**
- Android 9+ (API 28+)
- ~2 GB RAM (low-cost tablet)
- `android:largeHeap="true"` prevents OOM during inference

---

## 🔒 Privacy & Offline Guarantee

| Feature | Detail |
|---|---|
| HuggingFace offline | `HF_HUB_OFFLINE=1` enforced at startup |
| No telemetry | `HF_HUB_DISABLE_TELEMETRY=1` |
| Student audio | Never leaves the device |
| Lesson records | Stored in local JSON/SQLite only |
| Network calls | Zero — all inference is on-device |

---

## 🧠 Custom Quantization

The INT8 model was quantized using:
```python
import torch
from transformers import AutoModelForSeq2SeqLM

model = AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/indictrans2-en-indic-1B")
torch.backends.quantized.engine = 'qnnpack'
quantized = torch.ao.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
torch.save(quantized.state_dict(), "indictrans2-int8.pth")
```

**Result**: 4.8 GB → 1.59 GB, ~3× faster inference on ARM/Apple Silicon.

📦 **Download**: [github.com/puneeth24-pk/QUANTIZE8_INDICTRANS2/releases/tag/v1.0.0](https://github.com/puneeth24-pk/QUANTIZE8_INDICTRANS2/releases/tag/v1.0.0)

---

## 🤝 Acknowledgements

| Project | Use |
|---|---|
| [ai4bharat/IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) | Translation model |
| [OpenAI Whisper](https://github.com/openai/whisper) | Speech recognition |
| [DhVaani](https://huggingface.co/ai4bharat/dhvaani) | Santali voice synthesis |
| [IndicTransToolkit](https://github.com/AI4Bharat/IndicTransToolkit) | Pre/post processing |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
Made with ❤️ for Santali-speaking children across India<br>
<b>JANANI AI</b> — <i>"Every child deserves to learn in their mother tongue"</i>
</div>
