#!/usr/bin/env python3
"""Patch Pake's JS injector so scripts run at document-start."""
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: patch-pake-injection.py /path/to/Pake/bin/utils/combine.ts")

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")

old = """      return (
        "window.addEventListener('DOMContentLoaded', (_event) => {\\n" +
        fileContent +
        '\\n});'
      );"""

new = """      // vBlockTube must hook YouTube globals before YouTube's own scripts.
      // The default DOMContentLoaded wrapper is too late for @run-at document-start.
      return fileContent;"""

if old not in source:
    raise SystemExit(
        f"Expected Pake combineFiles wrapper not found in {path}. "
        "Pake's source changed; inspect bin/utils/combine.ts and update this patch."
    )

path.write_text(source.replace(old, new, 1), encoding="utf-8")
print(f"Patched {path}: injected JavaScript now runs as an initialization script.")
