"""
🎙️ Audio Transcriber on Modal.com
===================================
High-accuracy transcription with GPU acceleration

Requirements:
    pip install modal

Usage:
    # Deploy and run
    modal run audio_transcriber_modal.py --audio-path "download (2).wav" --language ar
    
    # Deploy as persistent endpoint
    modal deploy audio_transcriber_modal.py
"""

import modal
from pathlib import Path

# ============================================
# 🏗️ MODAL APP SETUP
# ============================================

app = modal.App("audio-transcriber")

# Docker image with faster-whisper
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "faster-whisper>=1.0.0",
        "torch>=2.0.0",
    )
)

# Volume for caching models
model_cache = modal.Volume.from_name("whisper-models", create_if_missing=True)
MODEL_CACHE_PATH = "/cache/models"


# ============================================
# 🎙️ TRANSCRIBER CLASS
# ============================================

@app.cls(
    image=image,
    gpu="T4",  # Use T4 GPU for fast inference
    timeout=600,
    volumes={MODEL_CACHE_PATH: model_cache},
)
class Transcriber:
    
    @modal.enter()
    def load_model(self):
        """Load Whisper model on container startup."""
        from faster_whisper import WhisperModel
        import os
        
        # Set cache directory
        os.environ["HF_HOME"] = MODEL_CACHE_PATH
        
        print("🔄 Loading Whisper large-v3 model...")
        self.model = WhisperModel(
            "large-v3",
            device="cuda",
            compute_type="float16",
            download_root=MODEL_CACHE_PATH,
        )
        print("✅ Model loaded!")
    
    @modal.method()
    def transcribe(
        self,
        audio_bytes: bytes,
        language: str = None,
        word_timestamps: bool = True,
    ) -> dict:
        """
        Transcribe audio to text with timestamps.
        
        Args:
            audio_bytes: Raw audio file bytes
            language: Language code (ar, en, etc.) or None for auto-detect
            word_timestamps: Include word-level timestamps
        
        Returns:
            dict with segments and metadata
        """
        import tempfile
        import os
        
        # Save audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            print(f"🎙️ Transcribing audio...")
            print(f"   Language: {language or 'auto-detect'}")
            
            # Transcribe
            segments_gen, info = self.model.transcribe(
                temp_path,
                language=language,
                word_timestamps=word_timestamps,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=200
                ),
                beam_size=5,  # Higher for better accuracy
            )
            
            # Process segments
            segments = []
            for seg in segments_gen:
                words = []
                if word_timestamps and seg.words:
                    for w in seg.words:
                        words.append({
                            "word": w.word.strip(),
                            "start": round(w.start, 2),
                            "end": round(w.end, 2),
                            "probability": round(w.probability, 3)
                        })
                
                segments.append({
                    "id": len(segments),
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": seg.text.strip(),
                    "words": words
                })
            
            result = {
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "duration": round(info.duration, 2),
                "segments": segments,
            }
            
            print(f"✅ Transcription complete!")
            print(f"   Language: {info.language}")
            print(f"   Segments: {len(segments)}")
            
            return result
            
        finally:
            os.unlink(temp_path)


# ============================================
# 📄 OUTPUT FORMATTERS
# ============================================

def format_time(seconds: float) -> str:
    """Format seconds to MM:SS"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def save_outputs(result: dict, output_path: Path, audio_name: str):
    """Save transcription results to files."""
    import json
    
    # Save JSON
    json_path = output_path.with_suffix(".json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "audio_file": audio_name,
            **result
        }, f, ensure_ascii=False, indent=2)
    print(f"   📄 JSON: {json_path}")
    
    # Save TXT
    txt_path = output_path.with_suffix(".txt")
    lines = [
        "=" * 60,
        "🎙️ AUDIO TRANSCRIPT (Modal + large-v3)",
        f"   File: {audio_name}",
        f"   Language: {result['language']}",
        f"   Duration: {format_time(result['duration'])}",
        "=" * 60,
        ""
    ]
    for seg in result["segments"]:
        start = format_time(seg["start"])
        end = format_time(seg["end"])
        lines.append(f"[{start} → {end}]")
        lines.append(f"   {seg['text']}")
        lines.append("")
    
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"   📝 TXT: {txt_path}")
    
    # Save SRT
    srt_path = output_path.with_suffix(".srt")
    srt_lines = []
    for seg in result["segments"]:
        start = format_srt_time(seg["start"])
        end = format_srt_time(seg["end"])
        srt_lines.append(str(seg["id"] + 1))
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(seg["text"])
        srt_lines.append("")
    
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    print(f"   🎬 SRT: {srt_path}")


# ============================================
# 🚀 MAIN ENTRY POINT
# ============================================

@app.local_entrypoint()
def main(
    audio_path: str,
    language: str = None,
    output: str = None,
):
    """
    Transcribe audio file using Modal GPU.
    
    Args:
        audio_path: Path to audio file
        language: Language code (ar, en, etc.)
        output: Output filename (without extension)
    """
    audio_path = Path(audio_path)
    
    if not audio_path.exists():
        print(f"❌ Error: File not found: {audio_path}")
        return
    
    print("\n" + "=" * 60)
    print("🎙️ AUDIO TRANSCRIBER (Modal + GPU + large-v3)")
    print("=" * 60)
    print(f"   Input: {audio_path.name}")
    print(f"   Language: {language or 'auto-detect'}")
    
    # Read audio file
    audio_bytes = audio_path.read_bytes()
    
    # Call Modal function
    print("\n🚀 Sending to Modal GPU...")
    transcriber = Transcriber()
    result = transcriber.transcribe.remote(
        audio_bytes=audio_bytes,
        language=language,
        word_timestamps=True,
    )
    
    # Save outputs
    if output:
        output_path = Path(output)
    else:
        output_path = audio_path.parent / f"{audio_path.stem}_transcript_modal"
    
    print(f"\n💾 Saving outputs...")
    save_outputs(result, output_path, audio_path.name)
    
    print(f"\n🎉 Done!")


# ============================================
# 🌐 WEB ENDPOINT (Optional)
# ============================================

@app.function(image=image)
@modal.web_endpoint(method="POST")
def transcribe_api(audio_base64: str, language: str = None):
    """
    REST API endpoint for transcription.
    
    POST /transcribe_api
    Body: {"audio_base64": "...", "language": "ar"}
    """
    import base64
    
    audio_bytes = base64.b64decode(audio_base64)
    transcriber = Transcriber()
    result = transcriber.transcribe.remote(
        audio_bytes=audio_bytes,
        language=language,
        word_timestamps=True,
    )
    return result
