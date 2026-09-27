# FirePath — your place, your plan

**Try it:** <https://firepath-ruddy.vercel.app> · **Demo video:** <https://youtu.be/7uOw3mHqUbE> · Built at Jewel City Hacks 5.0 (Glendale, September 2026)

FirePath turns a Glendale address into a practical preparedness plan for the people who live or work there. Anyone can check an address against seven state and federal hazard maps and the City's own permit and inspection records, with no account. A household or business then adds who is actually there (someone who needs help leaving, kids, pets, hazardous materials) and gets a short numbered checklist, drills for real alert types, one-tap emergency steps and a printable plan.

FirePath is an independent Glendale pilot prototype, not a City of Glendale service. It never replaces official instructions, certified alarms or 911.

## Try it in two minutes

1. Open <https://firepath-ruddy.vercel.app> on a phone.
2. Type an address, for example `1613 Glencoe Way`, and pick the City's suggestion. You see which of the seven maps include it (⚠ with the map's level), and the City's permit and inspection records for that parcel.
3. Tap **Explore the app → Begin** for a five-stop tour with a fictional household: Dana, her daughter, her mother Rosa who uses a walker, and two dogs. No sign-up.
4. On the **Map** tab, switch the view to **3D terrain** and tap any building or lot for its parcel, zoning, fire station district, nearby schools and permit history.
5. Tap **Emergency** (top right, on every screen) and pick a situation.

## What is real, and what is not

| Status | What |
| --- | --- |
| **Live** | City of Glendale address geocoder and public permit/inspection search (Tyler EnerGov). Seven hazard maps: CAL FIRE wildfire severity, FEMA flood, CGS fault, liquefaction and landslide, DWR dam inundation, USGS debris flow (a dated planning snapshot, not live incidents). National Weather Service alerts. LA County Assessor parcels. City zoning, fire station districts, historic districts and schools. |
| **Prototype** | Accounts (scrypt-hashed passwords, hashed bearer sessions) and mailed-code address verification (the code shows in a labelled demo mailbox). The responder brief: residents consent and preview it, but nothing is sent to 911, dispatch or the City. The ESP32 in-home alert: firmware compiles and its protocol is tested; it has not yet run on a physical board. City venue packages are labelled examples. |
| **Needs the City** | Evacuation zones and the City alert feed, a dispatch (CAD) test connection, parcel ownership records. The app shows each as a "Needs City data" card naming the dataset and what it would unlock (`src/city-data.js`). |

A point outside a mapped zone is labelled "Outside", never "safe". Weather alerts are not City evacuation orders. FirePath never chooses an evacuation route.

## How it is built

- **Resident app:** Expo / React Native (`apps/mobile`), exported to the web at `/app/`; also bundles for iOS and Android.
- **API:** Node (`server/api.mjs`), dependency-injected so the same routes run locally (`server.mjs`) and as a Vercel function (`api/index.mjs`). On Vercel the account store is one private Vercel Blob document (`server/blob-store.mjs`).
- **Hazard lookups:** [HackerFund's GlendaleGisMcp](https://github.com/HackerFund/GlendaleGisMcp) (GPL-3.0-or-later, installed as a dependency, not vendored). Locally it runs as a Python process (`scripts/lookup-hazards.py`); on Vercel as a Python function (`api/gis.py`) that downloads and verifies the published snapshot on a cold start.
- **Maps:** `map.html` (Leaflet, a graded ~150 m "combined planning index" with a tap-to-explain breakdown and illustrative weights, not an official risk score) and `map3d.html` (MapLibre with OpenFreeMap buildings and AWS terrain tiles). Layers are built by `scripts/build-map-layers.py` into `data/map-layers/`, which is committed.
- **Permits:** `scripts/crawl-permits.mjs` read the City's public permit catalog (75 permit types, 195 work classes, 1,652 business license types) into `src/glendale-permits.json` for plain-language search. FirePath never submits to the City portal and never invents a fee.
- **Parcels and neighborhood:** `server/parcels.mjs` (LA County Assessor; assessed values are deliberately not requested) and `server/neighborhood.mjs` (City zoning, historic districts, fire districts, school zones).

## Run it locally

Requires Node.js 20+ and Python 3.11+.

```bash
cd apps/mobile && npm install && cd ../..
uv venv .venv
uv pip install --python .venv/bin/python 'git+https://github.com/HackerFund/GlendaleGisMcp.git'
.venv/bin/glendale-gis-mcp --fetch-snapshot
npm run build:demo
GLENDALE_GIS_PYTHON=.venv/bin/python npm start
```

Open <http://localhost:5173/app/>. Run `npm test` for the test suite. Local accounts are stored in `data/firepath-dev.json` (gitignored).

**Deploying to Vercel:** `vercel.json` builds the web app and maps and deploys both API functions. The deployment needs a private Blob store connected to the project (`BLOB_READ_WRITE_TOKEN`).

## More

- [Handoff and repo map](docs/CLAUDE_HANDOFF.md) · [Demo script](docs/DEMO.md) · [Playtest notes](docs/PLAYTEST-2026-09-26.md)
- [City integration questions](docs/CITY_INTEGRATION.md) · [Mobile and safety plan](docs/MOBILE_AND_SAFETY.md)
- [In-home device wiring and limits](docs/HARDWARE.md) · [Earlier fire-routing lab](docs/FIRE_LAB.md) (`/fire-lab.html`)
- The original browser workspace with a responder training view is at `/classic`.

Call 911 for immediate danger.
