#!/usr/bin/env python3
"""Монтаж промо из кадров record.py: камера, кольца кликов, рамка, WebP.

    python scripts/promo/compose.py ПАПКА [--out файл.webp] [--keys-only] [--quality 82]

Стиль как у Agent Pulse: фон GitHub Dark #0d1117, обводка #3d444d, скругление
20 pt, курсора нет — клики показаны матовыми кольцами, камера по кривой V4.
Окно приложения — снимок настоящего renderer; светофор macOS дорисован на месте
системных кнопок (в Electron их рисует ОС, в снимок страницы они не попадают).

Контрольные кадры: ПАПКА/keys/key-SS.SS.png с шагом 0,5 с, плюс стык петли.
Итог — ПАПКА/figma-analytics-demo.webp и verification.json.
"""
import argparse
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_W, OUT_H = 1600, 880
K = OUT_W / 1280                 # px на pt, как в промо Agent Pulse
MARGIN = 40                      # поля вокруг окна на общем плане, px
WINDOW_RADIUS = 10               # скругление окна macOS, CSS px
CAMERA_DURATION = .9


# ---------- кривые (из промо Agent Pulse) ----------

def cubic_in_out(t):
    t = min(max(t, 0.0), 1.0)
    return 4 * t * t * t if t < .5 else 1 - (-2 * t + 2) ** 3 / 2


def cubic_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def camera_progress(elapsed, duration=CAMERA_DURATION):
    """Камера V4: основной ход, один небольшой перелёт, покой к концу."""
    if elapsed <= 0:
        return 0.0
    if elapsed >= duration:
        return 1.0
    t = elapsed / duration * .75
    value = 1 - math.exp(-11 * t) * (math.cos(8 * t) + (11 / 8) * math.sin(8 * t))
    blend = cubic_in_out((t - .60) / .15)
    return value * (1 - blend) + blend


def tap_state(rel):
    """Кольцо касания V4: радиус / максимум, прозрачность, отверстие / радиус."""
    hole = .58
    if rel < -.37 or rel > .28:
        return 0.0, 0.0, hole
    if rel < -.17:
        p = (rel + .37) / .20
        return .45 + .55 * cubic_out(p), cubic_in_out(p / .6), hole
    if rel < 0:
        p = (rel + .17) / .17
        return 1 - .5 * cubic_in_out(p), 1.0, hole
    p = rel / .28
    return .5 + .24 * cubic_out(p), 1 - cubic_in_out(p), hole + .2 * cubic_in_out(p)


# ---------- геометрия ----------

class Stage:
    def __init__(self, view_w, view_h, camera):
        self.vw, self.vh = view_w, view_h
        scale = min((OUT_W - 2 * MARGIN) / view_w, (OUT_H - 2 * MARGIN) / view_h)
        self.wide = (view_w / 2, view_h / 2, OUT_W / scale)
        self.poses = [(t, tuple(self.wide[i] if v is None else v for i, v in enumerate(pose))) for t, pose in camera]

    def camera_at(self, t):
        current = self.poses[0][1]
        for start, pose in self.poses[1:]:
            if t < start:
                break
            p = camera_progress(t - start)
            # Ширина — в логарифме: наезд и отъезд с одинаковым темпом.
            cx = current[0] + (pose[0] - current[0]) * p
            cy = current[1] + (pose[1] - current[1]) * p
            w = math.exp(math.log(current[2]) + (math.log(pose[2]) - math.log(current[2])) * p)
            current = (cx, cy, w)
        return current


class Frame:
    def __init__(self, view):
        cx, cy, width = view
        self.k = OUT_W / width
        self.x0 = cx - width / 2
        self.y0 = cy - width * OUT_H / OUT_W / 2
        self.img = Image.new("RGBA", (OUT_W, OUT_H), (13, 17, 23, 255))

    def px(self, x, y):
        return (x - self.x0) * self.k, (y - self.y0) * self.k


