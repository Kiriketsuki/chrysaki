#!/usr/bin/env python3
"""Pytest suite for thermal.py — CWD-independent via importlib by absolute path.

Covers the council-mandated crash guards and threshold behavior. Also runnable
directly without pytest via the ``__main__`` block at the bottom.
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
    assert sd.nvme == []


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


def _run_standalone() -> int:
    """Run every test_* function in this module; return non-zero on failure."""
    failures: list[str] = []
    funcs = sorted(
        (name, obj)
        for name, obj in globals().items()
        if name.startswith("test_") and callable(obj)
    )
    for name, fn in funcs:
        try:
            fn()
            print(f"PASS {name}")
        except Exception as exc:  # noqa: BLE001 — report any failure
            failures.append(name)
            print(f"FAIL {name}: {exc.__class__.__name__}: {exc}")
    print(f"\n{len(funcs) - len(failures)}/{len(funcs)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    import sys

    sys.exit(_run_standalone())
