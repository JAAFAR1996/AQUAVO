# 🎬 AQUAVO - خرافة سمك التنظيف
## "سمك التنظيف ينظف الحوض!" ❌

---

```yaml
# ═══════════════════════════════════════════════════════════════
# AQUAVO - CLEANER FISH MYTH STORYBOARD
# Copy this entire YAML block to Nano Banana Pro
# ═══════════════════════════════════════════════════════════════

project:
  name: "Cleaner Fish Myth Busted"
  duration: "30 seconds"
  format: "9:16 vertical (Reels/TikTok)"
  style: "3D Pixar cartoon"
  total_keyframes: 7

# ───────────────────────────────────────────────────────────────
# THE MYTH vs FACT
# ───────────────────────────────────────────────────────────────

myth:
  statement: "سمك التنظيف (البليكو) ينظف الحوض بالكامل!"
  common_belief: "ضع سمكة تنظيف واحدة = حوض نظيف للأبد"
  
fact:
  statement: "سمك التنظيف يساعد لكن لا يغني عن الصيانة الدورية!"
  truth_1: "البليكو الكبير ينتج فضلات أكثر مما ينظف"
  truth_2: "يأكل الطحالب فقط، لا ينظف الفضلات"
  truth_3: "يحتاج طعام إضافي وإلا يموت جوعاً"
  truth_4: "بدون تغيير الماء = حوض قذر حتى مع سمك التنظيف"

# ───────────────────────────────────────────────────────────────
# CHARACTERS
# ───────────────────────────────────────────────────────────────

characters:
  
  pleco:
    name: "Plucky the Pleco"
    type: "Common Pleco / Bristlenose"
    color: "dark brown with spots"
    style: "3D Pixar cartoon, cute suckermouth"
    size_in_frame: "15% of frame"
    features:
      - suckermouth (attached to glass)
      - armored body with plates
      - fan-like fins
      - whisker-like bristles (if Bristlenose)
    personality: "tired, overworked, frustrated"
    
  owner_hand:
    type: "human hand"
    action: "points, then cleans with tool"
    
  goldfish:
    name: "supporting character"
    role: "messy roommate making waste"
    expression: "oblivious, happy, pooping"

# ───────────────────────────────────────────────────────────────
# ENVIRONMENT
# ───────────────────────────────────────────────────────────────

environment:
  type: "glass aquarium"
  
  state_dirty:
    glass: "covered with green algae"
    water: "cloudy, greenish tint"
    gravel: "dirty with debris"
    decorations: "covered in algae"
    
  state_clean:
    glass: "crystal clear"
    water: "sparkling blue"
    gravel: "clean"
    decorations: "visible and pretty"

# ───────────────────────────────────────────────────────────────
# STORY ARC
# ───────────────────────────────────────────────────────────────

story:
  logline: "A pleco fish is blamed for a dirty tank, but reveals the truth about what 'cleaner fish' really do."
  
  arc:
    act_1: "HOOK - Owner shows dirty tank, blames pleco"
    act_2: "PROBLEM - Pleco responds: I can't do everything!"
    act_3: "DEMONSTRATION - What pleco ACTUALLY eats vs what it doesn't"
    act_4: "TWIST - Pleco produces waste too!"
    act_5: "SOLUTION - Owner helps, tank gets clean together"
    act_6: "CTA - The real truth about tank maintenance"

# ═══════════════════════════════════════════════════════════════
# KEYFRAMES
# ═══════════════════════════════════════════════════════════════

keyframes:

  # ─────────────────────────────────────────────────────────────
  KF1_HOOK:
    time: "0-0.5s"
    shot_type: "wide"
    
    scene:
      aquarium: "DIRTY - green algae on glass, cloudy water"
      pleco: "stuck to glass, looking tired"
      owner_hand: "pointing accusingly at pleco"
    
    action:
      hand: "pointing finger at pleco (blaming)"
      pleco: "looks up with exhausted expression"
    
    text_overlay:
      main: "MYTH ❌"
      sub: '"Cleaner fish clean the tank!"'
      position: "bottom center"
      style: "red stamp, bold"
    
    mood: "accusatory, dramatic"
    sound: "dun dun dun (dramatic)"

  # ─────────────────────────────────────────────────────────────
  KF2_PLECO_RESPONDS:
    time: "0.5-5s"
    shot_type: "close-up on pleco"
    
    scene:
      pleco: "close-up, frustrated face, still on dirty glass"
      speech_bubble: true
    
    action:
      pleco: "looks at camera with annoyed expression"
      mouth: "opens as if speaking"
    
    pleco_expression: "annoyed, tired, 'are you serious?'"
    
    text_overlay:
      speech: '"أنا مو خدامتك! 😤"'
      translation: '"I'm not your maid!"'
      position: "speech bubble"
    
    mood: "comedic frustration"
    sound: "record scratch"

  # ─────────────────────────────────────────────────────────────
  KF3_WHAT_PLECO_EATS:
    time: "5-12s"
    shot_type: "split screen / diagram"
    
    scene:
      left_side: "✅ What pleco EATS"
      right_side: "❌ What pleco DOESN'T eat"
    
    left_content:
      items:
        - "algae on glass ✅"
        - "algae on decorations ✅"
        - "leftover food bits ✅"
      pleco_action: "happily eating algae"
      
    right_content:
      items:
        - "fish poop ❌"
        - "dirty water ❌"
        - "dead plants ❌"
      pleco_action: "shaking head 'no'"
    
    text_overlay:
      main: "I only eat ALGAE!"
      position: "center"
    
    mood: "educational, clear"
    sound: "ding for yes, buzzer for no"

  # ─────────────────────────────────────────────────────────────
  KF4_PLOT_TWIST:
    time: "12-17s"
    shot_type: "medium"
    
    scene:
      pleco: "swimming, about to reveal something"
      background: "dirty tank"
    
    action:
      pleco: "turns around..."
      reveal: "POOPS a lot! 💩"
      reaction: "looks embarrassed"
    
    pleco_expression: "embarrassed, sheepish grin"
    
    text_overlay:
      main: "PLOT TWIST! 😳"
      sub: "Plecos produce MORE waste than they clean!"
      position: "center"
    
    mood: "funny surprise"
    sound: "fart sound effect + laugh track"

  # ─────────────────────────────────────────────────────────────
  KF5_THE_SOLUTION:
    time: "17-23s"
    shot_type: "wide, montage feel"
    
    scene:
      owner_hand: "using gravel vacuum, doing water change"
      pleco: "watching happily, giving thumbs up (fin up)"
      water: "becoming clearer"
    
    action:
      hand: "vacuuming gravel, changing water"
      pleco: "nodding approvingly"
      tank: "transforming from dirty to clean"
    
    text_overlay:
      main: "TEAMWORK! 🤝"
      sub: "Pleco helps, but YOU do the real cleaning"
      position: "bottom"
    
    mood: "positive, educational"
    sound: "uplifting music"

  # ─────────────────────────────────────────────────────────────
  KF6_REVEAL_CLEAN_TANK:
    time: "23-27s"
    shot_type: "wide"
    
    scene:
      aquarium: "NOW SPARKLING CLEAN!"
      pleco: "happy on clean glass"
      water: "crystal clear"
    
    action:
      pleco: "happily attached to now-clean glass"
      expression: "relieved, content"
    
    text_overlay:
      stamp: "FACT ✅"
      main: "Clean tank = Happy fish + Regular maintenance"
      position: "center"
    
    timer:
      value: "Weekly water change ✓"
    
    mood: "satisfying, clean, accomplished"
    sound: "sparkle sound effect"

  # ─────────────────────────────────────────────────────────────
  KF7_CTA:
    time: "27-30s"
    shot_type: "close-up portrait"
    
    scene:
      pleco: "centered, looking at camera"
      background: "clean tank, bokeh"
    
    action:
      pleco: "winks at camera"
      expression: "friendly, knowing smile"
    
    text_overlay:
      main: "هل حوضك نظيف؟ 👇"
      cta_1: "💬 كم مرة تغير الماء؟"
      cta_2: "❤️ = دليل صيانة مجاني"
      cta_3: "📤 أرسل لصاحب حوض"
    
    branding:
      logo: "AQUAVO"
      handle: "@aquavo.sa"
    
    mood: "friendly, engaging"
    sound: "upbeat jingle"

# ═══════════════════════════════════════════════════════════════
# VISUAL SUMMARY (3x3 GRID)
# ═══════════════════════════════════════════════════════════════

grid_summary:
  row_1:
    - "KF1: Dirty tank, hand blaming pleco, MYTH ❌"
    - "KF2: Pleco angry 'I'm not your maid!'"
    - "KF3: Split screen - what pleco eats vs doesn't"
  row_2:
    - "KF4: Plot twist - pleco poops too! 💩"
    - "KF5: Hand cleaning + pleco = teamwork"
    - "KF6: Clean tank reveal, FACT ✅"
  row_3:
    - "KF7: Pleco winks, CTA"
    - "(empty)"
    - "(empty)"

# ═══════════════════════════════════════════════════════════════
# SOUND DESIGN
# ═══════════════════════════════════════════════════════════════

sound_design:
  KF1: "dramatic 'dun dun dun'"
  KF2: "record scratch"
  KF3: "ding (yes) + buzzer (no)"
  KF4: "fart sound + laugh"
  KF5: "uplifting music"
  KF6: "sparkle sound"
  KF7: "upbeat jingle"
  
  voiceover: "NONE - text/subtitles only"
```

