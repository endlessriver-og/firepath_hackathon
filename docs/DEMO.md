# Three-minute preparedness demo

**Resident app with accounts (browser, recommended):**

Run these from the repo root:
```bash
cd apps/mobile && npm install && cd ../..
npm run build:demo
GLENDALE_GIS_PYTHON=.venv/bin/python npm start
```
Then open <http://localhost:5173/app/>. For live editing, also run `cd apps/mobile && npx expo start` and open <http://localhost:8081>; it calls the same API on port 5173.

1. **Create account.** Name, email and password. Stored only in `data/firepath-dev.json` on this machine.
2. **Step 1, household.** Add people with an age group and a "may need help leaving" flag. Choose own or rent, and house or apartment.
3. **Step 2, address.** Any Glendale street address goes to the City geocoder plus the 7 hazard maps (the GIS package must be installed). Then **Mail me a code** shows the code in a labeled *demo mailbox*; enter it to verify.
4. **Step 3, responder details.** Pets, access and utility notes, meeting places, and the consent toggle.
5. **Home.** Readiness score, level, badges and the next steps. Check one off to watch the score move.
6. **Actions.** Search (for example "pets" or "roof") and filter by hazard or status.
7. **Alerts.** Live National Weather Service alerts for the address point, which are often empty. City signup links. "Needs City data" callouts.
8. **Permits.** Pick a project to get the likely permit, notes for this address, the usual requirements, a copyable summary and a link to the Glendale Permits portal.
9. **Profile.** Edit the address and household, and preview exactly what a responder would see.

The blue **Needs City data** callouts name the dataset we lack, an illustrative example record and the capability it would unlock. Their text lives in `src/city-data.js`.

**Browser workspace and responder exercise:**

**Fast path:** open `/?demo=1`. The guided tour loads a public sample map point, moves to the checklist, then opens a separate fictional responder exercise. It runs on any static server; no GIS dependency or hardware is required. Use the steps below for a deeper demonstration.

1. Open the home page. Explain the problem: residents need a view of their **own mapped hazards** and a short, practical household plan.
2. Click **Try sample location** for a bundled, dated result at a public Glendale map point. If the GIS package is installed, enter a Glendale street address for a fresh local-snapshot lookup, or use coordinates to avoid geocoding. The address route sends the address to the City's geocoder when submitted.
3. Show the seven source-linked layers, including the different meaning of FEMA Zone X versus a Special Flood Hazard Area. Point out snapshot dates and the absence of live incident data.
4. Select renter/owner, pets or assistance, then show the checklist adapt. Check off an item and refresh to show browser-local progress.
5. Enter a fictional training note such as “two dogs in backyard” and save the local draft. Click **Open responder demo**. Switch among earthquake, evacuation and water-response exercises; show how fact order changes, then switch to **Field readout**. Explain that no City system receives this information.
6. Open official Everbridge and Know Your Zone links. Press **Send demo alert** and connect an ESP32 over USB if available. Explain that this is a simulation; real city alert ingestion and cellular fallback are follow-on work.
7. Open **fire-lab.html** only if there is time to show the earlier interior routing experiment.

If the GIS package or network geocoder is unavailable, the app keeps a general checklist and explicitly labels map layers unavailable/pending rather than making up an address result.
