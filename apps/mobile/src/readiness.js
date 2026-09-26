// Readiness scoring, queryable recommendations and the resident permit guide.
// Pure functions shared by the Node API and the Expo app (copied by scripts/sync-mobile-demo.mjs).
import { buildTasks, describeHazard, hazardNames } from './preparedness.js';

const CATEGORY = { alerts: 'alerts', kit: 'kit', plan: 'household', quake: 'earthquake', ground: 'earthquake', pets: 'household', assistance: 'household', apartment: 'household', wildfire: 'wildfire', flood: 'water', zone0: 'wildfire', 'responder-notes': 'household', kids: 'household', drill: 'alerts' };
const POINTS = { alerts: 20, kit: 30, plan: 20, quake: 15 };
export const categories = [['all', 'All'], ['wildfire', 'Wildfire'], ['earthquake', 'Earthquake'], ['water', 'Flood'], ['household', 'Household'], ['kit', 'Go bag'], ['alerts', 'Alerts']];

// Recommendations = the shared task engine plus steps driven by saved household facts.
export function buildRecommendations(profile = {}, household = {}, hazards = null) {
  const pets = household.pets || [];
  const members = household.members || [];
  const tasks = buildTasks({ housing: household.housing, homeType: household.homeType, pets: pets.length > 0, assistance: Boolean(household.assistance?.trim()) || members.some(m => m.needsHelp || m.ageGroup === 'senior') }, hazards);
  if (members.some(m => m.ageGroup === 'child')) tasks.push({ id: 'kids', tag: 'Your household', title: 'Plan for your kids during school hours', description: 'Know your school\'s emergency pickup plan, add a backup adult to the release list, and practice the meeting place with each child.', url: 'https://www.ready.gov/kids', link: 'Ready.gov for families' });
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  if (wildfire && household.homeType !== 'apartment') tasks.push({ id: 'zone0', tag: 'Mapped wildfire zone', title: 'Clear the first 5 feet around your home', description: 'Move firewood, mulch, dry leaves and anything that burns away from walls, decks and vents. Embers are the main way homes ignite.', url: 'https://www.readyforwildfire.org/prepare-for-wildfire/', link: 'CAL FIRE home hardening' });
  if (pets.length) {
    const pet = tasks.find(task => task.id === 'pets');
    pet.description = `Plan for ${pets.map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`).join(', ')}: food, water, medications, carriers or leashes, and a current photo of each.`;
  }
  tasks.push({ id: 'drill', tag: 'Stay informed', title: 'Run a practice alert drill', description: 'Open Alerts, pick a drill and walk through the plan FirePath builds for your household. It takes two minutes.' });
  if (profile.addressVerified !== 'mail') tasks.push({ id: 'responder-notes', tag: 'Your household', title: 'Verify your address and review your responder notes', description: 'A verified address and a short, consented note (pets, access, who may need help) is what a future City connection would read first.' });
  return tasks.map(task => ({ ...task, category: CATEGORY[task.id] || 'household', points: POINTS[task.id] || (task.tag.startsWith('Mapped') ? 25 : 15) }));
}

// Free-text + category + status filter. Matches title, description, tag and category.
export function queryRecommendations(items, { q = '', category = 'all', status = 'open', done = {} } = {}) {
  // Light stemming so "pets" finds "pet supplies" and "roofs" finds "roof".
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map(word => word.length > 3 ? word.replace(/(es|s)$/, '') : word);
  return items.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (status === 'open' && done[item.id]) return false;
    if (status === 'done' && !done[item.id]) return false;
    const text = `${item.title} ${item.description} ${item.tag} ${item.category}`.toLowerCase();
    return words.every(word => text.includes(word));
  });
}

// Milestones count toward the score alongside recommendations, so setup itself is rewarded.
export function milestones(profile = {}, household = {}) {
  return [
    { id: 'account', title: 'Created your account', points: 10, done: true },
    { id: 'address', title: 'Registered a Glendale address', points: 20, done: Boolean(profile.address) },
    { id: 'verified', title: 'Verified your address by mail', points: 20, done: profile.addressVerified === 'mail' },
    { id: 'household', title: 'Described your household', points: 15, done: Boolean(household.housing && household.homeType && household.people) },
    { id: 'meeting', title: 'Set meeting places', points: 15, done: Boolean(household.meetNear?.trim() && household.meetFar?.trim()) },
  ];
}

const LEVELS = [[0, 'Getting started'], [25, 'Aware'], [50, 'Prepared'], [75, 'Ready'], [100, 'Resilient']];
const BADGES = [
  { id: 'mapped', title: 'Mapped my home', when: s => s.milestone.address },
  { id: 'verified', title: 'Verified resident', when: s => s.milestone.verified },
  { id: 'alerts', title: 'Official alerts on', when: s => s.done.alerts },
  { id: 'kit', title: 'Go bag packed', when: s => s.done.kit },
  { id: 'plan', title: 'Household plan', when: s => s.done.plan && s.milestone.meeting },
  { id: 'quake', title: 'Quake ready', when: s => s.done.quake },
  { id: 'drill', title: 'Drilled', when: s => s.done.drill },
  { id: 'pets', title: 'Pets covered', when: s => s.done.pets },
  { id: 'wildfire', title: 'Ember aware', when: s => s.done.wildfire || s.done.zone0 },
];

const BUSINESS_BADGES = [
  { id: 'mapped', title: 'Mapped the site', when: s => s.milestone.address },
  { id: 'verified', title: 'Verified business', when: s => s.milestone.verified },
  { id: 'alerts', title: 'Official alerts on', when: s => s.done.alerts },
  { id: 'team', title: 'Team ready', when: s => s.done.contacts && s.done.assembly },
  { id: 'continuity', title: 'Continuity plan', when: s => s.done.continuity },
  { id: 'fire', title: 'Fire safe', when: s => s.done.extinguishers && (s.done.hood ?? true) },
  { id: 'quake', title: 'Quake ready', when: s => s.done.quake },
  { id: 'hazmat', title: 'Hazmat squared away', when: s => s.done.hmbp },
];

// Business accounts pass the business profile as `household`.
export function recommendationsFor(profile = {}, household = {}, hazards = null) {
  return profile.type === 'business' ? buildBusinessRecommendations(household, hazards) : buildRecommendations(profile, household, hazards);
}

export function readiness(recommendations, done = {}, profile = {}, household = {}) {
  const business = profile.type === 'business';
  const steps = business ? businessMilestones(profile, household) : milestones(profile, household);
  const possible = steps.reduce((sum, m) => sum + m.points, 0) + recommendations.reduce((sum, r) => sum + r.points, 0);
  const earned = steps.filter(m => m.done).reduce((sum, m) => sum + m.points, 0) + recommendations.filter(r => done[r.id]).reduce((sum, r) => sum + r.points, 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;
  const levelIndex = LEVELS.reduce((found, [min], index) => score >= min ? index : found, 0);
  const next = LEVELS[levelIndex + 1];
  const state = { done, milestone: Object.fromEntries(steps.map(m => [m.id, m.done])) };
  return {
    score, earned, possible,
    level: LEVELS[levelIndex][1],
    nextLevel: next ? { name: next[1], at: next[0] } : null,
    milestones: steps,
    badges: (business ? BUSINESS_BADGES.filter(b => b.id !== 'hazmat' || recommendations.some(r => r.id === 'hmbp')) : BADGES).map(b => ({ id: b.id, title: b.title, earned: Boolean(b.when(state)) })),
  };
}

// --- Resident permit guide -------------------------------------------------------------
// FirePath does not submit permits. It explains what a project usually needs, flags hazard-zone
// considerations from the saved address, and links to the City's own portal.
export const PERMIT_PORTAL = 'https://glendaleca-energovweb.tylerhost.net/apps/SelfService#/home';
const GUIDANCE = 'https://www.glendaleca.gov/government/departments/community-development/development-services/permit-guidance';
export const permitTypes = [
  { id: 'addition', title: 'Home addition or major remodel', permit: 'Building permit (plan check); Planning review may apply', needs: ['Site plan and floor plans', 'Scope of work and square footage', 'Property owner information', 'Licensed contractor, or owner-builder acknowledgement'], url: GUIDANCE, fire: true, seismic: true },
  { id: 'adu', title: 'Accessory dwelling unit (ADU)', permit: 'Building permit; City pre-approved ADU plans may speed review', needs: ['Site plan showing setbacks', 'Choice of a pre-approved plan or your own plans', 'Utility connection plan', 'Property owner information'], url: 'https://www.glendaleca.gov/government/departments/community-development/development-services/adu', fire: true, seismic: true },
  { id: 'reroof', title: 'Roof replacement', permit: 'Building permit for re-roofing', needs: ['Roofing material and product listing', 'Roof area', 'Contractor license'], url: PERMIT_PORTAL, fire: true, roof: true },
  { id: 'retrofit', title: 'Seismic retrofit (brace and bolt)', permit: 'Building permit', needs: ['Foundation type (raised or cripple wall)', 'Retrofit plan or standard plan set', 'Contractor license'], url: 'https://www.earthquakebracebolt.com/', seismic: true },
  { id: 'solar', title: 'Solar panels or battery', permit: 'Building and electrical permit', needs: ['System size and equipment specs', 'Roof or site layout', 'Single-line electrical diagram'], url: PERMIT_PORTAL },
  { id: 'mechanical', title: 'Water heater, HVAC or electrical panel', permit: 'Plumbing, mechanical or electrical permit', needs: ['Equipment make and model', 'Location in the home', 'Contractor license'], url: PERMIT_PORTAL, quakeStrap: true },
  { id: 'fence', title: 'Fence or wall', permit: 'Fence/wall permit (available online)', needs: ['Height and length', 'Material', 'Location relative to property lines'], url: PERMIT_PORTAL, fire: true },
  { id: 'tree', title: 'Work on or near an oak, sycamore or bay tree', permit: 'Indigenous tree permit (Public Works)', needs: ['Tree species and location', 'Photos of the tree', 'Arborist report when required'], url: 'https://www.glendaleca.gov/government/departments/public-works/indigenous-tree-program' },
];

export function permitGuide(typeId, { profile = {}, household = {}, hazards = null, description = '' } = {}) {
  const type = (profile.type === 'business' ? businessPermitTypes : permitTypes).find(t => t.id === typeId);
  if (!type) return null;
  const notes = [];
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  const zone = hazards?.wildfire?.matches?.[0]?.attributes?.FHSZ_Description;
  if (wildfire && type.fire) notes.push(`Your address is in a CAL FIRE ${zone || 'mapped'} fire hazard severity zone. Ask Building & Safety whether wildfire-resistant construction rules (California Building Code Chapter 7A) apply${type.roof ? ', including the required roof class' : ''}.`);
  const ground = ['fault', 'liquefaction', 'landslide'].filter(k => hazards?.[k]?.status === 'in_zone');
  if (ground.length && type.seismic) notes.push(`Your address is in a mapped ${ground.map(k => hazardNames[k].toLowerCase()).join(' and ')} zone. Some projects in state seismic hazard zones need a geotechnical report.`);
  if (type.quakeStrap) notes.push('Water heaters must be strapped for earthquakes; include it in the scope.');
  if (household.housing === 'rent' || (profile.type === 'business' && type.id === 'ti')) notes.push('The City portal asks for the property owner\'s information. Renters and tenants need the owner\'s approval and portal account email.');
  notes.push('The City\'s red/yellow/green permit fire zones are a different layer from CAL FIRE maps and are not connected to FirePath.');
  const summary = [
    `Project: ${type.title}`,
    `Likely permit: ${type.permit}`,
    `Address: ${profile.address || 'not set'}${profile.addressVerified === 'mail' ? ' (verified by mail in FirePath)' : ''}`,
    profile.type === 'business' ? `Business: ${household.name || 'not set'} · contact ${profile.name || 'not set'}` : `Applicant: ${profile.name || 'not set'} (${household.housing === 'rent' ? 'renter' : household.housing === 'own' ? 'owner' : 'relationship not set'})`,
    description.trim() ? `Description: ${description.trim()}` : null,
    wildfire ? `Mapped CAL FIRE zone: ${zone || 'mapped'} (planning layer)` : null,
    ground.length ? `Mapped seismic zones: ${ground.join(', ')}` : null,
    'Prepared with FirePath. Not a City submission; confirm requirements with the City of Glendale.',
  ].filter(Boolean).join('\n');
  return { ...type, notes, summary };
}

// --- Per-layer severity at an address -------------------------------------------------
// Uses only the classes each source defines (mirrors scripts/build-map-layers.py). Binary layers
// report "zone": inside the mapped zone, with no invented severity.
const SEVERITY_LABELS = { 3: 'Very high', 2: 'High', 1: 'Moderate', 0: 'Not mapped' };
export function hazardSeverity(key, value) {
  if (!value || value.status === 'unavailable') return { level: 'unknown', label: 'Not checked', scale: null };
  const attrs = value.matches?.[0]?.attributes || {};
  if (key === 'wildfire') {
    const level = { 'Very High': 3, High: 2, Moderate: 1 }[attrs.FHSZ_Description] ?? 0;
    return { level, label: SEVERITY_LABELS[level], scale: 'CAL FIRE scale: Moderate, High, Very high' };
  }
  if (key === 'flood') {
    if (attrs.SFHA_TF === 'T') return { level: 3, label: 'High (1% annual chance)', scale: 'FEMA: special flood hazard area' };
    if (attrs.FLD_ZONE === 'X' && String(attrs.ZONE_SUBTY || '').includes('0.2')) return { level: 1, label: 'Moderate (0.2% annual chance)', scale: 'FEMA: Zone X shaded' };
    if (attrs.FLD_ZONE === 'D') return { level: 'unknown', label: 'Undetermined', scale: 'FEMA Zone D: not studied' };
    return { level: 0, label: 'Minimal', scale: 'FEMA: Zone X, minimal flood hazard' };
  }
  return value.status === 'in_zone' ? { level: 'zone', label: 'In mapped zone', scale: 'This map has no severity levels; being inside the zone is the signal.' } : { level: 0, label: 'Not mapped', scale: null };
}

// --- Businesses ------------------------------------------------------------------------
// Same account, address, map and alert plumbing as residents; different profile, steps and permits.
export const businessKinds = [['restaurant', 'Restaurant / food'], ['retail', 'Retail'], ['office', 'Office'], ['warehouse', 'Warehouse / industrial'], ['care', 'Healthcare / childcare'], ['other', 'Other']];
export const hazmatKinds = [['propane', 'Propane or natural gas cylinders'], ['flammable', 'Flammable liquids (fuels, solvents)'], ['chemicals', 'Cleaning or process chemicals in bulk'], ['gas', 'Compressed gases'], ['batteries', 'Large lithium battery storage']];
const HMBP = 'https://www.glendaleca.gov/government/departments/fire-department/fire-prevention/environmental-management-center/hazardous-materials-business-plan';
const FIRE_PERMITS = 'https://www.glendaleca.gov/government/departments/fire-department/fire-prevention/inspections/fire-permits';

export function buildBusinessRecommendations(business = {}, hazards = null) {
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  const ground = ['fault', 'liquefaction', 'landslide'].some(k => hazards?.[k]?.status === 'in_zone');
  const hazmat = business.hazmat || [];
  const steps = [
    { id: 'alerts', tag: 'Stay informed', category: 'alerts', points: 20, title: 'Enroll the business in Glendale emergency alerts', description: 'Register the business address and at least two managers with the City\'s Everbridge system.', url: 'https://www.glendaleca.gov/Everbridge', link: 'Enroll with the City' },
    { id: 'contacts', tag: 'Your team', category: 'household', points: 20, title: 'Build a staff contact tree', description: `Keep a current call list for ${business.employees || 'all'} staff and name who calls whom when phones or the building are unavailable.` },
    { id: 'assembly', tag: 'Your team', category: 'household', points: 20, title: 'Set an assembly point and practice an evacuation', description: 'Pick a spot away from the building and traffic, assign someone to take a headcount of staff and visitors, and run a drill.' },
    { id: 'continuity', tag: 'First steps', category: 'kit', points: 25, title: 'Write a one-page continuity plan', description: 'Critical records, backups, key suppliers, insurance contacts, and how you would operate if the building were closed for a week.', url: 'https://www.ready.gov/business', link: 'Ready.gov for business' },
    { id: 'extinguishers', tag: 'Fire safety', category: 'wildfire', points: 15, title: 'Check extinguishers and exit paths', description: 'Confirm extinguishers are serviced and exits, exit signs and emergency lighting are clear and working.' },
    { id: 'quake', tag: 'Earthquake', category: 'earthquake', points: 15, title: 'Secure shelving, inventory and equipment', description: 'Anchor tall shelving and heavy equipment, and keep heavy stock on low shelves.', url: 'https://www.ready.gov/earthquakes', link: 'Earthquake guidance' },
  ];
  steps.push({ id: 'drill', tag: 'Stay informed', category: 'alerts', points: 15, title: 'Run a practice alert drill with your managers', description: 'Open Alerts, pick a drill and walk through the plan FirePath builds for your business.' });
  if (business.kind === 'restaurant') steps.push({ id: 'hood', tag: 'Fire safety', category: 'wildfire', points: 15, title: 'Keep kitchen hood suppression serviced', description: 'Kitchen fire suppression systems need regular professional service; keep the latest service tag visible.' });
  if (business.kind === 'care' || Number(business.needsHelp) > 0) steps.push({ id: 'assist', tag: 'Your team', category: 'household', points: 20, title: 'Plan how to move people who need help', description: 'Assign staff to each person who cannot evacuate alone, and keep that plan where the next shift can find it.' });
  if (hazmat.length) steps.push({ id: 'hmbp', tag: 'Hazardous materials', category: 'household', points: 30, title: 'Check whether you must file a Hazardous Materials Business Plan', description: 'Businesses at or above state reporting amounts (generally 55 gallons, 500 pounds or 200 cubic feet) file with Glendale Fire, the local agency, through the state CERS system. Keep an inventory and site map current.', url: HMBP, link: 'Glendale Fire HMBP page' });
  if (wildfire) steps.push({ id: 'zone0', tag: 'Mapped wildfire zone', category: 'wildfire', points: 25, title: 'Clear the first 5 feet around the building', description: 'Move pallets, dumpsters, mulch and anything that burns away from walls and vents.', url: 'https://www.readyforwildfire.org/prepare-for-wildfire/', link: 'CAL FIRE home hardening' });
  if (ground) steps.push({ id: 'ground', tag: 'Mapped ground hazard', category: 'earthquake', points: 25, title: 'Ask whether the building has had a seismic evaluation', description: 'The address is inside a state seismic hazard zone. Ask the owner or a licensed professional about the building\'s evaluation and retrofit status.', url: 'https://www.conservation.ca.gov/cgs/sh/seismic-hazard-zones', link: 'State seismic hazard zones' });
  return steps;
}

export function businessMilestones(profile = {}, business = {}) {
  return [
    { id: 'account', title: 'Created your account', points: 10, done: true },
    { id: 'address', title: 'Registered the business address', points: 20, done: Boolean(profile.address) },
    { id: 'verified', title: 'Verified the address by mail', points: 20, done: profile.addressVerified === 'mail' },
    { id: 'household', title: 'Described the business', points: 15, done: Boolean(business.name && business.kind && business.employees) },
    { id: 'meeting', title: 'Named a key emergency contact', points: 15, done: Boolean(business.contactName?.trim() && business.contactPhone?.trim()) },
  ];
}

export const businessPermitTypes = [
  { id: 'hmbp', title: 'Hazardous Materials Business Plan', permit: 'Filed with Glendale Fire (local CUPA) through CERS', needs: ['Chemical inventory with amounts', 'Site map with storage locations', 'Emergency response and training plan'], url: HMBP, fire: false },
  { id: 'firepermit', title: 'Fire code operational permit', permit: 'Glendale Fire Prevention permit for certain uses and storage', needs: ['Description of the activity or storage', 'Quantities and locations', 'Floor plan'], url: FIRE_PERMITS },
  { id: 'ti', title: 'Tenant improvement or remodel', permit: 'Building permit (plan check); fire plan review may apply', needs: ['Floor plans and scope of work', 'Occupancy and use', 'Property owner authorization', 'Licensed contractor'], url: PERMIT_PORTAL, fire: true, seismic: true },
  { id: 'sign', title: 'New or changed sign', permit: 'Sign permit', needs: ['Sign drawings and dimensions', 'Location on the building', 'Electrical details if illuminated'], url: PERMIT_PORTAL },
  { id: 'mechanical', title: 'HVAC, electrical or plumbing work', permit: 'Mechanical, electrical or plumbing permit', needs: ['Equipment specs', 'Location', 'Contractor license'], url: PERMIT_PORTAL, quakeStrap: true },
];
