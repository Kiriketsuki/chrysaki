#!/usr/bin/env python3
"""Pytest suite for thermal.py — CWD-independent via importlib by absolute path.

Covers the council-mandated crash guards and threshold behavior. The ``__main__``
block at the bottom runs fixture-free tests only; tests that require pytest
fixtures (``monkeypatch``, ``capsys``) are skipped in the standalone runner and
must be exercised via ``pytest``.
"""

import importlib.util
import pathlib

_THERMAL_PATH = str(pathlib.Path(__file__).parent.parent / "tmux" / "scripts" / "thermal.py")

spec = importlib.util.spec_from_file_location("thermal", _THERMAL_PATH)
assert spec is not None and spec.loader is not None
thermal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(thermal)


# -- _safe_float --------------------------------------------------------------

def test_safe_float_none_on_garbage():
    assert thermal._safe_float("abc") is None
    assert thermal._safe_float("") is None
    assert thermal._safe_float(None) is None


def test_safe_float_parses_numbers():
    assert thermal._safe_float("61.5") == 61.5
    assert thermal._safe_float(61.5) == 61.5


# -- _safe_int ----------------------------------------------------------------

def test_safe_int_none_on_garbage():
    assert thermal._safe_int("") is None
    assert thermal._safe_int("x") is None
    assert thermal._safe_int(None) is None


def test_safe_int_parses_numbers():
    assert thermal._safe_int("42") == 42
    assert thermal._safe_int(42) == 42


# -- _sanitize ----------------------------------------------------------------

def test_sanitize_strips_control_chars():
    assert thermal._sanitize("a\x1bb\x07c\x00d") == "abcd"


def test_sanitize_leaves_normal_text():
    assert thermal._sanitize("firefox-bin") == "firefox-bin"


def test_sanitize_strips_del_char():
    assert thermal._sanitize("x\x7fy") == "xy"


# -- _dig ---------------------------------------------------------------------

def test_dig_non_numeric_leaf_returns_none():
    data = {"chip": {"label": {"temp1_input": "not-a-number"}}}
    assert thermal._dig(data, "chip", "label", "temp1_input") is None


def test_dig_missing_key_returns_none():
    assert thermal._dig({"a": {}}, "a", "b") is None


def test_dig_numeric_leaf():
    data = {"chip": {"label": {"temp1_input": "61.5"}}}
    assert thermal._dig(data, "chip", "label", "temp1_input") == 61.5


# -- parse_sensors on malformed data -----------------------------------------

def test_parse_sensors_malformed_does_not_raise():
    bad = {"k10temp-pci-00c3": {"Tctl": {"temp1_input": "bad"}}}
    sd = thermal.parse_sensors(bad)
    assert isinstance(sd, thermal.SensorData)
    # the non-numeric Tctl degrades to None rather than raising
    assert sd.cpu_temp is None


def test_parse_sensors_empty_dict():
    sd = thermal.parse_sensors({})
    assert isinstance(sd, thermal.SensorData)
    assert sd.cpu_temp is None
    assert sd.nvme == ()


# -- temp_color thresholds ----------------------------------------------------

def test_temp_color_boundaries():
    assert thermal.temp_color(None) == thermal.MUTED
    assert thermal.temp_color(59.9) == thermal.TEAL_LT
    assert thermal.temp_color(60.0) == thermal.BLONDE   # boundary: not < 60
    assert thermal.temp_color(79.9) == thermal.BLONDE
    assert thermal.temp_color(80.0) == thermal.ERROR_LT  # boundary: not < 80
    assert thermal.temp_color(95.0) == thermal.ERROR_LT


# -- fan_color thresholds -----------------------------------------------------

def test_fan_color_boundaries():
    assert thermal.fan_color(None) == thermal.MUTED
    assert thermal.fan_color(0) == thermal.MUTED
    assert thermal.fan_color(-5) == thermal.MUTED
    assert thermal.fan_color(1) == thermal.TEAL_LT
    assert thermal.fan_color(3999) == thermal.TEAL_LT
    assert thermal.fan_color(4000) == thermal.BLONDE  # boundary: not < 4000
    assert thermal.fan_color(6000) == thermal.BLONDE


# -- bar_mode integration: empty sensor data ----------------------------------

def test_bar_mode_no_sensors_shows_na_muted(monkeypatch, capsys):
    """When _read_sensors returns {}, bar_mode must print N/A in MUTED color
    with only #[fg=...] tmux tags — no raw ANSI escape sequences."""
    monkeypatch.setattr(thermal, "_read_sensors", lambda: {})
    thermal.bar_mode()
    out = capsys.readouterr().out
    assert "N/A" in out
    assert thermal.MUTED in out
    assert "\033[" not in out  # no raw ANSI — tmux format tags only