def paste_scaled(frame, src, x, y, w, h):
    """Положить src (любого разрешения) в прямоугольник окна (x, y, w, h) в CSS px,
    пересчитывая только видимую часть."""
    left, top = frame.px(x, y)
    right, bottom = frame.px(x + w, y + h)
    vl, vt, vr, vb = max(0, left), max(0, top), min(OUT_W, right), min(OUT_H, bottom)
    il, it, ir, ib = math.floor(vl), math.floor(vt), math.ceil(vr), math.ceil(vb)
    if ir <= il or ib <= it:
        return
    sx = src.width / (right - left)
    sy = src.height / (bottom - top)
    il, it = math.ceil(max(0, left) - 1e-6), math.ceil(max(0, top) - 1e-6)
    ir, ib = math.floor(min(OUT_W, right) + 1e-6), math.floor(min(OUT_H, bottom) + 1e-6)
    if ir <= il or ib <= it:
        return
    # Целые пиксели внутри прямоугольника; дробная граница даёт сдвиг < 1 px.
    box = (max(0.0, (il - left) * sx), max(0.0, (it - top) * sy),
           min(src.width, (ir - left) * sx), min(src.height, (ib - top) * sy))
    part = src.resize((ir - il, ib - it), Image.LANCZOS, box=box)
    frame.img.alpha_composite(part, (il, it))


def window_chrome(width, height, dpr):
    """Маска скругления, тонкая обводка и светофор окна macOS в разрешении снимка."""
    sup = 2
    W, H, r = width * dpr * sup, height * dpr * sup, WINDOW_RADIUS * dpr * sup
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=r, fill=255)
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=r, outline=(255, 255, 255, 34), width=dpr * sup)
    # trafficLightPosition { x: 12, y: 12 } из electron/main.ts, кнопки 12 pt, шаг 20 pt.
    for i, color in enumerate(((255, 95, 87), (254, 188, 46), (40, 200, 64))):
        cx, cy, rr = (12 + 6 + 20 * i) * dpr * sup, (12 + 6) * dpr * sup, 6 * dpr * sup
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=color + (255,), outline=(0, 0, 0, 40), width=sup)
    size = (width * dpr, height * dpr)
    return mask.resize(size, Image.LANCZOS), over.resize(size, Image.LANCZOS)


def window_shadow(width, height, pad=90):
    img = Image.new("RGBA", (width + 2 * pad, height + 2 * pad), (0, 0, 0, 0))
    a = Image.new("L", img.size, 0)
    ImageDraw.Draw(a).rounded_rectangle((pad, pad + 18, pad + width, pad + height + 18), radius=WINDOW_RADIUS, fill=150)
    img.putalpha(a.filter(ImageFilter.GaussianBlur(34)))
    return img, pad


def draw_ring(frame, x, y, rel, radius_css=19):
    radius_share, alpha, hole = tap_state(rel)
    if alpha <= 0.01:
        return
    r = radius_css * frame.k * radius_share
    pad = int(r + 12)
    cx, cy = frame.px(x, y)
    box = (int(cx - pad), int(cy - pad), int(cx + pad), int(cy + pad))
    sample = frame.img.crop(box).filter(ImageFilter.GaussianBlur(max(2, r * .16)))
    light = sample.convert("L").resize((1, 1), Image.BOX).getpixel((0, 0)) > 170
    tint = Image.new("RGBA", sample.size, (120, 126, 140, 255) if light else (234, 241, 250, 255))
    glass = Image.blend(sample, tint, .45 if light else .28)
    size = sample.size
    sup = 4
    mask = Image.new("L", (size[0] * sup, size[1] * sup), 0)
    d = ImageDraw.Draw(mask)
    ox, oy = (cx - box[0]) * sup, (cy - box[1]) * sup
    d.ellipse((ox - r * sup, oy - r * sup, ox + r * sup, oy + r * sup), fill=int(235 * alpha))
    ri = r * hole
    d.ellipse((ox - ri * sup, oy - ri * sup, ox + ri * sup, oy + ri * sup), fill=0)
    mask = mask.resize(size, Image.LANCZOS)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(r * .12 + 2)).point(lambda v: int(v * .3)))
    frame.img.alpha_composite(shadow, (box[0], box[1] + max(1, int(r * .05))))
    glass.putalpha(mask)
    frame.img.alpha_composite(glass, (box[0], box[1]))


