"""
GiveGigsGames Local Native Input Simulator & Window Capture
Consolidated from 4weird/v2/desktop/code/scripts/python/input_sim.py.
Supports Win32 window enumeration, target-window normalized 0-1000 input
mapping, overlapping combos, and JPEG screenshot capture.
"""
import ctypes
from ctypes import wintypes
import json
import sys
import time


def _ensure_pyautogui():
    try:
        import pyautogui  # type: ignore
    except ImportError:
        import subprocess
        print("PyAutoGUI not found. Installing...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyautogui"])
        import pyautogui  # type: ignore
    pyautogui.FAILSAFE = True
    return pyautogui


def list_visible_windows():
    """Return sorted visible top-level window titles on Windows."""
    if sys.platform != "win32":
        return []
    user32 = ctypes.windll.user32
    titles = []
    seen = set()

    def enum_callback(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if not length:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        title = buf.value.strip()
        if title and title not in seen and title not in ("Program Manager", "Settings"):
            seen.add(title)
            titles.append(title)
        return True

    cb = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(enum_callback)
    user32.EnumWindows(cb, 0)
    return titles


def find_window(window_title):
    """Return a visible top-level window whose title exactly or partially matches."""
    if not window_title or sys.platform != "win32":
        return None
    user32 = ctypes.windll.user32
    exact = user32.FindWindowW(None, window_title)
    if exact:
        return exact
    match = None

    def enum_callback(hwnd, _):
        nonlocal match
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if not length:
            return True
        title = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, title, length + 1)
        if window_title.lower() in title.value.lower():
            match = hwnd
            return False
        return True

    cb = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(enum_callback)
    user32.EnumWindows(cb, 0)
    return match


def activate_window(window_title):
    if not window_title or sys.platform != "win32":
        return False
    try:
        hwnd = find_window(window_title)
        if hwnd:
            user32 = ctypes.windll.user32
            if user32.IsIconic(hwnd):
                user32.ShowWindow(hwnd, 9)
            else:
                user32.ShowWindow(hwnd, 5)
            user32.SetForegroundWindow(hwnd)
            time.sleep(0.18)
            return True
    except Exception as exc:
        print(f"Error activating window: {exc}", file=sys.stderr)
    return False


def target_window_rect(window_title):
    if not window_title or sys.platform != "win32":
        return None
    hwnd = find_window(window_title)
    if not hwnd:
        return None
    rect = wintypes.RECT()
    if not ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        return None
    if rect.right <= rect.left or rect.bottom <= rect.top:
        return None
    return rect.left, rect.top, rect.right, rect.bottom


def normalized_to_window(x, y, window_title, pyautogui):
    if x > 1000 or y > 1000:
        return x, y
    rect = target_window_rect(window_title)
    if rect:
        left, top, right, bottom = rect
        return left + int((x / 1000.0) * (right - left)), top + int((y / 1000.0) * (bottom - top))
    sw, sh = pyautogui.size()
    return int((x / 1000.0) * sw), int((y / 1000.0) * sh)


def normalized_key(key):
    aliases = {
        "Space": "space",
        " ": "space",
        "Enter": "enter",
        "Escape": "esc",
        "Esc": "esc",
        "Shift": "shift",
        "Control": "ctrl",
        "Ctrl": "ctrl",
        "Alt": "alt",
        "Tab": "tab",
    }
    if key in aliases:
        return aliases[key]
    low = str(key).lower()
    if low in (
        "space", "enter", "esc", "escape", "shift", "ctrl", "control", "alt", "tab",
        "up", "down", "left", "right", "backspace", "delete", "insert", "home", "end",
        "pageup", "pagedown", "arrowup", "arrowdown", "arrowleft", "arrowright"
    ):
        return low.replace("arrow", "") if low.startswith("arrow") else ("esc" if low == "escape" else ("ctrl" if low == "control" else low))
    if len(key) == 1:
        return key.lower()
    if key.upper().startswith("F") and key[1:].isdigit():
        return "f" + key[1:]
    return low


def do_click_at(x, y, window_title, pyautogui, button="left", clicks=1):
    x, y = normalized_to_window(x, y, window_title, pyautogui)
    pyautogui.click(x, y, button=button, clicks=clicks, interval=0.05 if clicks > 1 else 0.0)
    return x, y


