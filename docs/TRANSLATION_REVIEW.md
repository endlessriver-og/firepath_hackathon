# Reviewing FirePath's Armenian, Spanish and Korean

FirePath shows its screens, maps, printable sheets and emergency steps in Armenian (Հայերեն), Spanish (Español) and Korean (한국어). Every translation is a draft that no native speaker has reviewed yet, and the app says so on screen and on every printed sheet. This guide is for the volunteer who reviews them. You do not need to read code: each section says what to open in the app and what to look for.

## What matters most

Review in this order. The first two are safety text; a mistake there could change what someone does in an emergency.

1. **Emergency steps.** Open the app, tap **Emergency** (top right), then each of the seven situations. Check that every step says what the English says, in plain words a scared person would understand at a glance. Pay special attention to:
   - the **Call 911** button and its line underneath ("If anyone is hurt or in danger");
   - **Drop, Cover, Hold On** for earthquakes. It must match the wording your community already knows from school drills or city materials. The Armenian now uses "Կռացեք, ծածկվեք և ամուր բռնվեք"; Spanish uses the ShakeOut wording "Agáchese, cúbrase y sujétese" in both the app and the printed sheet; Korean uses "엎드리고, 머리를 감싸고, 꼭 붙잡으세요";
   - never walking or driving through moving flood water;
   - leaving at once when officials order it, and the note that FirePath does not choose evacuation routes.
2. **Printable sheets.** Plan tab → Print. Open each sheet (earthquake, wildfire "Ready, Set, Go!", go-bag, utility shutoffs, and the household plan). These end up on refrigerators, so check them as carefully as the emergency steps. The wildfire sheet uses CAL FIRE's three-step names; if your community knows official translations, use those.
3. **Drills and alert plans.** Alerts tab → Drill → pick an alert. These are longer and less urgent.
4. **Permit guidance.** Permits tab: a project's "what you'll usually need" list and notes, the event planner's explanations, and a City-venue package's timeline. Official permit and agency names stay English on purpose.
5. **Everything else.** Sign-up, the checklist, maps and settings.

## Words the builder was unsure about

These are known weak spots. Please check them first.

| Language | Where | Current text | Question |
|---|---|---|---|
| Armenian | Drill and emergency steps for pets | "կապեր" for leashes | Is there a more natural word for a dog leash? |
| Armenian | Earthquake steps and sheet | "Կռացեք, ծածկվեք և ամուր բռնվեք" | Is this the wording used in local drills? |
| Armenian | Wildfire sheet title | "Պատրաստ, ուշադիր, գնացե՛ք" | Is there an established translation of "Ready, Set, Go!"? |
| Spanish | Alerts | "Alerta de Bandera Roja" | The National Weather Service's Spanish name for a Red Flag Warning may differ. |
| Korean | Wildfire sheet title | "준비, 대비, 대피!" | Is there an established translation of "Ready, Set, Go!"? |
| All | Hazard names | "Liquefaction", "Debris flow", "Dam inundation" | Are these the terms residents would recognize? |

## What stays in English on purpose

- Official names: City permit types, agency names (CAL FIRE, FEMA), program names such as "Brace + Bolt", and City venue names. People search for these by their English names.
- The copyable project summary on the Permits tab, which is written for City staff.
- The responder brief's contents, which responders read.
- Anything the resident typed themselves, such as pet names or meeting places.

## How to send corrections

Any format is fine: a screenshot with the correction written on it, or a list of "screen, current text, better text". The builder will find the phrase. For reference, the phrases live in:

- `apps/mobile/src/i18n.js`: screens and buttons.
- `src/playbooks.js`: emergency steps, drills and alert plans (`RESIDENT` and `BUSINESS` tables).
- `src/printouts.js`: printable sheets.
- `map.html` and `map3d.html`: the two maps (the `TX` table near the top).
- `server/parcels.mjs` and `server/neighborhood.mjs`: the notes on the 3D map's parcel card.

After a change, `npm test` checks that every phrase still exists in all four languages with the same `{placeholders}`, and `npm run check:layout` checks that longer words still fit on a small phone.

## What was already checked (2026-09-27)

A proofreading pass by the builder (not a native speaker) fixed:

- **Spanish:** Drop, Cover, Hold On made to match the official ShakeOut wording on the printed sheet, "completados" for checklist progress, a card title that wrongly read "already completed", and a heat-day step that used "them" for one person.
- **Korean:** names written with the polite "님" instead of a bracketed "은(는)".
- **Armenian:** a missing case ending on names, "-ում" on meeting places, a plural "them" for one person, and Drop, Cover, Hold On made to match between the app and the printed sheet.
