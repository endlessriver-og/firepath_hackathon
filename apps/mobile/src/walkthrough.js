// The walkthrough: every stop defined here, nowhere else. Each step names a real screen (tab) in the
// app; the tour overlay navigates there and explains it. Chapters follow what fire leadership asks of
// preparedness tools: personalized, actionable, connected, and a new approach worth partnering on.

export const walkthroughIntro = {
  eyebrow: 'A guided walkthrough',
  heading: 'Preparedness keyed to where you live.',
  lede: 'FirePath turns public hazard maps, City records and live alerts into a plan for the specific people at a specific address, and gives them a way to share what responders should know.',
  subLede: 'The tour uses a fictional household at a public Glendale address, with real maps, real City records and live weather data. The one example configuration, City venue packages, is labelled as such.',
  cta: 'Start the walkthrough',
  ctaNote: 'About four minutes · leave anytime',
  loopHeading: 'The loop it closes',
  loop: [
    ['Anyone checks an address', 'Seven state and federal hazard maps, the City\'s own permit and inspection records, and the parcel number, with no account needed.'],
    ['The household adds what matters', 'Who lives there, who may need help leaving, pets, meeting places. Businesses add occupancy and hazardous materials.'],
    ['Every alert becomes steps for those people', 'A Red Flag Warning reads differently for a home with a grandmother who uses a walker and two dogs in the yard.'],
    ['It reaches them wherever they are', 'Phone, a printed sheet on the fridge, and an in-home alert device for people who miss phone alerts.'],
    ['And flows back, with consent', 'A short, sourced note for responders, keyed to the same parcel the City already uses across departments.'],
  ],
  boundariesHeading: 'What it deliberately does not do',
  boundaries: [
    'It never invents an alert or an evacuation order. Weather alerts are from the National Weather Service; City orders stay with the City.',
    'It never chooses an evacuation route without official closures.',
    'It sends nothing to 911, dispatch or the City today. Responder notes wait for an approved connection.',
    'Resident-entered facts are always labelled as resident-reported, never as verified City data.',
  ],
};

export const TOUR_STEPS = [
  { chapter: 'Personalized', tab: 'Home', title: 'A plan for these people, at this address',
    body: 'Dana\'s household: three people, a grandmother who needs help leaving, two dogs, in a CAL FIRE High zone. The line under the ring shows exactly what the plan was built from.' },
  { chapter: 'Personalized', tab: 'Home', title: 'The City\'s own records, per address',
    body: 'Permits, inspections and the parcel number come straight from the City\'s public permit portal. The parcel is the same key the City uses across departments.', tryIt: 'Open "City records" to see recent inspections.' },
  { chapter: 'Personalized', tab: 'Map', title: 'Danger graded across the city',
    body: 'The Combined view grades every 150-meter square by the mapped hazards that overlap there. Tap any spot to see how its score adds up. Each layer below links to the agency\'s official map. Switch View to 3D to see the zones draped over the real hillsides and buildings.', tryIt: 'Tap anywhere on the map, then try the 3D view.' },
  { chapter: 'Actionable', tab: 'Plan', sub: 'todo', title: 'A short, numbered checklist',
    body: 'Official alerts first, then the steps the mapped hazards call for, then this household\'s needs. Everything links to the official guidance.' },
  { chapter: 'Actionable', tab: 'Alerts', sub: 'drill', title: 'Every alert becomes steps for the people there',
    body: 'Live National Weather Service alerts for the address come with a plan. Run a drill to see one: it names Rosa, the dogs and the meeting place.', tryIt: 'Pick "Red Flag".' },
  { chapter: 'Actionable', tab: 'Home', emergency: true, title: 'When it is happening now',
    body: 'One tap from anywhere: what is happening, Call 911, then five calm steps for this household.', tryIt: 'Pick "Told to evacuate".' },
  { chapter: 'Actionable', tab: 'Plan', sub: 'print', title: 'Plans that work with no power or signal',
    body: 'A custom one-page plan for the fridge, plus standard sheets like Drop, Cover, Hold On.', tryIt: 'Print "Our emergency plan".' },
  { chapter: 'Connected', tab: 'Permits', sub: 'events', title: 'The City\'s permit catalog, in plain words',
    body: 'FirePath read all 75 of the City\'s permit types, so plain words find the official permit. Host at a City venue: a night market on Artsakh Paseo becomes a ready-to-file package.', tryIt: 'Pick Artsakh Avenue Paseo, then Night market.' },
  { chapter: 'Connected', tab: 'Systems', title: 'Data, software and devices on one record',
    body: 'Everything FirePath connects, marked Live, Prototype or Needs City. Plug in the in-home device and its row turns to Connected.' },
  { chapter: 'A new approach', tab: 'Walkthrough', final: true, overlay: 'Scroll for how FirePath answers each judging criterion, and what we would build with the City next.', title: 'Preparedness keyed to the parcel, and two-way',
    body: 'The City already keys its departments to the parcel. FirePath puts residents and businesses on that same key: City data flows out as plans, and consented household facts flow back to responders.' },
];

