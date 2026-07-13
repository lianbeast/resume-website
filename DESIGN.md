---
name: Syed Rahid Ahmed — Career Site
description: Single-page senior-network/telecom consultant portfolio; terracotta primary, deep teal secondary, olive tertiary.
colors:
  ink: "#1c1917"
  text-dim: "#78716c"
  bg-ivory: "#f7f5f0"
  bg-surface: "#ffffff"
  bg-glass: "rgba(255,255,255,0.55)"
  border-glass: "rgba(28,25,23,0.08)"
  primary: "#c2410c"
  primary-light: "#e06a3a"
  primary-dark: "#a4380a"
  secondary: "#0e7490"
  secondary-dark: "#0b5a7c"
  tertiary: "#4d7c0f"
  dark-bg: "#161412"
  dark-surface: "#1e1c1a"
  dark-text: "#f0ede8"
  dark-glass: "rgba(22,20,18,0.75)"
typography:
  display:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(2.25rem, 7vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "normal"
  headline:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  pill: "50%"
  card: "16px"
  card-large: "12px"
  button: "10px"
  field: "8px"
  tag: "6px"
  hairline: "2px"
  hairline-fine: "1px"
spacing:
  section-pad: "100px 5%"
  card-pad: "20–32px"
  grid-gap: "16–24px"
  max-content: "1100px"
  label-gap: "4px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-surface}"
    rounded: "{rounded.button}"
    padding: "16px 48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  button-primary-active:
    backgroundColor: "{colors.primary-dark}"
  skill-tag:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.tag}"
    padding: "6px 14px"
  glass-card:
    backgroundColor: "{colors.bg-glass}"
    rounded: "{rounded.card}"
    padding: "20–32px"
---

# Design System: Syed Rahid Ahmed — Career Site

## 1. Overview

**Creative North Star: "Solar Graphite (topology)"**

This is a single-page personal career site for a Senior Network & Telecom Consultant, and the design is meant to read like the work: a carrier network marked onto the page — hub nodes, signal trails, cross-connections, ambient rotation. The North Star is **topology as material**: the Three.js background and 2D skill ring are not decoration, they are the argument that this person thinks in networks. Graphite nodes, terracotta signal, ink clarity. The system should feel engineered, grounded, and methodically precise — the composure of carrier-grade uptime, not the flash of a product launch.

Density is medium-restrained: cards exist but are confined to credentials, experience, and skills; the hero and topology run full-bleed. The surface is warm-ivory ink-on-paper in light mode and graphite in dark mode, with a terracotta primary accent doing all the accenting. Glassmorphism is permitted but earned — only on cards that sit over moving topology, never as a default. Typography is a single sans (Outfit) across all voice roles, with JetBrains Mono reserved for the technical vocabulary the consultant actually uses daily: protocol names, section labels, code-flavored tags. Everything composes inside one self-contained HTML file.

