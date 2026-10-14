#!/usr/bin/env python3
"""Migrate the hero decoration inline styles into assets/shared.css.

These attributes violated the repo's documented "Zero Inline Styles" rule
(AGENTS.md) and forced style-src 'unsafe-inline' into the CSP. Geometry now
lives in shared.css, scoped to `#hero` so it covers index.html (which wraps
the decoration in .hero-decor) and the immersive/bold pages (which do not).

Idempotent: lines already migrated are skipped, and the run fails loudly if a
line is neither migrated nor matched, so a partial rewrite cannot slip past.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SHAPES = [
    ("f1", "circle", 'style="width:18px;height:18px;top:15%;left:8%;border-color:var(--gold);"'),
    ("f2", "diamond", 'style="width:14px;height:14px;top:22%;right:12%;border-color:var(--gold-dark);"'),
    ("f3", "circle", 'style="width:10px;height:10px;top:70%;left:18%;border-color:var(--gold-dark);"'),
    ("f4", "line", 'style="width:40px;top:35%;right:20%;background:var(--gold-dark);"'),
    ("f5", "triangle", 'style="top:60%;right:25%;border-bottom-color:var(--gold);"'),
    ("f6", "diamond", 'style="width:10px;height:10px;top:82%;left:30%;border-color:var(--gold-dark);"'),
]
ORBS = [
    ("orb-gold", 'style="width:320px;height:320px;top:-5%;right:-8%;"'),
    ("orb-gold-light", 'style="width:260px;height:260px;bottom:10%;left:-6%;"'),
    ("orb-gold-dark", 'style="width:200px;height:200px;top:40%;right:20%;"'),
]

FILES = ["immersive-preview.html", "bold-resume-preview.html"]
problems = []

for name in FILES:
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    before = text
    changed = 0

    for tag, shape, style in SHAPES:
        old = f'class="float-shape {shape} {tag}" aria-hidden="true" {style}'
        new = f'class="float-shape {shape} {tag}" aria-hidden="true"'
        clean = f'class="float-shape {shape} {tag}" aria-hidden="true">'
        if clean in text:
            continue  # already migrated
        if text.count(old) != 1:
            problems.append(f"{name}: {tag} matched {text.count(old)}x")
            continue
        text = text.replace(old, new)
        changed += 1

    for tag, style in ORBS:
        old = f'class="orb {tag}" aria-hidden="true" {style}'
        new = f'class="orb {tag}" aria-hidden="true"'
        clean = f'class="orb {tag}" aria-hidden="true">'
        if clean in text:
            continue  # already migrated
        if text.count(old) != 1:
            problems.append(f"{name}: {tag} matched {text.count(old)}x")
            continue
        text = text.replace(old, new)
        changed += 1

    if text != before:
        path.write_text(text, encoding="utf-8")
    print(f"{name}: {changed} attribute(s) migrated")

if problems:
    print("\nPROBLEMS:", file=sys.stderr)
    for p in problems:
        print("  " + p, file=sys.stderr)
    sys.exit(1)

print("Decor migration complete.")
