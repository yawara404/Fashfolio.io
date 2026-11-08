#!/usr/bin/env python3
"""Run the independent Nuxt and FastAPI processes; stop only our own children."""

import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[1]
backend_port = int(os.environ.get("BACKEND_PORT", "8085"))
frontend_port = int(os.environ.get("FRONTEND_PORT", "3005"))
for port in (backend_port, frontend_port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            sys.exit(
                f"Port {port} is already in use. Set BACKEND_PORT / FRONTEND_PORT to a free port."
            )
env = {**os.environ, "NUXT_API_BASE": f"http://127.0.0.1:{backend_port}"}
children = []


def shutdown(*_):
    for child in children:
        if child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for child in children:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)
try:
    children.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(backend_port),
                "--reload",
            ],
            cwd=root / "backend",
            env=env,
            start_new_session=True,
        )
    )
    children.append(
        subprocess.Popen(
            [
                "npm",
                "run",
                "dev",
                "--",
                "--host",
                "127.0.0.1",
                "--port",
                str(frontend_port),
            ],
            cwd=root / "frontend",
            env=env,
            start_new_session=True,
        )
    )
    print(
        f"\nFashfolio: http://127.0.0.1:{frontend_port}\nPython API docs: http://127.0.0.1:{backend_port}/docs\nCtrl+C stops both services.\n",
        flush=True,
    )
    while all(child.poll() is None for child in children):
        time.sleep(0.5)
finally:
    shutdown()
