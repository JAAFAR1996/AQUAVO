"""
AQUAVO Video Factory - Modal Deployment
Generate high-quality marketing videos using Wan2.1 T2V/I2V
Designed for AQUAVO's 20-video marketing campaign
"""

import modal
import io
import base64
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

# ============================================================
# MODAL APP CONFIGURATION
# ============================================================

app = modal.App("aquavo-video-factory")

# Persistent volume for caching models
volume = modal.Volume.from_name("aquavo-video-cache", create_if_missing=True)

# Docker image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libsm6", "libxext6", "libgl1")
    .pip_install(
        # Core ML
        "torch>=2.1.0",
        "torchvision",
        "torchaudio",
        # Diffusers & Transformers
        "diffusers>=0.32.0",
        "transformers>=4.39.0",
        "accelerate>=0.26.0",
        # Utilities
        "sentencepiece",
        "opencv-python",
        "imageio",
        "imageio-ffmpeg",
        "pillow",
        "numpy",
        "safetensors",
        "huggingface_hub",
        # Web API
        "fastapi",
        "starlette",
        "python-multipart",
        # HTML Parsing
        "beautifulsoup4",
        "lxml",
    )
)

MODEL_DIR = "/models"
OUTPUT_DIR = "/outputs"

# ============================================================
# MODEL LOADING
# ============================================================

_pipe_i2v = None
_pipe_t2v = None
_export_to_video = None


def load_wan21_i2v():
    """Load Wan2.1 Image-to-Video pipeline"""
    global _pipe_i2v, _export_to_video

    if _pipe_i2v is not None:
        return _pipe_i2v, _export_to_video

    import torch
    from diffusers import WanImageToVideoPipeline
    from diffusers.utils import export_to_video

    _export_to_video = export_to_video

    print("🎬 Loading Wan2.1 I2V Model...")

    model_path = Path(MODEL_DIR) / "wan21-i2v"

    if model_path.exists():
        print("📦 Loading from cache...")
        _pipe_i2v = WanImageToVideoPipeline.from_pretrained(
            str(model_path),
            torch_dtype=torch.bfloat16,
        )
    else:
        print("⬇️ Downloading Wan2.1-I2V from HuggingFace...")
        _pipe_i2v = WanImageToVideoPipeline.from_pretrained(
            "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers",
            torch_dtype=torch.bfloat16,
        )
        # Cache model
        _pipe_i2v.save_pretrained(str(model_path))
        volume.commit()

    _pipe_i2v.to("cuda")
    _pipe_i2v.enable_model_cpu_offload()

    # Enable memory optimizations
    _pipe_i2v.enable_vae_slicing()
    _pipe_i2v.enable_vae_tiling()

    print("✅ Wan2.1 I2V loaded successfully!")
    return _pipe_i2v, _export_to_video


def load_wan21_t2v():
    """Load Wan2.1 Text-to-Video pipeline"""
    global _pipe_t2v, _export_to_video

    if _pipe_t2v is not None:
        return _pipe_t2v, _export_to_video

    import torch
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    _export_to_video = export_to_video

    print("🎬 Loading Wan2.1 T2V Model...")

    model_path = Path(MODEL_DIR) / "wan21-t2v"

    if model_path.exists():
        print("📦 Loading from cache...")
        _pipe_t2v = WanPipeline.from_pretrained(
            str(model_path),
            torch_dtype=torch.bfloat16,
        )
    else:
        print("⬇️ Downloading Wan2.1-T2V from HuggingFace...")
        _pipe_t2v = WanPipeline.from_pretrained(
            "Wan-AI/Wan2.1-T2V-14B-Diffusers",
            torch_dtype=torch.bfloat16,
        )
        # Cache model
        _pipe_t2v.save_pretrained(str(model_path))
        volume.commit()

    _pipe_t2v.to("cuda")
    _pipe_t2v.enable_model_cpu_offload()

    # Enable memory optimizations
    _pipe_t2v.enable_vae_slicing()
    _pipe_t2v.enable_vae_tiling()

    print("✅ Wan2.1 T2V loaded successfully!")
    return _pipe_t2v, _export_to_video


# ============================================================
# VIDEO GENERATION FUNCTIONS
# ============================================================

