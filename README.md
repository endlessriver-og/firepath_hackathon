# FirePath — preparedness for where you live

A Glendale pilot that combines mapped local hazards, a household checklist, official alert links, a local-only draft of useful property facts for possible responder workflows, and an optional USB in-home notification demo. The old fire-routing experiment remains at `/fire-lab.html`.

The main interface has two modes: **Resident** for location, actions and optional property notes; **Responder demo** for a short, source-labeled exercise brief. The responder view includes three fictional scenarios, a compact field layout, and a switch between fictional sample facts and the current browser's saved draft. It has no login, City access, dispatch connection or live calls.

## Quick start

Requires Node.js 20+ and Python 3.11+. The browser UI needs no JavaScript dependencies.

```bash
npm start
```

Open <http://localhost:5173>. The general checklist, household preferences, official links, and simulated hardware alert work immediately. Run `npm test` for the deterministic models.

Click **Try sample location** to see seven real map-layer results for a public point near Glendale Civic Center without installing Python GIS dependencies. The sample is a dated snapshot and is explicitly labeled as an example, not your address.

## Enable real mapped hazard lookup

The seven Glendale map layers come from [HackerFund's Glendale GIS MCP project](https://github.com/HackerFund/GlendaleGisMcp). It is a separate GPL-3.0-or-later package; this repository invokes it as a Python process and does not vendor its source. Install the package and download its map snapshot using its current README instructions, in a Python environment of your choice. For example, with `uv` installed:

```bash
uv venv .venv
uv pip install --python .venv/bin/python 'git+https://github.com/HackerFund/GlendaleGisMcp.git'
.venv/bin/glendale-gis-mcp --fetch-snapshot
GLENDALE_GIS_PYTHON=.venv/bin/python npm start
```

A street-address submission is sent to the **City of Glendale geocoder** for matching, then evaluated against the local snapshot. The app stores household choices and the entered address in that browser's `localStorage`; it does not store address lookups on the Node server. You can instead enter latitude/longitude to avoid geocoding; the map check then stays local. If the package, snapshot, or geocoder is unavailable, no result is fabricated. Check the source date in each card. Currently the location lookup is **Glendale only**.

Mapped layers: CAL FIRE wildfire severity, FEMA flood zones, fault, liquefaction, landslide, dam inundation, and debris flow. The map is for planning, not live incident detection or a site-specific assessment. A FEMA Zone X polygon is not a Special Flood Hazard Area; the checklist adds flood coverage review only when the mapped `SFHA_TF` flag is true or dam inundation is mapped. A point outside a mapped zone does not mean safe.

## What works

- Household form for Glendale location, owner/renter, home type, pets and assistance; preferences and checklist completion persist locally.
- Address or coordinate lookup against the GIS snapshot, with source links and dates and a candid status for each layer.
- Deterministic tasks for a go bag, contact plan, official notifications and earthquake readiness, plus relevant mapped-zone and household tasks.
- Official [Glendale Everbridge](https://www.glendaleca.gov/Everbridge), [Know Your Zone](https://www.glendaleca.gov/government/departments/fire-department/other-links/emergency-preparedness-response/know-your-zone), and City emergency-alert links. The app does **not** receive live city alerts or send push notifications.
- Simulated alert over Web Serial to an ESP32; Arduino-framework C++ sketch with MQ-2 input on GPIO33 and buzzer output on GPIO12. See [hardware wiring and limits](docs/HARDWARE.md).
- Resident-entered property facts and an illustrative, copyable responder text summary. This draft stays in browser storage; it does not connect to dispatch, CAD, or City systems. See the [City integration hypothesis](docs/CITY_INTEGRATION.md).
- A dedicated responder **training** workspace that orders facts by exercise type and separates fictional facts, resident-entered notes, mapped planning layers and unavailable City systems. The field readout strips the side panels for a quick scan.
- Earlier simulated interior fire routing at `/fire-lab.html`, with its own [bridge protocol](docs/FIRE_LAB.md).

## Next build targets

1. Validate geocoding and source-layer interpretations with Glendale emergency staff; add household-review language and accessibility support.
2. Work with City GIS and dispatch teams on verified parcel matching, permit-zone definitions, floor-plan access, consent, provenance, and a short CAD-compatible summary. See [open City questions](docs/CITY_INTEGRATION.md).
3. Integrate a licensed, authenticated real alert feed with alert ID, source, geography, expiry, cancellation and test modes. Do not turn GIS hazard polygons into an active incident feed.
4. Add opt-in browser/mobile notification delivery and verified address-to-alert-area matching.
5. Finish enclosure, power budget, modem/carrier selection and measured SIM800L/SIM7600 failover; pilot the in-home buzzer as a companion to certified alarms and official channels.
6. Expand beyond Glendale only after adding verified jurisdiction-specific sources and rules.

The prototype never replaces emergency instructions, certified alarms, or professional advice about insurance or property risk. Call 911 for immediate danger.