def execute_combo_steps(steps, window_title, pyautogui):
    if isinstance(steps, str):
        steps = json.loads(steps)
    if isinstance(steps, dict) and "steps" in steps:
        steps = steps["steps"]
    if not isinstance(steps, list):
        raise ValueError("combo steps must be a list")
    steps = steps[:8]
    t0 = time.time()
    held = []
    results = []

    max_hold_s = 0.0
    for s in steps:
        if not isinstance(s, dict):
            continue
        op = str(s.get("op", "")).lower()
        if op == "hold_keys":
            keys = [normalized_key(k) for k in (s.get("keys") or str(s.get("target", "w")).split(",")) if str(k).strip()]
            keys = keys[:3] or ["w"]
            dur_s = max(0.08, min(3.0, float(s.get("duration_ms", 400)) / 1000.0))
            max_hold_s = max(max_hold_s, dur_s)
            for k in keys:
                pyautogui.keyDown(k)
                held.append(k)
        elif op == "hold":
            k = normalized_key(s.get("key") or s.get("target") or "w")
            dur_s = max(0.08, min(3.0, float(s.get("duration_ms", 400)) / 1000.0))
            max_hold_s = max(max_hold_s, dur_s)
            pyautogui.keyDown(k)
            held.append(k)

    for s in steps:
        if not isinstance(s, dict):
            continue
        op = str(s.get("op", "")).lower()
        try:
            if op == "press":
                k = normalized_key(s.get("key") or s.get("target") or "space")
                pyautogui.press(k)
                results.append(f"press {k}")
            elif op in ("click", "right_click", "middle_click", "double_click"):
                x = int(s.get("x", 500) if s.get("x") is not None else 500)
                y = int(s.get("y", 500) if s.get("y") is not None else 500)
                btn = "right" if op == "right_click" else ("middle" if op == "middle_click" else str(s.get("button", "left")).lower())
                clicks = 2 if op == "double_click" else 1
                rx, ry = do_click_at(x, y, window_title, pyautogui, button=btn, clicks=clicks)
                results.append(f"{op} ({rx},{ry})")
            elif op == "move":
                x = int(s.get("x", 500) if s.get("x") is not None else 500)
                y = int(s.get("y", 500) if s.get("y") is not None else 500)
                rx, ry = normalized_to_window(x, y, window_title, pyautogui)
                pyautogui.moveTo(rx, ry, duration=0.08)
                results.append(f"move ({rx},{ry})")
            elif op == "look":
                dx = max(-500, min(500, int(s.get("dx", 0))))
                dy = max(-500, min(500, int(s.get("dy", 0))))
                pyautogui.moveRel(dx, dy, duration=0.08)
                results.append(f"look ({dx},{dy})")
            elif op == "wheel":
                clicks = max(-5, min(5, int(s.get("delta", s.get("clicks", -1)))))
                if clicks != 0:
                    pyautogui.scroll(clicks)
                results.append(f"wheel {clicks}")
            elif op == "wait":
                ms = max(0, min(3000, int(s.get("duration_ms", s.get("ms", 150)))))
                time.sleep(ms / 1000.0)
                results.append(f"wait {ms}ms")
            elif op in ("type", "type_text"):
                text = str(s.get("text", s.get("target", "")))[:120]
                if text:
                    pyautogui.write(text, interval=0.02)
                    results.append(f"type {text}")
        except Exception as exc:
            results.append(f"{op} failed: {exc}")

    remaining = (t0 + max_hold_s) - time.time() if max_hold_s > 0 else 0
    if remaining > 0:
        time.sleep(remaining)
    for k in reversed(held):
        try:
            pyautogui.keyUp(k)
        except Exception:
            pass
    return results, int((time.time() - t0) * 1000)


