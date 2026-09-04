"""Restore target HWND and send Ctrl+V — AttachThreadInput for Chrome/Cursor."""
import ctypes
import sys
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
VK_CONTROL = 0x11
VK_V = 0x56
KEYEVENTF_KEYUP = 0x0002
SW_RESTORE = 9


def _thread_id(hwnd: int) -> int:
    pid = ctypes.c_ulong()
    return user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))


def _focus_window(target: int) -> bool:
    user32.ShowWindow(target, SW_RESTORE)
    fg = user32.GetForegroundWindow()
    fg_thread = _thread_id(fg) if fg else 0
    target_thread = _thread_id(target)
    attached = False
    if fg_thread and target_thread and fg_thread != target_thread:
        attached = bool(user32.AttachThreadInput(fg_thread, target_thread, True))
    ok = bool(user32.SetForegroundWindow(target))
    if attached:
        user32.AttachThreadInput(fg_thread, target_thread, False)
    return ok


def main() -> int:
    if len(sys.argv) < 2:
        return 1
    try:
        hwnd = int(sys.argv[1])
    except ValueError:
        return 1
    if hwnd <= 0:
        return 1
    if not _focus_window(hwnd):
        return 1
    time.sleep(0.09)
    user32.keybd_event(VK_CONTROL, 0, 0, 0)
    user32.keybd_event(VK_V, 0, 0, 0)
    user32.keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0)
    user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
