# FirePath — submission and pitch kit
September 26, 2026 · Jewel City Hacks 5.0

## What is confirmed for this event

- **Submit on Devpost by 6:00 PM Pacific today.** The 5.0 Luma page gives 8:45 AM opening, 6:00 PM closing, 6:15 PM demo expo and 7:15 PM awards. Do not wait until 5:59 to press Submit.
- Judges score **technical execution 40%, social/local impact 20%, presentation 15%, creativity 10%, feasibility 15%**. The challenge is technology that empowers city residents, neighborhoods and local businesses. The Fire Department and City IT provide additional challenges.
- Prize categories listed: Grand Champion, Best Hardware Hack, Best Software Hack, and Top 5 Hackathon Hackers.
- The public Luma page links to Devpost's home page, not the exact 5.0 submission form. Get the event-specific link from the onsite QR code, organizer, Discord or event email. Do not submit to Jewel City Hacks 4.0.
- The 5.0 Luma page does not specify required video, deck, screenshots, repo visibility, or demo length. Confirm these in the actual form. Earlier editions had different requirements; do not treat those as 5.0 rules.

Sources: https://luma.com/jewelcityhacks5 · https://help.devpost.com/article/126-know-your-submission-steps

## Prepare now, before opening Devpost

1. Devpost accounts for each teammate; one team/project submission, teammate invite emails ready.
2. Project title: **FirePath**. Suggested tagline: **Local risks. A plan for your place.**
3. A 1–2 sentence description and fuller project story (paste-ready drafts below).
4. A reliable **Try it out** URL that judges can open without your login; a test account or guided fictional demo if the account flow is required. If the URL depends on a tunnel on your laptop, keep it powered, connected and awake. Test on cellular.
5. GitHub repo link and clear README. If the repo remains private, judges may not be able to open it; either grant access as needed or rely on public demo/video while explaining code access.
6. Two or three clean screenshots: address result, personalized actions/drill, map or permit flow. A 3:2 gallery thumbnail under 5 MB is Devpost's general recommendation.
7. A 90–120 second recorded screen demo, uploaded to YouTube or Vimeo if the event form requests a video. Devpost says video links are *usually* required, but the exact 5.0 requirement is unverified. Have this as a reliability backup even if optional.
8. Short tools/tech list. Only say hardware works if the partner has demonstrated it on the actual device.
9. Device, charger, hotspot and a cached video/screenshots for the 6:15 PM live expo.
10. Submit a valid draft as soon as the form permits, then improve it before 6:00 PM. Confirm status says **Submitted**, not **Draft**.

Devpost's generic help lists Manage team, Project overview (name/tagline/thumbnail), Project details (story, built-with tags, demo links/media), event-specific additional questions and the final Submit step. The event form can differ: https://help.devpost.com/article/126-know-your-submission-steps

## Paste-ready submission copy

**Elevator pitch**

FirePath turns a Glendale address into a practical preparedness plan. It brings public hazard maps, household needs, alerts, City records and permit guidance into one place, so residents and businesses can see what matters where they are and take the next step.

**The problem**

Emergency information is spread across maps, alert services, checklists and City portals. Knowing that a hazard exists somewhere in Glendale does not tell a household what applies at its own address, who needs help leaving, or what to do first. City staff also described rich parcel-linked records that are difficult to turn into quick, useful decisions.

**What we built**

Enter a Glendale address to check seven public planning layers. Register the place and add household or business details to get a prioritized action list, printable plan and practice drill. FirePath links to City permit records, the current fee schedule and application portal; it shows project-specific fees as requiring a City quote when no reliable price is available. A separate consent-based responder brief previews information that could be useful in a future City-approved workflow. The app distinguishes live public data, fictional demo details and planned integrations.

**How we built it**

[Confirm against final code before submitting.] Expo/React Native for the resident interface and web demo; Node for the API; public GIS planning data, City permit records and National Weather Service alerts. An optional ESP32 in-home alert prototype is separate from the currently available app. Replace this sentence with the team's actual hardware status and exact tool list.

**Next steps**

Test with Glendale residents and the emergency preparedness team; validate map explanations and accessibility; improve authentication and consent; pursue an approved City connection for evacuation orders and parcel verification; only then test responder delivery and physical alerts. FirePath is an independent prototype, not a City service or a replacement for official instructions.

## Live pitch: 3-minute core

- **0:00–0:25 — Problem.** “In an emergency, people should not have to search seven maps and multiple City websites to understand their own address. We spoke with City staff and heard a need for location-specific, actionable preparedness.”
- **0:25–0:45 — Product.** “FirePath is one address-based starting point for preparing a household or business and navigating related City information.”
- **0:45–2:15 — Show, do not narrate every tab.** Enter/check one address; point out what is mapped and what is unknown. Open a fictional household: show its top action, a practice alert, and one personalized step for a pet or someone who needs help leaving. If the demo is stable, show City records or a permit with its fee guidance. Avoid the long tour or full feature inventory.
- **2:15–2:40 — Why Glendale / technical proof.** Seven public planning layers, City records, NWS alerts when available, real working interaction. State precisely which parts are demo-only. Show the in-home device only if it works repeatedly.
- **2:40–3:00 — Close.** “The next step is working with the City on verified parcel and evacuation data, then testing whether consented notes can fit existing responder workflows. Today, the resident can already turn public information into an actionable plan.”

**If judges give five minutes:** slow the live walkthrough, demonstrate a second address or printable plan, then leave time for questions. Do not assume five minutes is the official 5.0 slot; the event page gives a one-hour expo without a per-team limit.

## Two anticipated questions

**Does it send alerts or data to first responders?** It checks National Weather Service alerts when available and can run labeled local tests/drills. It does not receive City evacuation orders or send a brief to dispatch today. Responder delivery requires City approval and an integration.

**Are those permit prices final?** No. Permit type can be suggested from the project, but fees depend on scope and reviews. FirePath points to Glendale's current fee schedule and labels the result as City quote required.

## Final portal check

- Correct 5.0 hackathon page and team members.
- Name, tagline, story and tools are accurate for the build being submitted.
- Demo URL opens on a phone outside the team's signed-in session.
- Any video actually plays; screenshots are readable.
- The final button was pressed; the project shows **Submitted** before 6:00 PM PT.
