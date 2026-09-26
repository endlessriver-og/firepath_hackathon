// Search the crawled City of Glendale permit catalog in plain language, and assemble the likely set
// of City permits for an event. Names are the City's own permit types and work classes; FirePath only
// matches and explains them. Requirements are confirmed by the City, not by FirePath.
import { describeHazard } from './preparedness.js';

// Everyday words -> the City's vocabulary. Each entry adds search terms that appear in the catalog.
const SYNONYMS = [
  [/party|festival|fair|concert|market|gathering|celebration|event|block party|parade|run|walk/, ['special event', 'street use', 'tent/canopy', 'temporary structure']],
  [/tent|canopy|stage|booth|bleacher|structure/, ['tent/canopy', 'temporary structure']],
  [/food|truck|bbq|grill|cook|propane|fryer|candle|flame/, ['open flame/candle', 'commercial kitchen cooking oil']],
  [/film|movie|shoot|video|photo/, ['filming']],
  [/firework|pyro|special effect/, ['fireworks', 'pyrotechnics']],
  [/street|road|closure|block|sidewalk|curb/, ['street use', 'sidewalk']],
  [/patio|outdoor dining|tables|restaurant seating/, ['sidewalk and dining', 'back to business']],
  [/roof/, ['re-roof']],
  [/adu|granny|backyard home|accessory/, ['adu', 'combination (single family)']],
  [/addition|remodel|renovat|bedroom|garage/, ['combination (single family)', 'addition', 'commercial and mixed use']],
  [/kitchen|bath/, ['kitchen and bath']],
  [/solar|panel|battery/, ['solar', 'battery system']],
  [/quake|earthquake|retrofit|bolt|brace|foundation/, ['seismic bolt and brace']],
  [/tree|oak|sycamore|bay/, ['indigenous tree', 'street tree']],
  [/brush|weed|clearance|defensible|fuel|vegetation|wildfire/, ['landscape/fuel modification', 'fire clearance']],
  [/water heater|plumb|pipe|sewer/, ['plumbing', 'sewer connection']],
  [/hvac|air condition|furnace|heat pump|mechanical/, ['mechanical']],
  [/electric|outlet|ev charger|charger|breaker/, ['electrical']],
  [/sign|banner|mural|paint/, ['sign permit', 'mural', 'pedestrian sign']],
  [/fence|wall/, ['fence/wall', 'retaining wall']],
  [/pool|spa/, ['pool']],
  [/demolish|demolition|tear down/, ['demolition']],
  [/window|door/, ['window and door']],
  [/chemical|hazmat|storage|tank|gas|oil/, ['hazmat storage', 'storage tank', 'medical gas', 'carbon dioxide']],
  [/sprinkler|alarm|extinguish/, ['sprinkler', 'fire alarm', 'extinguishing']],
];

// Phrases that point clearly at one City permit type.
const BOOSTS = [[/block party|street (party|fair|closure)|parade/, 'PW - ROW - Street Use'], [/wedding|private party/, 'Building Temporary Structure Permit']];
const norm = s => s.toLowerCase();
const STOP = new Set(['new', 'add', 'the', 'and', 'for', 'our', 'my', 'around', 'house', 'home', 'want', 'need', 'build', 'put', 'install', 'get', 'with', 'have', 'host', 'hold', 'run', 'at', 'on', 'in', 'a']);

// Returns [{ name, workClasses (matching first), audience, hazards, score }], best first.
export function searchPermits(catalog, query, { audience = null, limit = 8 } = {}) {
  const q = norm(query || '').trim();
  if (!q) return [];
  const terms = new Set(q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s)$/, '')));
  for (const [re, extra] of SYNONYMS) if (re.test(q)) extra.forEach(t => terms.add(t));
  return catalog.permitTypes.map(type => {
    const name = norm(type.name);
    const hits = type.workClasses.filter(w => [...terms].some(t => norm(w).includes(t)));
    let score = [...terms].filter(t => name.includes(t)).length * 3 + hits.length * 2;
    if (audience && type.audience.includes(audience)) score += 1;
    if (BOOSTS.some(([re, target]) => re.test(q) && target === type.name)) score += 4;
    return { ...type, workClasses: [...hits, ...type.workClasses.filter(w => !hits.includes(w))], matched: hits, score };
  }).filter(t => t.score > (audience && t.audience.includes(audience) ? 1 : 0)).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function searchLicenses(catalog, query, limit = 6) {
  const words = norm(query || '').split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(es|s)$/, ''));
  if (!words.length) return [];
  return catalog.businessLicenseTypes.filter(name => words.every(w => norm(name).includes(w))).slice(0, limit);
}

export const eventQuestions = [
  ['commercial', 'Is it run by a business or charges admission?'],
  ['publicWay', 'Will it use a street, sidewalk or public parking?'],
  ['tents', 'Tents, canopies, stages or other temporary structures?'],
  ['flame', 'Cooking, grills, propane or open flame?'],
  ['fireworks', 'Fireworks, pyrotechnics or special effects?'],
  ['filming', 'Will it be filmed or photographed commercially?'],
];

// Assemble the City permits an event would likely need, from yes/no answers. Every item names the
// official permit type (and work class) so it can be found in the Glendale Permits portal.
export function planEvent(catalog, answers = {}, { hazards = null, attendees = 0 } = {}) {
  const find = (type, workClass) => {
    const t = catalog.permitTypes.find(p => p.name === type);
    return t && (!workClass || t.workClasses.includes(workClass)) ? { type: t.name, workClass: workClass || t.workClasses[0] || null } : null;
  };
  const items = [];
  const add = (why, type, workClass) => { const f = find(type, workClass); if (f && !items.some(i => i.type === f.type && i.workClass === f.workClass)) items.push({ ...f, why }); };
  if (answers.commercial) add('Business-run or ticketed events', 'Commercial Special Event Permit', 'Special Event');
  add('Fire Prevention reviews event safety: exits, occupancy and fire lanes', 'Fire General', 'Special Event');
  if (answers.publicWay) add('Using a street, sidewalk or public parking', 'PW - ROW - Street Use', 'Street Use');
  if (answers.tents) { add('Tents, stages and other temporary structures', 'Building Temporary Structure Permit'); add('Fire review of tents and canopies', 'Fire General', 'Tent/Canopy'); }
  if (answers.flame) add('Cooking, propane and open flame at events', 'Fire General', 'Open Flame/Candle');
  if (answers.fireworks) { add('Fireworks', 'Fire General', 'Fireworks'); add('Pyrotechnics or special effects', 'Fire General', 'Pyrotechnics or Special Effects'); }
  if (answers.filming) add('Commercial filming or photography', 'Filming Permit', 'Filming');
  const notes = [];
  const fire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped' ? hazards.wildfire.matches?.[0]?.attributes?.FHSZ_Description : null;
  if (fire && (answers.flame || answers.fireworks)) notes.push(`The event address is in a CAL FIRE ${fire} fire hazard severity zone. Open flame and fireworks may be restricted, especially on Red Flag Warning days; ask Glendale Fire Prevention early.`);
  if (attendees >= 500) notes.push('Large crowds usually need a security, medical and traffic plan; start at least 60 days out.');
  notes.push('Every event needs a plan for exits, a meeting point and weather. FirePath can build an alert playbook for the day.');
  notes.push('This list is FirePath\'s best match to the City\'s permit catalog. The City of Glendale decides what your event requires.');
  return { items, notes };
}