# -- _max_fan: zero-RPM fan excluded from max ---------------------------------

def test_max_fan_ignores_zero():
    """A zero-RPM fan entry must not suppress valid readings from other fans
    and must not affect the max calculation (spec: 3300/3400/0 → 3400)."""
    sd = thermal.SensorData(
        cpu_temp=None,
        cpu_fan=3300.0,
        gpu_fan=3400.0,
        acpi_fan=0.0,
        nvme=(),
        ram_temp=None,
        ram_alarm=False,
    )
    result = thermal._max_fan(sd)
    assert result == 3400.0


import io as _io
import inspect as _inspect


def _needs_fixtures(fn: object) -> bool:
    """Return True if the function declares any pytest fixture parameters."""
    try:
        params = list(_inspect.signature(fn).parameters)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return False
    return bool(params)


# -- _build_frame battery N/A path -------------------------------------------

def test_build_frame_battery_none_shows_na_muted(monkeypatch, capsys):
    """When _read_battery returns None the rendered frame must contain a muted
    'Battery N/A' row — verifies the else-branch at thermal.py:427-428 against
    regression."""
    monkeypatch.setattr(thermal, "_read_sensors", lambda: {})
    monkeypatch.setattr(thermal, "_read_battery", lambda: None)
    monkeypatch.setattr(thermal, "_get_top_procs", lambda _sort: [])

    frame = thermal._build_frame()

    assert "Battery" in frame
    assert "N/A" in frame
    # The row must carry the MUTED color escape (ANSI 24-bit), not an accent color
    r, g, b = thermal._hex_to_rgb(thermal.MUTED)
    muted_ansi = f"\033[38;2;{r};{g};{b}m"
    assert muted_ansi in frame


# -- _nvme_model_map: PCI-key construction ------------------------------------

def test_nvme_model_map_pci_key_format(monkeypatch, tmp_path):
    """_nvme_model_map must produce keys matching 'nvme-pci-<bus><dev>' from the
    resolved PCI path, omitting the function nibble (the last hex char of
    slot group).  Verified against the regex in thermal.py:154-157."""
    import pathlib

    # Construct a fake /sys/class/nvme/nvme0 with model and device symlink
    nvme_class = tmp_path / "sys" / "class" / "nvme"
    nvme_class.mkdir(parents=True)
    nvme0 = nvme_class / "nvme0"
    nvme0.mkdir()
    # model file
    (nvme0 / "model").write_text("SAMSUNG MZVL21T0HCLR-00B00  \n")
    # device symlink → path containing a PCI slot "03:00.0"
    pci_target = tmp_path / "sys" / "devices" / "pci0000:00" / "0000:03:00.0"
    pci_target.mkdir(parents=True)
    (nvme0 / "device").symlink_to(pci_target)

    # Patch Path("/sys/class/nvme") to use tmp_path tree
    original_path_class = thermal.Path

    class _PatchedPath(pathlib.Path):
        _flavour = pathlib.Path(".")._flavour  # type: ignore[attr-defined]

        def __new__(cls, *args, **kwargs):
            return super().__new__(cls, *args, **kwargs)

    monkeypatch.setattr(
        thermal,
        "Path",
        lambda p: pathlib.Path(str(p).replace("/sys/class/nvme", str(nvme_class))),
    )

    result = thermal._nvme_model_map()

    # The regex extracts groups (03, 00, 0) → pci_slot = "03000"
    # chip_key = f"nvme-pci-{pci_slot[:-1]}" = "nvme-pci-0300"
    assert "nvme-pci-0300" in result
    assert result["nvme-pci-0300"] == "SAMSUNG MZVL21T0HCLR-00B00"


def test_nvme_model_map_no_sysfs(monkeypatch):
    """_nvme_model_map must return an empty dict when /sys/class/nvme does not
    exist (e.g. inside CI without NVMe hardware)."""
    import pathlib

    monkeypatch.setattr(
        thermal,
        "Path",
        lambda p: type("_FakePath", (), {"exists": lambda self: False})(),
    )
    result = thermal._nvme_model_map()
    assert result == {}


# -- _is_fan_duplicate: ACPI-fan suppression ----------------------------------

