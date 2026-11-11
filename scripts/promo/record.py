#!/usr/bin/env python3
"""Запись промо: настоящий renderer figma-analytics в Chromium, кадр за кадром.

    python scripts/promo/record.py ПАПКА

Берёт собранный `dist/` (`npm run build`), поднимает локальный статический
сервер и открывает приложение в Playwright Chromium. Мост IPC подменён
`mock-api.js` — вымышленное пространство без сети и токенов.

Время виртуальное: часы страницы (`page.clock`) сдвигаются ровно на 1/60 с
перед каждым кадром, CSS-анимации замедлены через CDP и идут в такт. Поэтому
запись не зависит от скорости машины, а текст «обновлено …» не меняется
от того, сколько длится съёмка.

Результат в ПАПКЕ: frames/NNNNN.png (повторы не пишутся), frames.json —
номер снимка для каждого кадра, clicks.json — центры кликов, измеренные по
настоящим элементам, camera.json — позы камеры.
"""
import argparse
import functools
import hashlib
import http.server
import json
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
FPS = 60
VIEW_W, VIEW_H = 1280, 760          # окно приложения, CSS px
DPR = 2
SLOW = 0.08                         # во сколько раз замедлены CSS-анимации
START = "2026-11-10T15:00:00+03:00"  # виртуальное «сейчас»: данные мока строятся от него


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return 4 * t * t * t if t < .5 else 1 - (-2 * t + 2) ** 3 / 2


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(directory)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_port}/index.html"


class Scenario:
    """Действия по виртуальному времени. Цели кликов ищутся по настоящим
    элементам интерфейса, центр измеряется в момент клика."""

    def __init__(self):
        self.actions = []
        self.scrolls = []   # (t0, t1, from, to)
        self.camera = []    # (t, (cx, cy, width)) в CSS px окна

    def at(self, t, fn):
        self.actions.append((t, fn))

    def click(self, t, target, hover=.25, dx=None):
        """target(page) → Locator. Курсор подводится заранее, чтобы ховер успел
        проявиться, после клика уходит на пустую полосу заголовка."""
        self.actions.append((t - hover, ("hover", target)))
        self.actions.append((t, ("click", (target, dx))))
        self.actions.append((t + .35, ("away", None)))

    def scroll(self, t0, t1, to):
        self.scrolls.append((t0, t1, to))

    def cam(self, t, cx, cy, width):
        self.camera.append((t, (cx, cy, width)))


WIDE = (VIEW_W / 2, VIEW_H / 2, None)  # общий план; ширину считает монтаж


def build():
    s = Scenario()
    nav = lambda name: (lambda page: page.get_by_role("button", name=name, exact=True).first)
    sync_btn = lambda page: page.get_by_role("button", name="Синхронизировать")
    seg = lambda name: (lambda page: page.get_by_role("button", name=name, exact=True).first)

    s.cam(0, *WIDE)
    # 1. Синхронизация: прогресс по фазам, как его шлёт main-процесс.
    s.cam(.55, 1000, 150, 780)
    s.click(1.3, sync_btn)
    phases = [("projects", 5, 1.6), ("files", 22, 2.2), ("history", 22, 3.0)]
    for phase, total, t0 in phases:
        for k in range(total + 1):
            dt = (.55 if phase != "history" else .95) * k / total
            name = ["Мобильное приложение", "Веб-кабинет", "Дизайн-система", "Сайт", "Промо"][k % 5]
            s.at(t0 + dt, ("js", f"window.__promo.progress({json.dumps(phase)}, {k}, {total}, {json.dumps(name)})"))
    s.at(4.15, ("js", "window.__promo.finishSync()"))
    s.cam(4.9, *WIDE)

    # 2. Дашборд, переключение на месяцы и прокрутка графиков.
    s.click(5.6, nav("Дашборд"))
    s.cam(6.5, 470, 130, 640)
    s.click(7.25, seg("Месяц"))
    s.cam(8.1, *WIDE)
    s.scroll(8.6, 10.8, 1000)
    s.scroll(11.6, 12.5, 0)

    # 3. Люди.
    s.click(13.1, nav("Люди"))
    s.scroll(14.1, 15.9, 640)
    s.scroll(16.7, 17.5, 0)

    # 4. Командная палитра: поиск файла и переход в него.
    s.click(18.1, lambda page: page.get_by_role("button", name="Поиск").first)
    s.cam(18.2, 640, 260, 900)
    for i, ch in enumerate("онб"):
        s.at(18.75 + i * .16, ("type", ch))
    s.click(19.75, lambda page: page.locator("[role=dialog] button", has_text="Онбординг 2.0").first, dx=90)
    s.cam(20.2, *WIDE)
    s.click(21.7, seg("История версий"))

    # 5. Назад к Инсайтам и возврат недели — кадр совпадает с первым.
    s.click(25.1, nav("Инсайты"))
    s.cam(25.6, 470, 130, 640)
    s.click(26.5, seg("Неделя"))
    s.cam(27.3, *WIDE)
    s.duration = 29.0
    return s


