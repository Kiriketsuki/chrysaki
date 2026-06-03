#!/usr/bin/env python3
"""Chrysaki thermal monitor for tmux — bar segment and interactive popup."""

import json
import os
import re
import select
import shutil
import signal
import subprocess
import sys
import termios
import tty
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

EMERALD_LT = "#1a8a6a"
TEAL_LT = "#20969c"
BLONDE = "#FBB13C"
ERROR_LT = "#b53f4a"
PRIMARY = "#e0e2ea"
SECONDARY = "#a0a4b8"
MUTED = "#6a6e82"
BORDER = "#363a4f"

ICON_TEMP = "\U000f050f"
ICON_FAN = "\U000f0210"
ICON_NVME = "\U000f02ca"
ICON_RAM = "\U000f035b"
ICON_CPU = "\U000f0ee0"
ICON_GPU = "\U000f1382"
ICON_BAT_FULL = "\U000f0079"
ICON_BAT_CHARGE = "\U000f0084"
ICON_BAT_DISCHARGE = "\U000f008c"
ICON_LOAD = "\U000f035a"
ICON_PROC = "\U000f0871"
ICON_HEX = "⬢"

LABEL_W = 14
VALUE_W = 10
FAN_DUP_THRESHOLD = 200
TOP_N = 5

NL = "\r\n"


@dataclass(frozen=True)
class SensorData:
    cpu_temp: Optional[float]
    cpu_fan: Optional[float]
    gpu_fan: Optional[float]
    acpi_fan: Optional[float]
    nvme: tuple[tuple[str, float], ...]
    ram_temp: Optional[float]
    ram_alarm: bool


@dataclass(frozen=True)
class ProcInfo:
    pid: int
    name: str
    rss_kb: int
    mem_pct: float
    cpu_pct: float


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _ansi(hex_color: str) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    return f"\033[38;2;{r};{g};{b}m"


def _ansi_bold(hex_color: str) -> str:
    return f"\033[1m{_ansi(hex_color)}"


RST = "\033[0m"

