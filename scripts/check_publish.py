#!/usr/bin/env python3
"""Reject local data and credentials even if they were force-added to Git."""
from pathlib import Path, PurePosixPath
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
records = subprocess.check_output(["git", "ls-files", "--stage", "-z"], cwd=root).split(b"\0")
private_dirs = {"node_modules", ".venv", "venv", ".nuxt", ".output", ".data", ".cache", ".vscode", ".idea", "uploads", "secrets", "model-cache", "models-cache"}
private_suffixes = {".pem", ".key", ".p12", ".pfx", ".jks", ".db", ".sqlite", ".sqlite3", ".onnx", ".safetensors", ".gguf", ".ckpt", ".pt", ".pth", ".log", ".tmp", ".bak"}
errors = []
for record in filter(None, records):
    metadata, filename = record.split(b"\t", 1)
    path = filename.decode("utf-8", "surrogateescape")
    relative = PurePosixPath(path)
    name = relative.name
    reason = None
    if any(part in private_dirs for part in relative.parts):
        reason = "local data/build directory"
    elif (name == ".env" or name.startswith(".env.")) and name != ".env.example":
        reason = "environment secrets"
    elif relative.suffix.lower() in private_suffixes or name in {"id_rsa", "id_ed25519", "credentials.json", ".npmrc"}:
        reason = "credential, model or local scratch file"
    elif metadata.split()[0] == b"120000":
        reason = "symlink (review and commit the real source instead)"
    elif (root / path).exists() and (root / path).stat().st_size > 20 * 1024 * 1024:
        reason = "file larger than 20 MiB"
    if reason:
        errors.append(f"{path}: {reason}")
if errors:
    print("Refusing to publish:\n" + "\n".join(errors), file=sys.stderr)
    sys.exit(1)
print("Publish file guard passed.")
