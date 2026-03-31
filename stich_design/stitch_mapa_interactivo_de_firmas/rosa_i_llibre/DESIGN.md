# Design System: Modern Literary Celebration

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Digital Ephemera."** 

Unlike standard utilitarian apps that feel cold and mechanical, this system aims to feel like a high-end cultural journal—an interface that breathes with the tactile romance of a Barcelona spring. We achieve this through "The Editorial Offset": a layout strategy where large serif headings (Newsreader) are intentionally decoupled from rigid grid lines to create a sense of movement. By utilizing intentional asymmetry—such as overlapping a book cover image across two background tonal shifts—we break the "template" look and replace it with a bespoke, curated experience that feels as intentional as a hand-bound volume.

---

## 2. Colors
Our palette is a dialogue between the vibrant life of a rose and the quiet permanence of an inkwell.

- **Primary & Emphasis:** Use `primary` (#86001b) for core actions, but lean into `primary_container` (#b10528) for large emotive blocks. The transition between these two creates a "velvet" depth.
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a `surface_container_low` section sitting on a `surface` background provides all the separation a user needs without the visual clutter of "boxes."
- **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine paper. 
    - Use `surface` (#fcf9f3) as your base canvas.
    - Use `surface_container_low` for secondary content areas.
    - Use `surface_container_lowest` (#ffffff) for the most prominent interactive cards to give them a natural "pop" against the cream background.
- **The "Glass & Gradient" Rule:** To avoid a flat, dated look, floating elements (like navigation bars or quick-action buttons) should utilize `surface` colors at 80% opacity with a `20px` backdrop-blur. 
- **Signature Textures:** Apply a global, nearly-invisible noise texture (3% opacity) to the `surface` background to mimic heavy-stock paper.

---

## 3. Typography
The typographic system is a study in "High-Low" contrast: the romanticism of the humanities paired with the precision of modern data.

- **Display & Headlines (Newsreader):** Use `display-lg` and `headline-lg` for poetic moments—author names, literary quotes, or event titles. These should feel expansive and authoritative.
- **Functional UI (Manrope):** Use `title-sm` through `body-sm` for the "work" of the app. Logistics, timestamps, and locations belong in Manrope. It provides the "utility" that ensures the app remains fast and legible for users navigating the streets of Barcelona.
- **Hierarchy of Identity:** Typography should never be center-aligned by default. Use "flush left, ragged right" to maintain the feel of a modern manuscript.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen. We move away from the "shadow-heavy" look of early 2010s design.

- **The Layering Principle:** Stacking `surface_container` tiers creates a sophisticated, architectural depth. An inner module using `surface_container_high` nested within a `surface_container` creates focus through tonal contrast alone.
- **Ambient Shadows:** If a floating element (like a Rose-Selection FAB) requires a shadow, it must be `on_surface` at 5% opacity with a `32px` blur and an `8px` Y-offset. This mimics natural, ambient light in an open-air book market.
- **The "Ghost Border" Fallback:** Where accessibility demands a container edge, use `outline_variant` at 15% opacity. Never use 100% opaque lines; the goal is an "etched" look, not a "drawn" one.

---

## 5. Components

### Buttons
- **Primary:** `primary_container` background with `on_primary` text. Use `sm` (0.25rem) or `DEFAULT` (0.5rem) roundedness. 
- **Secondary:** `surface_container_highest` background. No border. The button is defined by its subtle tonal shift.
- **Tertiary:** Purely typographic. Use `title-sm` (Manrope) in `primary` color with a subtle under-dash (2px height) for a "literary annotation" look.

### Cards & Lists
- **The No-Divider Rule:** Forbid the use of horizontal divider lines. Use `8` (2rem) or `10` (2.5rem) vertical spacing from the scale to separate list items.
- **Card Styling:** Cards should use `surface_container_lowest` to appear "whiter" than the cream background. Apply `DEFAULT` (0.5rem) corner radius.

### Input Fields
- Avoid "box" inputs. Use a "Minimalist Ledger" style: a simple `outline_variant` bottom-border (20% opacity) that highlights to `primary` (#86001b) upon focus. Labels should use `label-md` (Manrope) in `on_secondary_container`.

### Signature Component: "The Bookmark" (Progress Indicator)
- Instead of a generic loading spinner, use a vertical "ribbon" (using `primary`) that subtly grows from the top of the screen or card, mimicking a silk bookmark.

---

## 6. Do's and Don'ts

- **DO** use generous whitespace. If in doubt, increase spacing from `6` (1.5rem) to `8` (2rem).
- **DO** overlap elements. Let a book cover (image) slightly hang over the edge of a card to create a 3D "layered paper" effect.
- **DON'T** use pure black (#000000). Always use `on_background` (#1c1c18) or `tertiary` (#404040) for a softer, "ink on paper" feel.
- **DON'T** use standard Material icons. Use "Thin" or "Light" stroke weight icons (1px) to match the elegance of Newsreader.
- **DO** use `secondary_container` (#fed488) for "Gold" accents—specifically for highlighting awards, "Best Seller" tags, or featured authors. Use it sparingly to maintain its value.