# 🎬 AQUAVO V4 - Keyframes مع الرسومات الصحيحة
## النسب الصحيحة: السمكة صغيرة داخل متاهة كبيرة

---

# 📐 المتاهة الثابتة (REFERENCE MAP)

```
┌──────────────────────────────────────────────┐
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║  [S]━━━━━━┓                            ║  │
│  ║           ┃        ┏━━━━━━━━━━┓        ║  │
│  ║           ┃        ┃          ┃        ║  │
│  ║           ┃        ┃    [X]   ┃        ║  │ ← [X] = Dead End
│  ║           ┗━━━━━━━━╋━━━━━━┓   ┃        ║  │
│  ║                    ┃      ┃   ┃        ║  │
│  ║  ┏━━━━━━━━━━━━━━━━━┛      ┃   ┗━━[E]   ║  │ ← [E] = Food
│  ║  ┃                        ┃            ║  │
│  ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ║                                        ║  │
│  ╚════════════════════════════════════════╝  │
│               [AQUARIUM GLASS]               │
└──────────────────────────────────────────────┘

المسار الصحيح: [S] → أسفل → يمين → أسفل → يمين → أعلى → [E]
المسار الخطأ:  [S] → يمين مباشرة → [X] حائط!

🐟 = 5% من حجم المتاهة (صغيرة)
الممرات = 3x عرض السمكة
```

---

# 🎬 KF1: HOOK (0-0.5s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│                                              │
│  👋💥━━━━━━━━►                               │
│  [HAND HITS GLASS]                           │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║           ·🐟← SHOCKED!                ║  │
│  ║           (jumping in fear)            ║  │
│  ║                                        ║  │
│  ║        [MAZE VISIBLE BEHIND]           ║  │
│  ║                                        ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║     MYTH ❌  "3 SECONDS"            ║     │
│  ╚═════════════════════════════════════╝     │
│                                              │
└──────────────────────────────────────────────┘

موقع السمكة: وسط الحوض (50%, 40%)
حجم السمكة: صغيرة (5% من الكادر)
التعبير: خوف/صدمة 😱
الحركة: قفز للخلف من الصدمة
```

## Prompt:
```
3D Pixar cartoon, wide shot of glass aquarium, human hand HITTING the glass from outside creating water ripples, inside the aquarium a SMALL golden goldfish (5% of frame) JUMPING BACKWARD in shock with scared expression, a large transparent maze structure visible behind the fish filling 70% of aquarium, big red stamp overlay "MYTH ❌" with text "3 SECONDS" crossed out, water splashing effect, HIGH CONTRAST bold text 72pt white with black stroke, 10% safe zone, 9:16 vertical
```

---

# 🎬 KF2: التحدي (0.5-4s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│  Timer: 00:00                                │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║  ·🐟→                                  ║  │
│  ║  [S]━━━━━━┓                            ║  │
│  ║           ┃        ┏━━━━━━━━━━┓        ║  │
│  ║           ┃        ┃          ┃        ║  │
│  ║           ┃        ┃          ┃        ║  │
│  ║           ┗━━━━━━━━╋━━━━━━┓   ┃        ║  │
│  ║                    ┃      ┃   ┃        ║  │
│  ║  ┏━━━━━━━━━━━━━━━━━┛      ┃   ┗━━🍽️   ║  │
│  ║  ┃                        ┃            ║  │
│  ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║  "Trained 3 MONTHS ago. Watch."    ║     │
│  ╚═════════════════════════════════════╝     │
└──────────────────────────────────────────────┘

موقع السمكة: عند [S] بداية المتاهة (15%, 25%)
حجم السمكة: صغيرة (5% من الكادر)
التعبير: هدوء → استعداد → فضول
الحركة: ستتحرك للأمام نحو المتاهة
```

## Prompt:
```
3D Pixar cartoon, wide shot, glass aquarium with LARGE transparent maze filling 70% of tank, SMALL golden goldfish (5% of frame) at maze entrance point [S] looking determined and curious, the fish is TINY compared to the big maze structure, timer "00:00" top right, text overlay "Trained 3 MONTHS ago. Watch." bold 72pt, maze paths clearly visible, food reward visible at end point, HIGH CONTRAST, 10% safe zone, 9:16 vertical
```

---

# 🎬 KF3: الخطأ! (4-8s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│  Timer: 00:03                                │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║  [S]━━━━━━┓                            ║  │
│  ║           ┃        ┏━━━━━━━━━━┓        ║  │
│  ║           ┃        ┃          ┃        ║  │
│  ║           ┃━━━━━━━►┃·🐟→❌    ┃        ║  │
│  ║           ┃ WRONG! ┃ (hits    ┃        ║  │
│  ║           ┗━━━━━━━━╋━wall!)━━┓┃        ║  │
│  ║                    ┃      ┃   ┃        ║  │
│  ║  ┏━━━━━━━━━━━━━━━━━┛      ┃   ┗━━🍽️   ║  │
│  ║  ┃                        ┃            ║  │
│  ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║        "Wait... 😬"                 ║     │
│  ╚═════════════════════════════════════╝     │
└──────────────────────────────────────────────┘

