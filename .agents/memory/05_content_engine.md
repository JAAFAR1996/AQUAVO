# 🤖 Content Engine — Layer 5 Memory

## Architecture Overview

```
basarai/backend/
├── telegram_content_bot.py    ← Bot v3 (main orchestrator)
├── improve_prompts.py         ← Claude-powered prompt enhancer
├── add_model_tags.py          ← Model recommendation tagger
├── approved_content/          ← week_N/day/img.png (approved images)
├── ref_images/                ← manual reference images fallback
├── completed_prompts.json     ← progress tracker (append-only log)
└── AQUAVO_CONTENT_CALENDAR.xlsx ← Excel calendar (legacy/Excel mode)
```

## Bot Flow (JSON Mode — PRIMARY)

```
/start or /json
    → screen_home()           [Select mode]
    → screen_json_home()      [4 weeks listed]
    → screen_json_days(week)  [Days per week]
    → screen_json_prompts(w,d) [Prompt list with scores]
    → screen_json_detail(w,d,i) [Full detail + model info]
        ↓
    [🚀 Auto-Generate]        → jauto callback
        → do_generate_json(auto=True)
            → _get_model_info(prompt)  ← reads generation_settings
            → generate_image(prompt, type, provider, model_id, quality)
            → review_image(img)        ← AI brand reviewer
            → send_photo(img, caption) ← with Approve/Reject/Regen buttons
                ↓
    [✅ Approve]               → jok callback
        → save_approved_image()
        → log_completed_prompt()
        → Display SEO caption + hashtags (ready to copy-paste)
```

## Prompt JSON Structure (IMPROVED format)

```json
{
  "id": "W4-MON-ST1",
  "day": "الإثنين",
  "type": "story_teaser",
  "platform": "instagram_story",
  "aspect_ratio": "9:16 (1080x1920)",
  "product": "اسم المنتج",
  "psychology": "Principle 1 + Principle 2",
  "prompt": "Full English prompt for AI generation...",
  "text_overlay": {
    "line1": "النص الرئيسي",
    "sticker": "نص ثانوي",
    "position": "center_safe_zone"
  },
  "seo_caption": "كابشن جاهز للنشر بالبغدادي",
  "seo_hashtags": ["#أحواض_عراق", "#aquavoiq"],
  "seo_alt_text": "وصف بديل للصورة",
  "music_recommendation": "Style — BPM",
  "improvement_notes": "ماذا تغير ولماذا",
  "psychology_score": 9,
  "brand_compliance": 10,
  "generation_settings": {
    "recommended_model": {
      "primary": {"key": "gpt2", "id": "gpt-image-2", "provider": "openai"},
      "fallback": {"key": "nano", "id": "gemini-2.5-flash-image", "provider": "gemini"},
      "quality": "high",
      "reasoning": "Why this model was chosen"
    },
    "dimensions": {"width": 1080, "height": 1920, "aspect_ratio": "9:16"}
  }
}
```

## Model Selection Logic (add_model_tags.py)

| Condition | Primary | Quality |
|-----------|---------|---------|
| Contains "product photography" / "photorealistic" | gpt2 | high |
| Carousel slides | gpt2 | high (same model = consistency) |
| Story with split/comparison | gpt2 | high |
| Standard story | gpt2 | medium |
| CTA/background only | nano | medium |
| CGI/mandala/multi-product | gpt2 | high |
| Dark premium (default) | gpt2 | high |

## AQUAVO Base Prompt (auto-prepended)

```
Premium product photography. Dark slate background.
Split lighting: warm amber from left, cool cyan from right.
Canon R5 style, 85mm f/2.8, shallow depth of field.
Subtle water droplets on product surface.
Sharp, clean, razor-crisp details. No noise, no grain.
Dark premium aesthetic. Product centered, 20% margin from edges.
No human hands, no clutter, no white backgrounds.
```

## Content Calendar Stats

| Week | File | Prompts | Theme |
|------|------|---------|-------|
| 1 | AQUAVO_REVIVAL_PROMPTS_WEEK1_IMPROVED.json | 7 | التأسيس والحماية — 16 منتج |
| 2 | AQUAVO_REVIVAL_PROMPTS_WEEK2_IMPROVED.json | 19 | البيئة البايولوجية |
| 3 | AQUAVO_REVIVAL_PROMPTS_WEEK3_IMPROVED.json | 18 | التغذية الاحترافية والفحوصات |
| 4 | AQUAVO_REVIVAL_PROMPTS_WEEK4_IMPROVED.json | 18 | المعدات والأحواض والتكاثر |

**Total:** 62 prompts improved
**Completed:** 0 generated & approved

## Avg Quality Scores (post-improvement)

- Psychology Score: **8.9 / 10**
- Brand Compliance: **9.6 / 10**

## Running the Engine

```powershell
# Start Telegram bot
cd C:\Users\jaafa\Desktop\basarai\backend
$env:PYTHONIOENCODING='utf-8'
python telegram_content_bot.py

# Add new week prompts
python improve_prompts.py   # Edit WEEK_FILES list first
python add_model_tags.py    # Run after improve_prompts.py
```

## Key Environment Variables (basarai/.env)

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
AQUAVO_BRAND_ID=0eb7d77b-35f7-45d3-a843-58407fee2354
```
