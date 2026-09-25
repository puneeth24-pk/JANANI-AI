# JANANI: System Architecture Document

## 1. High-Level Architecture Overview

**JANANI** (Santali Mother-Tongue Multilingual Education Assistant) is engineered for **100% offline, on-device operation** on low-cost Android hardware (Android 9.0+, ~2 GB RAM).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                            │
│                        (React Native TypeScript)                       │
│                                                                        │
│   HomeScreen      ClassroomScreen      TranslateScreen    LessonScreen │
│   WorksheetScreen FlashcardsScreen     HistoryScreen      Settings     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       Service & Storage Contract
                       (ApiClient / LocalStorage)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AI ADAPTER & ENGINE LAYER                       │
│                                                                        │
│   ModelManager (Lifecycle, Sequential Loading, Memory Unload)          │
│   ├── SpeechService (Whisper Small on CPU)                             │
│   ├── TranslationService (IndicTrans2 INT8 / 320M Dynamic Routing)     │
│   └── TTSService (DhVaani 0.5 Neural Synthesizer)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       LOCAL WEIGHTS & PERSISTENCE                      │
│                                                                        │
│   - indictrans2-int8.pth (~1.5 GB Dynamic Quantized)                   │
│   - models/indictrans2 (~1.28 GB Distilled 320M safetensors)           │
│   - DhVaani-0.5/model.safetensors (~491 MB)                            │
│   - SQLite / Local JSON Database (Lessons, History, Worksheets)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 2 GB RAM Device Optimization Strategy

Low-cost Android tablets running Android 9+ allocate ~1 GB to Android OS, System UI, and Play Services, leaving approximately **500–800 MB** of free RAM for active foreground applications.

### The Memory Challenge
- Whisper `small`: ~460 MB
- IndicTrans2 INT8: ~1,590 MB
- DhVaani TTS: ~491 MB
- **Total Concurrent Footprint**: ~2,541 MB (Triggers immediate Android OOM Killer!)

### The JANANI Solution
1. **Sequential Lifecycle Management (`ModelManager`)**:
   - At no point are all three models actively performing tensor operations simultaneously.
   - For batch lessons, models can be loaded on-demand and freed via explicit `unload()` methods (`gc.collect()` + `empty_cache()`).
2. **`android:largeHeap="true"`**:
   - Specified in `AndroidManifest.xml` to raise the Dalvik/ART virtual machine per-process limit to the maximum allowable memory.
3. **Local Phrase & Audio Caching**:
   - Frequent classroom instructions (e.g., *"Sit down"*, *"Open your book"*, *"Well done"*) are cached after the first synthesis, eliminating redundant model generation.

---

## 3. Translation Model Routing Strategy

The project contains two complementary IndicTrans2 assets:

| Model Asset | Disk Path | Underlying Architecture | Vocabulary | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **INT8 Checkpoint** | `indictrans2-int8/` | `indictrans2-en-indic-1B` | En: 32K, Indic: 122K | English → Santali (`sat_Olck`) |
| **320M Distilled** | `models/indictrans2/` | `indictrans2-indic-indic-dist-320M` | Indic: 122K, Indic: 122K | Hindi → Santali (`sat_Olck`) |

`TranslationService` transparently selects the correct model backend based on the incoming source language code (`eng_Latn` vs. `hin_Deva`), while supporting explicit `MODEL_BACKEND="int8"` selection.

---

## 4. Audio Pipeline & Latency Profile

```
Teacher Speech ➔ [Audio Capture 16kHz] ➔ [Whisper STT ~1.5s]
➔ [IndicProcessor Preprocess] ➔ [IndicTrans2 Generate ~1.1s]
➔ [Ol Chiki Unicode Validate] ➔ [DhVaani Synthesis ~3.9s]
➔ [Audio Normalizer] ➔ [Playable 24kHz WAV]
```
Total end-to-end interactive classroom turnaround is approximately **5.5 to 6.5 seconds**, with real-time stage breadcrumbs (🎤 Listening → 📝 Recognizing → 🔄 Translating → 🔊 Speaking) keeping the teacher informed.
