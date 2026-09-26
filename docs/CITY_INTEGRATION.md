# City and responder integration hypothesis

These notes reflect the September 26 conversation with City information and preparedness staff. They are discovery input, not a commitment from Glendale or a verified description of every city system.

## Product shift

FirePath has two linked jobs:

1. **Resident preparation:** show mapped local hazards, tailored next steps, and official warning channels for a home.
2. **Responder context:** let a resident maintain a small set of practical property facts that a City-approved workflow could surface inside existing dispatch and responder systems during a call.

The best responder delivery may be a short, sourced text summary in the existing CAD/dispatch stream, not another dashboard. Dispatch already works across maps, incoming text, cameras, radio and multiple screens; responders may read a compact stream while traveling to a scene. Avoid adding a required action that competes with their immediate job of reaching the location.

## Parcel as the joining key

City staff described the parcel identifier as a shared key across permitting, utilities, public works, ownership and public-safety information. The [Glendale GIS MCP catalog](https://github.com/HackerFund/GlendaleGisMcp) includes a City parcel layer queried **live**, separate from the downloadable hazard snapshot. The current app does not resolve a location to a verified parcel ID. Its optional parcel field is explicitly resident entered and unverified.

A production flow would geocode an address, resolve candidate parcel(s), have the resident confirm the property, and store the authoritative parcel ID with source and timestamp. Do not infer parcel ownership from an address entry. City review is needed to decide whether multi-unit properties should use unit/building identifiers in addition to the parcel.

## Keep these maps separate

| Data | Current state | Meaning |
| --- | --- | --- |
| CAL FIRE fire hazard severity zone | In the existing GIS snapshot and app | Planning/regulatory hazard layer at a map point. |
| City red/yellow/green fire/permit zone | Mentioned by City staff; dataset and legend not received | Separate permitting classification and possibly zone-specific requirements. Do not derive it from the CAL FIRE card. |
| Official evacuation zone or active alert | Link to City's Know Your Zone and Everbridge; no ingestion | Current protective action belongs to the official City channel. |
| Parcel and floor plan | Parcel live layer exists; floor-plan access not confirmed | Possible property-context join, subject to rights, accuracy and data-sharing rules. |

## Smallest valuable responder record

Candidate resident-reported fields: occupants usually present, pets and their likely location, assistance considerations stated as practical needs, general access/layout notes, and utility shutoff location. Each fact needs provenance, last-confirmed date, edit/delete controls and a visibility policy. Exclude door codes and detailed medical diagnoses. An empty or outdated field must never be presented as a verified absence of a hazard.

The prototype holds these fields only in the user's browser and shows an **illustrative** text summary. It never sends them to the City, 911, dispatch or responders. The copy button is a manual demonstration. No actual CAD integration exists.

The standalone **Responder demo** view uses fictional training facts by default. A user may explicitly switch it to the current browser's saved local draft. Earthquake, evacuation and water exercises change the order of facts, not the underlying evidence or official instructions. The field layout removes secondary panels to demonstrate a short en-route readout. None of these exercises represents an active dispatch call.

## Integration sequence to validate with the City

1. **Discover:** ask GIS/permitting for the authoritative parcel lookup, the fire permit-zone layer, class definitions, effective dates and requirement rules. Ask which floor plans are available, for which properties, with what access restrictions and update cadence.
2. **Choose use cases:** review 3-5 sample incident types with dispatch and a field responder. Determine which resident facts would change a decision en route and which would create distraction or stale-data risk.
3. **Design controls:** verify property/resident claims, get affirmative consent, minimize data, assign retention and refresh intervals, allow deletion, log access and corrections, and separate verified City facts from resident statements.
4. **Prototype the handoff:** deliver a short, provenance-labeled property summary in a **test environment** through the channel the City's CAD vendor supports. Confirm identity matching, latency, failure behavior and the dispatcher/responder display before any live pilot.
5. **Two-way path:** specify which updates are accepted from residents, dispatch and responders; show acknowledgments and corrections without turning a consumer app into an emergency reporting substitute.

## Open City questions

- What is the exact parcel identifier field and the approved address-to-parcel matching method, including apartments and multiple parcels?
- Are the red/yellow/green permit zones an accessible GIS layer? What do the colors mean, and which permit rules depend on them?
- Are floor plans accessible to dispatch/field personnel today? Which plans are authoritative and can a resident supply or update one?
- Which CAD vendor/interface is used, who can authorize a test integration, and what data format and character limit fit the existing responder summary?
- Which facts are useful enough to justify collection and verification? How often must they be renewed or removed?
- How should residents correct a record and how would responders flag stale or contradictory information?

The City's camera and license-plate systems came up as examples of current information flows. They do not imply that FirePath can or should connect to those systems.