---

# 📊 ملخص القصة الجديدة

| # | الحدث | التعبير |
|---|-------|---------|
| 1 | حوض قذر + يد تلوم السمكة | MYTH ❌ |
| 2 | البليكو يرد "أنا مو خدامتك!" | غاضب 😤 |
| 3 | ماذا آكل ✅ vs ماذا لا آكل ❌ | تعليمي |
| 4 | **TWIST:** البليكو يخرج فضلات أكثر! 💩 | محرج 😳 |
| 5 | صاحب الحوض ينظف + السمكة تساعد | تعاون 🤝 |
| 6 | الحوض نظيف! | FACT ✅ |
| 7 | السمكة تغمز + CTA | دعوة للتفاعل |

---

# 🎨 Prompt لتوليد Grid 3×3

```
Generate a 3×3 storyboard grid showing a Pleco fish myth story:

Panel 1: Dirty aquarium with algae, human hand pointing at tired Pleco fish, red "MYTH ❌" stamp
Panel 2: Close-up Pleco with angry face, speech bubble "I'm not your maid! 😤"
Panel 3: Split screen showing what Pleco eats (algae ✅) vs what it doesn't (fish poop ❌)
Panel 4: Pleco pooping, embarrassed face, text "PLOT TWIST! 💩"
Panel 5: Human hand with gravel vacuum cleaning, Pleco giving fins up, "TEAMWORK 🤝"
Panel 6: Sparkling clean aquarium, happy Pleco, green "FACT ✅" stamp
Panel 7: Pleco winking at camera, "@aquavo.sa" text, CTA buttons

Same Pleco character (brown, spots, suckermouth) in all panels.
3D Pixar cartoon style.
16:9 horizontal grid with 7 panels.
```

---

*AQUAVO - Cleaner Fish Myth*
*30 ثانية*
