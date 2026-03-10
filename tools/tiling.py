#!/usr/bin/env python3
"""
Chrysaki Tiling System — Generator
Produces trapezoid tiling sequences for any renderer (CSS, terminal, ASCII).

Usage:
    python tiling.py --n 4 --left '|' --right '/' --format css
    python tiling.py --preset zigzag --n 5 --format ascii --direction rtl
    python tiling.py --preset zigzag-alt --n 4 --format tmux --fg '#6a6e82' --bg '#1c1f2b'

See chrysaki/TILING.md for the full specification.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from enum import Enum


# ---------------------------------------------------------------------------
# Core model
# ---------------------------------------------------------------------------

class Edge(Enum):
    STRAIGHT = '|'
    FORWARD  = '/'
    BACK     = '\\'

    @classmethod
    def from_char(cls, c: str) -> 'Edge':
        for e in cls:
            if e.value == c:
                return e
        raise ValueError(f"Unknown edge character: {c!r}  (use |, /, or \\)")

    def opposite(self) -> 'Edge':
        if self == Edge.FORWARD:
            return Edge.BACK
        if self == Edge.BACK:
            return Edge.FORWARD
        return Edge.STRAIGHT  # | is self-opposite

    def flip(self) -> 'Edge':
        """Alias for opposite — used in RTL mirroring."""
        return self.opposite()


@dataclass
class Element:
    left: Edge
    right: Edge

    def __str__(self) -> str:
        return f"({self.left.value},{self.right.value})"

    def __repr__(self) -> str:
        return str(self)


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

PRESETS: dict[str, tuple[Edge, Edge]] = {
    'zigzag':     (Edge.STRAIGHT, Edge.FORWARD),
    'zigzag-alt': (Edge.STRAIGHT, Edge.BACK),
    'chevron':    (Edge.FORWARD,  Edge.FORWARD),
    'flat':       (Edge.STRAIGHT, Edge.STRAIGHT),
}


# ---------------------------------------------------------------------------
# Tiling algorithm
# ---------------------------------------------------------------------------

def tile(first_left: Edge, first_right: Edge, n: int) -> list[Element]:
    """
    Generate a tiling strip of N elements.

    Algorithm (from TILING.md §4):
      N=1 : [(first_left, |)]
      N>1 : element 1       = (first_left, first_right)
            element i (mid) = (prev.right, opposite(prev.right))
            element N (last)= (prev.right, |)
    """
    if n <= 0:
        return []
    if n == 1:
        return [Element(first_left, Edge.STRAIGHT)]

    elements: list[Element] = []
    elements.append(Element(first_left, first_right))

    for _ in range(1, n - 1):
        prev_right = elements[-1].right
        elements.append(Element(prev_right, prev_right.opposite()))

    prev_right = elements[-1].right
    elements.append(Element(prev_right, Edge.STRAIGHT))

    return elements


def mirror(elements: list[Element]) -> list[Element]:
    """
    RTL mirror: reverse element order, then flip / ↔ \\ on both edges of each element.
    See TILING.md §5.
    """
    return [Element(el.right.flip(), el.left.flip()) for el in reversed(elements)]


# ---------------------------------------------------------------------------
# Renderers
# ---------------------------------------------------------------------------

def to_ascii(elements: list[Element]) -> str:
    """
    ASCII diagram for documentation.

    Each element renders as: LEFT + underscores + RIGHT
    Underscore count = 3 minus 1 for each '|' edge (keeps visual widths equal).
    Elements are space-separated.
    """
    parts = []
    for el in elements:
        underscores = 3
        if el.left  == Edge.STRAIGHT:
            underscores -= 1
        if el.right == Edge.STRAIGHT:
            underscores -= 1
        parts.append(el.left.value + '_' * underscores + el.right.value)
    return ' '.join(parts)


def to_css_clip_paths(elements: list[Element], inset: int = 16) -> list[str]:
    """
    CSS clip-path polygon strings, one per element.

    Points (clockwise): top-left, top-right, bottom-right, bottom-left.
    See TILING.md §8.1 for the full point table.

    Set margin-left: -{inset}px on all elements except the first to overlap correctly.
    """
    results = []
    I = inset

    for el in elements:
        # Left edge → TL and BL
        if el.left == Edge.STRAIGHT:
            tl = f"0px 0%"
            bl = f"0px 100%"
        elif el.left == Edge.FORWARD:
            tl = f"{I}px 0%"
            bl = f"0px 100%"
        else:  # BACK
            tl = f"0px 0%"
            bl = f"{I}px 100%"

        # Right edge → TR and BR
        if el.right == Edge.STRAIGHT:
            tr = f"100% 0%"
            br = f"100% 100%"
        elif el.right == Edge.FORWARD:
            tr = f"100% 0%"
            br = f"calc(100% - {I}px) 100%"
        else:  # BACK
            tr = f"calc(100% - {I}px) 0%"
            br = f"100% 100%"

        results.append(f"clip-path: polygon({tl}, {tr}, {br}, {bl});")

    return results


# Nerd Font glyph map: edge → separator character
_GLYPH: dict[Edge, str] = {
    Edge.FORWARD:  '\ue0b8',  # U+E0B8  / diagonal
    Edge.BACK:     '\ue0bc',  # U+E0BC  \ diagonal
    Edge.STRAIGHT: '\ue0b0',  # U+E0B0  straight fill cap
}


def to_tmux_format(elements: list[Element], fg: str, bg: str) -> list[str]:
    """
    tmux status-format strings with Nerd Font powerline glyphs.

    Each element produces a format string:
        LEFT_GLYPH [fg=<bg>,bg=<bg>]  body text placeholder  RIGHT_GLYPH [fg=<bg>,bg=abyss]

    The glyph foreground = block bg (glyph "bleeds" from the block color).
    The glyph background = outer bg (abyss) for the separator gap.

    fg  — foreground text color for the element body (e.g. '#6a6e82')
    bg  — background fill color for the element block (e.g. '#1c1f2b')
    """
    abyss = '#0f1117'
    results = []

    for el in elements:
        left_glyph  = _GLYPH[el.left]
        right_glyph = _GLYPH[el.right]

        # Left separator: glyph fg=abyss, bg=block (entering the block)
        left_sep  = f"#[fg={abyss},bg={bg}]{left_glyph}"
        # Body text
        body      = f"#[fg={fg},bg={bg}] #I:#W "
        # Right separator: glyph fg=block, bg=abyss (leaving the block)
        right_sep = f"#[fg={bg},bg={abyss}]{right_glyph}"

        results.append(left_sep + body + right_sep)

    return results


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_zigzag_n4() -> bool:
    """
    Cross-check: zigzag LTR N=4 ASCII must equal the canonical value from TILING.md.
    Returns True if valid, False otherwise.
    """
    first_left, first_right = PRESETS['zigzag']
    elements = tile(first_left, first_right, 4)
    result   = to_ascii(elements)
    expected = '|__/ /___\\ \\___/ /__|'
    ok = result == expected
    if not ok:
        print(f"[FAIL] zigzag N=4 ASCII\n  got:      {result!r}\n  expected: {expected!r}",
              file=sys.stderr)
    return ok


def validate_zigzag_alt_n4() -> bool:
    """
    Cross-check: zigzag-alt LTR N=4 must match the tmux chrysaki.conf zigzag pattern.
    Session(|,\\) + window-even(\\,/) + window-odd(/,\\) + last(\\,|)
    """
    first_left, first_right = PRESETS['zigzag-alt']
    elements = tile(first_left, first_right, 4)
    expected_edges = [
        (Edge.STRAIGHT, Edge.BACK),
        (Edge.BACK,     Edge.FORWARD),
        (Edge.FORWARD,  Edge.BACK),
        (Edge.BACK,     Edge.STRAIGHT),
    ]
    ok = all(
        el.left == exp_l and el.right == exp_r
        for el, (exp_l, exp_r) in zip(elements, expected_edges)
    )
    if not ok:
        got = [(el.left, el.right) for el in elements]
        print(f"[FAIL] zigzag-alt N=4 edge sequence\n  got:      {got}\n  expected: {expected_edges}",
              file=sys.stderr)
    return ok


def run_validation() -> int:
    """Run all validations. Returns 0 on success, 1 on any failure."""
    checks = [validate_zigzag_n4, validate_zigzag_alt_n4]
    results = [fn() for fn in checks]
    passed = sum(results)
    total  = len(results)
    print(f"Validation: {passed}/{total} checks passed.")
    return 0 if all(results) else 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_inset(s: str) -> int:
    """Parse '16px' or '16' → 16."""
    return int(s.rstrip('px'))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description='Chrysaki tiling strip generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tiling.py --preset zigzag --n 4 --format ascii
  python tiling.py --preset zigzag --n 4 --format ascii --direction rtl
  python tiling.py --n 3 --left '|' --right '/' --format css --inset 16px
  python tiling.py --preset zigzag-alt --n 4 --format tmux --fg '#6a6e82' --bg '#1c1f2b'
  python tiling.py --validate
""")

    parser.add_argument('--preset', choices=list(PRESETS),
                        help='Named preset (overrides --left / --right)')
    parser.add_argument('--left',  default='|',
                        help='Left edge of first element: |, /, \\ (default: |)')
    parser.add_argument('--right', default='/',
                        help='Right edge of first element: |, /, \\ (default: /)')
    parser.add_argument('--n', type=int, default=4,
                        help='Number of elements (default: 4)')
    parser.add_argument('--format', choices=['ascii', 'css', 'tmux', 'elements'],
                        default='ascii',
                        help='Output format (default: ascii)')
    parser.add_argument('--direction', choices=['ltr', 'rtl'], default='ltr',
                        help='Strip direction (default: ltr)')
    parser.add_argument('--inset', default='16px',
                        help='CSS inset depth in px (default: 16px)')
    parser.add_argument('--fg', default='#6a6e82',
                        help='Foreground text color for tmux format (default: #6a6e82)')
    parser.add_argument('--bg', default='#1c1f2b',
                        help='Block background color for tmux format (default: #1c1f2b)')
    parser.add_argument('--validate', action='store_true',
                        help='Run built-in validation checks and exit')

    args = parser.parse_args(argv)

    if args.validate:
        return run_validation()

    # Resolve edges
    if args.preset:
        first_left, first_right = PRESETS[args.preset]
    else:
        first_left  = Edge.from_char(args.left)
        first_right = Edge.from_char(args.right)

    # Generate
    elements = tile(first_left, first_right, args.n)

    if args.direction == 'rtl':
        elements = mirror(elements)

    # Render
    fmt = args.format
    if fmt == 'ascii':
        print(to_ascii(elements))

    elif fmt == 'css':
        inset = _parse_inset(args.inset)
        lines = to_css_clip_paths(elements, inset=inset)
        for i, line in enumerate(lines):
            prefix = f"/* element {i+1}: {elements[i]} */"
            print(prefix)
            print(line)

    elif fmt == 'tmux':
        lines = to_tmux_format(elements, fg=args.fg, bg=args.bg)
        for i, line in enumerate(lines):
            print(f"# element {i+1}: {elements[i]}")
            print(line)

    elif fmt == 'elements':
        for i, el in enumerate(elements):
            print(f"{i+1}: {el}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