موقع السمكة: عند [X] الطريق المسدود (55%, 35%)
حجم السمكة: صغيرة (5% من الكادر)
التعبير: واثقة ثم صادمة حزينة
الحركة: سبحت يميناً واصطدمت بالحائط!
```

## Prompt:
```
3D Pixar cartoon, medium shot inside aquarium, SMALL golden goldfish (5% of frame) inside the LARGE maze, fish has just HIT a dead end wall at position [X], surprised then SAD expression, fins drooping, the fish went the WRONG WAY, timer "00:03", text "Wait... 😬" bold 72pt, maze walls clearly blocking the path, HIGH CONTRAST, 10% safe zone, 9:16 vertical
```

---

# 🎬 KF4: PATTERN INTERRUPT (8-12s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│  Timer: 00:06 ⏸️                             │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║  [S]━━━━━━┓                            ║  │
│  ║           ┃        ┏━━━━━━━━━━┓        ║  │
│  ║     ←·🐟  ┃        ┃          ┃        ║  │
│  ║   (going  ┃        ┃    [X]   ┃        ║  │
│  ║    back)  ┃        ┃          ┃        ║  │
│  ║           ┗━━━━━━━━╋━━━━━━┓   ┃        ║  │
│  ║                    ┃      ┃   ┃        ║  │
│  ║  ┏━━━━━━━━━━━━━━━━━┛      ┃   ┗━━🍽️   ║  │
│  ║  ┃                        ┃            ║  │
│  ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║    "Did she forget? 😱"             ║     │
│  ╚═════════════════════════════════════╝     │
└──────────────────────────────────────────────┘

موقع السمكة: رجعت للخلف، عند التقاطع (25%, 45%)
حجم السمكة: صغيرة (5% من الكادر)
التعبير: متوقفة تماماً! عيون مغلقة = تفكر
الحركة: ثابتة تماماً = توتر!
```

## Prompt:
```
3D Pixar cartoon, medium shot, SMALL golden goldfish (5% of frame) FROZEN STILL inside LARGE maze at intersection point, eyes CLOSED in deep concentration, fish backed away from dead end, thinking pose, timer "00:06" with PAUSED feeling, text "Did she forget? 😱" bold 72pt, DRAMATIC PAUSE moment, spotlight effect on fish, maze structure visible around, HIGH CONTRAST, 10% safe zone, 9:16 vertical
```

---

# 🎬 KF5: التذكر + الانطلاق (12-20s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│  Timer: 00:08                                │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║           💡⚡                         ║  │
│  ║  [S]━━━━━━┓                            ║  │
│  ║         ·🐟→→→→→→→→→→→                 ║  │
│  ║           ┃        ┏━━━━━━━━━━┓        ║  │
│  ║           ↓ SPEED! ┃          ┃        ║  │
│  ║           ↓        ┃    [X]   ┃        ║  │
│  ║           ┗━━━━━━━━╋━━━━━━┓   ┃        ║  │
│  ║                    ↓      ┃   ┃        ║  │
│  ║  ┏━━━━━━━━━━━━━━━━━┛      ┃   ┗━━🍽️   ║  │
│  ║  ┃→→→→→→→→→→→→→→→→→→→→→→→→┛            ║  │
│  ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║  "SHE REMEMBERS! ⚡"   ✅ FACT      ║     │
│  ╚═════════════════════════════════════╝     │
└──────────────────────────────────────────────┘

