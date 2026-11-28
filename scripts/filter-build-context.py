#!/usr/bin/env python3
"""Filter Git's NUL-delimited paths before creating the Docker build archive.

Git ignores untracked private files, and this denylist also excludes accidentally
tracked runtime files. It does not walk or open excluded paths. Keep vendored
web/vscode-web node_modules, which are intentionally part of the repository.
"""
import os
from pathlib import PurePosixPath
import sys

ROOT_DIRS = {".git", ".data", ".local", "local", "workspaces", "bin"}
ANY_DIRS = {".git", ".data", ".venv", "__pycache__"}
EXACT_FILES = {"upstream.json", "upstream-overrides.json"}
EXCLUDED_E2E = {".auth", "playwright-report", "test-results"}


def permitted(raw: bytes) -> bool:
    name = os.fsdecode(raw)
    if not name or name.startswith("/") or "\\" in name:
        return False
    parts = PurePosixPath(name).parts
    if not parts or any(p in ("", ".", "..") for p in parts):
        return False
    if parts[0] in ROOT_DIRS:
        return False
    if any(p in ANY_DIRS for p in parts):
        return False
    if "node_modules" in parts and parts[:2] != ("web", "vscode-web"):
        return False
    if parts[:2] == ("web", "native-chat"):
        return False
    if len(parts) > 1 and parts[0] == "e2e" and parts[1] in EXCLUDED_E2E:
        return False
    basename = parts[-1]
    if basename.startswith(".env") or basename in EXACT_FILES:
        return False
    if basename.endswith((".log", ".db", ".pyc")) or ".db-" in basename:
        return False
    if name == "scripts/check-upstream.py":
        return False
    return True


for item in sys.stdin.buffer.read().split(b"\x00"):
    if item and permitted(item):
        sys.stdout.buffer.write(item + b"\x00")
