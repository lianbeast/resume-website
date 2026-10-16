# Career Site — Color Direction Palettes

Four complete systems. Each: anchor hue, strategy, full 10-role palette (OKLCH + hex), light/dark themes, rationale for *Syed Rahid Ahmed — Senior Network & Telecom Consultant*.

---

## Direction 1 — Solar Graphite Evolution (Committed)

**Strategy:** Committed — one saturated color carries 30–60% of surface. Migrate live brass → terracotta, add teal as secondary signal.

**Anchor:** Burnt Terracotta `#c2410c` (OKLCH 0.58 0.18 30)

### Palette (10 roles)

| Role | OKLCH | Hex | Usage |
|------|-------|-----|-------|
| Primary | `0.58 0.18 30` | `#c2410c` | CTAs, hub nodes, timeline dots, focus rings |
| Primary-hover | `0.52 0.16 30` | `#a5380a` | Hover/active state |
| Primary-light | `0.68 0.12 32` | `#e07a4d` | Gradients, decorative orbs |
| Secondary | `0.48 0.14 200` | `#0e7490` | OSS tags, packet trails, secondary emphasis |
| Secondary-hover | `0.42 0.12 200` | `#0b5d73` | Hover |
| Tertiary | `0.52 0.12 115` | `#4d7c0f` | RAN/Cellular category, success |
| Neutral-900 | `0.21 0.01 60` | `#1c1917` | Ink — headings, body |
| Neutral-500 | `0.58 0.02 60` | `#8c8985` | Stone — labels, captions only |
| Neutral-100 | `0.96 0.008 80` | `#f7f5f0` | Carbon Ivory — page bg (light) |
| Neutral-0 | `1 0 0` | `#ffffff` | Warm White — card surface |
| Dark-bg | `0.16 0.008 60` | `#161412` | Graphite — page bg (dark) |
| Dark-surface | `0.20 0.01 60` | `#1e1c1a` | Dark card |
| Dark-text | `0.94 0.005 60` | `#f0ede8` | Dark ink |

### Light Theme
```css
:root {
  --bg: #f7f5f0;
  --surface: #ffffff;
  --ink: #1c1917;
  --stone: #8c8985;
  --accent: #c2410c;
  --accent-hover: #a5380a;
  --accent-light: #e07a4d;
  --signal: #0e7490;
  --ran: #4d7c0f;
  --glass: rgba(255,255,255,0.55);
  --glass-border: rgba(28,25,23,0.08);
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg: #161412;
  --surface: #1e1c1a;
  --ink: #f0ede8;
  --stone: #9a938d;
  --accent: #d97706;
  --accent-hover: #f08c1e;
  --accent-light: #e8a84d;
  --signal: #22d3ee;
  --ran: #84cc16;
  --glass: rgba(22,20,18,0.75);
  --glass-border: rgba(240,237,232,0.08);
}
```

**Rationale:** Direct evolution of brand-guidelines v2.0. Terracotta = carrier hardware warmth; Teal = optical fiber / signal clarity. Migration path from live brass is one coordinated pass. North Star "Solar Graphite (topology)" realized.

---

## Direction 2 — Deep Teal Signal (Committed)

**Strategy:** Committed — teal carries 40% of surface. Brass becomes subordinate accent.

**Anchor:** Deep Teal `#0e7490` (OKLCH 0.48 0.14 200)

### Palette

| Role | OKLCH | Hex | Usage |
|------|-------|-----|-------|
| Primary | `0.48 0.14 200` | `#0e7490` | CTAs, hub nodes, focus, hero gradient |
| Primary-hover | `0.42 0.12 200` | `#0b5d73` | Hover |
| Primary-light | `0.62 0.10 202` | `#4ecdc4` | Glows, packet trails |
| Secondary | `0.58 0.16 30` | `#c2410c` | Terracotta — timeline dots, alerts, warmth |
| Tertiary | `0.52 0.12 115` | `#4d7c0f` | RAN/Cellular, success |
| Neutral-900 | `0.21 0.01 60` | `#1c1917` | Ink |
| Neutral-500 | `0.58 0.02 60` | `#8c8985` | Stone |
| Neutral-100 | `0.96 0.005 230` | `#f5f5f4` | Alloy — cooler paper |
| Neutral-0 | `1 0 0` | `#ffffff` | Surface |
| Dark-bg | `0.14 0.01 220` | `#0d1b2a` | Abyssal graphite |
| Dark-surface | `0.18 0.01 220` | `#14233d` | Dark card |
| Dark-text | `0.94 0.005 230` | `#f5f5f4` | Dark ink |

### Light Theme
```css
:root {
  --bg: #f5f5f4;
  --surface: #ffffff;
  --ink: #1c1917;
  --stone: #8c8985;
  --accent: #0e7490;
  --accent-hover: #0b5d73;
  --accent-light: #4ecdc4;
  --warmth: #c2410c;
  --ran: #4d7c0f;
  --glass: rgba(255,255,255,0.6);
  --glass-border: rgba(14,116,144,0.08);
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg: #0d1b2a;
  --surface: #14233d;
  --ink: #f5f5f4;
  --stone: #9aa3a8;
  --accent: #22d3ee;
  --accent-hover: #67e8f9;
  --accent-light: #a5f3fc;
  --warmth: #f97316;
  --ran: #84cc16;
  --glass: rgba(13,27,42,0.8);
  --glass-border: rgba(34,211,238,0.1);
}
```