def record(folder):
    folder = Path(folder)
    frames_dir = folder / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("*.png"):
        old.unlink()
    scenario = build()
    actions = sorted(((t, a) for t, a in scenario.actions), key=lambda item: item[0])
    url = serve(ROOT / "dist")
    clicks, mapping, hashes = [], [], {}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": VIEW_W, "height": VIEW_H}, device_scale_factor=DPR,
                                      locale="ru-RU", timezone_id="Europe/Moscow", color_scheme="dark")
        page = context.new_page()
        page.clock.install(time=START)
        page.clock.pause_at(START)  # иначе часы идут сами и текст «обновлено …» зависит от длины съёмки
        page.add_init_script(path=str(ROOT / "scripts/promo/mock-api.js"))
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("crash", lambda *_: print("Страница упала", flush=True))
        page.on("console", lambda m: print("console:", m.type, m.text[:300], flush=True) if m.type == "error" else None)
        page.goto(url)
        page.clock.run_for(3000)
        page.wait_for_timeout(800)
        page.clock.run_for(1000)
        page.wait_for_selector("text=Пульс пространства")
        page.mouse.move(VIEW_W / 2, 10)
        page.clock.run_for(500)
        page.wait_for_timeout(500)
        cdp = context.new_cdp_session(page)
        cdp.send("Animation.enable")
        cdp.send("Animation.setPlaybackRate", {"playbackRate": SLOW})

        main = "document.querySelector('main')"
        total = int(round(scenario.duration * FPS))
        cursor = 0
        real0 = time.monotonic()
        for i in range(total):
            t = i / FPS
            while cursor < len(actions) and actions[cursor][0] <= t + 1e-9:
                at, action = actions[cursor]
                cursor += 1
                kind, arg = action
                if kind == "hover":
                    box = arg(page).bounding_box()
                    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                elif kind == "click":
                    target, dx = arg
                    box = target(page).bounding_box()
                    x = box["x"] + (box["width"] / 2 if dx is None else dx)
                    y = box["y"] + box["height"] / 2
                    page.mouse.move(x, y)
                    page.mouse.down()
                    page.mouse.up()
                    clicks.append({"t": at, "x": x, "y": y, "rect": box})
                elif kind == "away":
                    page.mouse.move(VIEW_W / 2, 10)
                elif kind == "type":
                    page.keyboard.type(arg)
                elif kind == "js":
                    page.evaluate(arg)
            for t0, t1, to in scenario.scrolls:
                if t0 <= t <= t1 + 1 / FPS:
                    start = getattr(scenario, f"_from_{t0}", None)
                    if start is None:
                        start = page.evaluate(f"{main}.scrollTop")
                        setattr(scenario, f"_from_{t0}", start)
                    y = start + (to - start) * ease((t - t0) / (t1 - t0))
                    page.evaluate(f"{main}.scrollTop = {y}")
            if i:
                # Часы принимают целые миллисекунды: 16/17 мс по очереди, без накопления ошибки.
                page.clock.run_for(round(i * 1000 / FPS) - round((i - 1) * 1000 / FPS))
            # CSS-анимации идут в реальном времени, замедленном в SLOW раз:
            # ждём, пока они дойдут до того же виртуального момента.
            animating = page.evaluate("document.getAnimations().some(a => a.playState === 'running')")
            if not animating:
                real0 = time.monotonic() - t / SLOW  # ждать нечего: статичный кадр или прокрутка
            wait = real0 + t / SLOW - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            else:
                real0 -= wait  # не успели — сдвигаем отсчёт, чтобы не накапливать отставание
            png = page.screenshot(animations="allow")
            digest = hashlib.sha1(png).hexdigest()
            if digest not in hashes:
                hashes[digest] = len(hashes)
                (frames_dir / f"{hashes[digest]:05d}.png").write_bytes(png)
            mapping.append(hashes[digest])
            if i % (FPS * 2) == 0:
                print(f"Запись: {t:.0f}/{scenario.duration:.0f} с, уникальных кадров {len(hashes)}", flush=True)
        browser.close()

    if errors:
        raise RuntimeError("Ошибки страницы: " + "; ".join(errors))
    (folder / "frames.json").write_text(json.dumps({"fps": FPS, "view": [VIEW_W, VIEW_H], "dpr": DPR, "frames": mapping}))
    (folder / "clicks.json").write_text(json.dumps(clicks, ensure_ascii=False, indent=1))
    (folder / "camera.json").write_text(json.dumps(scenario.camera))
    print(f"Готово: {len(mapping)} кадров, уникальных {len(hashes)}, кликов {len(clicks)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    folder = parser.parse_args().folder
    # Запись детерминирована, поэтому при внезапном закрытии браузера её можно просто повторить.
    for attempt in range(3):
        try:
            record(folder)
            break
        except Exception as error:  # noqa: BLE001
            if "has been closed" not in str(error) or attempt == 2:
                raise
            print(f"Браузер закрылся, повтор записи ({attempt + 2}/3)", flush=True)
