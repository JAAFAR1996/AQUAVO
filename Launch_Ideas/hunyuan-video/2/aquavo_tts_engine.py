"""
🐟 AQUAVO TTS ENGINE - ElevenLabs Integration
==============================================
Advanced Text-to-Speech with 8 Performance Modes
for Iraqi Arabic Goldfish Character Voiceover

Requirements:
    pip install elevenlabs pydub

Usage:
    python aquavo_tts_engine.py --api-key YOUR_API_KEY --voice-id YOUR_VOICE_ID
    
    Or set environment variables:
    ELEVENLABS_API_KEY=xxx
    ELEVENLABS_VOICE_ID=xxx
"""

import os
import argparse
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path

try:
    from elevenlabs import ElevenLabs, VoiceSettings
    from pydub import AudioSegment
except ImportError:
    print("❌ Missing dependencies! Run:")
    print("   pip install elevenlabs pydub")
    exit(1)


# ============================================
# 🎭 PERFORMANCE MODES CONFIGURATION
# ============================================

@dataclass
class PerformanceMode:
    """Defines voice settings for each emotional state."""
    name: str
    stability: float          # 0.0-1.0 (lower = more expressive)
    similarity_boost: float   # 0.0-1.0 (higher = closer to original voice)
    style: float              # 0.0-1.0 (higher = more stylized/dramatic)
    speed: float              # 0.5-2.0 (speaking speed)
    style_instruction: str    # Text instruction for the AI


# 🎭 8 PERFORMANCE MODES
PERFORMANCE_MODES = {
    
    # 1️⃣ TERRIFIED/GASPING (0-5 sec)
    "TERRIFIED": PerformanceMode(
        name="TERRIFIED",
        stability=0.15,          # Very unstable = shaky voice
        similarity_boost=0.6,
        style=0.9,               # High drama
        speed=0.7,               # Slow, gasping
        style_instruction="""
[EMOTION: TERRIFIED, GASPING FOR AIR]
Voice: broken, shaky, struggling to breathe like drowning
Delivery: gasping between words, panic in tone, desperate
Pace: very slow with 0.4-0.6 second pauses at ... marks
Energy: scared, weak, running out of air underwater
Dialect: Iraqi Arabic (Baghdadi), young female goldfish
"""
    ),
    
    # 2️⃣ CRYING/TREMBLING (5-15 sec)
    "CRYING": PerformanceMode(
        name="CRYING",
        stability=0.2,           # Unstable = trembling
        similarity_boost=0.65,
        style=0.85,
        speed=0.75,              # Slow, sobbing rhythm
        style_instruction="""
[EMOTION: CRYING, TREMBLING, HEARTBROKEN]
Voice: sobbing, cracking, trembling, sad
Delivery: voice breaks on emotional words, uneven rhythm like crying
Pace: slow with 0.3-0.5 second pauses
Energy: heartbroken, vulnerable, pleading
Think: child crying but trying to explain why they're hurt
Dialect: Iraqi Arabic, young female, emotional
"""
    ),
    
    # 3️⃣ ANGRY/POINTING (15-25 sec)
    "ANGRY": PerformanceMode(
        name="ANGRY",
        stability=0.4,           # More controlled but intense
        similarity_boost=0.7,
        style=0.95,              # Maximum drama
        speed=0.9,               # Punchy, direct
        style_instruction="""
[EMOTION: ANGRY, ACCUSATORY, POINTING FINGER]
Voice: SHARP, FRUSTRATED, ACCUSATORY - raise volume slightly
Delivery: STRESS the word "إنت!" heavily like pointing aggressively
Pace: Punchy and direct, hit each word hard
Energy: CONTROLLED ANGER - not screaming but CLEARLY upset and blaming
Emphasis: Make "إنت!" feel like a verbal finger jab
Think: calling out the person responsible for your suffering
Dialect: Iraqi Arabic, young female, confrontational
"""
    ),
    
    # 4️⃣ HOPEFUL/SMILING (25-30 sec)
    "HOPEFUL": PerformanceMode(
        name="HOPEFUL",
        stability=0.5,           # More stable, calmer
        similarity_boost=0.75,
        style=0.6,
        speed=0.95,              # Medium pace
        style_instruction="""
[EMOTION: HOPEFUL, SMILING, ENCOURAGING]
Voice: gentle, warm, encouraging, lifting up
Delivery: soft smile in voice, reassuring tone
Pace: medium with 0.2-0.3 second pauses, calmer rhythm
Energy: optimistic, kind, solution-focused
Think: friend offering help after listening to your problem
Dialect: Iraqi Arabic, young female, warm and friendly
"""
    ),
    
    # 5️⃣ TEACHING/CLEAR (30-42 sec)
    "TEACHING": PerformanceMode(
        name="TEACHING",
        stability=0.65,          # Stable, professional
        similarity_boost=0.8,
        style=0.5,
        speed=1.0,               # Clear, measured
        style_instruction="""
[EMOTION: TEACHING, AUTHORITATIVE, CLEAR]
Voice: confident, steady, authoritative but friendly
Delivery: clear enunciation, professional educator tone
Pace: measured and even with 0.2 second pauses between points
Energy: instructive, organized, trustworthy
Think: experienced teacher explaining important life-saving steps
Dialect: Iraqi Arabic, young female, educational tone
"""
    ),
    
    # 6️⃣ JOYFUL/LAUGHING (42-48 sec)
    "JOYFUL": PerformanceMode(
        name="JOYFUL",
        stability=0.35,          # Slightly unstable = laughing
        similarity_boost=0.7,
        style=0.75,
        speed=1.1,               # Faster, energetic
        style_instruction="""
[EMOTION: JOYFUL, LAUGHING, RELIEVED]
Voice: happy, relieved, light laugh in tone
Delivery: genuine gratitude, playful relief
Pace: medium-fast with 0.2 second pauses, energetic
Energy: celebration, freedom, thankful
Think: someone who just escaped danger and feels safe now
Dialect: Iraqi Arabic, young female, happy and free
"""
    ),
    
    # 7️⃣ TEASING/WARNING (48-52 sec)
    "TEASING": PerformanceMode(
        name="TEASING",
        stability=0.45,
        similarity_boost=0.75,
        style=0.65,
        speed=0.95,
        style_instruction="""
[EMOTION: TEASING, PLAYFUL WARNING, MYSTERIOUS]
Voice: playful caution, friendly warning, slightly mischievous
Delivery: raise pitch slightly on question, knowing smile
Pace: medium with 0.2-0.3 second pauses, suspenseful
Energy: mysterious but friendly, setting up next video
Think: friend warning you about something while smiling
Dialect: Iraqi Arabic, young female, playful
"""
    ),
    
    # 8️⃣ FAST CTA (52-58 sec)
    "CTA": PerformanceMode(
        name="CTA",
        stability=0.55,
        similarity_boost=0.8,
        style=0.7,
        speed=1.25,              # Fast, urgent
        style_instruction="""
[EMOTION: ENERGETIC CTA, ENTHUSIASTIC, URGENT]
Voice: energetic, enthusiastic, motivational
Delivery: fast but clear, advertisement energy, call to action
Pace: fast with only 0.1-0.2 second pauses, urgent excitement
Energy: high, encouraging, "don't miss this!"
Think: excited friend telling you about amazing opportunity
Dialect: Iraqi Arabic, young female, exciting and urgent
"""
    ),
}