موقع السمكة: تتحرك بسرعة عبر المسار الصحيح
حجم السمكة: صغيرة (5% من الكادر)
التعبير: عيون مفتوحة بلمعان! ابتسامة! ثقة!
الحركة: تنطلق بسرعة: يسار → أسفل → يمين → نحو [E]
```

## Prompt:
```
3D Pixar cartoon, wide shot with motion, SMALL golden goldfish (5% of frame) SPEEDING through LARGE maze on CORRECT path, eyes SPARKLING with eureka moment, confident smile, motion blur showing FAST movement through maze corridors, timer "00:08", text "SHE REMEMBERS! ⚡" bold 72pt, green stamp "FACT ✅" replacing red MYTH, speed lines effect, light burst around fish head, HIGH CONTRAST, 10% safe zone, 9:16 vertical, ACTION CLIMAX MOMENT
```

---

# 🎬 KF6: الوصول + اليد تعود (20-26s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│  Timer: 00:12.4 ✓                            │
│                                              │
│  👋← (hand returns gently)                   │
│   ┃                                          │
│  ╔╋═══════════════════════════════════════╗  │
│  ║┃                                       ║  │
│  ║┃ [S]━━━━━━┓                            ║  │
│  ║┃          ┃        ┏━━━━━━━━━━┓        ║  │
│  ║┃          ┃        ┃          ┃        ║  │
│  ║┃          ┃        ┃    [X]   ┃        ║  │
│  ║┃          ┗━━━━━━━━╋━━━━━━┓   ┃        ║  │
│  ║┃                   ┃      ┃   ┃        ║  │
│  ║┃ ┏━━━━━━━━━━━━━━━━━┛      ┃  ·🐟🍽️    ║  │
│  ║┃ ┃                        ┃   (eating) ║  │
│  ║┃ ┗━━━━━━━━━━━━━━━━━━━━━━━━┛            ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║  "She remembers. Do you? 💔"        ║     │
│  ╚═════════════════════════════════════╝     │
└──────────────────────────────────────────────┘

موقع السمكة: عند [E] الطعام (85%, 65%)
حجم السمكة: صغيرة لكن نراها في close-up
التعبير: سعيدة تأكل → ثم تنظر لليد بحكمة
الحركة: اليد (من KF1) ترجع بلطف/ندم
```

## Prompt:
```
3D Pixar cartoon, medium close shot, SMALL golden goldfish at maze END eating food reward, happy expression, BUT the human hand from KF1 now GENTLY touching glass with REGRET, fish looking at hand with WISE KNOWING expression, timer frozen "00:12.4 ✓" with glow, text "She remembers. Do you? 💔" bold 72pt, emotional warm golden lighting, LARGE maze visible in background, HIGH CONTRAST, 10% safe zone, 9:16 vertical, EMOTIONAL PAYOFF
```

---

# 🎬 KF7: CTA (26-30s)

## الرسم:
```
┌──────────────────────────────────────────────┐
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║                                        ║  │
│  ║                                        ║  │
│  ║              ·🐟 😉                    ║  │
│  ║           (winks at you)               ║  │
│  ║                                        ║  │
│  ║                                        ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  ╔═════════════════════════════════════╗     │
│  ║  "Bet you can't do this faster 👇"  ║     │
│  ╠═════════════════════════════════════╣     │
│  ║  💬 Comment your fish type          ║     │
│  ║  ❤️ = FREE intelligence guide       ║     │
│  ║  📤 Tag a fish owner                ║     │
│  ╚═════════════════════════════════════╝     │
│                                              │
│          @aquavo.sa    [LOGO]                │
│                                              │
└──────────────────────────────────────────────┘

موقع السمكة: وسط الكادر تماماً (50%, 40%)
حجم السمكة: أكبر قليلاً (15% من الكادر) - Portrait shot
التعبير: واثقة، تغمز، "تحداني!" 😉
الحركة: ثابتة، تنظر للكاميرا مباشرة
```

## Prompt:
```
3D Pixar cartoon, close-up portrait, golden goldfish CENTERED in frame (15% of frame size), looking DIRECTLY at camera, WINKING with confident smirk 😉, challenge expression, soft bokeh aquarium background, text top "Bet you can't do this faster 👇" bold 72pt, text middle "💬 Comment your fish type", "❤️ = FREE intelligence guide", "📤 Tag a fish owner", AQUAVO logo bottom left, "@aquavo.sa" bottom right, warm golden lighting, HIGH CONTRAST all text, 10% safe zone, 9:16 vertical, VIRAL CTA ENDING
```

---

# 📊 ملخص التسلسل

| KF | الثواني | موقع السمكة في المتاهة | الحدث |
|----|---------|----------------------|-------|
| 1 | 0-0.5 | خارج المتاهة (وسط الحوض) | HOOK - يد تضرب |
| 2 | 0.5-4 | [S] البداية | تحدي - تستعد |
| 3 | 4-8 | [X] الطريق المسدود | خطأ! - تصطدم |
| 4 | 8-12 | عند التقاطع | توقف - تفكر |
| 5 | 12-20 | المسار الصحيح → [E] | تذكر! - تنطلق |
| 6 | 20-26 | [E] عند الطعام | وصول + يد تعود |
| 7 | 26-30 | Portrait وسط الكادر | CTA - تغمز |

---

# 🎵 Sound Design

| KF | الصوت |
|----|-------|
| KF1 | Bass drop + glass tap + record scratch |
| KF2 | Ticking clock starts |
| KF3 | Wrong buzzer + sad trombone |
| KF4 | Silence... heartbeat |
| KF5 | Ding! + orchestral hit + whoosh |
| KF6 | Piano emotional + heartbeat fade |
| KF7 | Upbeat jingle |

---

*VIRAL READY - 30 ثانية*
*النسب الصحيحة: سمكة صغيرة 5% داخل متاهة كبيرة 70%*
