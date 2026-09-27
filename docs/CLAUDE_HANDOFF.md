# FirePath — project handoff for the next builder

**State:** September 26, 2026, Glendale hackathon. **Repo:** `endlessriver-og/firepath_hackathon` (public since the evening of 2026-09-26). **Live:** <https://firepath-ruddy.vercel.app>. **Owner's direction:** continue building an intuitive emergency-preparedness experience for residents and first responders. Prefer an iOS/Android resident app so phone alerts are possible. Keep the hardware optional. This document records product intent, observed code, unresolved decisions, and a practical path forward; it is not a fixed specification or evidence of City endorsement.

## Start here in five minutes

1. Read this file, `README.md`, `docs/DEMO.md`, `docs/MOBILE_AND_SAFETY.md`, `docs/CITY_INTEGRATION.md`, and `docs/HARDWARE.md`. The older `docs/FIRE_LAB.md` is a separate experiment.
2. Run `npm test` at repo root, then `npm start` and open `http://localhost:5173/?demo=1`. Click through resident hazards/tasks and the separate fictional responder exercise. The public sample runs without Python or credentials.
3. Run `npm run mobile:sync`; from `apps/mobile`, run `npm install` and `npx expo start`. The native app is a prototype with a **fixed sample point**, a map pin, tasks, and a **local test notification**. Try it on a phone before assuming native behavior. `npx expo export --platform android` successfully bundled in the previous session; no on-device run was completed.
4. The app is live on Vercel (project `firepath`, Endless River team). It is **not** git-linked: pushing to `main` does not deploy. Deploy with a plain export of the pushed commit (no `.git`, because the commit author email is not a team member): `rm -rf /tmp/d && mkdir /tmp/d && git archive origin/main | tar -x -C /tmp/d && cp -r .vercel /tmp/d/ && cd /tmp/d && vercel deploy --prod --yes --scope endless-river`. Then run `scripts/smoke.sh`. Its first line is `/api/health`, which reports the deployed commit (stamped into `VERSION` by `git archive`); it should equal `git rev-parse origin/main`.
5. Before implementing any feature, check whether it is demo-only, public planning data, household-sensitive data, an official live alert, or responder-restricted data. These classes have different trust and authorization requirements.

## Why this exists and how the idea changed

The project started as a home-fire detection/interior escape-route prototype. A conversation with the City's emergency-preparedness lead suggested home-fire mitigation was not the strongest priority. The stronger problem is that residents do not know which hazards apply to their location, do not have one tailored place to prepare their household, and need concrete actions such as go bags, home hardening, and coverage review. The owner chose a broad, location-aware emergency-preparedness app with recommendations and alerts. An in-home speaker/alert device remains a possible channel if the hardware collaborator completes it.

The owner's more recent product decision is: invest in an excellent, intuitive resident experience and a separate responder experience using data we can actually access. Native mobile is preferred for residents because permissions and push notifications fit the product. A web responder interface may still be the right deployment surface, but City staff described an existing CAD/dispatch text stream; actual responder integration may be a compact sourced summary inside their current workflow rather than a new dashboard. Validate this with dispatch and field responders.

### City discovery, not an integration agreement

City information staff described parcel IDs as a shared key across GIS, permitting, utilities, public works, property ownership, and public safety. They described fire/permit zones shown as red/green/yellow and connected to permit requirements. **That City permit-zone layer is not in this app**; it must not be conflated with the available CAL FIRE hazard map. They raised floor plans, simple resident facts such as two dogs in a backyard, and a two-way information path for responders. Dispatch uses maps, incoming text and multiple systems, and forwards a compact stream to responders en route. Camera and license-plate systems came up as context, not access granted to FirePath. Parcel lookup is present as a live layer in the separate GIS package but is **not connected** here. Floor-plan availability and rights are unconfirmed. Read `docs/CITY_INTEGRATION.md` for the discovery questions.

## User stories and product shape

