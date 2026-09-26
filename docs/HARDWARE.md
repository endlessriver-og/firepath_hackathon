# In-home notification prototype

The photo from the hardware planning session proposes a polycarbonate case, MQ-2 sensor at ESP32 GPIO33, buzzer at GPIO12, USB power, and cellular backup using SIM800L or SIM7600 after Wi-Fi fails. `examples/esp32_preparedness/esp32_preparedness.ino` implements the first USB version. Arduino sketches are compiled as **C++** by the ESP32 Arduino core; the code has C-like syntax and no third-party libraries.

## Wiring and bring-up

1. Connect the MQ-2 module's analog output to GPIO33. ESP32 GPIO is **3.3 V maximum**: many MQ-2 breakout boards are powered at 5 V and can output up to 5 V. Check the module and use a suitable divider or level shifter before connecting the ADC pin. Share ground.
2. Connect the buzzer control to GPIO12. If its current exceeds the pin rating, use a transistor and a suitable external supply. GPIO12 is a boot strap pin on some ESP32 boards; if startup fails, move the buzzer to a suitable different output pin in the sketch.
3. Power by USB, open serial at 115200, and allow the MQ-2 to warm up. The hard-coded threshold is for bench demonstration and must be calibrated; it has no safety meaning.
4. In a desktop Chromium browser on localhost, open **Alerts & device → Connect USB device**. Choose the ESP32 port. Click **Send demo alert**: the board beeps for three seconds. A threshold crossing sends a sensor message to the browser.

## Line-delimited JSON contract

Board to browser (local sensor observation):

```json
{"type":"sensor","sensor":"mq2","active":true,"value":2200}
```

Browser to board (explicit simulation):

```json
{"type":"alert","hazard":"wildfire","severity":"warning","text":"Demo only. Check official Glendale alerts for real instructions.","source":"demo"}
```

Each JSON object ends in `\n`. The firmware uses a narrow string match for the fixed demo command; production firmware needs structured parsing, signed/verified alert sources, deduplication, and fail-safe behavior. Sensor events do not become official city alerts, and the app never automatically notifies authorities.

## Cellular fallback design

The whiteboard proposes a SIM800L/SIM7600 module for Wi-Fi failure. **Cellular failover is not implemented.** First prove a USB buzzer and event loop. For a later version, choose a modem supported by the local carrier and its bands, provision a SIM/data plan, supply the modem's peak current from a separate regulated rail, and test outages with the primary network disconnected. Define an authenticated official alert ingest path before a real notification can trigger the buzzer. Keep the City's Everbridge and evacuation-zone channels as the source of incident instructions.

MQ-2 is a general combustible gas/smoke-sensitive module with warmup and calibration limitations; this prototype is **not** a certified smoke alarm or life-safety device. Retain approved smoke and CO alarms.

The earlier room-by-room fire-routing bridge is documented in [FIRE_LAB.md](FIRE_LAB.md).