# ============================================
# 📜 AQUAVO V2 SCRIPT (Segmented by Emotion)
# ============================================

SCRIPT_SEGMENTS = [
    {
        "mode": "TERRIFIED",
        "time": "0-5s",
        "text": "يا... ويلي... 😰 الماي... عكر... مو گادر... أتنفس..."
    },
    {
        "mode": "CRYING",
        "time": "5-15s",
        "text": "هذا مو حوض... هذا سجن! 😢 والسبب؟... مو لأن ما تحبني..."
    },
    {
        "mode": "ANGRY",
        "time": "15-25s",
        "text": "إنت!... مو لأنك سيء... لأنك مستعجل!... ما تعرف شلون تجهز الماي!"
    },
    {
        "mode": "HOPEFUL",
        "time": "25-30s",
        "text": "بس أكو حل! 😊 خليني أعلمك..."
    },
    {
        "mode": "TEACHING",
        "time": "30-42s",
        "text": "أول شي: الكلور يقتلني!... ثاني شي: درجة الحرارة لازم تكون مناسبة... ثالث شي: البكتيريا النافعة تحتاج وقت!"
    },
    {
        "mode": "JOYFUL",
        "time": "42-48s",
        "text": "هسة صرت تعرف! 🎉 ماكو عذر بعد!"
    },
    {
        "mode": "TEASING",
        "time": "48-52s",
        "text": "بس... إذا الماي مو جاهز... شنو يصير؟ 🤔"
    },
    {
        "mode": "CTA",
        "time": "52-58s",
        "text": "الجواب بالفيديو الجاي! تابع @AQUAVO وسوّي حفظ! 📌🐟"
    },
]


# ============================================
# 🔧 TTS ENGINE CLASS
# ============================================

