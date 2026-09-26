# Three-minute preparedness demo

**Resident app (phone or browser):** `cd apps/mobile && npx expo start`. Scan the QR code with Expo Go, or press `w` for a browser tab at phone width. Without a dev server, `npm run build:demo` puts the same app at `dist/app/`; any static host serves it. Before each run-through, tap **Start over** at the bottom of Home to clear the previous presenter's progress.

1. Pick **Sparr Heights Community Center**. Say plainly that it is a public place, not anyone's home.
2. Set the household to *I rent* with pets, then tap **Build my plan**.
3. Home shows two mapped layers: wildfire (*High*) and liquefaction. The steps adapt to them: renters are asked about building protections.
4. Check off a step, reload, and show that progress stays.
5. Open **Change place or household** and pick the Civic Center point. Nothing is mapped there, the caveat says that is not the same as no risk, and the plan shrinks to general steps.
6. On **Alerts**, point to City signup as the real channel. The notification button is a local test only.

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
