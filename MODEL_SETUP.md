# JANANI: Model Setup & Checkpoint Guide

## 1. Overview of On-Device Models

All required AI models are already present locally in the repository. **NO external downloads or Hugging Face Hub connections are permitted or required.**

```
SANTALI/
├── indictrans2-int8/
│   ├── indictrans2-int8.pth       (1.59 GB)
│   ├── kairos_model/              (Tokenizer, vocabularies, config)
│   └── model_info.txt
├── models/
│   └── indictrans2/               (1.28 GB model.safetensors)
└── DhVaani-0.5/
    ├── model.safetensors          (491 MB)
    └── samples/hindi.wav          (Reference prompt WAV)
```

---

## 2. IndicTrans2 INT8 Quantized Model

### Technical Specifications
- **Checkpoint Path**: `indictrans2-int8/indictrans2-int8.pth`
- **File Size**: 1,594,906,685 bytes (~1.59 GB)
- **Base Architecture**: `ai4bharat/indictrans2-en-indic-1B`
- **Quantization Scheme**: PyTorch Dynamic INT8 (`torch.ao.quantization.quantize_dynamic`)
- **Target Layers**: 289 Linear layers quantized to `torch.qint8`
- **Quantized Engine Backend**: `torch.backends.quantized.engine = "qnnpack"`

### Loading Code (Verified Working)
```python
import torch
from transformers import AutoConfig, AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

torch.backends.quantized.engine = "qnnpack"

# 1. Instantiate architecture from kairos_model config
config = AutoConfig.from_pretrained("indictrans2-int8/kairos_model", trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_config(config, trust_remote_code=True)
model.eval()

# 2. Apply dynamic INT8 quantization structure
model = torch.ao.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)

# 3. Load INT8 quantized weights
state_dict = torch.load("indictrans2-int8/indictrans2-int8.pth", map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

# 4. Initialize Tokenizer & IndicProcessor
tokenizer = AutoTokenizer.from_pretrained("indictrans2-int8/kairos_model", trust_remote_code=True)
processor = IndicProcessor(inference=True)
```

---

## 3. IndicTrans2 320M Distilled Model

- **Location**: `models/indictrans2/`
- **File Size**: 1,283,534,352 bytes (~1.28 GB)
- **Architecture**: `ai4bharat/indictrans2-indic-indic-dist-320M`
- **Device Support**: CPU / Apple Silicon MPS / CUDA
- **Primary Function**: Direct Indian language translation (Hindi `hin_Deva` → Santali `sat_Olck`).

---

## 4. DhVaani 0.5 Santali Voice Synthesizer

- **Location**: `DhVaani-0.5/`
- **Weights**: `DhVaani-0.5/model.safetensors` (~491 MB)
- **Prompt Audio**: `DhVaani-0.5/samples/hindi.wav`
- **Prompt Text**: `"इसे कईबार मनचित भी की आगया है"`
- **Production Synthesis Parameters**:
  - `num_step`: `24` (matches original working `test_tts.py`)
  - `guidance_scale`: `1.0`
  - `speed`: `0.92`
  - `seed`: `666`
  - `sample_rate`: `24,000 Hz` (24 kHz)

---

## 5. Model Verification Script

To verify that all models are present and functional, execute:
```bash
python -c "from services.model_manager import get_model_manager; print(get_model_manager().is_installed())"
```
Output:
```json
{
  "whisper": true,
  "indictrans2_int8": true,
  "indictrans2_320m": true,
  "dhvaani": true,
  "all_installed": true
}
```
