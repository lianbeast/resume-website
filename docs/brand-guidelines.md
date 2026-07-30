# Brand Guidelines v3.0 — Solar Graphite Evolution

> Last updated: 2026-07-10
> Status: Active — **Direction 1 from COLOR_DIRECTIONS.md adopted**
> Owner: Syed Rahid Ahmed

> **v3.0 adoption:** Palette migrated from Ivory & Ink (gold #c9950c / ivory #f7f5f0) to **Solar Graphite Evolution** — Burnt Terracotta #c2410c primary, Deep Teal #0e7490 secondary, Carbon Ivory #f7f5f0 background. The `:root` inline and `assets/design-tokens.css` have been resynced.

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #8b1a2e (Oxblood) |
| Secondary Color | #3a6b8c (Slate Teal) |
| Tertiary Color | #e8dcc8 (Warm Sand) |
| Background | #f7f5f0 (Carbon Ivory) |
| Primary Font | Outfit |
| Mono Font | JetBrains Mono |
| Voice | Authoritative, Grounded, Precise |

---

## 1. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Oxblood | #8b1a2e | rgb(139,26,46) | CTAs, accent borders, timeline dots, hub nodes |
| Oxblood Light | #c94a5e | rgb(201,74,94) | Gradient fills, dark-mode accent |
| Oxblood Dark | #6d1423 | rgb(109,20,35) | Hover/active states |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Slate Teal | #3a6b8c | rgb(58,107,140) | OSS platform tags, packet trails, code blocks |
| Slate Light | #64b5f6 | rgb(100,181,246) | Dark-mode secondary contrast |

### Tertiary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Warm Sand | #e8dcc8 | rgb(232,220,200) | Section band backgrounds, warm cards |
| Warm Charcoal | #44403c | rgb(68,64,60) | Enterprise IT category, carbon elements |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Carbon Ivory | #f7f5f0 | rgb(247,245,240) | Page background |
| Warm White | #ffffff | rgb(255,255,255) | Card surfaces, glass backgrounds |
| Ink | #1e1c1a | rgb(30,28,26) | Headings, primary text |
| Stone | #78716c | rgb(120,113,108) | Muted text, captions, labels |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | #4d7c0f | Confirmations, positive states |
| Warning | #8b1a2e | Cautions (doubles as primary accent) |
| Error | #be123c | Validation errors, destructive actions |
| Info | #3a6b8c | Informational messages (doubles as secondary) |

### Accessibility

- Ink (#1e1c1a) on Warm White (#ffffff): **15.3:1** ✅ AAA
- Oxblood (#8b1a2e) on Warm White (#ffffff): **8.2:1** ✅ AAA
- Slate Teal (#3a6b8c) on Warm White (#ffffff): **5.1:1** ✅ AA
- Stone (#78716c) on Warm White (#ffffff): **3.4:1** — AA for large text, UI components only
- All CTA buttons: min 4.5:1 contrast verified (oxblood on white = AAA)

---

## 2. Typography

### Font Stack

```css
--font-body: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Type Scale

| Element | Size (Desktop) | Size (Mobile) | Weight | Line Height |
| --- | --- | --- | --- | --- |
| H1 (Hero Name) | clamp(36px, 7vw, 72px) | 36px+ | 700 | 1.05 |
| H2 (Section Title) | clamp(28px, 4vw, 40px) | 28px+ | 700 | 1.15 |
| H3 (Card Title) | 18px | 18px | 600 | 1.3 |
| Body | 15px | 15px | 400 | 1.6–1.8 |
| Label/Tag | 12px | 12px | 400–600 | 1.4 |
| Mono Label | 11–12px | 11–12px | 400 | 1.4 |

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 3. Logo Usage

### Variants

| Variant | Description | Use Case |
| --- | --- | --- |
| Inline SVG Favicon | "SR" monogram, alloy bg, amber text | Browser tab, bookmarks |
| Hero Name | "Syed Rahid Ahmed" in Outfit 700 | Page hero only |

### Logo Rules

- Monogram background: Soft Alloy (#f5f5f4)
- Monogram text: Solar Amber (#d97706)
- Rounded rectangle, 20px radius
- Minimum size: 16×16px (favicon)

### Don'ts

- Don't change monogram colors outside the palette
- Don't add drop shadows or 3D effects
- Don't stretch or skew the text

---

## 4. Voice & Tone

### Brand Personality

For a Senior Network & Telecom Consultant — the voice mirrors the work: methodical, precise, reliable.

| Trait | Description |
| --- | --- |
| **Authoritative** | Expert knowledge, earned through 15+ years in the field |
| **Industrial** | Hardware‑centric, engineered, grounded |
| **Precise** | Every word serves a purpose, like every config line |
| **Approachable** | Clear, professional, human |

### Voice Chart

| Trait | We Are | We Are Not |
| --- | --- | --- |
| Authoritative | Confident, experienced | Arrogant, dismissive |
| Industrial | Hardware‑centric, grounded | Flashy, vague |
| Precise | Exact, measured | Hand‑wavy |
| Approachable | Clear, professional | Corporate‑speak |

### Tone by Context

| Context | Tone | Example |
| --- | --- | --- |
| Hero/Intro | Confident, engineered | "Carrier‑grade reliability, delivered with precision." |
| Skills | Technical, specific | "SS7/SIGTRAN", "Nokia NetAct" |
| Experience | Matter-of-fact | "15+ years in telecom network engineering" |
| Contact | Warm, professional | "Get in Touch" |

### Prohibited Terms

| Avoid | Reason |
| --- | --- |
| Synergy | Corporate jargon |
| Seamless | Overused |
| Leverage (as verb) | Use "use" |
| Revolutionary | Overpromised |
| Rockstar/Ninja | Unprofessional |
| Passionate | Show it, don't claim it |

---

## 5. Visual Style

### Glassmorphism

- Background: Warm White (#ffffff) at 72% opacity
- Backdrop blur: 16–24px
- Border: rgba(30,28,26, 0.06)
- Box shadow: inset top highlight + ambient depth
- Hover: oxblood border glow (rgba(139,26,46, 0.25))

### Decorative Elements

| Element | Style | Color Source |
| --- | --- | --- |
| Orbs | Radial gradient, blur(80px) | Oxblood, slate teal, sand |
| Float shapes | 1.5px stroke, circle/diamond/triangle/line | Palette colors at 7–12% opacity |
| Dividers | Gradient fade: oxblood → slate → transparent | Primary → secondary → zero |
| Timeline dots | Pulsing glow, oxblood | Primary accent |
| Shimmer | Slide-in highlight on hover | rgba(139,26,46, 0.12) |

### Three.js Background

- Hub nodes: 0x8b1a2e (oxblood), size 3.5–5
- Secondary nodes: 0x3a6b8c (slate teal), size 1.5–2.5
- Connection lines: averaged node color, 15% opacity, additive blending
- Data packets: oxblood trail (vec4(0.545, 0.102, 0.180, 0.9))
- Glow textures: radial gradient from color to transparent
- Skill Ring: 2D canvas with category arcs, cross-category links, ambient rotation

### Skill Ring

- 2D canvas with skills arranged in concentric category arcs
- Cross-category connection lines for shared keywords (Nokia, Cisco, Microsoft)
- Hover: enlarged node + tooltip with name + description
- Slow ambient rotation
- Categories: oxblood (routing), slate teal (OSS), oxide green (RAN), graphite (enterprise), rose (scripting), titanium (tools)

---

## 6. Design Components

### Buttons

| Type | Background | Text | Radius |
| --- | --- | --- | --- |
| Primary | gradient(#8b1a2e → #6d1423) | #ffffff | 10px |
| Secondary | transparent | #1e1c1a | 10px |

### Spacing

- Section padding: 100px 5%
- Card padding: 20–32px
- Grid gap: 16–24px
- Max content width: 1100px

### Border Radius

| Element | Radius |
| --- | --- |
| Buttons | 10px |
| Cards (glass) | 16px |
| Input fields | 10px |
| Skill tags | 6px |
| Skill canvas | 16px |

---

## 7. AI Image Generation

### Base Prompt Template

```
Editorial industrial aesthetic, carbon ivory (#f7f5f0) base, oxblood (#8b1a2e) and slate teal (#3a6b8c) accents, diffused warm lighting, clean composition, premium telecom consulting atmosphere, warm charcoal neutrals (#44403c), Outfit font family

```

### Style Keywords

| Category | Keywords |
| --- | --- |
| Lighting | Warm, diffused, metallic |
| Mood | Engineered, precise, premium |
| Composition | Clean, centered, structured |
| Treatment | Industrial, alloy, graphite |
| Aesthetic | Hardware-centric, editorial |

---

## Changelog

| Version | Date | Changes |
| --- | --- | --- |
| 3.0 | 2026-07-10 | Migrated to Oxblood Editorial palette; secondary Slate Teal; tertiary Warm Sand |
| 2.0 | 2026-07-01 | Solar Graphite palette established |