| Audience | Desired outcome | Honest current demonstration | Missing dependency |
| --- | --- | --- | --- |
| Glendale resident | Register a household/location and understand mapped hazards | Browser form can submit Glendale address/coordinates through optional local GIS install; static sample and mobile prototype use one public point | Native onboarding, authenticated property, verified parcel association, mobile hazard API |
| Resident | Get actions appropriate to home/household and map exposure | Deterministic checklist, source-linked general guidance, preferences in browser storage | Durable protected profile, expert validation of rules, jurisdiction expansion |
| Resident | Understand alerts and evacuation instructions | Links to official Glendale Everbridge and Know Your Zone; local demo notification | Approved official feed, backend event validation, geographic matching, remote push, cancellation/expiry, fallback |
| Resident | See geography and escape options | Native map pin; browser source-linked point-in-polygon results; older fictional indoor fire graph in separate lab | Actual authorized GIS geometry, live official evacuation areas and closures, reliable route inputs |
| Responder | See a fast, relevant property brief | Fictional exercise and browser-local resident draft with source labels | City-approved identity, consent, parcel verification, CAD/test integration, audit |
| Household | Hear an in-home prompt | USB ESP32 buzzer demonstration and separate older room-routing controller | Robust hardware, trusted alert ingest, validated cellular/Wi-Fi path, enclosure/power testing |

**Design aim:** clear hierarchy: “where am I / what applies / what should I do / what official source says now.” Present planning hazards separately from active alerts. Missing or stale data should remain visibly unknown. Source and observation date matter. Do not imply a City partnership or a safety guarantee.

## Repository tour

| Path | Purpose and important behavior |
| --- | --- |
| `index.html`, `src/prep.css`, `src/app.js` | Browser resident/responder demo. `/?demo=1` starts guided tour. `src/app.js` reads/writes `localStorage`, loads sample JSON, optionally POSTs `/api/hazards`, renders source-linked cards and a local training brief; Web Serial sends a simulated hardware command. |
| `src/preparedness.js` | Pure hazard interpretation and deterministic task generation. Wildfire triggers zone-specific action only when mapped; flood task only for `SFHA_TF === 'T'` or dam inundation. General earthquake task applies regardless of fault polygon. |
| `src/sample-location.json` | Cached, dated response for a **public** point near Glendale Civic Center (34.1466, -118.2483), not a resident home. It has the location, seven hazard results, map metadata and matched attributes. It is not a live feed. |
| `src/responder.js`, `src/workspace.js` | Resident-draft and training readouts. Exercise ordering changes by incident type; fictional default and local draft are separate. No actual responder account or CAD access. |
| `server.mjs`, `scripts/lookup-hazards.py` | Node static server and POST lookup. Spawns a separate Python GIS package. Coordinates use a local snapshot; address lookup uses the City geocoder. Server does not persist submissions. Dependency and snapshot are optional and not vendored. |
| `apps/mobile/App.js`, `apps/mobile/app.json` | Expo SDK 57 resident prototype (React Native, `react-native-maps`, `expo-notifications`): tabs Plan/Map/Alerts, fixed sample point, session-only task completion, official enrollment link, local test notification. No native auth, address search, remote push or routes. |
| `apps/mobile/src/*`, `scripts/sync-mobile-demo.mjs` | Copies of root task engine and sample snapshot. Run `npm run mobile:sync` after root changes. Avoid treating these duplicated copies as independently maintained sources. |
| `fire-lab.html`, `src/fire-lab.js`, `src/model.js` | Original **fictional** room fire routing simulation, separate from current resident evacuation concept. Do not present its graph as a real building plan or safe route. |
| `examples/esp32_preparedness/*`, `docs/HARDWARE.md` | USB MQ-2/buzzer Arduino-framework C++ example, threshold is uncalibrated. Not a certified alarm; cellular fallback is proposed, not built. |
| `examples/esp32_controller/*`, `docs/FIRE_LAB.md` | Older two-button, three-LED hardware exercise for the room graph. Different protocol from the new MQ-2 demo. |
| `scripts/build-demo.mjs`, `vercel.json` | Static web export to `dist/`; no dynamic API on the static host. |
| `tests/*` | Eleven Node tests covering routing graph, hazard tasks, responder provenance and workspace behavior. |

There is no database, real authentication, cloud backend, production location or device enrollment, delivery telemetry, push registration, live GIS polygon display, live event feed, or real CAD integration. The browser mode switch is **not** access control. Browser `localStorage` is unsuitable for a sensitive production resident/responder record. The Expo sample keeps checklist ticks only in memory and does not share state with the browser.

