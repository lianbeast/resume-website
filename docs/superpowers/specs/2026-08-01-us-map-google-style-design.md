# US Map — Google Maps Style (State Outlines + Markers)

**Date:** 2026-08-01
**Files touched:** `index.html` (only) — `initThreeJSMap()` IIFE, CSS for `.map-labels`.

## Goal

Restyle the existing Three.js background US map so it resembles Google Maps' US view: thin state-boundary lines, a light landmass surface, and classic pin markers (no DOM text chips). Cities unchanged. Career-path packet animation and parallax preserved.

**Scope decision:** User asked for option "2 — map + markers, no state labels, just state lines." Rejected full Google-Maps clone (zoom/pan/labels) as over-scope, and rejected "markers only" (option 1) as not enough of the map feel.

## Visual changes

| Element | Current | New |
|---------|---------|-----|
| Country outline (single stroke) | `US_OUTLINE` Line + faint fill | **Removed** — replaced by state outlines + surface |
| State boundaries | None | **Add** — thin lines, terracotta `--gold` @ ~0.22 opacity |
| Land surface | Faint fill @ 0.05 | Single merged fill @ ~0.04 opacity, terracotta |
| City markers | Glow-point shader, pulsing; DOM `.map-label` chips | **Pin shader** (outer disc + inner dot); **DOM labels removed** |
| Pin colors | Hub gold, career primary, decorative secondary | Same mapping, applied to pin outer/inner fills |
| Career path lines | Dashed gradient, opacity 0.45 | Keep; dash 1.5 / gap 1.0 unchanged |
| Data packets | 25 moving dots | Keep |
| Pulse animation | Yes | Keep, applied to pin `size` |

## Data

- **State polygons**: 48 lower-48 states, inline JSON in `index.html`. Coordinates in lon/lat. Each state = array of polygon rings (array of `[lon, lat]`).
- Source: simplified US states GeoJSON (e.g. `us-states-10m.json` / ubilabs `us-states.json`), pruned to lower-48 and simplified with Ramer–Douglas–Peucker (ε ≈ 0.02°) to keep total payload small. Target: < 30KB minified, < 25K triangles combined.
- No Alaska/Hawaii (current camera view is lower-48 only).
- Co-locate near `US_OUTLINE` (currently `index.html:2190`).

## Rendering order (bottom → top), all inside `mapGroup`

1. **State surface** — one `BufferGeometry` triangulated fill (earcut per ring, merged), terracotta @ opacity 0.04, `DoubleSide`.
2. **State outlines** — `LineSegments` per state boundary ring, terracotta @ 0.22 opacity, `LineBasicMaterial`.
3. **Career path** — existing `LineSegments` (dashed gradient), kept.
4. **City pins** — `THREE.Points` with new pin shader (outer disc + inner dot).
5. **Data packets** — existing `Points`, kept.

## Pin shader

Replace the current glow-texture shader (`index.html:2353–2376`) with a shader that draws two concentric discs per point:

- Fragment: `gl_PointCoord` distance → outer disc (color A), inner disc at radius `0.32` (color B), transparent outside outer radius.
- `attribute vec3 color` carries **outer** color (per-node: hub=gold, career=primary, decorative=secondary).
- Inner color via uniform: `uInnerHub` (white), `uInnerCareer` (gold), `uInnerSecondary` (white). Selected per-point by an additional `attribute float isHub/inPath` OR three separate `Points` objects. **Chosen: three separate `Points`** (hub / career / decorative), each its own material — simplest, avoids branching in shader. (`ponytail:` three draw calls, fine at this count.)
- No additive blending — pins are solid like Google markers. `blending: THREE.NormalBlending`, `transparent: true` (for disc edge AA).
- Pulse: existing `animateNodes()` (line 2525) multiplies `citySizes[idx]` by sin — keep; baseline sizes bump (hub 5.2→6.0, career 3.4→4.0, decorative 2.5→3.0) so pins read as markers, not glow specks.

## CSS / DOM removals

- Delete `.map-labels` + `.map-label` + `.map-label.is-hub` + `.map-label.visible` rules (`index.html:344–379`). Keep `#map-labels` host element removal-safe: JS no longer appends children.
- Delete `#map-labels` div in HTML (`index.html:1757`) — orphaned after JS change. Keep `#career-locations` a11y list (unchanged — still the accessible career path).

## JS changes in `initThreeJSMap()` (`index.html:2128–2611`)

1. **Insert state data** after `US_OUTLINE` (~line 2208): `const US_STATES = { … }`.
2. **Replace outline + fill build** (lines 2210–2248) with state surface + state `LineSegments`. Reuse `project(lon, lat)`.
3. **Keep `CITIES`** (2252–2264) and `CAREER_PATH` (2266–2283) and `EXTRA_PINS` (2286–2288) — unchanged.
4. **Split city points into 3 `Points`** (hub / career / decorative), each with pin shader + its own inner-color uniform + `NormalBlending`. Update `cityNodeData` to track per-group idx.
5. **Delete label creation** (lines 2470–2478): remove `labelsHost`, `labelEls`, the `Object.keys(CITIES).forEach(label…)` block.
6. **Remove `positionLabels()`** (lines 2480–2493) and its call in `animate()` (line 2604) + in resize handler (line 2549).
7. **Keep** `animateNodes`, `animatePackets`, parallax, IO gating, `container.classList.add('is-enhanced')`.

## Constraints / non-goals

- **No zoom, no pan** — camera position logic unchanged. State boundaries are visual, not interactive.
- **No state labels** — per user scope.
- **No Alaska/Hawaii**.
- **Reduced-motion** (`prefers-reduced-motion`): `initThreeJSMap()` already bails entirely (line 2137) → user sees the CSS text fallback list. Keep that behavior; state map is a progressive enhancement only.
- Performance: target ≥ 60fps desktop, ≥ 30fps mobile. Parallax + packets remain.
- Dark mode + style toggles: still read brand colors from CSS tokens via `cssVar()` (line 2145), re-resolved on theme change. State outlines use `--gold`; fill uses `--gold` at low opacity. No new tokens.
- Accessibility: removing DOM labels is safe because `.map-labels` was `aria-hidden="true"` and `#career-locations` is the real a11y source. No a11y regression.

## Testing / verification

- Single runnable self-check: open `index.html` in browser, confirm (a) state lines render, (b) pins render without text, (c) hub pin gold/largest, (d) career path dashed lines present, (e) packets still travel, (f) toggling dark mode + style keeps map legible, (g) reduced-motion shows text fallback not a broken canvas.
- No automated test framework in repo — visual check is the contract (matches `ponytail:` self-check convention).

## Out of scope (YAGNI)

- Map zoom/pan controls.
- Interactive state hover/highlight.
- State name labels.
- Real GeoJSON tile server / Mapbox / Leaflet swap — rejected: current single-file Three.js canvas stays; adding a map library violates "no new dependency for what a few lines can do."
