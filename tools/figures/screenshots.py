"""Stack screenshots into one numbered figure, the way Figure 17.3 marks SimGUI: a heading over each
panel on a dark background, Okabe-Ito orange outlines and numbered circles with a black outline
and digit. Used by the generators of the figures made from the user's screenshots (3.1, 7.2, 8.2, 11.1, 11.2, 13.3, 13.5, 16.2, 18.3, D.1, R.1).

A panel is a dict:
    shot     the screenshot's path
    crop     (x0, y0, x1, y1) in the screenshot's pixels
    scale    how much to scale the crop (the figure is WIDTH px wide; a panel can be narrower)
    boxes    [(x0, y0, x1, y1), ...] orange outlines, in the screenshot's pixels
    circles  [(number, x, y), ...] numbered circles, centred there, in the screenshot's pixels
    heading  the text over the panel (optional; a one-panel figure needs none)
"""

import os

from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BACKGROUND = (20, 23, 28)  # Figure 17.3's
HEADING = (204, 204, 204)  # Figure 17.3's
ORANGE = (230, 159, 0)  # Okabe-Ito orange, as in Figure 17.3
BLACK = (0, 0, 0)

WIDTH = 1600
MARGIN = 20
GAP = 26  # between one panel and the next heading
HEADING_SIZE = 26
RADIUS = 16  # callout circles, in the final image's pixels
SS = 2  # build at twice the size, then scale down, so circles and text come out smooth


def full_width_scale(crop):
    """The scale that makes a crop fill the figure between its margins."""
    return (WIDTH - 2 * MARGIN) / (crop[2] - crop[0])


def _panel_image(p):
    shot = Image.open(p["shot"]).convert("RGB")
    x0, y0 = p["crop"][:2]
    crop = shot.crop(p["crop"])
    draw = ImageDraw.Draw(crop)
    for bx0, by0, bx1, by1 in p.get("boxes", []):
        draw.rounded_rectangle([bx0 - x0, by0 - y0, bx1 - x0, by1 - y0], radius=5, outline=ORANGE, width=3)
    k = p["scale"] * SS
    return crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)


def compose(panels, out_path, repo, method=None):
    """method: Pillow's quantize method; the default median cut can merge small colour swatches."""
    heading_font = ImageFont.truetype(FONT, HEADING_SIZE * SS)
    digit_font = ImageFont.truetype(FONT, round(RADIUS * 1.35 * SS))

    placed, y = [], (MARGIN * SS // 2) if panels[0].get("heading") else MARGIN * SS
    for p in panels:
        im = _panel_image(p)
        heading_y = y
        if p.get("heading"):
            y += round(HEADING_SIZE * 1.6) * SS
        placed.append((p, im, MARGIN * SS, y, heading_y))
        y += im.height + GAP * SS
    height = y - GAP * SS + MARGIN * SS

    canvas = Image.new("RGB", (WIDTH * SS, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    for p, im, x, y, heading_y in placed:
        if p.get("heading"):
            draw.text((x, heading_y), p["heading"], fill=HEADING, font=heading_font)
        canvas.paste(im, (x, y))
        k = p["scale"] * SS
        for number, sx, sy in p.get("circles", []):
            cx, cy = x + (sx - p["crop"][0]) * k, y + (sy - p["crop"][1]) * k
            r = RADIUS * SS
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ORANGE, outline=BLACK, width=2 * SS)
            draw.text((cx, cy), str(number), fill=BLACK, font=digit_font, anchor="mm")

    out = canvas.resize((WIDTH, round(height / SS)), Image.Resampling.LANCZOS)
    # Screenshots have few colours, so a 256-colour palette keeps them sharp and small.
    out = out.quantize(colors=256, method=method if method is not None else Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out.save(out_path, optimize=True)
    print(f"wrote {os.path.relpath(out_path, repo)}: {out.width} x {out.height}, {os.path.getsize(out_path) // 1024} KB")
