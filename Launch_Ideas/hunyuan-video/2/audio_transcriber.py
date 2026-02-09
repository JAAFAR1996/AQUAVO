"""
🎙️ Audio Transcriber with Timestamps
=====================================
أداة لاستخراج النص من الملفات الصوتية مع تحديد التوقيت

Features:
    - Word-level & segment-level timestamps
    - Arabic & English support
    - Multiple output formats (JSON, TXT, SRT)
    - Local processing (no API required)

Requirements:
    pip install faster-whisper

Usage:
    python audio_transcriber.py --input audio.mp3 --language ar
    python audio_transcriber.py --input audio.wav --output transcript --word-timestamps
"""

import argparse
import json
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict
from datetime import timedelta

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("❌ Missing dependency! Run:")
    print("   pip install faster-whisper")
    exit(1)


# ============================================
# 📊 DATA STRUCTURES
# ============================================

@dataclass
class Word:
    """Single word with timestamp."""
    word: str
    start: float
    end: float
    probability: float


@dataclass
class Segment:
    """Text segment with timestamp range."""
    id: int
    start: float
    end: float
    text: str
    words: list[dict]


@dataclass
class Transcript:
    """Full transcript with metadata."""
    audio_file: str
    language: str
    duration: float
    segments: list[Segment]


# ============================================
# 🔧 TRANSCRIBER CLASS
# ============================================

class AudioTranscriber:
    """
    Audio to Text with Timestamps using Faster-Whisper.
    """
    
    def __init__(
        self, 
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "auto"
    ):
        """
        Initialize the transcriber.
        
        Args:
            model_size: tiny, base, small, medium, large-v3
            device: auto, cpu, cuda
            compute_type: auto, int8, float16, float32
        """
        print(f"🔄 Loading Whisper model ({model_size})...")
        
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type
        )
        
        print(f"✅ Model loaded successfully!")
    
    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        word_timestamps: bool = True
    ) -> Transcript:
        """
        Transcribe audio file to text with timestamps.
        
        Args:
            audio_path: Path to audio file
            language: Language code (ar, en, etc.) or None for auto-detect
            word_timestamps: Include word-level timestamps
        
        Returns:
            Transcript object with segments and words
        """
        audio_path = Path(audio_path)
        
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        print(f"\n🎙️ Transcribing: {audio_path.name}")
        print(f"   Language: {language or 'auto-detect'}")
        print(f"   Word timestamps: {word_timestamps}")
        
        # Run transcription
        segments_gen, info = self.model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=word_timestamps,
            vad_filter=True,  # Filter out silence
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200
            )
        )
        
        # Process segments
        segments = []
        total_duration = 0.0
        
        for i, seg in enumerate(segments_gen):
            # Extract words if available
            words = []
            if word_timestamps and seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(w.probability, 3)
                    })
            
            segment = Segment(
                id=i,
                start=round(seg.start, 2),
                end=round(seg.end, 2),
                text=seg.text.strip(),
                words=words
            )
            segments.append(segment)
            total_duration = max(total_duration, seg.end)
            
            # Print progress
            print(f"   [{self._format_time(seg.start)} → {self._format_time(seg.end)}] {seg.text.strip()[:50]}...")
        
        detected_lang = info.language if language is None else language
        
        print(f"\n✅ Transcription complete!")
        print(f"   Detected language: {detected_lang}")
        print(f"   Total segments: {len(segments)}")
        print(f"   Duration: {self._format_time(total_duration)}")
        
        return Transcript(
            audio_file=str(audio_path),
            language=detected_lang,
            duration=round(total_duration, 2),
            segments=segments
        )
    
    def _format_time(self, seconds: float) -> str:
        """Format seconds to MM:SS.ms"""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        secs = total_seconds % 60
        ms = int((seconds % 1) * 100)
        return f"{minutes:02d}:{secs:02d}.{ms:02d}"


# ============================================
# 📄 OUTPUT FORMATTERS
# ============================================

