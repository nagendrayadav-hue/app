# BioDash — Product Requirements Document

## Original Problem Statement
Build BioDash, a dark-theme web app (emerald + beige, sleek/earthy). Three tabs:
1. Upload — user uploads a habitat photo, AI suggests a habitat health score + brief summary, user can save it.
2. Map — 2D map with color-coded pins for each saved post, colored by score.
3. Animal — user uploads a photo, AI identifies the animal + short habitat loss summary.
No login. Single user. Minimal and clean. Fonts: Nikolas + LemonMilk.

## User Choices
- AI model: Gemini 3.1 Pro (gemini-3.1-pro-preview) via Emergent Universal Key
- Map pins: auto from photo EXIF GPS, fallback = click map to place
- Score scale: 0–100 (higher = healthier)
- Photo storage: base64 in MongoDB

## Architecture
- Backend: FastAPI (/api prefix), MongoDB (habitat_posts collection), emergentintegrations LlmChat (Gemini vision), Pillow for EXIF GPS extraction.
- Frontend: React + Tailwind + framer-motion + sonner. Custom equirectangular SVG/image MapView (no leaflet dep).
- Endpoints: POST /api/habitat/analyze, POST /api/animal/analyze, GET/POST/DELETE /api/habitat/posts.

## User Persona
Single conservation-minded user logging habitat photos and identifying wildlife.

## Core Requirements (static)
- Three-tab dashboard, dark emerald/beige theme, Nikolas/LemonMilk fonts (fallbacks Cormorant Garamond / Outfit).
- AI habitat scoring 0-100 + summary; AI animal ID + habitat loss summary.
- Color-coded world map pins by score tier (>=70 green, 40-69 amber, <40 red).

## Implemented (2026-06)
- All three tabs functional end-to-end. Gemini 3.1 Pro vision confirmed working.
- 5 seeded sample posts, save/delete CRUD, filter by health tier, detail modal (Escape/backdrop/X close).
- Animated score gauge, scan-line on analyze, pulsing map pins, glassmorphism header w/ sliding tab pill.
- Tested: backend 8/8, frontend all tabs + CRUD + filters (iteration_1.json, 100%).

## Backlog
- P2: Transcode seed images to true base64 (currently Unsplash URLs in image_base64 field).
- P2: Client-side axios timeout + retry UX for slow AI calls.
- P2: Aria dialog attributes on modal.

## Next Tasks
See finish summary action items.
