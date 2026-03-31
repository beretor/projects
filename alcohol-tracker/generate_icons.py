#!/usr/bin/env python3
"""
Generate simple PWA icons for Dry Days.
Run: python generate_icons.py
Requires: pip install Pillow
"""
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow requis: pip install Pillow")
    exit(1)

BASE_DIR = Path(__file__).parent

def make_icon(size):
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Background circle — dark
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin],
                 fill=(26, 26, 26, 255))

    # Leaf / droplet shape in green
    cx, cy = size // 2, size // 2
    r = size // 4
    draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                 fill=(220, 252, 231, 255))  # green-100

    # Small text "DD" in dark
    try:
        font_size = size // 5
        font = ImageFont.load_default()
        text = "DD"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((cx - tw // 2, cy - th // 2), text,
                  fill=(26, 26, 26, 255), font=font)
    except Exception:
        pass

    return img

for size, fname in [(192, "icon-192.png"), (512, "icon-512.png")]:
    icon = make_icon(size)
    path = BASE_DIR / fname
    icon.save(path, "PNG")
    print(f"Created {path}")

print("Done.")