def generate_video_i2v(
    image_b64: str,
    prompt: str,
    num_frames: int = 65,
    fps: int = 8,
    num_inference_steps: int = 30,
    guidance_scale: float = 7.5,
) -> Dict[str, Any]:
    """Generate video from image + prompt"""
    import torch
    from PIL import Image
    import tempfile
    import os
    import gc

    try:
        pipe, export_to_video = load_wan21_i2v()

        if not image_b64:
            return {"error": "No image provided", "success": False}

        if not prompt:
            return {"error": "No prompt provided", "success": False}

        # Decode image
        print(f"📷 Processing image...")
        image_data = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # 9:16 vertical for Reels (divisible by 16)
        target_width = 544
        target_height = 960
        image = image.resize((target_width, target_height), Image.LANCZOS)
        print(f"📐 Resolution: {target_width}x{target_height}")

        # Enhance prompt for quality
        enhanced_prompt = f"Cinematic, professional video, smooth motion, high quality, 4K, {prompt}"
        print(f"🎬 Prompt: {enhanced_prompt[:100]}...")

        # Clear VRAM
        gc.collect()
        torch.cuda.empty_cache()

        # Generate video
        print("⏳ Generating video...")
        with torch.inference_mode():
            video_frames = pipe(
                prompt=enhanced_prompt,
                image=image,
                num_frames=num_frames,
                height=target_height,
                width=target_width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
            ).frames[0]

        # Export to video file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        export_to_video(video_frames, video_path, fps=fps)

        # Read and encode to base64
        with open(video_path, "rb") as f:
            video_base64 = base64.b64encode(f.read()).decode("utf-8")

        # Get file size
        file_size = os.path.getsize(video_path)

        # Cleanup
        os.unlink(video_path)

        print("✅ Video generated successfully!")

        return {
            "success": True,
            "video": video_base64,
            "num_frames": num_frames,
            "fps": fps,
            "duration": num_frames / fps,
            "resolution": f"{target_width}x{target_height}",
            "file_size_mb": round(file_size / (1024 * 1024), 2),
        }

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"error": str(e), "success": False}


def generate_video_t2v(
    prompt: str,
    num_frames: int = 65,
    fps: int = 8,
    num_inference_steps: int = 30,
    guidance_scale: float = 7.5,
) -> Dict[str, Any]:
    """Generate video from text prompt only"""
    import torch
    import tempfile
    import os
    import gc

    try:
        pipe, export_to_video = load_wan21_t2v()

        if not prompt:
            return {"error": "No prompt provided", "success": False}

        # 9:16 vertical for Reels
        target_width = 544
        target_height = 960
        print(f"📐 Resolution: {target_width}x{target_height}")

        # Enhance prompt
        enhanced_prompt = f"Cinematic, professional video, smooth motion, high quality, 4K, {prompt}"
        print(f"🎬 Prompt: {enhanced_prompt[:100]}...")

        # Clear VRAM
        gc.collect()
        torch.cuda.empty_cache()

        # Generate
        print("⏳ Generating video...")
        with torch.inference_mode():
            video_frames = pipe(
                prompt=enhanced_prompt,
                num_frames=num_frames,
                height=target_height,
                width=target_width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
            ).frames[0]

        # Export
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        export_to_video(video_frames, video_path, fps=fps)

        with open(video_path, "rb") as f:
            video_base64 = base64.b64encode(f.read()).decode("utf-8")

        file_size = os.path.getsize(video_path)
        os.unlink(video_path)

        print("✅ Video generated successfully!")

        return {
            "success": True,
            "video": video_base64,
            "num_frames": num_frames,
            "fps": fps,
            "duration": num_frames / fps,
            "resolution": f"{target_width}x{target_height}",
            "file_size_mb": round(file_size / (1024 * 1024), 2),
        }

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"error": str(e), "success": False}


# ============================================================
# FASTAPI WEB API
# ============================================================

from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

web_api = FastAPI(
    title="AQUAVO Video Factory",
    description="Generate high-quality marketing videos for AQUAVO",
    version="1.0.0",
)

web_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@web_api.get("/")
async def root():
    return {
        "name": "AQUAVO Video Factory",
        "version": "1.0.0",
        "model": "Wan2.1-14B",
        "endpoints": ["/generate/i2v", "/generate/t2v", "/health"],
    }


