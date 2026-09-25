import torch
from diffusers import FluxPipeline
from dotenv import load_dotenv
import os

load_dotenv()

token = os.getenv("token")

pipe = FluxPipeline.from_pretrained(
    "black-forest-labs/FLUX.1-schnell",
    torch_dtype=torch.bfloat16,
    token=token
)

pipe.enable_model_cpu_offload()

prompt = """
A single bright red apple on a clean white background,
simple colorful educational illustration for a primary school flashcard,
centered, no text, no letters.
"""

image = pipe(
    prompt,
    num_inference_steps=4,
    guidance_scale=0.0,
    width=512,
    height=512
).images[0]

image.save("apple_test.png")

print("✅ Image saved: apple_test.png")