export const partnership = {
  heading: 'What we would build together',
  lede: 'Each item below is already designed into FirePath and shown in the app as "Needs City". Together they make preparedness a two-way City service.',
  asks: [
    ['Evacuation zones and the City alert feed', 'Every official order matched to the exact address, turned into steps for that household, with cancellations and all-clears.'],
    ['A dispatch (CAD) test connection', 'Consented, sourced notes (who needs help, pets, hazardous materials) reaching responders en route.'],
    ['Pre-permitted places', 'City-configured venue packages so a night market or block party is a few answers, not a month of forms.'],
    ['Parcel and building records', 'Instant address verification and home-hardening advice that knows what was already done.'],
  ],
};

// Jewel City Hacks 5.0 judging criteria, answered explicitly on the closing page.
export const criteria = [
  { name: 'Technical execution', weight: 40, question: 'Does the prototype function as intended?',
    answer: 'Yes. Every screen in this walkthrough runs on real data; the only example configuration (venue packages) is labelled.',
    evidence: [
      'Any Glendale address resolves through the City\'s own geocoder and is checked against 7 state and federal hazard maps.',
      'Permits, inspections and parcel numbers come live from the City\'s public permit portal; all 75 City permit types were crawled.',
      'Live National Weather Service alerts, accounts with hashed passwords, and mailed-code address verification.',
      'Runs on web, and bundles for iOS and Android; ESP32 firmware compiles and its protocol is tested end to end.',
      '36 automated tests. Not yet tested on a physical phone or a real ESP32 board.',
    ] },
  { name: 'Social and local impact', weight: 20, question: 'How does this solution benefit the local community?',
    answer: 'It gives every Glendale household and business a plan for their exact address and the people in it, and gives responders the facts that change what they do on arrival.',
    evidence: [
      'People who need help leaving, kids and pets are named in every alert plan and emergency step.',
      'Built for Glendale: the City\'s address list, permit catalog, parcel numbers, Everbridge and evacuation-zone links.',
      'Local businesses get their own plan, hazardous-materials guidance and plain-language permits, down to a night market on Artsakh Paseo.',
      'Printed plans and an in-home device reach people who miss phone alerts.',
    ] },
  { name: 'Presentation', weight: 15, question: 'Is there clarity in storytelling and visual design?',
    answer: 'One story: an address, the people there, and what to do. This walkthrough tells it in ten stops with a fictional household and no sign-up.',
    evidence: [
      'Every plan says what it was built from.',
      'A numbered checklist, a graded hazard map, and an Emergency button always one tap away.',
      'Everything is honestly labelled: Live, Prototype or Needs City.',
    ] },
  { name: 'Creativity', weight: 10, question: 'Is the idea original or novel?',
    answer: 'Preparedness keyed to the parcel, and two-way with consent. The City already links its departments by parcel; FirePath puts residents and businesses on that same key.',
    evidence: [
      'Alerts become steps for specific people, not a generic push.',
      'A combined hazard grid that grades danger across the whole city, with a tap-to-explain breakdown, in 2D or draped over 3D terrain and buildings.',
      '"Pre-permitted places": the permit office as a catalog residents and businesses can order from.',
    ] },
  { name: 'Feasibility', weight: 15, question: 'Could this idea realistically be implemented, if funded?',
    answer: 'Yes. It is built on public data and systems the City already runs (the geocoder, Glendale Permits, Everbridge, Genasys), so no new City infrastructure is needed to start.',
    evidence: [
      'The hazard layers already run on HackerFund\'s open Glendale GIS project (GlendaleGisMcp), so the data foundation exists and is shared.',
      'Phase 1 needs no City integration: hosting, a security review and a standard identity provider for the working resident and business app.',
      'Phase 2: data agreements for evacuation zones and the City alert feed.',
      'Phase 3: a dispatch (CAD) test connection and City-configured venue packages.',
      'The in-home device moves from USB to Bluetooth or Wi-Fi and only acts on verified City alerts.',
    ] },
];
