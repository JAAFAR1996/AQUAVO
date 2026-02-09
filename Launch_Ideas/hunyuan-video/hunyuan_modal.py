"""
HunyuanVideo I2V - Modal Deployment
Generate videos from images using Tencent's HunyuanVideo model
"""

import modal
import io
import base64
from pathlib import Path

# Modal app definition
app = modal.App("hunyuan-video-i2v")

# Create volume for caching models
volume = modal.Volume.from_name("hunyuan-video-cache", create_if_missing=True)

# Docker image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libsm6", "libxext6", "libgl1")
    .pip_install(
        "torch>=2.1.0",
        "torchvision",
        "diffusers>=0.31.0",
        "transformers>=4.39.0",
        "accelerate>=0.26.0",
        "sentencepiece",
        "opencv-python",
        "imageio",
        "imageio-ffmpeg",
        "pillow",
        "numpy",
        "safetensors",
        "huggingface_hub",
        "fastapi",
        "starlette",
    )
)

MODEL_DIR = "/models"
OUTPUT_DIR = "/outputs"

# Global variable to hold the model
_pipe = None
_export_to_video = None


def load_model():
    """Load the model if not already loaded"""
    global _pipe, _export_to_video
    
    if _pipe is not None:
        return _pipe, _export_to_video
    
    import torch
    from diffusers import HunyuanVideoImageToVideoPipeline
    from diffusers.utils import export_to_video

    _export_to_video = export_to_video

    print("Loading HunyuanVideo I2V model...")

    # Check if model is cached
    model_path = Path(MODEL_DIR) / "hunyuan-video-i2v"

    if model_path.exists():
        print("Loading from cache...")
        _pipe = HunyuanVideoImageToVideoPipeline.from_pretrained(
            str(model_path),
            torch_dtype=torch.bfloat16,
        )
    else:
        print("Downloading model from HuggingFace...")
        _pipe = HunyuanVideoImageToVideoPipeline.from_pretrained(
            "hunyuanvideo-community/HunyuanVideo-I2V",
            torch_dtype=torch.bfloat16,
        )
        # Cache the model
        _pipe.save_pretrained(str(model_path))
        volume.commit()

    _pipe.to("cuda")
    _pipe.enable_model_cpu_offload()

    print("Model loaded successfully!")
    return _pipe, _export_to_video


def generate_video_internal(image_b64: str, prompt: str, num_frames: int, fps: int, width: int, height: int):
    """Generate video from image and prompt"""
    import torch
    from PIL import Image
    import tempfile
    import os

    try:
        pipe, export_to_video = load_model()
        
        if not image_b64:
            return {"error": "No image provided", "success": False}

        if not prompt:
            return {"error": "No prompt provided", "success": False}

        # Decode image
        print(f"Processing image for prompt: {prompt[:50]}...")
        image_data = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # 540p resolution adjusted for divisibility by 16 (required by model)
        # 540 is not divisible by 16, so we use 544
        target_width = 544
        target_height = 960
        image = image.resize((target_width, target_height), Image.LANCZOS)
        print(f"Resolution: {target_width}x{target_height}")
        
        # Add Quality Boost to prompt
        if "quality" not in prompt.lower():
            prompt = "Best quality, masterpiece, 4k, photorealistic, cinematic lighting, " + prompt
        print(f"Enhanced Prompt: {prompt}")

        # Generate video with optimized settings for B200
        print("Generating video...")
        import gc
        gc.collect()
        torch.cuda.empty_cache()
        
        with torch.inference_mode():
            video_frames = pipe(
                prompt=prompt,
                image=image,
                num_frames=min(num_frames, 17),  # ~2 sec to save memory
                height=target_height,
                width=target_width,
                num_inference_steps=50,  # MAX QUALITY
                guidance_scale=9.0,      # HIGH PRECISION
            ).frames[0]

        # Export to video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        export_to_video(video_frames, video_path, fps=fps)

        # Read video and encode to base64
        with open(video_path, "rb") as f:
            video_base64 = base64.b64encode(f.read()).decode("utf-8")

        # Clean up
        os.unlink(video_path)

        print("Video generated successfully!")

        return {
            "success": True,
            "video": video_base64,
            "num_frames": num_frames,
            "fps": fps,
            "duration": num_frames / fps,
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e), "success": False}


# FastAPI app with CORS
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

web_api = FastAPI()

# Add CORS middleware
web_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@web_api.post("/generate")
async def generate_endpoint(request: Request):
    data = await request.json()
    
    return generate_video_internal(
        image_b64=data.get("image", ""),
        prompt=data.get("prompt", ""),
        num_frames=data.get("num_frames", 25),
        fps=data.get("fps", 8),
        width=data.get("width", 720),
        height=data.get("height", 1280),
    )


@web_api.get("/health")
async def health():
    return {"status": "ok", "model": "HunyuanVideo-I2V"}


@app.function(image=image, gpu="B200", timeout=600, volumes={MODEL_DIR: volume})
@modal.asgi_app(label="api")
def fastapi_app():
    """Serve FastAPI with CORS"""
    return web_api


# For serving the web interface
web_app = modal.App("hunyuan-video-web")

static_path = Path(__file__).parent


@web_app.function(
    image=modal.Image.debian_slim().add_local_dir(static_path, remote_path="/static"),
)
@modal.asgi_app()
def web():
    """Serve the web interface"""
    from starlette.applications import Starlette
    from starlette.routing import Mount
    from starlette.staticfiles import StaticFiles

    return Starlette(
        routes=[
            Mount("/", app=StaticFiles(directory="/static", html=True)),
        ]
    )
