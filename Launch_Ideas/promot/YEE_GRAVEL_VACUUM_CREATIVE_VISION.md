# 🧪 Creative Vision: YEE-C4-1067 | 3W Oil Film Processor (Skimmer)

> **Document Status:** ✅ Verified & Ready for Generation
> **Product ID:** `yee-c4-1067`
> **Category:** Filtration & Surface Skimming
> **Visual Identity:** "Crystal Surface Technology"

---

## 1. Product Identity & Core Message
**The Truth:** This is a compact, 3-watt electric surface skimmer (Oil Film Processor). It sits inside the aquarium, near the surface. Its floating head automatically adjusts to water level changes to suck in the oily film (protein slick) from the water surface, process it through a sponge, and return clean oxygenated water.

**The Vibe:**
*   **Primary Emotion:** Clarity (removing the ugly oily film).
*   **Keywords:** Surface Skimming, Oxygenation, Crystal Clear, Silent, Auto-Leveling.
*   **Color Palette:** Mysterious Black (Product), Crystal Clear Surface (Water), Vibrant Green (Plants).

---

## 2. Visual Language Guide
| Element | Visual Translation |
| :--- | :--- |
| **Material** | Matte Black Plastic housing with a floating "Crown" head. |
| **Action** | The "Vortex Downpour" - water cascading into the floating head. |
| **Lighting** | **Surface-Glance**: Light hitting the water surface to show the "Before/After" of the oil film. |
| **Context** | Planted tanks where oil slick is common, positioned at the water line. |

---

## 3. Master Prompts (JSON)

### 🖼️ Shot 1: The "Hero" (Studio/Reference Match)
**Reference Image:**
![Ref Product](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png)

**Purpose:** Accurate product representation.
**Focus:** The compact black body and the floating intake nozzle.

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Professional studio product shot of YEE 3W Oil Film Processor",
    "secondary": "Show compact black design with floating surface intake head"
  },
  "subject": {
    "main": "YEE Surface Skimmer C4-1067",
    "attributes": {
      "physical": "Matte black boxy filter body, distinct floating crown-shaped intake nozzle on top, flow control knob, suction cup mount",
      "orientation": "Vertical, standing as if mounted"
    }
  },
  "environment": {
    "lighting": {
      "type": "Studio Tech Lighting",
      "direction": "Rim lighting to separate black product from background",
      "quality": "Sleek, modern, high contrast"
    },
    "background": "Clean White or Light Grey Gradient"
  },
  "style": {
    "camera": { "lens": "50mm", "aperture": "f/8", "shot_type": "Full Body Product" },
    "mood": "Silent, Efficient, Modern"
  },
  "technical": { 
    "resolution": "8K", 
    "aspect_ratio": "4:5" 
  },
  "constraints": {
    "exclusions": ["gravel vacuum tube", "hoses", "long pipes", "transparent body", "white plastic"]
  }
}
```

### 🖼️ Shot 2: The "Performance" (Surface Action)
**Reference Image:**
![Ref Product](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png)

**Purpose:** Show the core function: Removing the oil film.
**Focus:** The floating head sucking in water at the surface line.

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Action shot of Oil Skimmer removing surface film",
    "secondary": "Visualizing the 'Vortex' intake at the water line"
  },
  "subject": {
    "main": "Floating Skimmer Head at water surface",
    "action": {
      "physics": "Water cascading into the floating nozzle, creating a small satisfying vortex",
      "effect": "Visible boundary between 'Oily/Dusty' surface outside and 'Clean' surface near intake"
    }
  },
  "environment": {
    "lighting": {
      "type": "Aquarium Surface Light",
      "direction": "Top-down shimmer to highlight water texture and oil film contrast",
      "quality": "Realistic, reflective"
    },
    "background": "Split view: Half above water, half underwater showing the filter body"
  },
  "style": {
    "camera": { "lens": "85mm Macro", "aperture": "f/4", "shot_type": "Split-Level / Close-up" },
    "mood": "Purifying, Active"
  },
  "technical": { 
    "resolution": "8K", 
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["splashing water", "fish jumping", "bubbles obscuring view"]
  }
}
```

### 🖼️ Shot 3: The "Mechanism" (Exploded/Internal Flow)
**Reference Image:**
![Ref Product](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png)

**Purpose:** Show the filtration inside.
**Focus:** The sponge and impeller path (implied or cutaway).

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Tech visualization of water flow through the Oil Processor",
    "secondary": "Highlighting specific 3W motor efficiency and sponge filtration"
  },
  "subject": {
    "main": "YEE Skimmer with 'X-Ray' or Flow Arrows overlay",
    "attributes": {
      "flow_path": "Water entering top -> Passing through sponge block -> Clean water exiting bottom",
      "motor": "Small, silent 3W core highlighted"
    }
  },
  "environment": {
    "lighting": {
      "type": "Blueprint / Tech Glow",
      "direction": "Internal glow",
      "quality": "Schematic, informative"
    },
    "background": "Dark Tech Blue"
  },
  "style": {
    "camera": { "lens": "100mm", "aperture": "f/8", "shot_type": "Technical Illustration Style" },
    "mood": "Smart, Engineered"
  },
  "technical": { 
    "resolution": "8K", 
    "aspect_ratio": "1:1" 
  },
  "constraints": {
    "exclusions": ["confusing parts", "external canisters", "complex pipes"]
  }
}
```

### 🖼️ Shot 4: The "Result" (Crystal Surface)
**Reference Image:**
![Ref Product](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png)

**Purpose:** Oxygenation and clarity benefit.
**Focus:** Perfect mirror-like water surface from below, looking up.

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Lifestyle shot from underwater looking up at crystal clear surface",
    "secondary": "Skimmer visible in corner doing its job silently"
  },
  "subject": {
    "main": "Water Surface (Underside)",
    "context": "No bio-film, perfect ripples, high oxygen exchange",
    "attributes": {
      "lighting": "God rays penetrating deeply because surface is clear"
    }
  },
  "environment": {
    "lighting": {
      "type": "Underwater Sun Rays",
      "direction": "Top Down",
      "quality": "Ethereal, breathable"
    },
    "background": "Lush planted tank, thriving ecosystem"
  },
  "style": {
    "camera": { "lens": "24mm Wide", "aperture": "f/5.6", "shot_type": "Underwater Landscape" },
    "mood": "Healthy, Vitality, Breathable"
  },
  "technical": { 
    "resolution": "8K", 
    "aspect_ratio": "16:9" 
  },
  "constraints": {
    "exclusions": ["cloudy water", "green scum", "darkness"]
  }
}
```
