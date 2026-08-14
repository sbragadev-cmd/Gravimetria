"""Gera os ícones do PWA (não faz parte do app em produção — script utilitário)."""
from PIL import Image, ImageDraw
import math

BRAND = (27, 175, 122, 255)  # #1baf7a
WHITE = (255, 255, 255, 255)
SLICE_COLORS = [(255, 255, 255, 255), (255, 255, 255, 190), (255, 255, 255, 130)]


def draw_pie_icon(size, pad_ratio, out_path, bg=BRAND, rounded=True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if rounded:
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg)
    else:
        draw.rectangle([0, 0, size - 1, size - 1], fill=bg)

    pad = int(size * pad_ratio)
    box = [pad, pad, size - pad, size - pad]
    cx, cy = size / 2, size / 2
    r = (size - 2 * pad) / 2

    # gráfico de pizza estilizado: 3 fatias representando categorias de materiais
    angles = [0, 150, 250, 360]
    for i in range(3):
        draw.pieslice(box, angles[i] - 90, angles[i + 1] - 90, fill=SLICE_COLORS[i])

    # anel central (efeito "doughnut") na cor de fundo
    inner_r = r * 0.42
    inner_box = [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r]
    draw.ellipse(inner_box, fill=bg)

    img.save(out_path)


draw_pie_icon(192, 0.16, "icons/icon-192.png", rounded=True)
draw_pie_icon(512, 0.16, "icons/icon-512.png", rounded=True)
# Maskable: conteúdo precisa caber na "zona segura" central (~80%), fundo até a borda
draw_pie_icon(192, 0.26, "icons/icon-maskable-192.png", rounded=False)
draw_pie_icon(512, 0.26, "icons/icon-maskable-512.png", rounded=False)

print("Ícones gerados em icons/")
