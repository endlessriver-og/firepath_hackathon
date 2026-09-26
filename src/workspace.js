import { describeHazard } from './preparedness.js';

export const scenarios = {
  earthquake: { title: 'Earthquake response', focus: 'Check occupancy and assistance needs', detail: 'Exercise emphasis only. Confirm every fact through the normal response process.', order: ['occupants', 'assistance', 'access', 'pets', 'utilities'] },
  wildfire: { title: 'Evacuation support', focus: 'Check animals and property access', detail: 'Exercise emphasis only. Follow official evacuation direction and normal response procedures.', order: ['pets', 'access', 'assistance', 'occupants', 'utilities'] },
  flood: { title: 'Water response', focus: 'Check access and utility locations', detail: 'Exercise emphasis only. Confirm conditions on arrival and use official incident information.', order: ['access', 'utilities', 'occupants', 'assistance', 'pets'] },
};

const labels = { occupants: 'Usual occupants', pets: 'Animals & likely location', assistance: 'Assistance consideration', access: 'Access / layout', utilities: 'Utility shutoff' };
const fictional = { occupants: 'Three people usually present', pets: 'Two dogs usually in backyard', assistance: 'One person may need a step-free exit', access: 'Rear access from alley', utilities: 'Gas shutoff reported on east wall' };

export function buildWorkspace({ scenario = 'earthquake', source = 'fictional', profile = {}, draft = {}, hazards = null } = {}) {
  const exercise = scenarios[scenario] || scenarios.earthquake;
  const isLocal = source === 'local';
  const values = isLocal ? draft : fictional;
  const sourceLabel = isLocal ? 'Resident entered · unverified' : 'Fictional training fact';
  const facts = exercise.order.filter(key => values[key]?.trim()).map(key => ({ key, label: labels[key], value: values[key].trim(), source: sourceLabel }));
  const place = isLocal ? (profile.address?.trim() || (Number.isFinite(profile.lat) && Number.isFinite(profile.lon) ? `Map point ${profile.lat.toFixed(4)}, ${profile.lon.toFixed(4)}` : 'No location saved with this draft')) : 'Fictional training property · Glendale, CA';
  const mapLinked = isLocal && Boolean(hazards) && Boolean(profile.address || (Number.isFinite(profile.lat) && Number.isFinite(profile.lon)));
  const planning = [];
  if (mapLinked && describeHazard('wildfire', hazards.wildfire).tone === 'mapped') planning.push('CAL FIRE wildfire hazard zone mapped');
  if (mapLinked && hazards.flood?.matches?.some(item => item.attributes?.SFHA_TF === 'T')) planning.push('FEMA special flood hazard area mapped');
  const lines = ['EXERCISE ONLY - NO LIVE CALL OR CAD CONNECTION', exercise.title, place];
  if (isLocal && draft.parcelId?.trim()) lines.push(`Parcel ID (resident entered, unverified): ${draft.parcelId.trim()}`);
  for (const fact of facts) lines.push(`${fact.label}: ${fact.value} [${fact.source}]`);
  if (!facts.length) lines.push('No resident facts saved. Missing information is unknown.');
  for (const item of planning) lines.push(`${item} [public planning layer, not a live event]`);
  lines.push('City permit zone, floor plan and CAD link: unavailable in prototype');
  return { ...exercise, place, facts, mapLinked, sourceLabel, updatedAt: isLocal ? draft.updatedAt || null : null, readout: lines.join('\n') };
}
