import subprocess
import sys
import time
from pathlib import Path

import onnxruntime as ort


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(
    "/Users/puneeth/Downloads/SANTALI"
)

ONNX_DIR = (
    BASE_DIR / "DhVaani-ONNX"
)

REFERENCE_WAV = (
    BASE_DIR
    / "DhVaani-0.5"
    / "samples"
    / "hindi.wav"
)

OUTPUT_DIR = (
    BASE_DIR / "outputs"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# TEST SETTINGS
# ============================================================

TEST_TEXT = (
    "ᱡᱚᱦᱟᱨ ᱾ ᱤᱧ ᱯᱩᱱᱤᱛ ᱠᱩᱢᱟᱨ ᱠᱟᱱᱟᱹᱧ ᱾"
)

PROMPT_TEXT = (
    "नमस्ते। मेरा नाम पुणीत कुमार है। "
    "आज हम एक सरल विषय के बारे में सीखेंगे।"
)

# Quality baseline
NUM_STEPS = 4


# ============================================================
# PRINT PROVIDERS
# ============================================================

print()
print("=" * 70)
print("          DHVAANI ONNX M2 BENCHMARK")
print("=" * 70)

print()

print(
    "ONNX Runtime version:"
)

print(
    ort.__version__
)

print()

print(
    "Available execution providers:"
)

providers = ort.get_available_providers()

for provider in providers:

    print(
        f"  ✓ {provider}"
    )


# ============================================================
# SELECT PROVIDER
# ============================================================

if "CoreMLExecutionProvider" in providers:

    selected_provider = (
        "CoreMLExecutionProvider"
    )

    print()
    print(
        "🚀 CoreML Execution Provider FOUND"
    )

elif "CPUExecutionProvider" in providers:

    selected_provider = (
        "CPUExecutionProvider"
    )

    print()
    print(
        "⚠️ CoreML not available."
    )

    print(
        "Using CPUExecutionProvider."
    )

else:

    print()
    print(
        "❌ No usable execution provider found."
    )

    sys.exit(1)


# ============================================================
# MODEL FILE CHECK
# ============================================================

print()
print("=" * 70)
print("MODEL CHECK")
print("=" * 70)

required = [

    ONNX_DIR
    / "text_encoder_int8.onnx",

    ONNX_DIR
    / "fm_decoder_int8.onnx",

    ONNX_DIR
    / "vocoder_backbone.onnx",

    ONNX_DIR
    / "dhvaani_torchfree.py",

    REFERENCE_WAV
]


for path in required:

    if path.exists():

        print(
            f"✓ {path.name}"
        )

    else:

        print()
        print(
            f"❌ Missing: {path}"
        )

        sys.exit(1)


# ============================================================
# TEST DIRECT ONNX SESSION
# ============================================================

print()
print("=" * 70)
print("TESTING ONNX RUNTIME")
print("=" * 70)


models = [

    (
        "Text Encoder",
        ONNX_DIR
        / "text_encoder_int8.onnx"
    ),

    (
        "Flow Decoder",
        ONNX_DIR
        / "fm_decoder_int8.onnx"
    ),

    (
        "Vocoder",
        ONNX_DIR
        / "vocoder_backbone.onnx"
    )
]


for name, model_path in models:

    print()
    print(
        f"Loading {name}..."
    )


    start = time.perf_counter()


    try:

        session = ort.InferenceSession(

            str(model_path),

            providers=[
                selected_provider,
                "CPUExecutionProvider"
            ]
        )


        elapsed = (
            time.perf_counter()
            - start
        )


        print(
            f"✓ Loaded in "
            f"{elapsed:.3f}s"
        )


        print(
            "  Provider:"
        )

        print(
            f"  {session.get_providers()}"
        )


        del session


    except Exception as e:

        print()
        print(
            f"⚠️ {name} cannot use "
            f"{selected_provider}"
        )

        print(
            str(e)[:1000]
        )

        if selected_provider != "CPUExecutionProvider":

            print()
            print(
                "Falling back to CPU."
            )

            selected_provider = (
                "CPUExecutionProvider"
            )


# ============================================================
# RUN FULL DHVAANI
# ============================================================

print()
print("=" * 70)
print("FULL DHVAANI TEST")
print("=" * 70)

print()

print(
    f"Provider : {selected_provider}"
)

print(
    f"Steps    : {NUM_STEPS}"
)

print()

output_file = (
    OUTPUT_DIR
    / "dhvaani_m2_test.wav"
)


script = (
    ONNX_DIR
    / "dhvaani_torchfree.py"
)


command = [

    sys.executable,

    str(script),

    "--prompt-wav",
    str(REFERENCE_WAV),

    "--prompt-text",
    PROMPT_TEXT,

    "--text",
    TEST_TEXT,

    "--onnx-dir",
    str(ONNX_DIR),

    "--num-step",
    str(NUM_STEPS),

    "--out",
    str(output_file)
]


print(
    "Command:"
)

print(
    " ".join(
        f'"{x}"'
        if " " in str(x)
        else str(x)
        for x in command
    )
)

print()

print(
    "🚀 Starting..."
)

print()


start = time.perf_counter()


result = subprocess.run(
    command,
    cwd=str(ONNX_DIR)
)


total = (
    time.perf_counter()
    - start
)


# ============================================================
# RESULT
# ============================================================

print()
print("=" * 70)
print("RESULT")
print("=" * 70)

print()

print(
    f"⏱️ Total wall time: "
    f"{total:.2f}s"
)


if result.returncode != 0:

    print()
    print(
        "❌ DhVaani failed."
    )

    sys.exit(
        result.returncode
    )


if not output_file.exists():

    print()
    print(
        "❌ Output WAV missing."
    )

    sys.exit(1)


print()
print(
    "✅ Audio generated:"
)

print(
    output_file
)


# ============================================================
# PLAY
# ============================================================

print()
print(
    "🔊 Playing..."
)

print()

subprocess.run(

    [
        "afplay",

        str(output_file)
    ],

    check=False
)


# ============================================================
# FINAL
# ============================================================

print()
print("=" * 70)
print("BENCHMARK COMPLETE")
print("=" * 70)

print()

print(
    f"Provider : {selected_provider}"
)

print(
    f"Steps    : {NUM_STEPS}"
)

print(
    f"Time     : {total:.2f}s"
)

print()

print(
    "If CoreML is available but the full pipeline"
)

print(
    "does not actually use it, we will patch the"
)

print(
    "DhVaani inference script directly."
)