class AquavoTTSEngine:
    """
    Advanced TTS Engine with Performance Mode Support.
    """
    
    def __init__(self, api_key: str, voice_id: str, output_dir: str = "./audio_segments"):
        self.client = ElevenLabs(api_key=api_key)
        self.voice_id = voice_id
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Model selection
        self.model_id = "eleven_multilingual_v2"  # Best for Arabic
        
        print(f"🐟 AQUAVO TTS Engine initialized")
        print(f"   Voice ID: {voice_id}")
        print(f"   Model: {self.model_id}")
        print(f"   Output: {self.output_dir}")
    
    def generate_segment(
        self,
        text: str,
        mode: PerformanceMode,
        segment_index: int,
        previous_text: Optional[str] = None,
        next_text: Optional[str] = None
    ) -> Path:
        """
        Generate a single audio segment with specified performance mode.
        """
        print(f"\n🎭 Generating [{mode.name}] segment {segment_index}...")
        
        # Combine style instruction with text
        full_text = f"{mode.style_instruction}\n\n{text}"
        
        # Configure voice settings
        voice_settings = VoiceSettings(
            stability=mode.stability,
            similarity_boost=mode.similarity_boost,
            style=mode.style,
            use_speaker_boost=True
        )
        
        # Generate audio
        audio_generator = self.client.text_to_speech.convert(
            voice_id=self.voice_id,
            text=full_text,
            model_id=self.model_id,
            voice_settings=voice_settings,
            previous_text=previous_text,
            next_text=next_text
        )
        
        # Save to file
        output_path = self.output_dir / f"segment_{segment_index:02d}_{mode.name.lower()}.mp3"
        
        with open(output_path, "wb") as f:
            for chunk in audio_generator:
                f.write(chunk)
        
        print(f"   ✅ Saved: {output_path.name}")
        return output_path
    
    def generate_full_voiceover(self, script: List[dict]) -> Path:
        """
        Generate all segments and combine into final audio.
        """
        print("\n" + "="*50)
        print("🎬 AQUAVO FULL VOICEOVER GENERATION")
        print("="*50)
        
        segment_files = []
        
        for i, segment in enumerate(script):
            mode_name = segment["mode"]
            mode = PERFORMANCE_MODES[mode_name]
            text = segment["text"]
            
            # Get context for smoother transitions
            prev_text = script[i-1]["text"] if i > 0 else None
            next_text = script[i+1]["text"] if i < len(script)-1 else None
            
            segment_path = self.generate_segment(
                text=text,
                mode=mode,
                segment_index=i,
                previous_text=prev_text,
                next_text=next_text
            )
            segment_files.append(segment_path)
        
        # Combine all segments
        print("\n🔗 Combining segments...")
        combined = AudioSegment.empty()
        
        for seg_path in segment_files:
            audio = AudioSegment.from_mp3(seg_path)
            combined += audio
        
        # Export final audio
        final_path = self.output_dir / "AQUAVO_V2_VOICEOVER_FINAL.mp3"
        combined.export(final_path, format="mp3", bitrate="192k")
        
        # Also export as WAV for video editing
        wav_path = self.output_dir / "AQUAVO_V2_VOICEOVER_FINAL.wav"
        combined.export(wav_path, format="wav")
        
        print(f"\n🎉 GENERATION COMPLETE!")
        print(f"   MP3: {final_path}")
        print(f"   WAV: {wav_path}")
        print(f"   Duration: {len(combined)/1000:.1f} seconds")
        
        return final_path
    
    def generate_single_mode_test(self, mode_name: str, test_text: str) -> Path:
        """
        Test a single performance mode with custom text.
        """
        if mode_name not in PERFORMANCE_MODES:
            raise ValueError(f"Unknown mode: {mode_name}. Available: {list(PERFORMANCE_MODES.keys())}")
        
        mode = PERFORMANCE_MODES[mode_name]
        return self.generate_segment(
            text=test_text,
            mode=mode,
            segment_index=99
        )


# ============================================
# 🚀 MAIN EXECUTION
# ============================================

def main():
    parser = argparse.ArgumentParser(description="🐟 AQUAVO TTS Engine")
    parser.add_argument("--api-key", help="ElevenLabs API Key", 
                        default=os.getenv("ELEVENLABS_API_KEY"))
    parser.add_argument("--voice-id", help="ElevenLabs Voice ID",
                        default=os.getenv("ELEVENLABS_VOICE_ID"))
    parser.add_argument("--output-dir", help="Output directory", 
                        default="./audio_segments")
    parser.add_argument("--test-mode", help="Test a single mode (e.g., TERRIFIED)")
    parser.add_argument("--test-text", help="Text for test mode",
                        default="هذا اختبار للصوت")
    
    args = parser.parse_args()
    
    # Validate credentials
    if not args.api_key:
        print("❌ ERROR: ElevenLabs API Key required!")
        print("   Use --api-key YOUR_KEY or set ELEVENLABS_API_KEY env variable")
        return
    
    if not args.voice_id:
        print("❌ ERROR: ElevenLabs Voice ID required!")
        print("   Use --voice-id YOUR_ID or set ELEVENLABS_VOICE_ID env variable")
        return
    
    # Initialize engine
    engine = AquavoTTSEngine(
        api_key=args.api_key,
        voice_id=args.voice_id,
        output_dir=args.output_dir
    )
    
    # Run
    if args.test_mode:
        print(f"\n🧪 Testing mode: {args.test_mode}")
        engine.generate_single_mode_test(args.test_mode, args.test_text)
    else:
        engine.generate_full_voiceover(SCRIPT_SEGMENTS)


if __name__ == "__main__":
    main()
