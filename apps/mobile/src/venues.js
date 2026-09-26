// City event venues with pre-set permit packages. EXAMPLE CONFIGURATION: the City of Glendale has not
// set these up. The venues and their locations are real City facilities; the packages show how the City
// could pre-configure a site so an organizer only answers a few questions. Permit names come from the
// crawled City catalog (planEvent); outside agencies are named with links checked 2026-09-26.
import { planEvent } from './permit-catalog.js';

export const VENUE_NOTE = 'Example of a City-configured venue package. The City of Glendale has not set this up; confirm every requirement with the City.';
const FACILITY_PERMIT = 'https://www.glendaleca.gov/government/departments/community-services-parks/parks-facilities-historic-sites/parks-facilities-reservations/facility-permit-application';

export const venues = [
  { id: 'artsakh', name: 'Artsakh Avenue Paseo', where: 'N Artsakh Ave between Wilson Ave and Broadway', lat: 34.1472, lon: -118.2538, kind: 'paseo', publicWay: true,
    about: 'Pedestrian paseo in the Downtown Arts & Entertainment District, next to the Downtown Central Library.', url: 'https://www.glendaleca.gov/Home/Components/FacilityDirectory/FacilityDirectory/1192/34' },
  { id: 'central-park', name: 'Central Park', where: '201 E Colorado St', lat: 34.143507, lon: -118.253529, kind: 'park', publicWay: false,
    about: 'Downtown park beside the Adult Recreation Center.', url: 'https://www.glendaleca.gov/Home/Components/FacilityDirectory/FacilityDirectory/123/59' },
  { id: 'brand-park', name: 'Brand Park (Brand Library & Art Center)', where: '1601 W Mountain St', lat: 34.183494, lon: -118.2763395, kind: 'park', publicWay: false,
    about: 'Foothill park at the edge of the Verdugo Mountains.', url: 'https://www.glendaleca.gov/government/departments/community-services-parks/parks-facilities-historic-sites/parks-facilities-reservations/facility-permit-application' },
];

// Event templates pre-fill the questions; the organizer can still change every answer.
export const eventTemplates = [
  { id: 'night-market', name: 'Night market', answers: { commercial: true, tents: true, flame: true, food: true, sound: true }, start: '17:00', end: '22:00' },
  { id: 'concert', name: 'Outdoor concert', answers: { commercial: true, tents: true, sound: true }, start: '18:00', end: '21:00' },
  { id: 'festival', name: 'Cultural festival', answers: { commercial: true, tents: true, flame: true, food: true, sound: true }, start: '11:00', end: '19:00' },
  { id: 'fundraiser', name: 'Nonprofit fundraiser', answers: { tents: true, food: true }, start: '12:00', end: '16:00' },
];

const hour = t => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h + (m || 0) / 60 : null; };

// Build a venue package from the organizer's answers. Returns City permits, outside-agency items,
// venue-specific notes and a timeline, all labelled as an example configuration.
export function venuePackage(catalog, venueId, input = {}, hazards = null) {
  const venue = venues.find(v => v.id === venueId);
  if (!venue) return null;
  const a = input.answers || {};
  const plan = planEvent(catalog, { commercial: a.commercial, publicWay: venue.publicWay, tents: a.tents, flame: a.flame, fireworks: a.fireworks, filming: a.filming }, { hazards, attendees: input.attendees });
  const outside = [];
  if (venue.kind === 'park') outside.push({ name: 'City park facility permit', who: 'Glendale Community Services & Parks', why: 'Reserving a City park for an event', url: FACILITY_PERMIT });
  if (a.alcohol) outside.push({ name: 'Alcohol: ABC Event Authorization (licensed caterer) or Daily License (nonprofit, ABC-221)', who: 'California Department of Alcoholic Beverage Control', why: 'Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.', url: 'https://www.abc.ca.gov/licensing/license-forms/event-authorization/' });
  if (a.food) outside.push({ name: 'Temporary food facility permits for each food vendor', who: 'Usually Los Angeles County Public Health, Environmental Health (confirm with the City)', why: 'Selling or giving out food', url: 'http://publichealth.lacounty.gov/eh/' });
  const notes = [...plan.notes];
  const end = hour(input.end);
  if (a.sound && end !== null && end >= 21) notes.unshift('Amplified sound late in the evening may need special approval. Ask the City when you apply.');
  if (a.sound) notes.unshift('Amplified sound: the City may set sound hours and limits for this site.');
  if (venue.publicWay) notes.unshift(`${venue.name} is a public way: street use, barricades and emergency vehicle access are part of the review.`);
  const timeline = [
    ['60+ days before', 'Start City permits (special event, street use or park facility)'],
    a.alcohol ? ['10 to 30 days before', 'File the ABC alcohol application'] : null,
    a.food ? ['2 to 4 weeks before', 'Food vendor health permits'] : null,
    ['Week of the event', 'Fire inspection of tents, cooking and exits; share your emergency plan with staff'],
    ['Day of', 'Check National Weather Service alerts; FirePath can build a playbook for the day'],
  ].filter(Boolean).map(([when, what]) => ({ when, what }));
  return { venue, items: plan.items, outside, notes, timeline, note: VENUE_NOTE };
}
