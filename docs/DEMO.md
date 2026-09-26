# FirePath presentation runbook

## Before judges arrive

- Start `npm start` and open `http://localhost:5173` in Chrome or Edge.
- Keep the browser zoom around 80–100% so the map and guidance cards fit.
- In **Household plan**, enter an illustrative household name, meeting point, language, and any needs you can explain honestly. The default address is a fictional Glendale example, not a verified city record.
- Test **Run household drill**, **Detect kitchen fire**, **West hall fills with smoke**, and **Reset simulation** once. Confirm Bedroom A changes **West exit → East exit** on the second hazard.
- Click **Present mode** before the live hazard sequence. Press Escape to return to the full dashboard.
- If hardware is present, connect serial, press each button, then reset. The software buttons remain the fallback.
- If the room is loud, keep speech concise: use the automatic Bedroom A reroute phrase and show the other room messages on screen.
- Keyboard fallback while no form field is active: **1** triggers Kitchen, **2** triggers West hall, **0** resets.

## Five-minute sequence

**0:00–0:40 — The problem.**

“The Glendale Fire challenge asks us to make preparedness personal and actionable. An alarm can tell you there is a fire. It rarely tells someone in a specific room which way to go, or helps them practice that choice before the emergency.”

**0:40–1:30 — Before.**

Open **Household plan**. Show the chosen meeting point, language and household consideration. Click **Start a drill**. Point at the three colored routes and the per-room voice guidance. Be explicit that this is a verified sample graph, not automatic extraction from the floor plan.

**1:30–2:40 — During.**

Your partner presses the kitchen button (or click **Detect kitchen fire**). The room-specific instructions update. Then they press the west hall button. Pause and let the audience see Bedroom A's route travel across the home to the east exit. Repeat its new spoken instruction if needed.

**2:40–3:40 — How it works.**

Show **Devices & bridge**. “The buttons send location IDs. The software marks unsafe graph nodes, finds the shortest available route to either exit, and selects fixed, reviewed-style language for each room. The same command goes to the physical guidance node. The speech layer does not choose the route.”

**3:40–4:30 — Responder view.**

Return to the dashboard. Point out the detector locations, event times, blocked hall, and active routes. “This same model could give responders a clear picture of which guidance is active. Integrating with real building plans and certified alarm systems would require engineering and fire-service review.”

**4:30–5:00 — Close.**

“The first time a family hears its escape plan shouldn't be during a fire. FirePath makes the plan something they can practice, then lets the same map adapt when the situation changes.”

## Claims to keep precise

- Say **prototype with simulated detectors**, not installed alarm or certified life-safety system.
- Say **manually defined sample home graph**, not automatic plan extraction.
- Say **local/browser speech with optional cached ElevenLabs audio**, unless those files are actually generated and playing.
- Say **Glendale household example**, not an actual address validated with city GIS.
- The mobility preference is captured but route accessibility has not been verified.

## Fast recovery

If serial disconnects, click the on-screen hazard buttons. If speech fails, read the guidance card while the route changes. If the scenario gets into an unexpected state, click **Reset simulation**, start the drill again, and trigger Kitchen → West hall. The route computation needs no cloud connection.
