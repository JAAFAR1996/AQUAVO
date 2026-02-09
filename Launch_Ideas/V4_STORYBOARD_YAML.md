# 🎬 AQUAVO V4 - Storyboard بصيغة YAML للـ AI
## انسخ هذا الكود إلى Nano Banana Pro

---

```yaml
# ═══════════════════════════════════════════════════════════════
# AQUAVO V4 - STORYBOARD CONFIGURATION
# Copy this entire YAML block to Nano Banana Pro
# ═══════════════════════════════════════════════════════════════

project:
  name: "AQUAVO Fish Memory Myth"
  duration: "30 seconds"
  format: "9:16 vertical (Reels/TikTok)"
  style: "3D Pixar cartoon"
  total_keyframes: 7

# ───────────────────────────────────────────────────────────────
# CHARACTER DEFINITION
# ───────────────────────────────────────────────────────────────

character:
  name: "Goldie"
  type: "goldfish"
  color: "orange/gold"
  style: "3D Pixar cartoon, cute, expressive"
  size_in_frame: "5% of frame (small fish in big maze)"
  features:
    - big expressive eyes
    - flowing fins and tail
    - cute round body
    - orange/gold scales
  consistency: "MUST remain identical in ALL 7 keyframes"

# ───────────────────────────────────────────────────────────────
# ENVIRONMENT DEFINITION
# ───────────────────────────────────────────────────────────────

environment:
  type: "glass aquarium"
  lighting: "soft top light, underwater caustics"
  water: "crystal clear, slight blue tint"
  
  maze:
    material: "transparent acrylic"
    size: "70% of aquarium interior"
    color: "light blue tint, clear walls"
    structure: |
      ┌────────────────────────────┐
      │  [S]━━━┓                   │
      │        ┃    ┏━━━━━┓        │
      │        ┃    ┃ [X] ┃        │  [X] = Dead End
      │        ┗━━━━╋━━┓  ┃        │
      │             ┃  ┃  ┃        │
      │  ┏━━━━━━━━━━┛  ┃  ┗━[E]   │  [E] = Food/End
      │  ┗━━━━━━━━━━━━━┛          │
      └────────────────────────────┘
    
    paths:
      correct: "[S] → down → right → down → right → up → [E]"
      wrong: "[S] → right directly → [X] wall!"
    
    proportions:
      corridors: "3x fish width"
      fish_to_maze_ratio: "5%"

# ───────────────────────────────────────────────────────────────
# STORY ARC
# ───────────────────────────────────────────────────────────────

story:
  logline: "A goldfish proves its memory is NOT 3 seconds by solving a maze it learned 3 months ago."
  
  arc:
    act_1_hook: "0-0.5s - Shocking start"
    act_2_challenge: "0.5-8s - Fish enters maze, makes mistake"
    act_3_twist: "8-12s - Fish stops, seems to forget (tension)"
    act_4_climax: "12-20s - EUREKA! Fish remembers and speeds through"
    act_5_resolution: "20-30s - Victory, emotional payoff, CTA"

# ═══════════════════════════════════════════════════════════════
# KEYFRAMES DEFINITION
# ═══════════════════════════════════════════════════════════════

keyframes:

  # ─────────────────────────────────────────────────────────────
  KF1_HOOK:
    time: "0-0.5s"
    duration: "0.5s"
    shot_type: "wide"
    
    composition:
      fish_position: "center (50%, 40%)"
      fish_size: "5% of frame"
      hand_position: "left side, hitting glass"
      maze_position: "behind fish, 70% of aquarium"
    
    action:
      hand: "hitting aquarium glass, creating ripples"
      fish: "jumping backward in shock"
      water: "splash effect from impact"
    
    fish_expression: "shocked, scared, eyes wide open"
    fish_direction: "facing right, jumping left"
    
    text_overlay:
      main: "MYTH ❌"
      sub: "3 SECONDS"
      style: "red stamp, crossed out"
      position: "bottom center"
      font: "bold 72pt, white with black stroke"
    
    timer: null
    
    lighting: "dramatic, slight blue tone"
    mood: "shocking, attention-grabbing"
    
    sound: "bass drop + glass tap + record scratch"
    
    camera: "static wide shot"

  # ─────────────────────────────────────────────────────────────
  KF2_CHALLENGE:
    time: "0.5-4s"
    duration: "3.5s"
    shot_type: "wide"
    
    composition:
      fish_position: "at [S] maze entrance (15%, 25%)"
      fish_size: "5% of frame"
      maze_position: "filling 70% of tank"
      food_position: "visible at [E] end point"
    
    action:
      fish: "at entrance, about to enter maze"
    
    fish_expression: "calm, curious, determined"
    fish_direction: "facing right toward maze"
    
    text_overlay:
      main: "Trained 3 MONTHS ago. Watch."
      position: "bottom center"
      font: "bold 72pt white"
    
    timer:
      value: "00:00"
      position: "top right"
      style: "digital, dark background"
    
    lighting: "neutral, clear"
    mood: "curious, anticipation"
    
    sound: "ticking clock starts"
    
    camera: "static wide shot"

  # ─────────────────────────────────────────────────────────────
  KF3_MISTAKE:
    time: "4-8s"
    duration: "4s"
    shot_type: "medium"
    
    composition:
      fish_position: "at [X] dead end (55%, 35%)"
      fish_size: "5% of frame"
      wall_position: "in front of fish, blocking path"
    
    action:
      fish: "just hit dead end wall, stopped"
      previous_movement: "swam right (wrong direction)"
    
    fish_expression: "sad, disappointed, fins drooping"
    fish_direction: "facing wall"
    
    text_overlay:
      main: "Wait... 😬"
      position: "bottom center"
      font: "bold 72pt white"
    
    timer:
      value: "00:03"
      position: "top right"
    
    lighting: "slightly darker, melancholic"
    mood: "sad, worried, tension"
    
    sound: "wrong buzzer + sad trombone"
    
    camera: "medium shot inside maze"

  # ─────────────────────────────────────────────────────────────
  KF4_PATTERN_INTERRUPT:
    time: "8-12s"
    duration: "4s"
    shot_type: "close-up"
    
    composition:
      fish_position: "at intersection (25%, 45%)"
      fish_size: "8% of frame (slightly larger for close-up)"
      spotlight: "on fish"
    
    action:
      fish: "completely frozen, not moving at all"
      previous_movement: "backed away from dead end"
    
    fish_expression: "eyes CLOSED, deep concentration, thinking"
    fish_direction: "body still, facing forward"
    
    text_overlay:
      main: "Did she forget? 😱"
      position: "bottom center"
      font: "bold 72pt white"
    
    timer:
      value: "00:06"
      position: "top right"
      effect: "paused feeling"
    
    lighting: "dramatic spotlight on fish"
    mood: "tense, suspenseful, dramatic pause"
    
    sound: "silence... then heartbeat"
    
    camera: "static close-up, dramatic"

  # ─────────────────────────────────────────────────────────────
  KF5_EUREKA_AND_SPEED:
    time: "12-20s"
    duration: "8s"
    shot_type: "wide with motion"
    
    composition:
      fish_position: "moving through correct path"
      fish_size: "5% of frame"
      path_highlight: "show correct path with arrows"
      light_burst: "around fish head"
    
    action:
      fish: "speeding through maze on CORRECT path"
      movement: "left → down → right → toward [E]"
      effect: "motion blur on tail, speed lines"
    
    fish_expression: "eyes WIDE OPEN with sparkles, big confident smile"
    fish_direction: "moving fast through corridors"
    
    text_overlay:
      main: "SHE REMEMBERS! ⚡"
      stamp: "FACT ✅ (green, replaces MYTH)"
      position: "bottom center"
      font: "bold 72pt white"
    
    timer:
      value: "00:08"
      position: "top right"
    
    lighting: "bright, energetic, golden glow"
    mood: "triumphant, exciting, climax"
    
    sound: "ding! + orchestral hit + whoosh"
    
    camera: "dynamic wide shot with motion"

  # ─────────────────────────────────────────────────────────────
  KF6_ARRIVAL_AND_EMOTION:
    time: "20-26s"
    duration: "6s"
    shot_type: "medium close"
    
    composition:
      fish_position: "at [E] food reward (85%, 65%)"
      fish_size: "10% of frame"
      hand_position: "left side, gently touching glass"
      maze_position: "visible in background"
    
    action:
      fish: "eating food reward, then looks at hand"
      hand: "gently touching glass (same hand from KF1, now apologetic)"
    
    fish_expression: "happy eating → then wise, knowing look at hand"
    fish_direction: "facing food, then turning to hand"
    
    text_overlay:
      main: "She remembers. Do you? 💔"
      position: "bottom center"
      font: "bold 72pt white"
    
    timer:
      value: "00:12.4 ✓"
      position: "top right"
      effect: "frozen with glow/checkmark"
    
    lighting: "warm golden, emotional"
    mood: "emotional, touching, payoff"
    
    sound: "piano emotional + heartbeat fade"
    
    camera: "medium close, intimate"

  # ─────────────────────────────────────────────────────────────
  KF7_CTA:
    time: "26-30s"
    duration: "4s"
    shot_type: "close-up portrait"
    
    composition:
      fish_position: "centered (50%, 40%)"
      fish_size: "15% of frame (larger for portrait)"
      background: "soft bokeh aquarium"
    
    action:
      fish: "looking directly at camera, winking"
    
    fish_expression: "confident smirk, WINKING with one eye"
    fish_direction: "facing camera directly"
    
    text_overlay:
      challenge: "Bet you can't do this faster 👇"
      cta_1: "💬 Comment your fish type"
      cta_2: "❤️ = FREE intelligence guide"
      cta_3: "📤 Tag a fish owner"
      position: "middle and bottom"
      font: "bold 72pt white"
    
    branding:
      logo: "AQUAVO logo bottom left"
      handle: "@aquavo.sa bottom right"
    
    timer: null
    
    lighting: "warm golden"
    mood: "friendly, challenging, call-to-action"
    
    sound: "upbeat jingle"
    
    camera: "static close-up portrait"

# ═══════════════════════════════════════════════════════════════
# GLOBAL RULES
# ═══════════════════════════════════════════════════════════════

rules:
  character_consistency:
    - "SAME fish in ALL 7 keyframes"
    - "Same color, style, proportions"
    - "Only expression and position changes"
  
  text_formatting:
    - "Bold 72pt minimum"
    - "White text with black stroke (4px)"
    - "HIGH CONTRAST for mobile"
    - "10% safe zone from edges"
  
  aspect_ratio: "9:16 vertical (portrait)"
  resolution: "4K"
  
  style_consistency:
    - "3D Pixar cartoon throughout"
    - "Same lighting temperature progression"
    - "Same water caustics effect"
    - "Same maze structure"

# ═══════════════════════════════════════════════════════════════
# SOUND DESIGN SUMMARY
# ═══════════════════════════════════════════════════════════════

sound_design:
  KF1: "bass drop + glass tap + record scratch"
  KF2: "ticking clock starts"
  KF3: "wrong buzzer + sad trombone"
  KF4: "silence... heartbeat"
  KF5: "ding! + orchestral hit + whoosh"
  KF6: "piano emotional + heartbeat fade"
  KF7: "upbeat jingle"
  
  voiceover: "NONE - text only (better for mute scrolling)"
```

---

# 📋 كيفية الاستخدام

## الطريقة 1: توليد Grid 3×3
```
انسخ الـ YAML أعلاه + اطلب:
"Generate a 3×3 storyboard grid based on this YAML config"
```

## الطريقة 2: توليد كل Keyframe منفرد
```
انسخ section واحد فقط:
"Generate KF1_HOOK based on this config"
```

## الطريقة 3: Reference + YAML
```
ارفق صورة السمكة + انسخ الـ YAML:
"Use attached fish as character reference. Generate storyboard based on YAML."
```

---

*YAML Format - Nano Banana Pro Ready*
