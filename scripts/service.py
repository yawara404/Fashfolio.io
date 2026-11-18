#!/usr/bin/env python3
"""Keep the local editing server alive independently of terminal sessions."""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import socket
import subprocess
import sys
from urllib.parse import urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = f"gui/{os.getuid()}"
LABELS = {name: f"io.fashfolio.{name}" for name in ("backend", "frontend", "watchdog")}
AGENTS = Path.home() / "Library/LaunchAgents"
LOGS = ROOT / "logs"
STATE = ROOT / ".data/service-watchdog.json"
PYTHON = ROOT / "backend/.venv/bin/python"
FAILURE_LIMIT = 3
RESTART_COOLDOWN = 120


def launch(*args, check=True):
    return subprocess.run(["/bin/launchctl", *args], check=check, capture_output=True, text=True)


def installed(name):
    return launch("print", f"{DOMAIN}/{LABELS[name]}", check=False).returncode == 0


def fetch(path, port=3005):
    with urlopen(f"http://127.0.0.1:{port}{path}", timeout=5) as response:
        body = response.read(2 * 1024 * 1024).decode("utf-8")
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        return body, response.headers.get("Content-Type", "")


def probe(name):
    try:
        if name == "backend":
            body, _ = fetch("/api/health", 8085)
            if json.loads(body).get("service") != "fashfolio-python":
                raise ValueError("Unexpected API response")
        else:
            for path in ("/", "/tryon"):
                body, content_type = fetch(path)
                if "text/html" not in content_type or "Fashfolio" not in body:
                    raise ValueError(f"Invalid page: {path}")
                scripts = re.findall(r'<script[^>]+src="([^"]+)"', body)
                assets = [src for src in scripts if src.startswith("/_nuxt/") and not urlsplit(src).netloc]
                if not assets:
                    raise ValueError("Page has no application scripts")
                for src in assets:
                    _, asset_type = fetch(src)
                    if not any(kind in asset_type for kind in ("javascript", "ecmascript")):
                        raise ValueError("Application script unavailable")
        return True, "OK"
    except Exception as error:
        return False, f"{type(error).__name__}: {error}"


def should_restart(failures, now, last_restart):
    return failures >= FAILURE_LIMIT and now - last_restart >= RESTART_COOLDOWN


def rotate_logs():
    for path in LOGS.glob("*.log"):
        if path.stat().st_size > 5 * 1024 * 1024:
            # Truncate in place: launchd and existing children retain this descriptor.
            with path.open("r+b") as stream:
                stream.seek(-512 * 1024, os.SEEK_END)
                tail = stream.read()
                stream.seek(0)
                stream.write(tail)
                stream.truncate()


def watchdog():
    from time import time

    try:
        state = json.loads(STATE.read_text())
        if not isinstance(state, dict):
            state = {}
    except (OSError, ValueError):
        state = {}
    now = time()
    for name in ("backend", "frontend"):
        # An intentionally unloaded service must stay stopped.
        if not installed(name):
            state.pop(name, None)
            continue
        healthy, message = probe(name)
        previous = state.get(name, {})
        failures = 0 if healthy else previous.get("failures", 0) + 1
        last_restart = previous.get("last_restart", 0)
        if not healthy:
            print(f"{datetime.now(timezone.utc).isoformat()} {name} failure {failures}: {message}", flush=True)
        if should_restart(failures, now, last_restart):
            result = launch("kickstart", "-k", f"{DOMAIN}/{LABELS[name]}", check=False)
            print(f"Restart {name}: {'OK' if result.returncode == 0 else result.stderr.strip()}", flush=True)
            last_restart = now
            failures = 0
        state[name] = {"failures": failures, "last_restart": last_restart}
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE.with_suffix(".tmp")
    temp.write_text(json.dumps(state))
    temp.replace(STATE)
    rotate_logs()


def configurations():
    npm = shutil.which("npm")
    if not npm or not PYTHON.exists():
        raise RuntimeError("Run npm run setup first; Node.js and the Python virtualenv are required.")
    env = {"PATH": f"{Path(npm).parent}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "PYTHONUNBUFFERED": "1", "NUXT_API_BASE": "http://127.0.0.1:8085"}
    specs = {
        "backend": ([str(PYTHON), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8085", "--reload"], ROOT / "backend"),
        "frontend": ([npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", "3005"], ROOT / "frontend"),
        "watchdog": ([str(PYTHON), str(ROOT / "scripts/service.py"), "watchdog"], ROOT),
    }
    for name, (args, cwd) in specs.items():
        config = {"Label": LABELS[name], "ProgramArguments": args, "WorkingDirectory": str(cwd), "EnvironmentVariables": env, "RunAtLoad": True, "StandardOutPath": str(LOGS / f"{name}.log"), "StandardErrorPath": str(LOGS / f"{name}.log")}
        if name == "watchdog":
            config["StartInterval"] = 20
        else:
            config.update(KeepAlive=True, ThrottleInterval=10)
        yield name, config


def install():
    AGENTS.mkdir(parents=True, exist_ok=True)
    LOGS.mkdir(parents=True, exist_ok=True)
    for name, config in configurations():
        path = AGENTS / f"{LABELS[name]}.plist"
        if path.exists() and plistlib.loads(path.read_bytes()) == config:
            continue
        if installed(name):
            launch("bootout", f"{DOMAIN}/{LABELS[name]}")
        path.write_bytes(plistlib.dumps(config))
        path.chmod(0o600)
    print("Installed Fashfolio LaunchAgents.")


def start():
    for name, port in (("backend", 8085), ("frontend", 3005)):
        if installed(name):
            continue
        with socket.socket() as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                raise RuntimeError(f"Port {port} is in use. Stop the existing Fashfolio development server before starting services.") from None
    for name in ("backend", "frontend", "watchdog"):
        if not installed(name):
            path = AGENTS / f"{LABELS[name]}.plist"
            if not path.exists():
                raise RuntimeError("Run npm run service:install first.")
            launch("bootstrap", DOMAIN, str(path))
    print("Fashfolio: http://127.0.0.1:3005 (logs: logs/)")


def stop():
    for name in ("watchdog", "frontend", "backend"):
        if installed(name):
            launch("bootout", f"{DOMAIN}/{LABELS[name]}")
    STATE.unlink(missing_ok=True)
    print("Stopped Fashfolio services.")


def status():
    healthy = True
    for name in ("backend", "frontend"):
        ok, message = probe(name)
        print(f"{name}: {'OK' if ok else 'FAILED'}; launchd={'loaded' if installed(name) else 'not loaded'}; {message}")
        healthy = healthy and ok
    print(f"watchdog: {'loaded' if installed('watchdog') else 'not loaded'}")
    return 0 if healthy else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "start", "stop", "status", "watchdog"))
    action = parser.parse_args().action
    if action == "status":
        return status()
    {"install": install, "start": start, "stop": stop, "watchdog": watchdog}[action]()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
