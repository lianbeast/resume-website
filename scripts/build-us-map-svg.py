#!/usr/bin/env python3
"""Build a static SVG outline of the lower-48 US from states.js.

The Three.js tiers project lon/lat at runtime; this does the same projection
ahead of time so the Lite tier can ship a cached SVG instead of a 60 KB
geometry script plus a WebGL renderer.

Usage:  python scripts/build-us-map-svg.py
Writes: assets/us-map.svg
Prints: percentage pin positions for the career cities, ready to paste into HTML.
"""
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAP_CX, MAP_CY, MAP_SCALE = -98.0, 39.5, 1.35

CITIES = {
    "Bethesda, MD": (-77.09, 39.02),
    "Martinsburg, WV": (-77.97, 39.55),
    "Spokane, WA": (-117.43, 47.66),
    "Austin, TX": (-97.74, 30.27),
    "Miami, FL": (-80.19, 25.76),
    "Hammond, LA": (-90.46, 30.50),
    "DC, MD, VA": (-77.04, 38.90),
}


def project(lon, lat):
    """Equirectangular projection, y pointing down (SVG convention)."""
    x = (lon - MAP_CX) * MAP_SCALE * math.cos(math.radians(lat))
    y = (MAP_CY - lat) * MAP_SCALE
    return x, y


def load_states():
    src = (ROOT / "states.js").read_text(encoding="utf-8")
    start = src.index("{")
    end = src.rindex("}")
    return json.loads(src[start:end + 1])


def main():
    states = load_states()

    # Pass 1 — bounds across every ring so the viewBox fits the country.
    xs, ys = [], []
    for rings in states.values():
        for ring in rings:
            for lon, lat in ring:
                x, y = project(lon, lat)
                xs.append(x)
                ys.append(y)
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad = 1.0
    width = (max_x - min_x) + pad * 2
    height = (max_y - min_y) + pad * 2
    ox, oy = min_x - pad, min_y - pad

    def svg_xy(lon, lat):
        x, y = project(lon, lat)
        return x - ox, y - oy

    # Pass 2 — one path per state ring.
    paths = []
    for name in sorted(states):
        for ring in states[name]:
            if len(ring) < 3:
                continue
            pts = [svg_xy(lon, lat) for lon, lat in ring]
            d = "M" + "L".join(f"{px:.2f},{py:.2f}" for px, py in pts) + "Z"
            paths.append(f'    <path d="{d}"/>')

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {width:.2f} {height:.2f}" '
        f'width="{width:.2f}" height="{height:.2f}" '
        'preserveAspectRatio="xMidYMid meet" role="img" '
        'aria-label="Map of the lower-48 United States showing the career path">\n'
        '  <g fill="currentColor" stroke="currentColor" stroke-width="0.06" '
        'stroke-linejoin="round">\n'
        + "\n".join(paths) + "\n"
        "  </g>\n"
        "</svg>\n"
    )

    out = ROOT / "assets" / "us-map.svg"
    out.write_text(svg, encoding="utf-8")
    print(f"wrote {out}  ({len(svg):,} bytes, {len(paths)} state rings, "
          f"viewBox {width:.2f}x{height:.2f})")

    # Percentage positions for HTML pins (origin top-left of the viewBox).
    print("\nCareer pins as % of the map box:")
    for city, (lon, lat) in CITIES.items():
        x, y = svg_xy(lon, lat)
        print(f'  {city:18s} left:{x / width * 100:6.2f}%  top:{y / height * 100:6.2f}%')


if __name__ == "__main__":
    main()
