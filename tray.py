# /// script
# dependencies = ["pystray", "pillow"]
# ///
"""tray.py — 系统托盘订阅更新器，左键点击更新 Clash Verge 订阅"""
import os, sys, re, threading, subprocess, winreg
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as Item

ROOT = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(ROOT, "sub2clash.ts")
APP_NAME = "sub2clash"
AUTOSTART_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
UPDATING = False
ANSI_RE = re.compile(r'\x1b\[[0-9;]*m')


def make_icon(color):
    """生成圆形色块图标"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6, 6, 58, 58], fill=color)
    return img

ICONS = {
    "idle":    make_icon((33, 150, 243)),   # 蓝
    "running": make_icon((255, 152, 0)),    # 橙
    "ok":      make_icon((76, 175, 80)),    # 绿
    "err":     make_icon((244, 67, 54)),    # 红
}


def set_icon(icon, name):
    icon.icon = ICONS[name]
    icon.update_menu()


def restore_idle(icon):
    """3 秒后恢复蓝色图标"""
    def _restore():
        threading.Event().wait(3.0)
        set_icon(icon, "idle")
    threading.Thread(target=_restore, daemon=True).start()


def do_update(icon, item):
    """更新订阅（菜单回调）"""
    global UPDATING
    if UPDATING:
        icon.notify("已经在更新中，请稍候", "订阅更新")
        return
    UPDATING = True
    set_icon(icon, "running")
    icon.notify("正在更新订阅...", "订阅更新")

    def worker():
        global UPDATING
        try:
            r = subprocess.run(
                ["bun", SCRIPT],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=90,
                env={**os.environ, "NO_COLOR": "1"},
                encoding="utf-8",
                errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            stdout = ANSI_RE.sub("", r.stdout or "")
            if r.returncode == 0:
                lines = [l.strip() for l in stdout.splitlines() if l.strip()]
                summary = next((l for l in reversed(lines) if "完成" in l), "更新完成")
                icon.notify(summary, "订阅更新成功")
                set_icon(icon, "ok")
            else:
                err = ANSI_RE.sub("", r.stderr or "")
                msg = err[:200] if err else stdout[-200:] if stdout else "未知错误"
                icon.notify(msg, "订阅更新失败")
                set_icon(icon, "err")
        except FileNotFoundError:
            icon.notify("未找到 bun，请确认已安装 Bun", "错误")
            set_icon(icon, "err")
        except subprocess.TimeoutExpired:
            icon.notify("更新超时 (90秒)", "错误")
            set_icon(icon, "err")
        except Exception as e:
            icon.notify(str(e)[:200], "错误")
            set_icon(icon, "err")
        finally:
            UPDATING = False
            restore_idle(icon)

    threading.Thread(target=worker, daemon=True).start()


def is_autostart():
    """检查是否已设置开机自启"""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, APP_NAME)
        winreg.CloseKey(key)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False


def toggle_autostart(icon, item):
    """切换开机自启"""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE)
        if is_autostart():
            try:
                winreg.DeleteValue(key, APP_NAME)
            except FileNotFoundError:
                pass
            icon.notify("已关闭开机自启", "订阅更新")
        else:
            uv_path = subprocess.run(["where", "uv"], capture_output=True, text=True).stdout.strip()
            if uv_path:
                cmd = f'"{uv_path}" run "{os.path.join(ROOT, "tray.py")}"'
            else:
                cmd = f'pythonw "{os.path.join(ROOT, "tray.py")}"'
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, cmd)
            icon.notify("已开启开机自启", "订阅更新")
        winreg.CloseKey(key)
        icon.update_menu()
    except Exception as e:
        icon.notify(f"设置失败: {e}", "错误")


def on_exit(icon, item):
    icon.stop()


def main():
    # Windows 通知 AppUserModelID
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_NAME)
    except Exception:
        pass

    icon = pystray.Icon(
        APP_NAME,
        ICONS["idle"],
        "订阅更新 — 左键点击更新",
        menu=pystray.Menu(
            Item("更新订阅", do_update, default=True),
            Item("开机自启", toggle_autostart, checked=lambda item: is_autostart()),
            Item("退出", on_exit),
        ),
    )
    icon.run()


if __name__ == "__main__":
    main()