**Rationale:** Teal = carrier wave, optical spectrum, SIGTRAN clarity. Reads as precision engineering, not marketing. Differentiates from every terracotta/gold consultant site. Cool substrate (alloy/abyssal) reinforces "signal in noise" metaphor.

---

## Direction 3 — Industrial Ochre/Olive (Restrained)

**Strategy:** Restrained — tinted neutrals + one accent ≤10%. Earth tones from hardware: oxidized copper, olive drab, graphite.

**Anchor:** Oxidized Copper `#b87333` (OKLCH 0.58 0.10 45)

### Palette

| Role | OKLCH | Hex | Usage |
|------|-------|-----|-------|
| Primary | `0.58 0.10 45` | `#b87333` | CTAs, hub nodes, single accent line |
| Primary-hover | `0.52 0.09 45` | `#9d5f2a` | Hover |
| Primary-light | `0.70 0.06 48` | `#d4a574` | Subtle gradient only |
| Secondary | `0.52 0.08 110` | `#6b8e23` | Olive — RAN category, success |
| Tertiary | `0.40 0.02 60` | `#5c5a56` | Warm charcoal — enterprise tags |
| Neutral-900 | `0.22 0.01 60` | `#1e1c1a` | Ink (warmer) |
| Neutral-600 | `0.50 0.015 60` | `#78716c` | Stone |
| Neutral-100 | `0.94 0.008 80` | `#ebe7e0` | Parchment — warm paper |
| Neutral-0 | `0.99 0.003 85` | `#fafaf6` | Surface |
| Dark-bg | `0.15 0.008 60` | `#1a1816` | Dark parchment |
| Dark-surface | `0.19 0.01 60` | `#23201d` | Dark card |
| Dark-text | `0.92 0.005 80` | `#ebe7e0` | Dark ink |

### Light Theme
```css
:root {
  --bg: #ebe7e0;
  --surface: #fafaf6;
  --ink: #1e1c1a;
  --stone: #78716c;
  --accent: #b87333;
  --accent-hover: #9d5f2a;
  --accent-light: #d4a574;
  --olive: #6b8e23;
  --charcoal: #5c5a56;
  --glass: rgba(250,250,246,0.6);
  --glass-border: rgba(30,28,26,0.06);
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg: #1a1816;
  --surface: #23201d;
  --ink: #ebe7e0;
  --stone: #a8a39d;
  --accent: #d4a574;
  --accent-hover: #e8c49a;
  --accent-light: #e8c49a;
  --olive: #a3d977;
  --charcoal: #8a8680;
  --glass: rgba(26,24,22,0.75);
  --glass-border: rgba(212,165,116,0.08);
}
```

