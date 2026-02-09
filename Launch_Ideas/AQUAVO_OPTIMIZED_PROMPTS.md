# 🧪 Final Prompt Strategy: AQUAVO "Speed Maze"
**Status:** Optimized for Quality (Zero Glitch)

## 📋 The Verdict
*   **Your Structure:** **10/10** (Start/End + Single Move is the industry standard).
*   **Text Strategy:** **Risky.**
    *   **Nano Banana (Images):** ✅ Excellent. Gemini 3 Pro can handle text perfectly.
    *   **Veo (Video):** ⚠️ **High Risk.** Veo cannot "fade text at 2.5s" cleanly. It will likely melt the text into the fish or bubbles ("Text Boiling").

## 🛠️ The "Pro" Workflow (Safe Route)
To get the result you want (Netflix Quality), use this **Hybrid Method**:

### Step 1: Generate Images (Nano Banana)
Generate **TWO versions** of your keys:
1.  **With Text:** (For your reference and overlay).
2.  **Clean:** (No text - for Veo to eat).

**Prompt (Clean Version):**
*   *Remove the "ON-SCREEN TEXT" block.*
*   *Keep everything else (Lighting, Camera, Subject).*

### Step 2: Generate Video (Veo)
Feed the **CLEAN** Start/End frames to Veo.
**Why?** The AI will focus 100% on the fish movement and won't get confused trying to "swim" the letters.

**Optimized Veo Prompt (Motion Only):**
> **Input:** Clean Start Frame + Clean End Frame
> **Prompt:** A single continuous camera move with no cuts.
>
> **CAMERA:** Perform a slow, smooth dolly-in. Keep the fish eye sharp. 
> **ACTION:** The goldfish swims fast and precisely through the transparent glass maze from entrance to exit. No hesitation. Keep the maze rigid.
> **REALISM:** Natural fin motion, realistic water physics, gentle bubbles.
> **TIMING:** Reach the exit composition by 6 seconds and hold.

### Step 3: The Polish (Editor)
*   Take the **Text Image** you generated in Step 1.
*   Crop the text ("Fish have 3 sec memory?").
*   Overlay it on the video in your editor (CapCut/Premiere).
*   Add the Fade Out animation yourself (0.5s work).

---

## 🚀 Why this is better?
1.  **Crisp Text:** No "AI spelling errors" or melting edges.
2.  **Better Physics:** Veo devotes all computing power to the fish/water physics.
3.  **Control:** You decide *exactly* when the text fades, not the AI.

**Recommendation:** Copy the prompts below (Safe Mode).
