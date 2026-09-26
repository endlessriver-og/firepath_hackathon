# FirePath

An interactive hackathon prototype for a household fire plan that can be practiced and updated when a simulated hazard blocks a route.

## Run it

Requires Node.js 20+. No install, credentials, database, or network connection is needed.

```bash
npm start
```

Open [http://localhost:5173](http://localhost:5173). Run `npm test` for the routing checks. The UI also works on a local static server that serves the project root.
All browser assets use relative paths, so the frontend can be published from a repository subpath such as GitHub Pages without rewriting URLs.

## Three-minute demo

1. Open **Household plan** and set a household name, meeting point and language. Save.
2. Click **Start a drill**. Three rooms get individually computed exit paths and spoken directions from the browser.
3. Click **Detect kitchen fire**. The hazard appears in red; the dashboard and voice guidance update.
4. Click **West hall fills with smoke**. Bedroom A's route changes from the west exit to the east exit; its message changes as well.
5. Show **Devices & bridge** to explain that physical buttons can deliver those same events by USB serial.

For a quiet presentation, the **Play announcements** button can replay voice output after you have demonstrated the visual reroute.

## What works

- A manually verified sample graph of three bedrooms, one kitchen, corridors, and two exits.
- Dijkstra shortest available route calculation that excludes blocked graph nodes.
- Practice, alert, and reset states, with per-room message IDs and English/Spanish text templates.
- A floor-plan dashboard, event log, per-room instructions, household preferences saved in the browser, and responder-facing hazard view.
- Web Serial bridge at 115200 baud for newline-delimited sensor events and location-specific guidance commands.
- Speech through the browser's local speech engine. Hardware may play cached clips keyed by `message_id`.
- Optional cached ElevenLabs audio. No key is shipped with the app, and no emergency-time API request is made.
- Simulation functions in the browser console: `firepath.ingest({ type: 'hazard', node: 'WEST_HALL', active: true })` and `firepath.snapshot()`.

## Scope and safety

The home and address shown are fictional placeholders; no city data or actual plan has been loaded. The app does not infer routes from uploaded plans, model smoke spread or occupant movement, establish accessibility of a path, or integrate with a certified alarm panel. It is a demonstration of architecture, not emergency equipment. Do not use its instructions in a real emergency.

Route selection is deterministic. Language is selected from templates; no language model decides emergency actions. In particular, the household-needs setting records a requirement but does not alter routes without verified accessibility data. There is an explicit no-confirmed-route state if both exits are blocked.

## Project layout

- `src/model.js` - building graph, routing, message selection.
- `src/app.js` - state, UI, browser speech, serial bridge.
- `src/style.css` and `index.html` - dashboard and resident setup.
- `docs/HARDWARE.md` - physical interface contract and bring-up sequence.
- `examples/esp32_controller/esp32_controller.ino` - optional two-button / three-LED ESP32 controller sketch.

## Optional ElevenLabs audio

`npm run audio:plan` lists the number of phrases without contacting the API. To generate and cache nine English demo phrases, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in your shell, then run `node scripts/generate-audio.mjs --generate`. Add `--spanish` to generate nine Spanish phrases. The browser uses a cached clip when its exact reviewed phrase is present and otherwise falls back to browser speech. The API key stays on the local machine; generated MP3 files are ignored by Git.

The script follows ElevenLabs' [official text-to-speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) and [API-key guidance](https://elevenlabs.io/docs/api-reference/authentication). These calls consume the account's generation credits; the default command is a dry run.

## Next improvements

Plan upload with human confirmation, approved building geometry, hazard weighting and smoke propagation, local voice clips in additional languages, resilient edge hardware, device commissioning, and review by fire professionals. A city GIS data connection would add location context but does not replace the home's interior plan.