_CTRL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def _safe_float(v: object) -> Optional[float]:
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _safe_int(v: object) -> Optional[int]:
    try:
        return int(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _sanitize(s: str) -> str:
    return _CTRL_CHARS.sub("", s)


def temp_color(t: Optional[float]) -> str:
    if t is None:
        return MUTED
    if t < 60.0:
        return TEAL_LT
    if t < 80.0:
        return BLONDE
    return ERROR_LT


def fan_color(rpm: Optional[float]) -> str:
    if rpm is None or rpm <= 0:
        return MUTED
    if rpm < 4000:
        return TEAL_LT
    return BLONDE


def _read_sensors() -> dict:
    try:
        result = subprocess.run(
            ["sensors", "-j"], capture_output=True, text=True, timeout=5
        )
        return json.loads(result.stdout) if result.returncode == 0 else {}
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        return {}


def _dig(data: dict, *keys) -> Optional[float]:
    node = data
    for k in keys:
        if not isinstance(node, dict) or k not in node:
            return None
        node = node[k]
    return _safe_float(node) if node is not None else None


def _nvme_model_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    nvme_base = Path("/sys/class/nvme")
    if not nvme_base.exists():
        return mapping
    for dev_dir in sorted(nvme_base.iterdir()):
        model_path = dev_dir / "model"
        device_link = dev_dir / "device"
        if not model_path.exists() or not device_link.exists():
            continue
        try:
            resolved = str(device_link.resolve())
            match = re.search(r"([0-9a-f]{2}):([0-9a-f]{2})\.([0-9a-f])$", resolved)
            if match:
                pci_slot = match.group(1) + match.group(2) + match.group(3)
                chip_key = f"nvme-pci-{pci_slot[:-1]}"
                mapping[chip_key] = _sanitize(model_path.read_text().strip())
        except OSError:
            continue
    return mapping


def parse_sensors(data: dict) -> SensorData:
    cpu_temp = _dig(data, "k10temp-pci-00c3", "Tctl", "temp1_input")
    if cpu_temp is None:
        cpu_temp = _dig(data, "acpitz-acpi-0", "temp1", "temp1_input")
    cpu_fan = _dig(data, "asus-isa-000a", "cpu_fan", "fan1_input")
    gpu_fan = _dig(data, "asus-isa-000a", "gpu_fan", "fan2_input")
    acpi_fan = _dig(data, "acpi_fan-isa-0000", "fan1", "fan1_input")
    nvme_temps: list[tuple[str, float]] = []
    model_map = _nvme_model_map()
    for chip in sorted(data.keys()):
        if chip.startswith("nvme-pci-"):
            val = _dig(data, chip, "Composite", "temp1_input")
            if val is not None:
                label = model_map.get(chip, chip.replace("nvme-pci-", "NVMe "))
                nvme_temps.append((label, val))
    ram_temp = _dig(data, "spd5118-i2c-3-50", "temp1", "temp1_input")
    ram_alarm_val = _dig(data, "spd5118-i2c-3-50", "temp1", "temp1_max_alarm")
    ram_alarm = ram_alarm_val == 1.0 if ram_alarm_val is not None else False
    return SensorData(
        cpu_temp=cpu_temp,
        cpu_fan=cpu_fan,
        gpu_fan=gpu_fan,
        acpi_fan=acpi_fan,
        nvme=tuple(nvme_temps),
        ram_temp=ram_temp,
        ram_alarm=ram_alarm,
    )


def _max_fan(sd: SensorData) -> Optional[float]:
    fans = [f for f in (sd.cpu_fan, sd.gpu_fan, sd.acpi_fan) if f and f > 0]
    return max(fans) if fans else None


def bar_mode() -> None:
    data = _read_sensors()
    if not data:
        print(
            f"#[fg={MUTED},bg=#1c1f2b]{ICON_TEMP} N/A  "
            f"#[fg={MUTED},bg=#1c1f2b]{ICON_FAN} N/A"
        )
        return
    sd = parse_sensors(data)
    tc = temp_color(sd.cpu_temp)
    temp_str = f"{sd.cpu_temp:.0f}" if sd.cpu_temp is not None else "N/A"
    temp_display = f"{temp_str}°C" if temp_str != "N/A" else "N/A"
    max_rpm = _max_fan(sd)
    fan_str = f"{max_rpm:.0f}" if max_rpm is not None else "N/A"
    fan_display = f"{fan_str} RPM" if fan_str != "N/A" else "N/A"
    fc = fan_color(max_rpm)
    print(
        f"#[fg={tc},bg=#1c1f2b]{ICON_TEMP} {temp_display}  "
        f"#[fg={fc},bg=#1c1f2b]{ICON_FAN} {fan_display}"
    )


def _heat_bar(temp: Optional[float], width: int, color: str) -> str:
    if temp is None or width < 2:
        return ""
    fraction = max(0.0, min(temp / 100.0, 1.0))
    filled = int(fraction * width)
    empty = width - filled
    return f"{_ansi(color)}{'█' * filled}{_ansi(BORDER)}{'░' * empty}{RST}"


def _read_battery() -> Optional[dict[str, str]]:
    bat = Path("/sys/class/power_supply/BAT1")
    if not bat.exists():
        return None
    info: dict[str, str] = {}
    for key in ("status", "capacity", "voltage_now", "current_now"):
        p = bat / key
        if p.exists():
            try:
                info[key] = p.read_text().strip()
            except OSError:
                continue
    return info if info else None


def _is_fan_duplicate(a: Optional[float], b: Optional[float]) -> bool:
    if a is None or b is None:
        return False
    return abs(a - b) <= FAN_DUP_THRESHOLD


def _trunc(s: str, w: int) -> str:
    return s if len(s) <= w else s[: w - 1] + "…"


def _row(icon: str, label: str, value: str, color: str, extra: str = "") -> str:
    lbl = _trunc(label, LABEL_W).ljust(LABEL_W)
    val = value.ljust(VALUE_W)
    suffix = f"  {extra}" if extra else ""
    return f"  {_ansi(color)}{icon} {RST}{_ansi(SECONDARY)}{lbl}{RST} {_ansi(color)}{val}{RST}{suffix}"


def _section_header(title: str, cols: int) -> str:
    rule_w = max(0, cols - 4 - len(title) - 1)
    return (
        f"  {_ansi_bold(MUTED)}{title} "
        f"{_ansi(BORDER)}{'─' * rule_w}{RST}"
    )


def _full_rule(cols: int) -> str:
    return f"  {_ansi(BORDER)}{'─' * max(0, cols - 4)}{RST}"


def _top_procs_by_mem() -> list[ProcInfo]:
    return _get_top_procs("rss")


def _top_procs_by_cpu() -> list[ProcInfo]:
    return _get_top_procs("pcpu")


def _get_top_procs(sort_field: str) -> list[ProcInfo]:
    try:
        result = subprocess.run(
            ["ps", "axo", "pid,rss,%mem,%cpu,comm",
             f"--sort=-{sort_field}", "--no-headers"],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode != 0:
            return []
        procs: list[ProcInfo] = []
        for line in result.stdout.strip().splitlines():
            parts = line.split(None, 4)
            if len(parts) < 5:
                continue
            procs.append(ProcInfo(
                pid=int(parts[0]),
                name=parts[4].strip(),
                rss_kb=int(parts[1]),
                mem_pct=float(parts[2]),
                cpu_pct=float(parts[3]),
            ))
            if len(procs) >= TOP_N:
                break
        return procs
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
        return []


def _fmt_mem(kb: int) -> str:
    if kb >= 1_048_576:
        return f"{kb / 1_048_576:.1f}G"
    if kb >= 1024:
        return f"{kb / 1024:.0f}M"
    return f"{kb}K"


def _rpm(val: Optional[float]) -> str:
    return f"{val:.0f} RPM" if val is not None and val > 0 else "N/A"


def popup_mode() -> None:
    if not sys.stdin.isatty():
        print("thermal: --popup requires an interactive terminal", file=sys.stderr)
        return
    old_settings = termios.tcgetattr(sys.stdin)
    try:
        tty.setraw(sys.stdin)
        _popup_loop()
    finally:
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
        sys.stdout.write("\033[?25h")
        sys.stdout.flush()


def _build_frame() -> str:
    cols, _rows = shutil.get_terminal_size()
    bar_w = min(14, max(6, cols - 44))
    name_w = max(8, min(20, cols - 24))
    data = _read_sensors()
    sd = parse_sensors(data) if data else SensorData(
        None, None, None, None, (), None, False
    )
    bat = _read_battery()
    load = os.getloadavg()

    cpu_procs = _top_procs_by_cpu()
    ram_procs = _top_procs_by_mem()

    lines: list[str] = []

    # -- CPU & Fans --
    lines.append(_section_header("CPU & FANS", cols))

    tc = temp_color(sd.cpu_temp)
    temp_v = f"{sd.cpu_temp:.1f}°C" if sd.cpu_temp is not None else "N/A"
    hb = _heat_bar(sd.cpu_temp, bar_w, tc)
    lines.append(_row(ICON_CPU, "CPU Temp", temp_v, tc, hb))
    lines.append(_row(ICON_FAN, "CPU Fan", _rpm(sd.cpu_fan), fan_color(sd.cpu_fan)))
    lines.append(_row(ICON_GPU, "GPU Fan", _rpm(sd.gpu_fan), fan_color(sd.gpu_fan)))

    if (
        not _is_fan_duplicate(sd.acpi_fan, sd.cpu_fan)
        and not _is_fan_duplicate(sd.acpi_fan, sd.gpu_fan)
        and sd.acpi_fan
        and sd.acpi_fan > 0
    ):
        lines.append(_row(ICON_FAN, "ACPI Fan", _rpm(sd.acpi_fan), fan_color(sd.acpi_fan)))

    mf = _max_fan(sd)
    lines.append(_row(ICON_FAN, "Max Fan", _rpm(mf), fan_color(mf)))

    # -- Storage & Memory --
    lines.append(_section_header("STORAGE & MEMORY", cols))

    for label, ntemp in sd.nvme:
        nc = temp_color(ntemp)
        nhb = _heat_bar(ntemp, bar_w, nc)
        lines.append(_row(ICON_NVME, label, f"{ntemp:.1f}°C", nc, nhb))

    rc = temp_color(sd.ram_temp)
    ram_v = f"{sd.ram_temp:.1f}°C" if sd.ram_temp is not None else "N/A"
    alarm = f"  {_ansi(ERROR_LT)}▲ ALARM{RST}" if sd.ram_alarm else ""
    rhb = _heat_bar(sd.ram_temp, bar_w, rc)
    lines.append(f"{_row(ICON_RAM, 'RAM', ram_v, rc, rhb)}{alarm}")

    # -- Top CPU (read-only) --
    lines.append(_section_header("TOP CPU", cols))
    _render_proc_table(lines, cpu_procs, name_w, is_cpu=True)

    # -- Top RAM (read-only) --
    lines.append(_section_header("TOP RAM", cols))
    _render_proc_table(lines, ram_procs, name_w, is_cpu=False)

    # -- System --
    lines.append(_section_header("SYSTEM", cols))

    l1, l5, l15 = load
    lc = TEAL_LT if l1 < 4.0 else BLONDE if l1 < 8.0 else ERROR_LT
    load_v = (
        f"{l1:.2f}"
        f" {_ansi(MUTED)}/{RST} "
        f"{_ansi(SECONDARY)}{l5:.2f}{RST}"
        f" {_ansi(MUTED)}/{RST} "
        f"{_ansi(MUTED)}{l15:.2f}{RST}"
    )
    lines.append(f"  {_ansi(lc)}{ICON_LOAD} {RST}{_ansi(SECONDARY)}{'Load'.ljust(LABEL_W)}{RST} {_ansi(lc)}{load_v}")

    if bat:
        status = bat.get("status", "Unknown")
        cap = _safe_int(bat.get("capacity"))
        voltage = _safe_int(bat.get("voltage_now"))
        current = _safe_int(bat.get("current_now"))
        cap_s = f"{cap}%" if cap is not None else "N/A"
        volt_s = f"{voltage / 1_000_000:.1f}V" if voltage is not None else "N/A"
        curr_s = f"{current / 1_000_000:.1f}A" if current is not None else "N/A"
        if status == "Charging":
            bi, bc = ICON_BAT_CHARGE, EMERALD_LT
        elif status == "Discharging":
            bi = ICON_BAT_DISCHARGE
            if cap is None:
                bc = MUTED
            else:
                bc = TEAL_LT if cap > 30 else BLONDE if cap > 10 else ERROR_LT
        else:
            bi, bc = ICON_BAT_FULL, TEAL_LT
        bat_v = (
            f"{status} "
            f"{_ansi(PRIMARY)}{cap_s}{RST}  "
            f"{_ansi(MUTED)}{volt_s} {curr_s}{RST}"
        )
        lines.append(f"  {_ansi(bc)}{bi} {RST}{_ansi(SECONDARY)}{'Battery'.ljust(LABEL_W)}{RST} {_ansi(bc)}{bat_v}")
    else:
        lines.append(_row(ICON_BAT_FULL, "Battery", "N/A", MUTED))

    lines.append("")
    lines.append(_full_rule(cols))
    lines.append(f"  {_ansi(MUTED)}q/Esc close{RST}")

    return f"\033[2J\033[H{NL.join(lines)}{NL}"


def _error_frame(exc: Exception) -> str:
    msg = _sanitize(str(exc)) or exc.__class__.__name__
    return (
        f"\033[2J\033[H"
        f"  {_ansi(ERROR_LT)}render error{RST} "
        f"{_ansi(MUTED)}{_trunc(msg, 60)}{RST}{NL}"
        f"  {_ansi(MUTED)}q/Esc close{RST}{NL}"
    )


def _drain_escape() -> None:
    """Consume a buffered CSI/SS3 sequence following a lone ESC byte."""
    while select.select([sys.stdin], [], [], 0)[0]:
        if not sys.stdin.read(1):
            break


def _popup_loop() -> None:
    signal.signal(signal.SIGINT, lambda *_: None)
    sys.stdout.write("\033[?25l")
    sys.stdout.flush()

    while True:
        try:
            frame = _build_frame()
        except Exception as exc:  # defensive: render this frame, keep looping
            frame = _error_frame(exc)
        sys.stdout.write(frame)
        sys.stdout.flush()

        if select.select([sys.stdin], [], [], 2.0)[0]:
            ch = sys.stdin.read(1)
            if not ch:  # EOF on stdin — stop busy-spinning
                break
            if ch == "\x1b":
                # Distinguish a lone ESC from an arrow/Home/F-key escape sequence.
                if select.select([sys.stdin], [], [], 0)[0]:
                    _drain_escape()
                    continue
                break
            if ch in ("q", "Q", "\x03"):
                break


def _render_proc_table(
    lines: list[str],
    procs: list[ProcInfo],
    name_w: int,
    is_cpu: bool,
) -> None:
    if not procs:
        lines.append(f"  {_ansi(MUTED)}N/A{RST}")
        return
    for p in procs:
        pname = _trunc(_sanitize(p.name), name_w).ljust(name_w)
        if is_cpu:
            val = f"{p.cpu_pct:5.1f}%"
            c = TEAL_LT if p.cpu_pct < 10 else BLONDE if p.cpu_pct < 50 else ERROR_LT
        else:
            mem_s = _fmt_mem(p.rss_kb)
            val = f"{mem_s:>5} {p.mem_pct:4.1f}%"
            c = TEAL_LT if p.mem_pct < 3 else BLONDE if p.mem_pct < 5 else ERROR_LT
        lines.append(f"  {_ansi(c)}{ICON_PROC} {RST}{_ansi(SECONDARY)}{pname}{RST} {_ansi(c)}{val}{RST}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("--bar", "--popup"):
        print(f"Usage: {sys.argv[0]} --bar | --popup", file=sys.stderr)
        sys.exit(1)
    if sys.argv[1] == "--bar":
        bar_mode()
    else:
        popup_mode()
