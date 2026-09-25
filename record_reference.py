import sounddevice as sd
from scipy.io.wavfile import write

SAMPLE_RATE = 24000
SECONDS = 6

print("🎤 Speak Santali for 6 seconds...")

audio = sd.rec(
    int(SECONDS * SAMPLE_RATE),
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="int16"
)

sd.wait()

write(
    "santali_reference.wav",
    SAMPLE_RATE,
    audio
)

print("✅ Saved: santali_reference.wav")
