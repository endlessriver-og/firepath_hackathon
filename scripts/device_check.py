"""Live bench test for the FirePath ESP32 preparedness prototype.

Finds the board on USB, optionally compiles and flashes the sketch with arduino-cli,
sends the same SIMULATED demo alert the web app sends, and prints what the board reports.

    .venv/bin/python scripts/device_check.py            # test an already-flashed board
    .venv/bin/python scripts/device_check.py --flash    # compile + upload first
    .venv/bin/python scripts/device_check.py --listen 90  # also watch MQ-2 events (30 s warmup)

This is a demonstration check, not a safety test. The MQ-2 threshold is uncalibrated.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import time

import serial
from serial.tools import list_ports

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKETCH = ROOT / 'examples' / 'esp32_preparedness'
# USB-serial bridges common on ESP32 dev boards: Silicon Labs CP210x, WCH CH340/CH9102, FTDI, Espressif native USB.
KNOWN_VIDS = {0x10C4: 'CP210x', 0x1A86: 'CH340/CH9102', 0x0403: 'FTDI', 0x303A: 'Espressif USB'}
DEMO_ALERT = {'type': 'alert', 'hazard': 'wildfire', 'severity': 'warning', 'text': 'Demo only. Check official Glendale alerts for real instructions.', 'source': 'demo'}


def find_port(explicit):
    if explicit:
        return explicit
    candidates = [p for p in list_ports.comports() if p.vid in KNOWN_VIDS]
    if not candidates:
        found = ', '.join(p.device for p in list_ports.comports()) or 'none'
        sys.exit(f'No ESP32 USB-serial board found (ports seen: {found}).\n'
                 'Plug the board in with a data-capable USB cable, or pass --port /dev/cu.XXXX.')
    port = candidates[0]
    print(f'Board: {port.device} ({KNOWN_VIDS[port.vid]}, {port.description})')
    return port.device


def flash(port, fqbn):
    cli = shutil.which('arduino-cli') or str(pathlib.Path.home() / '.local/bin/arduino-cli')
    print(f'Compiling and uploading {SKETCH.name} to {port} as {fqbn} ...')
    result = subprocess.run([cli, 'compile', '--upload', '--fqbn', fqbn, '--port', port, str(SKETCH)])
    if result.returncode:
        sys.exit('Upload failed. On many boards: hold BOOT, tap EN/RST, release BOOT, then retry.')


def read_lines(conn, seconds, stop_on=None):
    deadline, events = time.time() + seconds, []
    while time.time() < deadline:
        raw = conn.readline().decode('utf-8', 'replace').strip()
        if not raw:
            continue
        try:
            event = json.loads(raw)
        except ValueError:
            print(f'  (board log) {raw}')
            continue
        print(f'  board → {raw}')
        events.append(event)
        if stop_on and stop_on(event):
            break
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--port')
    parser.add_argument('--flash', action='store_true')
    parser.add_argument('--fqbn', default='esp32:esp32:esp32', help='arduino-cli board id (default: generic ESP32 Dev Module)')
    parser.add_argument('--listen', type=int, default=0, help='seconds to watch for MQ-2 sensor events after the alert test')
    args = parser.parse_args()

    port = find_port(args.port)
    if args.flash:
        flash(port, args.fqbn)

    with serial.Serial(port, 115200, timeout=0.5) as conn:
        # Opening the port resets most ESP32 dev boards; wait for the boot message.
        print('Waiting for the board to boot ...')
        booted = any(e.get('type') == 'ready' for e in read_lines(conn, 6, lambda e: e.get('type') == 'ready'))
        if not booted:
            print('  No ready message (older firmware, or the board did not reset). Continuing.')

        print('Sending SIMULATED demo alert (not a real emergency alert) ...')
        conn.write((json.dumps(DEMO_ALERT, separators=(',', ':')) + '\n').encode())
        acked = any(e.get('type') == 'ack' for e in read_lines(conn, 3, lambda e: e.get('type') == 'ack'))
        print('PASS: board acknowledged the demo alert. You should hear about 3 seconds of beeping.' if acked
              else 'FAIL: no acknowledgement. Check the port, baud rate (115200) and that the latest sketch is flashed (--flash).')

        if args.listen:
            print(f'Listening {args.listen} s for MQ-2 events. The sketch ignores the sensor for 30 s after boot ...')
            sensor = [e for e in read_lines(conn, args.listen) if e.get('type') == 'sensor']
            print(f'{len(sensor)} sensor event(s). None is normal in clean air; the threshold is uncalibrated.')
    sys.exit(0 if acked else 1)


if __name__ == '__main__':
    main()
