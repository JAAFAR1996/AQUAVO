# 🎬 AQUAVO - خرافة سمك التنظيف (النسخة الاحترافية V2)
## مع الإخراج السينمائي الكامل

---

```yaml
# ═══════════════════════════════════════════════════════════════
# AQUAVO - CLEANER FISH MYTH STORYBOARD V2 (PROFESSIONAL)
# ═══════════════════════════════════════════════════════════════

project:
  name: "Cleaner Fish Myth Busted"
  duration: "30 seconds"
  format: "9:16 vertical"
  style: "3D Pixar cartoon"
  color_palette:
    primary: "Deep Blue #1a365d"
    secondary: "Gold #f6ad55"
    accent: "Green #48bb78"
    danger: "Red #e53e3e"

# ═══════════════════════════════════════════════════════════════
# GLOBAL CINEMATOGRAPHY RULES
# ═══════════════════════════════════════════════════════════════

cinematography:
  rule_1: "One clean camera move per shot (no mixing)"
  rule_2: "High contrast lighting for mobile"
  rule_3: "Shallow depth of field on close-ups"
  rule_4: "Deep focus on wide shots"

text_formatting:
  font_size: "72pt minimum"
  color: "white"
  stroke: "4px black"
  safe_zone: "10% from all edges"
  contrast: "HIGH (readable on small screens)"

# ═══════════════════════════════════════════════════════════════
# KEYFRAMES WITH PROFESSIONAL DIRECTING
# ═══════════════════════════════════════════════════════════════

keyframes:

  # ─────────────────────────────────────────────────────────────
  KF1_HOOK:
    time: "0-0.5s"
    purpose: "STOP THE SCROLL - Visual Shock"
    
    # CINEMATOGRAPHY
    shot_type: "Wide Shot (WS)"
    camera_angle: "Slightly Low Angle (looking up at tank)"
    camera_move: "STATIC (no movement - let content shock)"
    lens: "24mm wide angle"
    depth_of_field: "Deep (everything in focus)"
    
    # FIRST & LAST FRAME (for VEO/Kling)
    first_frame: "Dirty tank with algae, pleco on glass, hand entering frame"
    last_frame: "Hand pointing at pleco, MYTH stamp visible"
    
    # SCENE
    scene:
      aquarium: "FILTHY - thick green algae, cloudy water"
      pleco: "stuck on glass, exhausted face, working"
      hand: "enters from left, points accusingly"
    
    # TEXT
    text_overlay:
      main: "MYTH ❌"
      sub: '"سمك التنظيف ينظف الحوض!"'
      position: "bottom center (10% from edge)"
      style: "red stamp, 72pt bold white stroke"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Static shot, no camera movement.
      Hand enters frame from left and points.
      Pleco looks up with tired expression.
      Keep pleco character consistent.
      24fps cinematic, 0.5 seconds.
    
    sound: "Dramatic 'dun dun dun' + glass tap"

  # ─────────────────────────────────────────────────────────────
  KF2_PLECO_RESPONDS:
    time: "0.5-5s"
    purpose: "HOLD - Comedy + Character"
    
    # CINEMATOGRAPHY
    shot_type: "Extreme Close-Up (ECU)"
    camera_angle: "Eye Level (pleco's POV)"
    camera_move: "Slow DOLLY IN (3 seconds)"
    lens: "85mm portrait"
    depth_of_field: "Shallow (background blurred)"
    
    # FIRST & LAST FRAME
    first_frame: "Medium shot of pleco on dirty glass"
    last_frame: "Extreme close-up of pleco's annoyed face"
    
    # SCENE
    scene:
      pleco: "close-up, annoyed face, mouth opens"
      background: "blurred dirty tank (bokeh)"
      speech_bubble: true
    
    # TEXT
    text_overlay:
      speech: '"أنا مو خدامتك! 😤"'
      position: "speech bubble above pleco"
      style: "72pt, comic bubble"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Slow dolly in toward pleco face.
      Pleco opens mouth as if speaking.
      Annoyed expression, eyebrows furrowed.
      Keep same pleco character.
      Shallow depth of field, bokeh background.
      24fps cinematic, 4.5 seconds.
    
    sound: "Record scratch"

  # ─────────────────────────────────────────────────────────────
  KF3_WHAT_PLECO_EATS:
    time: "5-12s"
    purpose: "OFFER - Educational Value (Saves)"
    
    # CINEMATOGRAPHY
    shot_type: "Split Screen (Diagram)"
    camera_angle: "Straight On (infographic style)"
    camera_move: "STATIC with ANIMATED elements"
    lens: "50mm standard"
    depth_of_field: "Deep (diagrams in focus)"
    
    # FIRST & LAST FRAME
    first_frame: "Empty split screen template"
    last_frame: "Completed diagram with all items"
    
    # SCENE
    left_side:
      title: "✅ ماذا يأكل البليكو"
      items:
        - "طحالب الزجاج ✅" 
        - "طحالب الديكور ✅"
        - "بقايا الطعام ✅"
      pleco_action: "happily eating, smiling"
      color: "green background"
      
    right_side:
      title: "❌ ماذا لا يأكل"
      items:
        - "فضلات السمك ❌"
        - "الماء العكر ❌"
        - "النباتات الميتة ❌"
      pleco_action: "shaking head NO, disgusted"
      color: "red background"
    
    # TEXT
    text_overlay:
      center: "أنا آكل الطحالب فقط!"
      position: "center bottom"
      style: "72pt bold"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Static split screen.
      Items appear one by one with pop animation.
      Pleco on left side nods yes.
      Pleco on right side shakes head no.
      Ding sound for checkmarks, buzz for X marks.
      24fps, 7 seconds.
    
    sound: "Ding ✅ / Buzz ❌"

  # ─────────────────────────────────────────────────────────────
  KF4_PLOT_TWIST:
    time: "12-17s"
    purpose: "SURPRISE - Comedy Twist (Shares)"
    
    # CINEMATOGRAPHY
    shot_type: "Medium Shot (MS)"
    camera_angle: "Dutch Angle (tilted 15° for comedy)"
    camera_move: "WHIP PAN to reveal"
    lens: "35mm"
    depth_of_field: "Medium"
    
    # FIRST & LAST FRAME
    first_frame: "Pleco swimming normally"
    last_frame: "Pleco embarrassed, poop visible, text overlay"
    
    # SCENE
    scene:
      pleco: "swimming, then turns around..."
      reveal: "POOPS! 💩 (stylized, not gross)"
      reaction: "pleco looks embarrassed, blushes"
    
    # TEXT
    text_overlay:
      main: "PLOT TWIST! 😳"
      sub: "البليكو ينتج فضلات أكثر مما ينظف!"
      position: "center"
      style: "72pt, yellow highlight"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Whip pan following pleco.
      Pleco turns around, cartoon poop appears.
      Pleco's face turns embarrassed.
      Dutch angle 15 degrees for comedic effect.
      24fps, 5 seconds.
    
    sound: "Fart SFX + Laugh track"

  # ─────────────────────────────────────────────────────────────
  KF5_THE_SOLUTION:
    time: "17-23s"
    purpose: "RELATE - The Real Solution"
    
    # CINEMATOGRAPHY
    shot_type: "Wide Shot (WS) - Montage"
    camera_angle: "High Angle (bird's eye - shows whole tank)"
    camera_move: "Slow CRANE DOWN"
    lens: "24mm"
    depth_of_field: "Deep"
    
    # FIRST & LAST FRAME
    first_frame: "High angle: dirty tank, hand with vacuum entering"
    last_frame: "Eye level: water clearing, pleco happy"
    
    # SCENE
    scene:
      hand: "using gravel vacuum, doing water change"
      pleco: "watching, giving 'fin up' (thumbs up)"
      tank: "transforming dirty → clean"
      water: "cloudy → crystal clear"
    
    # TEXT
    text_overlay:
      main: "TEAMWORK! 🤝"
      sub: "هو يساعد، لكن أنت المسؤول الحقيقي"
      position: "bottom"
      style: "72pt bold"
    
    # RELATE MOMENT
    relate: "هل كنت تظن أن سمكة واحدة تكفي؟"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Slow crane down from high angle to eye level.
      Hand with gravel vacuum cleaning gravel.
      Water particles being sucked up.
      Pleco nodding approvingly.
      Tank water becoming clearer over time.
      Transformation montage feel.
      24fps cinematic, 6 seconds.
    
    sound: "Uplifting music builds"

  # ─────────────────────────────────────────────────────────────
  KF6_REVEAL_CLEAN_TANK:
    time: "23-27s"
    purpose: "PAYOFF - Satisfying Reveal"
    
    # CINEMATOGRAPHY
    shot_type: "Wide Shot (WS)"
    camera_angle: "Straight On (hero shot)"
    camera_move: "Slow PUSH IN"
    lens: "35mm"
    depth_of_field: "Deep (show beautiful clean tank)"
    
    # FIRST & LAST FRAME
    first_frame: "Wide shot of sparkling clean aquarium"
    last_frame: "Medium shot, pleco happy on clean glass"
    
    # SCENE
    scene:
      aquarium: "SPARKLING CLEAN! Crystal water"
      pleco: "happily attached to clean glass"
      light: "beautiful caustic reflections"
      plants: "green and healthy"
    
    # TEXT
    text_overlay:
      stamp: "FACT ✅"
      main: "حوض نظيف = سمك سعيد + صيانة دورية"
      sub: "تغيير الماء أسبوعياً ✓"
      position: "center"
      style: "green stamp, 72pt white"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Slow push in on beautiful clean aquarium.
      Sparkle effects on water.
      Pleco smiles contentedly.
      Light caustics on tank floor.
      Satisfying, peaceful mood.
      24fps, 4 seconds.
    
    sound: "Sparkle SFX + Peaceful music"

  # ─────────────────────────────────────────────────────────────
  KF7_CTA:
    time: "27-30s"
    purpose: "TAKE ACTION - Engagement"
    
    # CINEMATOGRAPHY
    shot_type: "Close-Up Portrait"
    camera_angle: "Eye Level (direct connection)"
    camera_move: "STATIC"
    lens: "85mm portrait"
    depth_of_field: "Shallow (bokeh background)"
    
    # FIRST & LAST FRAME
    first_frame: "Pleco looking at camera, neutral"
    last_frame: "Pleco winking, CTAs visible"
    
    # SCENE
    scene:
      pleco: "centered, looking at camera, WINKS"
      background: "clean tank, soft bokeh"
      expression: "friendly, knowing, confident"
    
    # TEXT
    text_overlay:
      main: "هل حوضك نظيف؟ 👇"
      cta_1: "💬 كم مرة تغير الماء؟"
      cta_2: "❤️ = دليل صيانة مجاني"
      cta_3: "📤 أرسل لصاحب حوض"
      position: "center (10% safe zone)"
      style: "72pt bold white"
    
    branding:
      logo: "AQUAVO"
      handle: "@aquavo.sa"
      position: "bottom corners"
    
    # VEO/KLING MOTION PROMPT
    veo_prompt: |
      Static portrait shot.
      Pleco looks at camera, then winks.
      Friendly expression.
      Shallow depth of field, bokeh.
      24fps, 3 seconds.
    
    sound: "Upbeat jingle + 'ding'"

# ═══════════════════════════════════════════════════════════════
# SHOT LIST SUMMARY (للمخرج)
# ═══════════════════════════════════════════════════════════════

shot_list:
  | KF | Shot Type | Angle | Move | Lens | DoF |
  |----|-----------|-------|------|------|-----|
  | 1 | Wide | Low Angle | Static | 24mm | Deep |
  | 2 | ECU | Eye Level | Dolly In | 85mm | Shallow |
  | 3 | Split | Straight | Static | 50mm | Deep |
  | 4 | Medium | Dutch 15° | Whip Pan | 35mm | Medium |
  | 5 | Wide | High Angle | Crane Down | 24mm | Deep |
  | 6 | Wide | Straight | Push In | 35mm | Deep |
  | 7 | Close-Up | Eye Level | Static | 85mm | Shallow |

# ═══════════════════════════════════════════════════════════════
# S.H.O.R.T STRUCTURE CHECK
# ═══════════════════════════════════════════════════════════════

short_structure:
  S_Surprise: "KF1 - MYTH stamp, dirty tank (0-0.5s)"
  H_Hold: "KF2 - 'أنا مو خدامتك!' comedy (0.5-5s)"
  O_Offer: "KF3 - What pleco eats vs doesn't (5-12s)"
  R_Relate: "KF4-5 - Twist + Solution (12-23s)"
  T_TakeAction: "KF7 - CTA (27-30s)"

# ═══════════════════════════════════════════════════════════════
# SOUND DESIGN
# ═══════════════════════════════════════════════════════════════

sound_design:
  KF1: "Dramatic dun-dun-dun + glass tap"
  KF2: "Record scratch"
  KF3: "Ding (yes) + Buzz (no)"
  KF4: "Fart SFX + Laugh"
  KF5: "Uplifting music builds"
  KF6: "Sparkle + Peace"
  KF7: "Upbeat jingle"
  
  voiceover: "NONE - text only (better for mute scrolling)"
```

---

# 📊 ملخص التحسينات

| العنصر | قبل | بعد ✅ |
|--------|-----|-------|
| **حركة الكاميرا** | غير محددة | Static, Dolly In, Whip Pan, Crane Down, Push In |
| **زاوية الكاميرا** | غير محددة | Low Angle, Eye Level, Dutch, High Angle |
| **العدسات** | غير محددة | 24mm, 35mm, 50mm, 85mm |
| **First & Last Frame** | مفقود | ✅ لكل KF |
| **VEO Motion Prompts** | مفقود | ✅ لكل KF |
| **Text Safe Zone** | مفقود | 10% من الحواف |
| **S.H.O.R.T Structure** | جزئي | ✅ كامل |
| **Relate Moment** | ضعيف | ✅ "هل كنت تظن أن سمكة واحدة تكفي؟" |

---

*النسخة الاحترافية V2 - جاهزة للإنتاج*
