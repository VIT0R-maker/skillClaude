#!/usr/bin/env python3
"""Start, inspect, or stop Animate's local HTTP server."""

from __future__ import annotations

import argparse
import http.server
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATE = Path('/tmp/animate-server.json')
LOG = Path('/tmp/animate-server.log')
HOST = '127.0.0.1'
DEFAULT_PORT = 4173


def read_state() -> dict | None:
    try:
        return json.loads(STATE.read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError, TypeError):
        return False


def responds(port: int) -> bool:
    try:
        with urllib.request.urlopen(f'http://{HOST}:{port}/index.html', timeout=0.8) as response:
            return response.status == 200
    except Exception:
        return False


def active_state() -> dict | None:
    state = read_state()
    if not state:
        return None
    if pid_alive(state.get('pid')) and responds(state.get('port')):
        return state
    try:
        STATE.unlink()
    except FileNotFoundError:
        pass
    return None


def available_port() -> int:
    for port in range(DEFAULT_PORT, DEFAULT_PORT + 50):
        with socket.socket() as sock:
            try:
                sock.bind((HOST, port))
                return port
            except OSError:
                continue
    raise RuntimeError('No free local port found between 4173 and 4222.')


def start() -> int:
    state = active_state()
    if state:
        print(state['url'])
        return 0

    port = available_port()
    with LOG.open('ab') as log:
        process = subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), 'run', '--port', str(port)],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=log,
            start_new_session=True,
        )

    url = f'http://{HOST}:{port}/'
    for _ in range(40):
        if responds(port):
            print(url)
            return 0
        if process.poll() is not None:
            break
        time.sleep(0.1)
    print(f'Animate server failed to start. See {LOG}.', file=sys.stderr)
    return 1


def run(port: int) -> int:
    os.chdir(ROOT)
    server = http.server.ThreadingHTTPServer((HOST, port), http.server.SimpleHTTPRequestHandler)
    STATE.write_text(json.dumps({
        'pid': os.getpid(),
        'port': port,
        'url': f'http://{HOST}:{port}/',
        'root': str(ROOT),
    }, indent=2) + '\n')

    def shutdown(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, shutdown)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        state = read_state()
        if state and state.get('pid') == os.getpid():
            STATE.unlink(missing_ok=True)
    return 0


def status() -> int:
    state = active_state()
    if state:
        print(state['url'])
        return 0
    print('stopped')
    return 1


def stop() -> int:
    state = read_state()
    if not state or not pid_alive(state.get('pid')):
        STATE.unlink(missing_ok=True)
        print('stopped')
        return 0
    os.kill(state['pid'], signal.SIGTERM)
    for _ in range(30):
        if not pid_alive(state['pid']):
            break
        time.sleep(0.1)
    STATE.unlink(missing_ok=True)
    print('stopped')
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command', required=True)
    subparsers.add_parser('start')
    subparsers.add_parser('status')
    subparsers.add_parser('stop')
    run_parser = subparsers.add_parser('run')
    run_parser.add_argument('--port', type=int, required=True)
    args = parser.parse_args()
    if args.command == 'start':
        return start()
    if args.command == 'status':
        return status()
    if args.command == 'stop':
        return stop()
    return run(args.port)


if __name__ == '__main__':
    raise SystemExit(main())
