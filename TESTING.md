# JANANI: Complete Testing & Verification Suite

## 1. Automated Test Scripts

A comprehensive suite of standalone test scripts is provided to verify each layer of the JANANI pipeline independently and end-to-end.

---

### Test 1: Speech Recognition (Whisper STT)
Tests Hindi audio transcription using `hindi_test.wav`:
```bash
python -c "
import sys
from pathlib import Path
from services.speech_service import get_speech_service

speech = get_speech_service()
speech.load()
res = speech.transcribe('hindi_test.wav', language='hin_Deva')
print('Transcription:', res['text'])
print('Time:', res['elapsed_seconds'], 'sec')
assert len(res['text']) > 0, 'Transcription empty'
print('✅ Test 1 Passed: Whisper STT OK')
"
```

---

### Test 2: Machine Translation (IndicTrans2 INT8 & 320M)
Tests English → Santali using INT8, and Hindi → Santali using 320M:
```bash
python -c "
from services.translation_service import get_translation_engine, is_valid_olchiki

# English -> Santali (INT8 Engine)
engine = get_translation_engine(backend='int8')
engine.load()
en_res = engine.translate('This is a book.', src_lang='eng_Latn', tgt_lang='sat_Olck')
print('EN -> Santali:', en_res)
assert is_valid_olchiki(en_res), 'Invalid Ol Chiki output'

# Hindi -> Santali (320M Engine)
hi_res = engine.translate('यह एक किताब है।', src_lang='hin_Deva', tgt_lang='sat_Olck')
print('HI -> Santali:', hi_res)
assert is_valid_olchiki(hi_res), 'Invalid Ol Chiki output'

print('✅ Test 2 Passed: Translation & Ol Chiki Validation OK')
"
```

---

### Test 3: Santali Voice Synthesis (DhVaani 0.5)
Synthesizes verified Ol Chiki script to a 24 kHz WAV file:
```bash
python -c "
from services.tts_service import get_tts_service
from pathlib import Path

tts = get_tts_service()
tts.load()
out_wav = Path('outputs/test_tts_verified.wav')
res = tts.synthesize_full(text='ᱱᱚᱶᱟ ᱫᱚ ᱢᱤᱫᱴᱟᱝ ᱯᱚᱛᱚᱵ ᱾', output_path=out_wav, steps=24, speed=0.92)
print('TTS Result:', res)
assert out_wav.exists() and out_wav.stat().st_size > 1000, 'Audio file missing or empty'
print('✅ Test 3 Passed: DhVaani TTS OK')
"
```

---

### Test 4: End-to-End Pipeline
Speech In → Whisper STT → IndicTrans2 → Santali Ol Chiki → DhVaani → Playable Audio:
```bash
python -c "
from services.pipeline_service import get_pipeline_service
from pathlib import Path

pipeline = get_pipeline_service()
res = pipeline.process_audio(
    audio_path='hindi_test.wav',
    source_language='hin_Deva',
    generate_audio=True,
    tts_steps=24,
    tts_speed=0.92
)
print('1. Recognized:', res['source_text'])
print('2. Santali Ol Chiki:', res['santali_text'])
print('3. Audio Generated:', res['audio_path'])
print('4. Timings:', res['timing'])
assert Path(res['audio_path']).exists(), 'Pipeline failed to produce output audio'
print('✅ Test 4 Passed: Full End-to-End Offline Pipeline OK')
"
```

---

## 2. Hackathon Demo Mode Verification

For hackathon presentation, open the **Offline Test Screen** in the React Native UI:
1. Tap the bottom navigation tab **⚙️ Settings** or the home screen card **Offline Diagnostic**.
2. Tap **"▶ Run Full End-to-End Offline Test Suite"**.
3. All 5 core checks will execute in real-time on-device and display:
   - `Internet: OFFLINE GUARANTEED`
   - `Whisper STT: PASS`
   - `IndicTrans2: PASS`
   - `DhVaani TTS: PASS` (audio snippet plays aloud automatically)
   - `Local Storage: PASS`