def test_is_fan_duplicate_suppresses_acpi_near_cpu():
    """ACPI fan within FAN_DUP_THRESHOLD of cpu_fan must be flagged as
    duplicate — the _build_frame guard at thermal.py:358-364 relies on this
    returning True to omit the ACPI row."""
    # Exactly at threshold boundary (abs diff == FAN_DUP_THRESHOLD → duplicate)
    assert thermal._is_fan_duplicate(2000.0, 2000.0 + thermal.FAN_DUP_THRESHOLD) is True
    # One RPM above threshold → not a duplicate
    assert thermal._is_fan_duplicate(2000.0, 2000.0 + thermal.FAN_DUP_THRESHOLD + 1) is False


def test_is_fan_duplicate_none_inputs():
    """_is_fan_duplicate must return False when either input is None (guard
    against None fan readings that arrive when the sensor is absent)."""
    assert thermal._is_fan_duplicate(None, 1000.0) is False
    assert thermal._is_fan_duplicate(1000.0, None) is False
    assert thermal._is_fan_duplicate(None, None) is False


def test_build_frame_acpi_fan_suppressed_when_duplicate(monkeypatch):
    """When acpi_fan is within FAN_DUP_THRESHOLD of cpu_fan, the ACPI Fan row
    must be absent from the rendered frame (spec §3.4 duplicate-fan guard)."""
    cpu_fan_val = 2500.0
    acpi_fan_val = cpu_fan_val + thermal.FAN_DUP_THRESHOLD  # at boundary → duplicate

    # Return a non-empty dict so _build_frame calls parse_sensors (not the fallback)
    monkeypatch.setattr(thermal, "_read_sensors", lambda: {"_sentinel": True})
    monkeypatch.setattr(thermal, "_read_battery", lambda: None)
    monkeypatch.setattr(thermal, "_get_top_procs", lambda _sort: [])

    # Patch parse_sensors to return a controlled SensorData
    monkeypatch.setattr(
        thermal,
        "parse_sensors",
        lambda _data: thermal.SensorData(
            cpu_temp=55.0,
            cpu_fan=cpu_fan_val,
            gpu_fan=2400.0,
            acpi_fan=acpi_fan_val,
            nvme=(),
            ram_temp=None,
            ram_alarm=False,
        ),
    )

    frame = thermal._build_frame()
    assert "ACPI Fan" not in frame


def test_build_frame_acpi_fan_shown_when_not_duplicate(monkeypatch):
    """When acpi_fan differs from both cpu_fan and gpu_fan by more than
    FAN_DUP_THRESHOLD and is > 0, the ACPI Fan row must appear in the frame."""
    cpu_fan_val = 2500.0
    gpu_fan_val = 2400.0
    acpi_fan_val = cpu_fan_val + thermal.FAN_DUP_THRESHOLD + 500  # clearly distinct

    # Return a non-empty dict so _build_frame calls parse_sensors (not the fallback)
    monkeypatch.setattr(thermal, "_read_sensors", lambda: {"_sentinel": True})
    monkeypatch.setattr(thermal, "_read_battery", lambda: None)
    monkeypatch.setattr(thermal, "_get_top_procs", lambda _sort: [])
    monkeypatch.setattr(
        thermal,
        "parse_sensors",
        lambda _data: thermal.SensorData(
            cpu_temp=55.0,
            cpu_fan=cpu_fan_val,
            gpu_fan=gpu_fan_val,
            acpi_fan=acpi_fan_val,
            nvme=(),
            ram_temp=None,
            ram_alarm=False,
        ),
    )

    frame = thermal._build_frame()
    assert "ACPI Fan" in frame


def _run_standalone() -> int:
    """Run fixture-free test_* functions; skip those requiring pytest fixtures."""
    failures: list[str] = []
    skipped: list[str] = []
    funcs = sorted(
        (name, obj)
        for name, obj in globals().items()
        if name.startswith("test_") and callable(obj)
    )
    for name, fn in funcs:
        if _needs_fixtures(fn):
            skipped.append(name)
            print(f"SKIP {name}  (requires pytest fixtures)")
            continue
        try:
            fn()
            print(f"PASS {name}")
        except Exception as exc:  # noqa: BLE001 — report any failure
            failures.append(name)
            print(f"FAIL {name}: {exc.__class__.__name__}: {exc}")
    runnable = len(funcs) - len(skipped)
    print(f"\n{runnable - len(failures)}/{runnable} passed  ({len(skipped)} skipped — run pytest for full suite)")
    return 1 if failures else 0


if __name__ == "__main__":
    import sys

    sys.exit(_run_standalone())
