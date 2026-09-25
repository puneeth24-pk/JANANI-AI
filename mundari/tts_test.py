import os
import sys
import subprocess
from pathlib import Path

import numpy as np
import torch
import scipy.io.wavfile as wav
from transformers import AutoTokenizer, VitsModel


BASE_DIR = Path(__file__).resolve().parent

MODEL_ID = "facebook/mms-tts-unr"

OUTPUT_DIR = BASE_DIR
OUTPUT_WAV = OUTPUT_DIR / "mundari_test.wav"

DEVICE = (
    "mps"
    if torch.backends.mps.is_available()
    else "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


def print_header(title):
    print()
    print("=" * 70)
    print(f"{title:^70}")
    print("=" * 70)


def load_model():
    print_header("MUNDARI TTS MODEL")

    print("Model:")
    print(MODEL_ID)

    print()
    print("Device:", DEVICE)

    print()
    print("Loading tokenizer...")

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_ID
    )

    print("Tokenizer ready.")

    print()
    print("Loading Mundari TTS model...")

    model = VitsModel.from_pretrained(
        MODEL_ID
    )

    model = model.to(DEVICE)
    model.eval()

    print("Mundari TTS ready.")

    print()
    print("Sampling rate:")
    print(model.config.sampling_rate)

    return tokenizer, model


def validate_text(tokenizer, text):
    text = text.strip()

    if not text:
        raise ValueError("Empty text.")

    inputs = tokenizer(
        text,
        return_tensors="pt"
    )

    input_ids = inputs["input_ids"]

    print()
    print("Tokenizer input shape:")
    print(input_ids.shape)

    if input_ids.numel() == 0:
        raise ValueError(
            "The Mundari tokenizer produced zero tokens."
        )

    if input_ids.shape[1] == 0:
        raise ValueError(
            "The Mundari tokenizer produced an empty sequence."
        )

    return inputs


def generate_speech(tokenizer, model, text):
    print_header("MUNDARI SPEECH GENERATION")

    print()
    print("Mundari text:")
    print(text)

    print()
    print("Checking tokenizer...")

    inputs = validate_text(
        tokenizer,
        text
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    print()
    print("Generating Mundari speech...")

    with torch.inference_mode():
        output = model(
            **inputs
        )

    audio = output.waveform

    if audio is None:
        raise RuntimeError(
            "Mundari TTS returned no waveform."
        )

    audio = audio.squeeze().detach().cpu().numpy()

    if audio.size == 0:
        raise RuntimeError(
            "Generated waveform is empty."
        )

    audio = np.asarray(
        audio,
        dtype=np.float32
    )

    peak = np.max(
        np.abs(audio)
    )

    if peak > 0:
        audio = audio / max(
            1.0,
            peak
        )

    wav.write(
        str(OUTPUT_WAV),
        model.config.sampling_rate,
        audio
    )

    print()
    print("Mundari speech generated.")

    print()
    print("Audio:")
    print(OUTPUT_WAV)

    return str(OUTPUT_WAV)


def play_audio(audio_path):
    print()
    print("Playing Mundari speech...")

    system = sys.platform

    try:

        if system == "darwin":

            subprocess.run(
                ["afplay", audio_path],
                check=False
            )

        elif system.startswith("linux"):

            subprocess.run(
                ["aplay", audio_path],
                check=False
            )

        elif system == "win32":

            import winsound

            winsound.PlaySound(
                audio_path,
                winsound.SND_FILENAME
            )

        else:

            print(
                "Automatic playback is unavailable."
            )

    except KeyboardInterrupt:

        print()
        print("Playback stopped.")

    except Exception as e:

        print()
        print("Playback failed:")
        print(e)

    print()
    print("Playback finished.")


def test_known_mundari(tokenizer, model):
    print_header("KNOWN MUNDARI TTS TEST")

    print()
    print(
        "This test directly checks the Mundari TTS model."
    )

    print()
    print(
        "The input below MUST be Mundari text."
    )

    print()
    print(
        "Enter a Mundari sentence."
    )

    print()
    print(
        "For the SIH application, Hindi/English will be"
    )
    print(
        "translated to Mundari before reaching this stage."
    )

    while True:

        text = input(
            "\nMundari text [Q to quit]: "
        ).strip()

        if text.lower() == "q":
            return

        if not text:
            print(
                "Please enter some text."
            )
            continue

        try:

            output = generate_speech(
                tokenizer,
                model,
                text
            )

            play_audio(
                output
            )

        except Exception as e:

            print()
            print(
                "TTS generation failed."
            )
            print()
            print(e)


def main():

    print_header(
        "MUNDARI TEXT-TO-SPEECH TEST"
    )

    print()
    print(
        "MMS Mundari TTS"
    )

    print()
    print(
        "Language: Mundari"
    )

    print()
    print(
        "ISO 639-3: unr"
    )

    try:

        tokenizer, model = load_model()

    except Exception as e:

        print()
        print(
            "Failed to load Mundari TTS."
        )

        print()
        print(e)

        sys.exit(1)

    print_header(
        "MODEL READY"
    )

    print()
    print(
        "The Mundari TTS model is loaded locally."
    )

    print()
    print(
        "Important:"
    )

    print(
        "Hindi/English should NOT be sent directly"
    )

    print(
        "to this TTS model."
    )

    print()
    print(
        "Correct SIH pipeline:"
    )

    print(
        "Hindi/English"
    )

    print(
        "      ↓"
    )

    print(
        "IndicTrans2"
    )

    print(
        "      ↓"
    )

    print(
        "Mundari"
    )

    print(
        "      ↓"
    )

    print(
        "Mundari TTS"
    )

    print(
        "      ↓"
    )

    print(
        "Speech"
    )

    test_known_mundari(
        tokenizer,
        model
    )

    print_header(
        "MUNDARI TTS TEST FINISHED"
    )


if __name__ == "__main__":
    main()