### GIS semantics that must survive future UI work

The separate [HackerFund Glendale GIS MCP repository](https://github.com/HackerFund/GlendaleGisMcp) supplies the optional local map snapshot. FirePath queries CAL FIRE local-responsibility wildfire hazard severity, FEMA flood, Alquist-Priolo fault, liquefaction, earthquake-induced landslide, California dam inundation and USGS post-fire debris-flow assessment. The sample is a point lookup, **not** a set of display-ready polygon geometries. Metadata includes source URL, checked time, source edit time when known and cache/stale fields. A “not in mapped zone” result never means no risk. FEMA Zone X can be returned as a matched polygon while `SFHA_TF` is false. USGS post-fire coverage is limited; absence of an assessment does not imply absence of debris-flow risk. Dam inundation planning areas are distinct from evacuation orders.

Install GIS dependency per its *current upstream instructions*; README has an example with `uv`, `--fetch-snapshot`, and `GLENDALE_GIS_PYTHON=.venv/bin/python npm start`. Geocoding a resident address sends it to the City's geocoder; coordinates avoid that network step. `server.mjs` currently returns generic 400 for API errors; before public hosting, revisit rate limits, input validation, CORS/CSRF policy, logging, dependency pinning, observability, security review and the handling of geocoder/third-party data. Do not copy GPL source into this repo without reviewing licensing.

## Security, mapping, routing and alerts: implementation gates

These are part of the product, not final polish. Full discussion is in `docs/MOBILE_AND_SAFETY.md`.

- **Account and property binding:** use an established auth provider for residents; city-managed SSO/RBAC for responders. Server must enforce per-record ownership and responder scopes. Entering an address or parcel ID is not proof of ownership. Model units/tenants separately where needed. Distinguish resident-reported facts from City-verified records and log authorized responder access. Agree on consent, expiration, correction and deletion before storing floor plans, medical/assistance details or access notes.
- **Map:** show actual available hazard geometry with legend and provenance only once fetched and licensed; show the public sample pin as exactly that. Distinguish regulatory hazard maps, City fire/permit zones, official evacuation zones, road closures and real incidents. Avoid sending precise home coordinates to a third-party map provider without a clear privacy explanation.
- **Routing:** begin with user-saved exits, meeting places and official evacuation guidance. A calculated road route needs current official closures, incident instructions, geospatial matching and data freshness; no static layer alone can certify safety. Indoor routes require a verified floor plan and fire conditions beyond this prototype. Offline plans can be shown, but stale maps/roads need a visible warning.
- **Remote alerts:** need an approved feed and backend that authenticates source, validates incident ID, geography, issue/update/cancel, expiry, severity and test/live environment; deduplicates and records attempts. Store minimal device tokens and protect their registration to the authenticated account. Permission should be requested in context. Include an official-channel fallback: push delivery is best effort and should never be described as guaranteed emergency coverage. Expo local notification is only a UI proof; remote push requires app credentials, build and server.
- **Device:** pass only verified events to a companion ESP32; benchmark power, Wi-Fi loss, modem/carrier compatibility, duplicate/cancel behavior and acoustic accessibility. MQ-2 output must be constrained to ESP32 3.3 V ADC; GPIO12 boot behavior and buzzer current need checking. Keep approved smoke and CO alarms.

## Suggested sequencing, with room to revise

**For the imminent hackathon demo:** first test the browser tour on a second device; test Expo on an actual iPhone/Android handset if available. Verify the map tiles render, task links open, and test notification stays clearly labeled. Ensure judges can still use the static browser fallback even if the phone or hardware fails. Rehearse a concise story: location → mapped planning context → tailored actions → official alert channel → fictional responder brief → optional USB sound. Do not claim native push, active route guidance or City connectivity.

**Next product slice:** choose a single path through native resident onboarding and sample data with strong interaction design. Consider a small local household profile (home type, pets, assistance, preparedness progress) before cloud storage, with user-visible privacy choices. Add real property lookup only with an agreed address/geocoder privacy model; expose source date and uncertainty in the native UI. Keep backend contracts independent of Expo UI and avoid duplicating rules between web and native.

**When City and feed access are real:** validate parcels/permit zones and responder facts with staff; write data contract and access policy; build authenticated storage and a test responder summary; then implement alert ingest, geography, token registration and cancellations. Prototype geometry display with one authoritative layer before layering many. Bring routing in after official closures and directives can be obtained. Hardware consumes verified alert events only after that pipeline exists.

These are hypotheses, not marching orders. If the hackathon has minutes left, a reliable demo and accurate claims outweigh speculative integrations. If the team chooses a different stack, preserve the data trust boundaries and the core user story.

## Open questions to ask the owner, hardware partner and City

- Which local jurisdiction is the first pilot, and has any staff agreed to share data or review a prototype? Are we presenting to judges today, and which demo device is available?
- What matters most in judging: native resident polish, responder workflow, map visualization, hardware demonstration, or end-to-end data? Which feature must work without connectivity?
- Should an account be required for basic hazard lookup, or only for saved household facts and notifications? What proof links a resident to a parcel, especially in apartments?
- Can the City provide public polygon geometry and the official red/yellow/green permit layer with definitions, rules, timestamps and redistribution terms? What is the evacuation-zone identifier and authoritative live alert source?
- Which responder facts change decisions en route? What consent and refresh period are appropriate? What CAD vendor/test interface and City sponsor are available?
- Does the hardware partner actually have an ESP32, MQ-2, buzzer, modem/SIM, enclosure and a way to flash firmware? Which features can be demonstrated today?
- Who will maintain GIS snapshots, verify guidance, handle data incidents and operate alerts after the hackathon?

## Verification, deployment and known limits

**Latest state (2026-09-26, after submission):**

- **Hosting:**
  - Vercel serves the static app and maps.
  - `api/index.mjs` is the Node API; its store is a private Blob document (`server/blob-store.mjs`, store `firepath-store`).
  - `api/gis.py` runs HackerFund's GlendaleGisMcp; it downloads its snapshot to `/tmp` on a cold start (about 5 s).
  - A Vercel cron calls `GET /api/gis` every 5 minutes to keep it warm (about 0.25 s warm).
  - `POST /api/gis` only answers FirePath's own API, which sends `x-firepath-internal` = `FIREPATH_INTERNAL_KEY` (a Vercel production secret). A new environment needs that variable set, or the key check is skipped.
  - Deployment Protection (`ssoProtection`) is off for this project only, so judges can open it.
- **New since the accounts slice:**
  - `map3d.html`: MapLibre, 3D terrain and buildings, tap any lot.
  - `server/parcels.mjs`: LA County parcels, without assessed values.
  - `server/neighborhood.mjs`: City zoning (live), fire districts, school zones and historic status.
  - Civic map layers are built by `scripts/build-map-layers.py`.
  - `GET /api/public/point` backs the tap card.
  - City records are keyed by the parcel number (APN) without dashes.
- **Playtest-driven simplification:** see `docs/PLAYTEST-2026-09-26.md`.
  - Checklist items are only the name.
  - In-zone layers are marked ⚠ with their level.
  - No pill selectors remain.
  - "Needs City data" callouts collapse to one line.
  - The tour has five stops.
- **Tests:** 44 pass.
- **Submission:** Devpost "Jewel City Hacks 5.0", project FirePath.
  - Staged with every field filled; the owner was to tick the terms and press Submit. Submission is unconfirmed: the project page exists, but it is not in the event's public gallery. Check that the Devpost status says Submitted.
  - The video (<https://youtu.be/7uOw3mHqUbE>) is a crossfaded slideshow of real screens; a live screencast glitched.
  - Pitch deck: a claude.ai Slides artifact (owner's gallery).
- **Languages (es, hy, ko; drafts, not yet reviewed by native speakers):**
  - Translated: the public page and address result, sign-up and onboarding, Home, the checklist titles, Plan, Alerts and the drill frame, Map, Permits, Profile and the household form, the "Needs City data" cards, and the guided tour.
  - Household drill and alert-plan steps, including the Emergency weather situations, are translated too (`RESIDENT` in `src/playbooks.js`; the API takes `?lang=`).
  - Business alert plans are translated as well (`BUSINESS` in `src/playbooks.js`).
  - Still English: official agency and permit names, and the responder card.
  - Keys live in `apps/mobile/src/i18n.js`; checklist titles are in `taskTitles`.
- **Deployed:** `17328e4`, 2026-09-26 at 7:15 PM.
  - Production passed all 15 `scripts/smoke.sh` checks.
  - The address check takes 0.3–0.6 s; City records load separately.
- **Offline:**
  - `scripts/build-demo.mjs` writes `dist/app/sw.js`. Pages are network-first and the fingerprinted bundle is cache-first; `/api/` is never cached.
  - `App.js` keeps the last `/api/me` in `firepath-me-cache` and uses it only when the server is unreachable (status 0), showing an offline banner.
  - Check with `npm run check:offline [url]` (headless Chrome, network cut). The in-app browser pane cannot register service workers, so test in Chrome.
- **Known gaps:**
  - Concurrent Blob writes: fixed and deployed (ETag-conditional write, per-record merge on conflict). Reads return weak ETags (`W/"…"`); conditional writes need the strong form.
  - No physical phone or ESP32 run.

**Resident accounts slice (2026-09-26, evening):**

- **Code:** `server/api.mjs`, `server/auth.mjs` and `server/store.mjs` hold the API. `src/readiness.js` covers scoring, recommendations and permits; `src/city-data.js` holds the "Needs City data" callouts. The app is split into `apps/mobile/src/{api,ui,onboarding,tabs}.js`.
- **Tests:** 23 pass, 8 of them for the API.
- **Browser check:** the whole flow was clicked through at 390×844 with a real Glendale address lookup, the City geocoder and the live NWS feed.
- **Still missing:** a production identity provider, encryption at rest, real postcard mailing, and City data of every kind listed in `src/city-data.js`. The sample-place mode was removed from the app; the old samples remain in `src/`.


**Session 2026-09-26 (afternoon):**

- **Mobile:** the app gained first-run onboarding (sample place, then household), a Home summary, persistent progress and meeting places (AsyncStorage), and a second real sample.
- **Shared logic:** `summarizePlace`, `nextSteps` and a mapped seismic-zone task in `src/preparedness.js`. The seismic layers now show plain-language descriptions instead of GIS metadata notes.
- **Tests:** `npm test` passes 15/15.
- **Native bundles:** `npx expo export --platform ios --platform android` bundles.
- **Browser check:** the full mobile flow was clicked through with `expo start --web` at 390×844.
- **Static phone app:** `npm run build:demo` exports the mobile app to `dist/app/`, which was verified on a plain static server. `vercel.json` now installs `apps/mobile` deps, but no Vercel build has been run.
- **Start over:** a button on Home clears the device's demo data.
- **Still unverified:** no physical device, no iOS simulator (this machine has no Xcode), and the native `react-native-maps` rendering.


At the previous build: `npm test` passed **11/11**; `npm run build:demo` completed; `npx expo export --platform android` bundled successfully. The native app was **not** tested on physical iOS or Android hardware and no iOS build was verified. No backend auth/alert integration or authenticated end-to-end security tests exist. A static browser demo is buildable but a Vercel project was not confirmed deployed. The local Git checkout may have a different history from GitHub because earlier work was published through GitHub's tree/commit API; inspect `git status`, `git log` and the remote branch before rebasing, force-pushing or assuming local history is canonical. GitHub's `main` is the shared delivery surface.

The sample's snapshot date is embedded in `src/sample-location.json` and is not continuously refreshed. Treat old map metadata as old data. This handoff reflects a code reading and conversation notes as of the date above; verify upstream SDK, city datasets and availability before deploying or making legal/safety claims.

## Pasteable instruction for Claude

> You are continuing FirePath in `endlessriver-og/firepath_hackathon`. Read `docs/CLAUDE_HANDOFF.md` and linked docs, inspect the current repository and run its existing checks. The product is a Glendale-first, location-tailored emergency-preparedness resident app plus a City-approved responder information path; native resident experience is preferred, optional ESP32 hardware. Build the next highest-value testable slice with accurate data provenance and a polished interaction. Keep public planning maps, official live instructions, resident reports and fictional demo data unmistakably distinct. Do not claim a verified safe evacuation route, live alert delivery, authenticated responder access or City integration until those exist. Ask only the decisions that materially block progress; otherwise make reasonable choices, implement, verify, and report what works and what remains unverified.