def save_json(transcript: Transcript, output_path: Path) -> Path:
    """Save transcript as JSON."""
    json_path = output_path.with_suffix(".json")
    
    data = {
        "audio_file": transcript.audio_file,
        "language": transcript.language,
        "duration": transcript.duration,
        "segments": [asdict(seg) for seg in transcript.segments]
    }
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"   📄 JSON: {json_path}")
    return json_path


def save_txt(transcript: Transcript, output_path: Path) -> Path:
    """Save transcript as readable TXT."""
    txt_path = output_path.with_suffix(".txt")
    
    lines = []
    lines.append("=" * 60)
    lines.append(f"🎙️ AUDIO TRANSCRIPT")
    lines.append(f"   File: {Path(transcript.audio_file).name}")
    lines.append(f"   Language: {transcript.language}")
    lines.append(f"   Duration: {_format_duration(transcript.duration)}")
    lines.append("=" * 60)
    lines.append("")
    
    for seg in transcript.segments:
        start = _format_duration(seg.start)
        end = _format_duration(seg.end)
        lines.append(f"[{start} → {end}]")
        lines.append(f"   {seg.text}")
        lines.append("")
    
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    
    print(f"   📝 TXT: {txt_path}")
    return txt_path


def save_srt(transcript: Transcript, output_path: Path) -> Path:
    """Save transcript as SRT subtitle file."""
    srt_path = output_path.with_suffix(".srt")
    
    lines = []
    for seg in transcript.segments:
        # SRT format: HH:MM:SS,mmm
        start = _format_srt_time(seg.start)
        end = _format_srt_time(seg.end)
        
        lines.append(str(seg.id + 1))
        lines.append(f"{start} --> {end}")
        lines.append(seg.text)
        lines.append("")
    
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    
    print(f"   🎬 SRT: {srt_path}")
    return srt_path


def _format_duration(seconds: float) -> str:
    """Format seconds to MM:SS"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def _format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time format HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


# ============================================
# 🚀 MAIN EXECUTION
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="🎙️ Audio Transcriber with Timestamps",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python audio_transcriber.py --input audio.mp3
  python audio_transcriber.py --input audio.wav --language ar
  python audio_transcriber.py --input audio.mp4 --output transcript --word-timestamps
        """
    )
    
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to audio file (mp3, wav, mp4, etc.)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output filename (without extension). Default: input filename"
    )
    parser.add_argument(
        "--language", "-l",
        help="Language code (ar, en, etc.). Default: auto-detect"
    )
    parser.add_argument(
        "--model", "-m",
        default="base",
        choices=["tiny", "base", "small", "medium", "large-v3"],
        help="Whisper model size. Default: base"
    )
    parser.add_argument(
        "--word-timestamps", "-w",
        action="store_true",
        default=True,
        help="Include word-level timestamps (default: True)"
    )
    parser.add_argument(
        "--no-word-timestamps",
        action="store_true",
        help="Disable word-level timestamps"
    )
    parser.add_argument(
        "--format", "-f",
        nargs="+",
        default=["json", "txt", "srt"],
        choices=["json", "txt", "srt"],
        help="Output formats. Default: json txt srt"
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cpu", "cuda"],
        help="Compute device. Default: auto"
    )
    
    args = parser.parse_args()
    
    # Validate input
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Error: File not found: {input_path}")
        return
    
    # Set output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_transcript"
    
    # Word timestamps setting
    word_timestamps = not args.no_word_timestamps
    
    print("\n" + "=" * 60)
    print("🎙️ AUDIO TRANSCRIBER WITH TIMESTAMPS")
    print("=" * 60)
    
    # Initialize transcriber
    transcriber = AudioTranscriber(
        model_size=args.model,
        device=args.device
    )
    
    # Transcribe
    transcript = transcriber.transcribe(
        audio_path=str(input_path),
        language=args.language,
        word_timestamps=word_timestamps
    )
    
    # Save outputs
    print(f"\n💾 Saving outputs...")
    
    if "json" in args.format:
        save_json(transcript, output_path)
    
    if "txt" in args.format:
        save_txt(transcript, output_path)
    
    if "srt" in args.format:
        save_srt(transcript, output_path)
    
    print(f"\n🎉 Done!")


if __name__ == "__main__":
    main()