**Rationale:** Hardware materiality — oxidized copper busbars, olive drab rack ears, graphite chassis. Warm parchment substrate reads as field manual, not web page. Brass eliminated entirely; copper is the honest metal. Zero risk of "AI cream default" — chroma sits at 0.008, hue locked to 80° (copper's own hue).

---

## Direction 4 — Graphite Drenched (Drenched)

**Strategy:** Drenched — the surface IS the color. Dark-first. Light mode is the variant.

**Anchor:** Graphite `#1e1c1a` (OKLCH 0.20 0.01 60) + Signal Amber `#f59e0b` (OKLCH 0.74 0.15 85)

### Palette

| Role | OKLCH | Hex | Usage |
|------|-------|-----|-------|
| Primary (dark) | `0.74 0.15 85` | `#f59e0b` | Signal amber — CTAs, hubs, packets, focus |
| Primary-hover | `0.68 0.14 85` | `#d97706` | Hover |
| Primary-light | `0.82 0.10 88` | `#fcd34d` | Glows, specular |
| Secondary | `0.55 0.12 200` | `#0ea5e9` | Sky — OSS, secondary signal |
| Tertiary | `0.58 0.13 120` | `#65a30d` | Lime — RAN, success |
| Surface-900 | `0.08 0.005 60` | `#0a0908` | Near-black base |
| Surface-800 | `0.14 0.008 60` | `#161412` | Graphite — primary bg |
| Surface-700 | `0.20 0.01 60` | `#1e1c1a` | Card surface |
| Surface-600 | `0.30 0.015 60` | `#3a3633` | Elevated card |
| Surface-200 | `0.58 0.02 60` | `#78716c` | Stone — labels |
| Surface-100 | `0.90 0.005 60` | `#e5e3df` | Text on dark |
| Surface-0 | `0.98 0.002 60` | `#fafaf8` | Light-mode bg (variant) |

### Dark Theme (DEFAULT)
```css
:root {
  --bg: #161412;
  --surface: #1e1c1a;
  --surface-elevated: #3a3633;
  --ink: #e5e3df;
  --stone: #78716c;
  --accent: #f59e0b;
  --accent-hover: #d97706;
  --accent-light: #fcd34d;
  --sky: #0ea5e9;
  --lime: #65a30d;
  --glass: rgba(22,20,18,0.85);
  --glass-border: rgba(245,158,11,0.12);
}
```

### Light Theme (VARIANT)
```css
[data-theme="light"] {
  --bg: #fafaf8;
  --surface: #ffffff;
  --surface-elevated: #f5f3f0;
  --ink: #1e1c1a;
  --stone: #78716c;
  --accent: #b87333;
  --accent-hover: #9d5f2a;
  --accent-light: #d4a574;
  --sky: #0284c7;
  --lime: #4d7c0f;
  --glass: rgba(255,255,255,0.6);
  --glass-border: rgba(30,28,26,0.06);
}
```

**Rationale:** Network operations centers run dark. The recruiter who opens this at 11pm in a dim room sees a terminal that belongs there. Signal amber on graphite = NOC dashboard heritage. Light mode exists but is explicitly the variant. Three.js topology reads natively (nodes emit light). Highest differentiation — no one ships a dark-first portfolio.

---

## Direction 5 — Oxblood Editorial (Full Palette)

**Strategy:** Full palette — 4 named roles, each deliberate. Editorial oxblood + slate teal + warm sand + graphite.

**Anchor:** Oxblood `#8b1a2e` (OKLCH 0.38 0.18 15)

### Palette

| Role | OKLCH | Hex | Usage |
|------|-------|-----|-------|
| Oxblood (Primary) | `0.38 0.18 15` | `#8b1a2e` | Hero CTAs, name accent, critical alerts |
| Oxblood-hover | `0.32 0.16 15` | `#6d1423` | Hover |
| Oxblood-light | `0.55 0.12 18` | `#c94a5e` | Gradients only |
| Slate Teal (Secondary) | `0.42 0.08 210` | `#3a6b8c` | OSS, secondary nav, code blocks |
| Slate-hover | `0.36 0.07 210` | `#2d556e` | Hover |
| Warm Sand (Tertiary) | `0.80 0.04 70` | `#e8dcc8` | Card bg variant, section bands |
| Graphite (Neutral) | `0.20 0.01 60` | `#1e1c1a` | Ink, dark bg |
| Stone | `0.58 0.02 60` | `#78716c` | Labels |
| Paper | `0.96 0.008 80` | `#f7f5f0` | Light bg |
| White | `1 0 0` | `#ffffff` | Surface |
| Dark-bg | `0.14 0.008 60` | `#161412` | Dark bg |
| Dark-text | `0.94 0.005 60` | `#f0ede8` | Dark ink |

### Light Theme
```css
:root {
  --bg: #f7f5f0;
  --surface: #ffffff;
  --sand: #e8dcc8;
  --ink: #1e1c1a;
  --stone: #78716c;
  --oxblood: #8b1a2e;
  --oxblood-hover: #6d1423;
  --oxblood-light: #c94a5e;
  --slate: #3a6b8c;
  --slate-hover: #2d556e;
  --glass: rgba(255,255,255,0.55);
  --glass-border: rgba(30,28,26,0.08);
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg: #161412;
  --surface: #1e1c1a;
  --sand: #2d2a26;
  --ink: #f0ede8;
  --stone: #9a938d;
  --oxblood: #c94a5e;
  --oxblood-hover: #e06b7e;
  --oxblood-light: #e88a96;
  --slate: #64b5f6;
  --slate-hover: #90caf9;
  --glass: rgba(22,20,18,0.75);
  --glass-border: rgba(201,74,94,0.1);
}
```

**Rationale:** Editorial authority — oxblood reads as serious publication (Financial Times, Leica, high-end spec sheets). Slate teal is the technical counterpoint (slate = telecom infrastructure). Warm sand cards break the binary. Four colors, each named, each with a job. No "accent" ambiguity.

---

## Quick Decision Matrix

| If you want... | Pick |
|----------------|------|
| Brand guide v2.0 realized, migration from live brass | **1. Solar Graphite Evolution** |
| Maximum differentiation, "signal clarity" metaphor | **2. Deep Teal Signal** |
| Honest hardware materiality, zero AI-cream risk | **3. Industrial Ochre/Olive** |
| Dark-native, NOC-dashboard heritage | **4. Graphite Drenched** |
| Editorial gravitas, 4-color system with names | **5. Oxblood Editorial** |

---

## Next Steps

1. **Pick one direction** → I'll generate the complete CSS token file (`assets/design-tokens.css` replacement) + updated inline `:root` for `index.html` + `theme-color` meta tags.
2. **Want to see them live?** Run `/impeccable live` (already configured) and I can inject each palette as a variant in the browser.
3. **Need a hybrid?** Say which roles from which direction (e.g. "Direction 2 primary + Direction 3 substrate + Direction 1 dark theme").