**Key Characteristics:**
- **Carrier-grade composure** — restraint over performance; motion enhances, never shouts.
- **Topology is the argument** — Three.js hub-and-packet background + 2D skill ring are domain metaphors, not garnish.
- **Terracotta is the main voice** — a single orange accent (#c2410c) carries every emphasis; rarity is its strength.
- **Ink-on-ivory / graphite-on-graphite** — two true themes, light paper and dark metal, both warm-neutral.
- **One self-contained file** — portable, forwardable, no build step.

## 2. Colors

A single-accent warm-neutral system: ink text on an ivory paper field, with terracotta as the primary accent, deep teal as secondary, and olive as tertiary. Two true themes (light/dark) flip the substrate.

### Primary
- **Burnt Terracotta** (#c2410c): the primary accent. CTAs, timeline dots, hub nodes, focus rings, gradient fills on headings, active borders, shimmer trails. Used sparingly. Hover deepens to —dark (#a4380a).
- **Terracotta Light** (#e06a3a): gradient endpoint and decorative orb fill.
- **Terracotta Dark** (#a4380a): hover/active state of primary; gradient anchor. Pairs with primary in gradients.

### Secondary
- **Deep Teal** (#0e7490): secondary signal — OSS platform tags, packet trails.
- **Deep Teal Dark** (#0b5a7c): hover/active state of secondary.

### Tertiary
- **Olive** (#4d7c0f): tertiary warmth — RAN & Cellular category.

### Neutral
- **Ink** (#1c1917): primary text, headings, the dark-mode substrate origin.
- **Carbon Ivory** (#f7f5f0): page background, light mode.
- **Warm White / Surface** (#ffffff): card backgrounds, glass base.
- **Stone** (#78716c): muted text, captions, mono labels.
- **Glass tint** rgba(255,255,255,0.55): the glassmorphism substrate in light mode.

### Dark theme
- **Graphite Dark** (#161412): dark-mode page background.
- **Dark Surface** (#1e1c1a): dark-mode cards.
- **Dark Ink** (#f0ede8): dark-mode text.
- **Dark Glass** rgba(22,20,18,0.75): dark glass substrate.

### Named Rules
**The One Accent Rule.** Terracotta is the primary saturated color on any light-mode screen. It accents ≲10% of the surface.
**The No-Cream Rule.** The ivory field (#f7f5f0) stays at near-zero chroma toward warm gray, not toward yellow-beige.
**The Stone-Not-Body Rule.** Stone (#78716c) is for labels, captions, and mono metadata only. Body copy is Ink.

## 3. Typography

**Display & Body Font:** Outfit (with `-apple-system, BlinkMacSystemFont, sans-serif`)
**Label/Mono Font:** JetBrains Mono (with `monospace` fallback)

**Character:** A single geometric-grotesque sans carries every voice role — display, headline, title, body. Outfit reads as clean, engineered, and slightly industrial. JetBrains Mono is the only second typeface, and it is reserved strictly for the technical vocabulary: protocol names (SS7/SIGTRAN), section kickers, tag labels, and date stamps.

### Hierarchy
- **Display** (700, clamp(36px,7vw,72px), 1.05): hero name only.
- **Headline** (700, clamp(28px,4vw,40px), 1.15): section titles. `text-wrap: balance`.
- **Title** (600, 18px, 1.3): card titles, role names.
- **Body** (400, 15px, 1.7): running text. Cap line length 65–75ch. `text-wrap: pretty`.
- **Label** (500, 11–12px, 1.4, mono, uppercase, 0.08em tracking): section kickers, skill tags, meta.

### Named Rules
**The One Display Rule.** Display weight appears once per page — the hero name. Section titles drop to the headline scale.
**The Mono Earns Its Place Rule.** JetBrains Mono is for technical tokens and structural labels only. Never set a paragraph or a headline in mono.

## 4. Elevation

The system is **hybrid** — flat by default for content surfaces, with two distinct elevation behaviors: glassmorphism for cards over moving topology, and a terracotta-tinted ambient shadow for interactive state.

### Shadow Vocabulary
- **Glass card rest** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.04)`): the default card. Inset specular top-highlight plus a hair ambient.
- **Terracotta-state ambient** (`box-shadow: 0 2px 8px rgba(194,65,12,0.2)` at rest; `0 4px 16px rgba(194,65,12,0.3)` on hover): interactive cards and hovers. Shadow is **tinted with terracotta**, not neutral black.
- **Input focus glow** (`border-glow` keyframe, 2s ease-in-out infinite): breathing outline glow on focused form fields.

### Named Rules
**The Flat-Content Rule.** Content cards are flat-glass at rest. Ambient shadow appears as a **response to state** (hover, focus, active).
**The Terracotta-Tinted Shadow Rule.** Hover/active shadows are tinted with the terracotta primary (`rgba(194,65,12,a)`), never pure neutral black.

## 5. Components

### Buttons
- **Shape:** 10px radius (button scale).
- **Primary:** terracotta on white text, padding 16px 48px, `linear-gradient(135deg, primary 0%, primary-dark 100%)`. A shimmer (`::before` slide-in highlight, 0.5s) sweeps on hover.
- **Hover / Focus:** deepens toward primary-dark, 2px outline terracotta on focus-visible, terracotta-state ambient shadow.
- **Secondary / Ghost:** transparent background, Ink text, terracotta border on hover.

### Skill Tags
- **Style:** Warm White background, Ink or terracotta text, 6px radius, 6px 14px padding, mono label typography.

### Glass Cards
- **Corner:** 16px (card scale); small cards use 12px, fine borders use 1px or 2px.
- **Background:** glass (`rgba(255,255,255,0.55)`, `backdrop-filter: blur(12px)`) in light; dark glass (rgba(22,20,18,0.75)) in dark.
- **Border:** 1px `--border-glass` (rgba(28,25,23,0.08)).
- **Shadow:** glass-card-rest. Hover lifts to terracotta-state ambient with a terracotta border glow (rgba(194,65,12,0.25)).
- **Padding:** 20–32px. Cards never nest.

### Inputs / Fields
- **Style:** 8px radius, Warm White fill, hairline border.
- **Focus:** terracotta outline (2px `--gold` mapped to #c2410c) + `border-glow` breathing keyframe.

### Navigation
- **Style:** glass bar (top), mono labels, terracotta active indicator. Outfit link text.

### Signature: Three.js Topology + Skill Ring
- **Three.js background** (`#scene-container`): hub nodes (terracotta 0xc2410c, size 3.5–5) + secondary nodes (teal 0x0e7490) + connection lines (averaged, 15% opacity) + data packets (terracotta trail vec4(0.761, 0.255, 0.047, 0.9)). Camera scroll-parallax. Disabled on `prefers-reduced-motion`.
- **Skill Ring** (2D canvas): skills in concentric category arcs, cross-category links, hover tooltips, ambient rotation. Categories colored via `CAT_COLORS`: terracotta (Routing & Switching), deep teal (OSS), olive (RAN), warm charcoal (Enterprise IT), rose (Scripting), lime (Tools).

## 6. Do's and Don'ts

### Do:
- **Do** capture the live terracotta/teal system. The Ivory & Ink gold system has been deprecated; build new screens against the rendering terracotta tokens.
- **Do** keep terracotta as the single primary accent (≲10% surface), on CTAs, focus rings, topology hubs, timeline dots, and gradient fills.
- **Do** dampen motion fully on `prefers-reduced-motion`: kill Three.js (`#scene-container{display:none}`), neutralize reveals (`opacity:1;transform:none`).
- **Do** tint hover shadows with terracotta (`rgba(194,65,12,a)`) so state changes feel like brand.
- **Do** list protocol names and employers with spec-sheet specificity ("SS7/SIGTRAN", "Nokia NetAct") — the evidence a recruiter scans for.

### Don't:
- **Don't** use gold `#c9950c` anymore. The palette has evolved to Burnt Terracotta `#c2410c`.
- **Don't** use Stone (#78716c) for body copy. It is labels/meta only. Body is Ink.
- **Don't** print a hero-metric template (big number, small label, gradient accent, supporting stats).
- **Don't** put a mono uppercase tracked eyebrow above every section.
- **Don't** use `border-left`/`border-right` >1px as a colored side-stripe on cards or list items.
- **Don't** set gradient text (`background-clip:text` + gradient).
- **Don't** apply glassmorphism decoratively.
- **Don't** use the words synergy, seamless, leverage (as verb), revolutionary, rockstar/ninja, or passionate.