def outer_frame():
    sup = 3
    border = Image.new("RGBA", (OUT_W * sup, OUT_H * sup))
    ImageDraw.Draw(border).rounded_rectangle((sup / 2, sup / 2, OUT_W * sup - sup / 2, OUT_H * sup - sup / 2),
                                             radius=20 * K * sup, outline="#3d444d", width=round(K * sup))
    mask = Image.new("L", (OUT_W * sup, OUT_H * sup), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, OUT_W * sup - 1, OUT_H * sup - 1), radius=20 * K * sup, fill=255)
    return border.resize((OUT_W, OUT_H), Image.LANCZOS), mask.resize((OUT_W, OUT_H), Image.LANCZOS)


# ---------- монтаж ----------

def compose(folder, out, keys_only=False, quality=82, fps_out=None):
    import imageio_ffmpeg
    folder = Path(folder)
    meta = json.loads((folder / "frames.json").read_text())
    clicks = json.loads((folder / "clicks.json").read_text())
    camera = json.loads((folder / "camera.json").read_text())
    fps, (vw, vh), dpr, mapping = meta["fps"], meta["view"], meta["dpr"], meta["frames"]
    fps_out = fps_out or fps
    step = fps // fps_out
    stage = Stage(vw, vh, camera)
    mask, chrome = window_chrome(vw, vh, dpr)
    shadow, pad = window_shadow(vw, vh)
    border, outer_mask = outer_frame()
    keys_dir = folder / "keys"
    keys_dir.mkdir(exist_ok=True)
    indices = list(range(0, len(mapping), step))
    key_set = {i for i in indices if (i * 2) % fps == 0} | {indices[0], indices[-1]}

    cache = {}

    def window_image(n):
        if n not in cache:
            cache.clear()
            img = Image.open(folder / "frames" / f"{n:05d}.png").convert("RGBA")
            img.alpha_composite(chrome)
            img.putalpha(ImageChops.multiply(img.getchannel("A"), mask))
            cache[n] = img
        return cache[n]

    encoder = None if keys_only else subprocess.Popen([
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-v", "error", "-f", "rawvideo",
        "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-r", str(fps_out), "-i", "-",
        "-c:v", "libwebp_anim", "-lossless", "0", "-quality", str(quality), "-compression_level", "6",
        "-preset", "text", "-loop", "0", str(out)
    ], stdin=subprocess.PIPE)
    first = last = None
    try:
        for i in (sorted(key_set) if keys_only else indices):
            t = i / fps
            frame = Frame(stage.camera_at(t))
            paste_scaled(frame, shadow, -pad, -pad, vw + 2 * pad, vh + 2 * pad)
            paste_scaled(frame, window_image(mapping[i]), 0, 0, vw, vh)
            for c in clicks:
                draw_ring(frame, c["x"], c["y"], t - c["t"])
            frame.img.putalpha(outer_mask)
            frame.img.alpha_composite(border)
            if encoder:
                encoder.stdin.write(frame.img.tobytes())
            if i in key_set:
                frame.img.save(keys_dir / f"key-{t:05.2f}.png")
            if i == indices[0]:
                first = frame.img.copy()
            last = frame.img
            if i % (fps * 5) == 0:
                print(f"Монтаж: {t:.0f}/{len(mapping) / fps:.0f} с", flush=True)
    finally:
        if encoder:
            encoder.stdin.close()
    if encoder and encoder.wait() != 0:
        raise RuntimeError("Не удалось записать WebP")
    diff = ImageChops.difference(first.convert("RGB"), last.convert("RGB")).getbbox()
    report = {
        "duration_s": len(mapping) / fps,
        "fps": fps_out,
        "frames": len(indices),
        "unique_window_frames": len(set(mapping)),
        "clicks": len(clicks),
        "loop_first_equals_last": diff is None,
    }
    if out and Path(out).exists():
        report["bytes"] = Path(out).stat().st_size
    (folder / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--out")
    parser.add_argument("--keys-only", action="store_true")
    parser.add_argument("--quality", type=int, default=82)
    # 30 к/с: при 60 к/с тот же ролик весит 21 МБ даже на качестве 70, текст при этом мыльнее.
    parser.add_argument("--fps", type=int, default=30, help="частота итогового ролика: 30 или 60 (как записано)")
    args = parser.parse_args()
    out = args.out or str(Path(args.folder) / "figma-analytics-demo.webp")
    compose(args.folder, None if args.keys_only else out, args.keys_only, args.quality, args.fps)