def main():
    if len(sys.argv) < 2:
        print("Usage: input_sim.py <list_windows|click|right_click|double_click|press|type|hold|hold_keys|move|look|wheel|combo|screenshot> ...")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "list_windows":
        print(json.dumps({"windows": list_visible_windows()}))
        return

    pyautogui = _ensure_pyautogui()

    if cmd == "screenshot":
        if len(sys.argv) < 3:
            sys.exit(1)
        dest = sys.argv[2]
        window_title = " ".join(sys.argv[3:]) if len(sys.argv) >= 4 else ""
        if window_title:
            activate_window(window_title)
        rect = target_window_rect(window_title) if window_title else None
        if rect:
            left, top, right, bottom = rect
            img = pyautogui.screenshot(region=(left, top, max(1, right - left), max(1, bottom - top)))
        else:
            img = pyautogui.screenshot()
        w, h = img.size
        new_w = min(640, w)
        new_h = max(1, int((h / float(max(1, w))) * new_w))
        img = img.resize((new_w, new_h))
        if dest == "-":
            import base64
            import io
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=60)
            print(json.dumps({
                "width": new_w,
                "height": new_h,
                "screenshotBase64": base64.b64encode(buf.getvalue()).decode("ascii")
            }))
        else:
            img.save(dest, "JPEG", quality=60)
            print(f"Saved screenshot to {dest}")
        return

    if cmd in ("click", "right_click", "middle_click", "double_click"):
        x, y = int(sys.argv[2]), int(sys.argv[3])
        window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ""
        if window_title:
            activate_window(window_title)
        btn = "right" if cmd == "right_click" else ("middle" if cmd == "middle_click" else "left")
        clicks = 2 if cmd == "double_click" else 1
        rx, ry = do_click_at(x, y, window_title, pyautogui, button=btn, clicks=clicks)
        print(f"Executed {cmd} at ({rx}, {ry})")
    elif cmd == "combo":
        payload = json.loads(sys.argv[2])
        window_title = " ".join(sys.argv[3:]) if len(sys.argv) >= 4 else ""
        if window_title:
            activate_window(window_title)
        results, elapsed_ms = execute_combo_steps(payload, window_title, pyautogui)
        print(f"Executed combo ({len(results)} steps, {elapsed_ms}ms): {'; '.join(results)}")
    elif cmd == "move":
        x, y = int(sys.argv[2]), int(sys.argv[3])
        window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ""
        if window_title:
            activate_window(window_title)
        rx, ry = normalized_to_window(x, y, window_title, pyautogui)
        pyautogui.moveTo(rx, ry, duration=0.10)
        print(f"Moved pointer to ({rx}, {ry})")
    elif cmd == "press":
        key = normalized_key(sys.argv[2])
        if len(sys.argv) >= 4:
            activate_window(" ".join(sys.argv[3:]))
        pyautogui.press(key)
        print(f"Pressed {key}")
    elif cmd == "type":
        text = " ".join(sys.argv[2:])
        pyautogui.write(text, interval=0.04)
        print(f"Typed {text}")
    elif cmd == "hold":
        key = normalized_key(sys.argv[2])
        dur = max(0.05, float(sys.argv[3]) / 1000.0)
        if len(sys.argv) >= 5:
            activate_window(" ".join(sys.argv[4:]))
        pyautogui.keyDown(key)
        time.sleep(dur)
        pyautogui.keyUp(key)
        print(f"Held {key} for {sys.argv[3]}ms")
    elif cmd == "hold_keys":
        keys = [normalized_key(k.strip()) for k in sys.argv[2].split(",") if k.strip()]
        dur = max(0.05, float(sys.argv[3]) / 1000.0)
        if len(sys.argv) >= 5:
            activate_window(" ".join(sys.argv[4:]))
        for k in keys:
            pyautogui.keyDown(k)
        time.sleep(dur)
        for k in reversed(keys):
            pyautogui.keyUp(k)
        print(f"Held keys {','.join(keys)} for {sys.argv[3]}ms")
    elif cmd == "look":
        dx = max(-500, min(500, int(sys.argv[2])))
        dy = max(-500, min(500, int(sys.argv[3])))
        window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ""
        if window_title:
            activate_window(window_title)
        pyautogui.moveRel(dx, dy, duration=0.08)
        print(f"Looked ({dx}, {dy})")
    elif cmd == "wheel":
        clicks = max(-5, min(5, int(sys.argv[2])))
        window_title = " ".join(sys.argv[3:]) if len(sys.argv) >= 4 else ""
        if window_title:
            activate_window(window_title)
        if clicks != 0:
            pyautogui.scroll(clicks)
        print(f"Wheeled {clicks}")
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
