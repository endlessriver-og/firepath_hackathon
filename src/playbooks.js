// Alert playbooks: turn an official alert (or a labelled practice drill) into steps for THIS household
// or business. Uses only what the account saved and the mapped layers at its address; never invents
// an evacuation order. Shared by the API and the Expo app.
import { describeHazard, hazardNames } from './preparedness.js';

const KINDS = [
  { kind: 'fire', match: /red flag|fire weather|extreme fire/i, title: 'Fire weather' },
  { kind: 'wind', match: /wind/i, title: 'Strong wind' },
  { kind: 'flood', match: /flood|debris flow|rain/i, title: 'Flooding' },
  { kind: 'heat', match: /heat/i, title: 'Extreme heat' },
  { kind: 'smoke', match: /smoke|air quality/i, title: 'Smoke and air quality' },
];

export const drillEvents = ['Red Flag Warning', 'High Wind Warning', 'Flash Flood Warning', 'Excessive Heat Warning', 'Air Quality Alert'];

export function alertKind(event = '') {
  return KINDS.find(k => k.match.test(event)) || { kind: 'general', title: 'Weather alert' };
}

const list = items => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

export function buildPlaybook(event, { type = 'resident', household = {}, business = {}, hazards = null, done = {} } = {}) {
  const { kind, title } = alertKind(event);
  const inZone = key => hazards?.[key] && describeHazard(key, hazards[key]).tone === 'mapped';
  const fireZone = inZone('wildfire') ? hazards.wildfire.matches?.[0]?.attributes?.FHSZ_Description : null;
  const floodZone = hazards?.flood?.matches?.some(m => m.attributes?.SFHA_TF === 'T') || hazards?.dam_inundation?.status === 'in_zone';
  const now = [], leave = [], checkOn = [];
  const add = (group, text, why) => group.push({ text, why });

  if (type === 'business') {
    const b = business;
    const staff = b.employees ? `${b.employees} staff` : 'staff';
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, `Your site is in a CAL FIRE ${fireZone} zone. Decide now who can close the business and when.`, 'Mapped wildfire zone at your address');
      add(now, `Brief ${staff} on the assembly point${b.assembly ? `: ${b.assembly}` : ''} and who takes the headcount.`, b.assembly ? 'Your saved assembly point' : 'No assembly point saved yet');
      if ((b.hazmat || []).length) add(now, `Secure hazardous materials${b.hazmatNote ? ` (${b.hazmatNote})` : ''} and keep the storage area clear of anything that burns.`, 'You reported hazardous materials on site');
      if (!done.zone0 && fireZone) add(now, 'Move pallets, dumpsters and anything that burns away from walls and vents.', 'Open step: clear the first 5 feet');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, 'Move stock, records and equipment off the floor; know where the utility shutoffs are.', 'Mapped flood or dam inundation area');
      add(now, 'Tell staff not to drive through flooded streets on the way in or out.', 'Most flood deaths happen in vehicles');
    }
    if (kind === 'heat') add(now, `Plan water, shade and breaks for ${staff}, especially anyone working outdoors or in kitchens.`, 'Heat illness risk at work');
    if (kind === 'smoke') add(now, 'Keep doors and windows closed, set HVAC to recirculate, and limit outdoor work.', 'Smoke exposure');
    if (b.needsHelp) add(checkOn, `Assign a staff member to each of the ${b.needsHelp} people who may need help leaving.`, 'From your business profile');
    add(leave, `Keep the key contact${b.contactName ? ` (${b.contactName})` : ''} reachable and confirm how you will reach every employee.`, done.contacts ? 'Your staff contact tree' : 'Open step: build a staff contact tree');
  } else {
    const h = household;
    const pets = (h.pets || []).map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`);
    const helpers = (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
    const kids = (h.members || []).filter(m => m.ageGroup === 'child').map(m => m.name);
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, `Your home is in a CAL FIRE ${fireZone} zone. Park facing out and keep the car fuelled so you can leave at the first order.`, 'Mapped wildfire zone at your address');
      add(now, done.kit ? 'Put your go bag by the door and charge phones and battery packs.' : 'Pack a go bag now: water, medications, documents, chargers, a flashlight.', done.kit ? 'You packed a go bag' : 'Open step: go bag');
      if (pets.length) add(now, `Get carriers, leashes and food ready for the ${list(pets)}.`, 'Pets you saved');
      if (fireZone && !done.zone0) add(now, 'Move doormats, cushions, firewood and anything that burns away from the house.', 'Open step: clear the first 5 feet');
      if (kind === 'wind') add(now, 'Expect possible power outages: charge devices and have flashlights ready.', 'High winds can bring down lines');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, 'Move valuables and documents off the floor and know how to shut off power.', 'Mapped flood or dam inundation area');
      if (inZone('debris_flow')) add(now, 'You are near a post-fire debris-flow area: be ready to leave before heavy rain.', 'Mapped debris-flow assessment');
      add(now, 'Never walk or drive through moving water. Turn around.', 'Most flood deaths happen in vehicles');
      if (pets.length) add(now, `Bring the ${list(pets)} inside.`, 'Pets you saved');
    }
    if (kind === 'heat') {
      add(now, 'Plan the hottest hours: cool room, water, and the nearest place with air conditioning.', 'Heat illness risk');
      if (pets.length) add(now, `Keep the ${list(pets)} inside with water; pavement burns paws.`, 'Pets you saved');
    }
    if (kind === 'smoke') add(now, 'Keep windows closed, run a HEPA filter or AC on recirculate, and limit time outside.', 'Smoke exposure');
    if (helpers.length) add(checkOn, `${list(helpers)} may need help${['fire', 'wind', 'flood'].includes(kind) ? ' leaving. Arrange the ride now and plan to go early' : ' in this weather. Check on them today'}.`, 'People you said may need help');
    if (kids.length && ['fire', 'wind', 'flood'].includes(kind)) add(checkOn, `Confirm the school pickup plan for ${list(kids)}.`, 'Children in your household');
    if (kids.length && ['heat', 'smoke'].includes(kind)) add(checkOn, `Keep ${list(kids)} indoors during the worst hours.`, 'Children are more sensitive');
    if (h.meetNear || h.meetFar) add(leave, `If you are separated: meet at ${[h.meetNear, h.meetFar].filter(Boolean).join(', or farther away at ')}.`, 'Your saved meeting places');
    else add(leave, 'Agree now where your household meets if you are separated.', 'No meeting places saved yet');
    if (h.contact) add(leave, `Tell ${h.contact} your plan; out-of-area lines often work when local ones are busy.`, 'Your out-of-area contact');
  }
  add(leave, 'If officials order you to leave, go right away and follow their routes. FirePath does not choose evacuation routes.', 'Official instructions come first');
  return {
    event, kind, title,
    mappedHere: Object.keys(hazardNames).filter(inZone).map(k => hazardNames[k]),
    groups: [['Do now', now], ['Before you leave', leave], ['Check on', checkOn]].filter(([, steps]) => steps.length).map(([label, steps]) => ({ label, steps })),
  };
}
