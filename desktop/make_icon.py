from pathlib import Path

from PIL import Image, ImageDraw


SIZE = 256
SCALE = 4
OUT = Path(__file__).resolve().parent
WEB_ICONS = OUT.parent / "public" / "icons"


def box(*coords):
    return tuple(round(value * SCALE) for value in coords)


def points(coords):
    return [box(x, y) for x, y in coords]


image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

draw.rounded_rectangle(box(8, 8, 248, 248), radius=52 * SCALE, fill="#193D3B")
draw.ellipse(box(45, 181, 211, 211), fill="#102E2D")

# Cover edges keep the open-book silhouette readable at small icon sizes.
draw.polygon(points([(35, 74), (86, 74), (128, 91), (170, 74), (221, 74),
                     (221, 190), (172, 190), (128, 206), (84, 190), (35, 190)]),
             fill="#E6AA7C")
draw.polygon(points([(43, 67), (86, 68), (125, 87), (125, 195), (85, 179), (43, 179)]),
             fill="#E8F1EA")
draw.polygon(points([(131, 87), (170, 68), (213, 67), (213, 179), (171, 179), (131, 195)]),
             fill="#FFF9E9")
draw.polygon(points([(173, 68), (189, 67), (189, 124), (181, 115), (173, 124)]),
             fill="#E77C63")

for y, width in [(100, 34), (119, 43), (138, 35)]:
    draw.line(points([(65, y), (65 + width, y + 5)]), fill="#86A7A0", width=5 * SCALE)
for y, width in [(105, 28), (125, 42), (145, 31)]:
    draw.line(points([(157, y + 4), (157 + width, y)]), fill="#B2B8A8", width=5 * SCALE)

draw.line(points([(128, 89), (128, 195)]), fill="#D9D0B8", width=5 * SCALE)
draw.line(points([(42, 180), (85, 184), (128, 200), (171, 184), (214, 180)]),
          fill="#F7C598", width=5 * SCALE, joint="curve")

WEB_ICONS.mkdir(parents=True, exist_ok=True)
desktop_icon = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
desktop_icon.save(OUT / "book.png")
desktop_icon.save(OUT / "book.ico", sizes=[(16, 16), (24, 24), (32, 32),
                                             (48, 48), (64, 64), (128, 128), (256, 256)])

for size in (192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(
        WEB_ICONS / f"icon-{size}.png"
    )

maskable = Image.new("RGBA", (512, 512), "#193D3B")
padded_icon = image.resize((416, 416), Image.Resampling.LANCZOS)
maskable.alpha_composite(padded_icon, (48, 48))
maskable.save(WEB_ICONS / "maskable-512.png")
maskable.resize((180, 180), Image.Resampling.LANCZOS).save(
    WEB_ICONS / "apple-touch-icon.png"
)
