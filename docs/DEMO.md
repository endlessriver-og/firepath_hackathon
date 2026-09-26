# Three-minute preparedness demo

**Resident app with accounts (browser, recommended):**

Run these from the repo root:
```bash
cd apps/mobile && npm install && cd ../..
npm run build:demo
GLENDALE_GIS_PYTHON=.venv/bin/python npm start
```
Run `npm run map:build` once, after the GIS snapshot is installed, to build the hazard map layers. Then open <http://localhost:5173/app/>. For live editing, also run `cd apps/mobile && npx expo start` and open <http://localhost:8081>; it calls the same API on port 5173.

0. **Public check (no account).** The signed-out screen is "What's mapped at your Glendale address?" Type an address, pick a City suggestion, and see how many of the 7 maps include it, the combined index with its breakdown, the heat grid, each layer's rating and where to start. **I live here** or **I run a business here** leads to sign-up, and step 2 then registers that same address automatically. Public checks are not stored and are rate-limited per visitor.
1. **Create account.** Name, email and password. Stored only in `data/firepath-dev.json` on this machine.
2. **Step 1, household.** Add people with an age group and a "may need help leaving" flag. Choose own or rent, and house or apartment.
3. **Step 2, address.** Any Glendale street address goes to the City geocoder plus the 7 hazard maps (the GIS package must be installed). Then **Mail me a code** shows the code in a labeled *demo mailbox*; enter it to verify.
4. **Step 3, responder details.** Pets, access and utility notes, meeting places, and the consent toggle.
5. **Home.** Readiness score, level, badges and the next steps. Check one off to watch the score move.
6. **Map.** A city-wide Leaflet map with a filter for each hazard layer plus fire stations, hospitals and schools; zones are shaded by the severity their source defines. Below it, each layer's rating at your address. Tap one to show it on the map.
7. **Plan.** Search (for example "pets" or "roof") and filter by hazard or status.
8. **Alerts.** Every live alert comes with *Your plan for this alert*: steps grouped as Do now, Before you leave and Check on, built from the mapped zones, household members, pets, meeting places and open steps, each saying why it is there. **Practice drill** runs the same playbook for Red Flag, High Wind, Flash Flood, Heat or Air Quality. It's labeled DRILL · NOT A REAL ALERT, and finishing one earns points and the Drilled badge. Live National Weather Service alerts for the address point, which are often empty. City signup links. "Needs City data" callouts.
9. **Permits.** **What are you planning?** searches the City's full permit catalog: 75 permit types, 195 work classes and 1,652 business license types, crawled from the public Glendale Permits (Tyler EnerGov) search API by `node scripts/crawl-permits.mjs`. Everyday words map to official names ("block party" → PW - ROW - Street Use). **Plan an event** asks six yes/no questions and lists the likely City permits (Special Event, Fire General work classes, Street Use, Temporary Structure, Filming, Fireworks), flagging open flame in mapped fire zones. Then come the guided projects: Pick a project to get the likely permit, notes for this address, the usual requirements, a copyable summary and a link to the Glendale Permits portal.
10. **Profile.** Edit the address and household, and preview exactly what a responder would see.

**Business version.** At sign-up choose *A business*. Onboarding asks for the business name and type, staff and visitor counts, floors, hours and sprinklers. Then comes the address, same as residents. Then hazardous materials, key contact, staff assembly point, access and utilities. Businesses get their own steps (contact tree, continuity plan, kitchen hood service, Hazardous Materials Business Plan check with Glendale Fire), their own badges and business permits. The responder brief leads with occupancy and hazardous materials.

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