@web_api.get("/health")
async def health():
    return {"status": "ok", "model": "Wan2.1-14B", "ready": True}


@web_api.post("/generate/i2v")
async def generate_i2v_endpoint(request: Request):
    """Generate video from image + prompt"""
    data = await request.json()

    result = generate_video_i2v(
        image_b64=data.get("image", ""),
        prompt=data.get("prompt", ""),
        num_frames=data.get("num_frames", 65),
        fps=data.get("fps", 8),
        num_inference_steps=data.get("num_inference_steps", 30),
        guidance_scale=data.get("guidance_scale", 7.5),
    )

    return JSONResponse(content=result)


@web_api.post("/generate/t2v")
async def generate_t2v_endpoint(request: Request):
    """Generate video from text prompt only"""
    data = await request.json()

    result = generate_video_t2v(
        prompt=data.get("prompt", ""),
        num_frames=data.get("num_frames", 65),
        fps=data.get("fps", 8),
        num_inference_steps=data.get("num_inference_steps", 30),
        guidance_scale=data.get("guidance_scale", 7.5),
    )

    return JSONResponse(content=result)


@web_api.post("/generate/aquavo")
async def generate_aquavo_video(request: Request):
    """
    Generate AQUAVO video clip
    Expects: video_id (V2, V3, etc.), clip_number (1, 2, 3), optional image
    """
    data = await request.json()

    video_id = data.get("video_id", "")
    clip_number = data.get("clip_number", 1)
    prompt = data.get("prompt", "")
    image_b64 = data.get("image", "")

    if not prompt:
        return JSONResponse(
            content={"error": "No prompt provided", "success": False},
            status_code=400,
        )

    # Use I2V if image provided, otherwise T2V
    if image_b64:
        result = generate_video_i2v(
            image_b64=image_b64,
            prompt=prompt,
            num_frames=65,  # ~8 seconds @ 8fps
            fps=8,
            num_inference_steps=30,
            guidance_scale=7.5,
        )
    else:
        result = generate_video_t2v(
            prompt=prompt,
            num_frames=65,
            fps=8,
            num_inference_steps=30,
            guidance_scale=7.5,
        )

    # Add metadata
    result["video_id"] = video_id
    result["clip_number"] = clip_number

    return JSONResponse(content=result)


# ============================================================
# MODAL FUNCTION DEFINITION
# ============================================================

@app.function(
    image=image,
    gpu="A100",  # 80GB for 14B model
    timeout=1200,  # 20 minutes
    volumes={MODEL_DIR: volume},
    memory=32768,  # 32GB RAM
)
@modal.asgi_app()
def fastapi_app():
    """Serve AQUAVO Video Factory API"""
    return web_api


# ============================================================
# CLI ENTRYPOINT (for local testing)
# ============================================================

@app.local_entrypoint()
def main(
    prompt: str = "A beautiful goldfish swimming in a crystal clear aquarium",
    mode: str = "t2v",
    image_path: str = "",
    output_path: str = "output.mp4",
):
    """
    CLI for generating videos locally
    
    Usage:
        modal run aquavo_video_factory.py --prompt "Your prompt" --mode t2v
        modal run aquavo_video_factory.py --prompt "Your prompt" --mode i2v --image-path input.jpg
    """
    import base64

    print(f"🎬 AQUAVO Video Factory")
    print(f"📝 Mode: {mode.upper()}")
    print(f"📝 Prompt: {prompt}")

    if mode == "i2v":
        if not image_path:
            print("❌ Error: --image-path required for i2v mode")
            return

        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        result = generate_video_i2v.remote(
            image_b64=image_b64,
            prompt=prompt,
        )
    else:
        result = generate_video_t2v.remote(prompt=prompt)

    if result.get("success"):
        # Save video
        video_data = base64.b64decode(result["video"])
        with open(output_path, "wb") as f:
            f.write(video_data)
        print(f"✅ Video saved to: {output_path}")
        print(f"📊 Duration: {result['duration']}s, Size: {result['file_size_mb']}MB")
    else:
        print(f"❌ Error: {result.get('error')}")


if __name__ == "__main__":
    print("Deploy with: modal deploy aquavo_video_factory.py")
    print("Run with: modal run aquavo_video_factory.py --prompt 'Your prompt'")
