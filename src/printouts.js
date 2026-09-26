// Printable one-page sheets for fridges, doors and break rooms. Standard sheets carry widely published
// guidance (Drop, Cover, Hold On; Ready, Set, Go!); custom sheets are filled from the account's saved
// data, with blank lines where nothing is saved so they can be completed by hand.
import { describeHazard, hazardNames } from './preparedness.js';
import { hazmatKinds } from './readiness.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const blank = (value, width = '100%') => value ? esc(value) : `<span class="line" style="width:${width}"></span>`;
const list = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const today = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function page(title, accent, body, subtitle = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #17372E; margin: 0; font-size: 13pt; line-height: 1.35; }
  .band { background: ${accent}; color: #fff; padding: 16px 20px; border-radius: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .band h1 { margin: 0; font-size: 28pt; letter-spacing: .5px; }
  .band p { margin: 4px 0 0; font-size: 12pt; opacity: .92; }
  h2 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1.5px; color: ${accent}; margin: 18px 0 6px; border-bottom: 2px solid ${accent}; padding-bottom: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 26px; }
  .steps { counter-reset: s; list-style: none; padding: 0; margin: 0; }
  .steps li { counter-increment: s; position: relative; padding: 6px 0 6px 44px; }
  .steps li::before { content: counter(s); position: absolute; left: 0; top: 4px; width: 32px; height: 32px; border-radius: 50%; background: ${accent}; color: #fff; font-weight: 800; text-align: center; line-height: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .big { font-size: 20pt; font-weight: 800; }
  ul { margin: 4px 0; padding-left: 20px; } li { margin: 3px 0; }
  .box { border: 2px solid #17372E; border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
  .line { display: inline-block; border-bottom: 1.5px solid #17372E; height: 1.1em; vertical-align: bottom; }
  .field { margin: 7px 0; } .field b { display: inline-block; min-width: 150px; }
  .tick li { list-style: none; margin-left: -20px; } .tick li::before { content: "☐  "; font-size: 14pt; }
  .warn { background: #FFF4E5; border-left: 5px solid #B4502B; padding: 8px 12px; margin-top: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  footer { margin-top: 18px; font-size: 9.5pt; color: #53655E; border-top: 1px solid #C9D3CC; padding-top: 6px; }
  @media screen { body { max-width: 8.5in; margin: 24px auto; padding: 0 16px; } }
</style></head><body>
<div class="band"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
${body}
<footer>Prepared with FirePath (Glendale pilot prototype) on ${today()}. Not a City of Glendale document. In an emergency call 911 and follow official instructions. City alerts: glendaleca.gov/Everbridge · Your evacuation zone: protect.genasys.com</footer>
</body></html>`;
}

const mappedLine = hazards => {
  if (!hazards) return '';
  const mapped = Object.keys(hazardNames).filter(k => hazards[k] && describeHazard(k, hazards[k]).tone === 'mapped').map(k => `${hazardNames[k]} (${describeHazard(k, hazards[k]).label})`);
  return mapped.length ? `<div class="warn"><b>Mapped at this address:</b> ${esc(mapped.join('; '))}. Planning maps, not live alerts.</div>` : '';
};

export const standardPrintouts = [
  { id: 'earthquake', title: 'Earthquake: Drop, Cover, Hold On', for: 'everyone' },
  { id: 'wildfire', title: 'Wildfire: Ready, Set, Go!', for: 'everyone' },
  { id: 'gobag', title: 'Go-bag checklist', for: 'everyone' },
  { id: 'shutoffs', title: 'Utility shutoffs', for: 'everyone' },
];

export function standardPrintout(id) {
  if (id === 'earthquake') return page('Earthquake: Drop, Cover, Hold On', '#7B2D8B', `
    <h2>When the shaking starts</h2><ol class="steps">
      <li><span class="big">DROP</span> to your hands and knees before the shaking drops you.</li>
      <li><span class="big">COVER</span> your head and neck. Get under a sturdy table or desk if one is close; otherwise crawl to an interior wall away from windows.</li>
      <li><span class="big">HOLD ON</span> to your shelter, or to your head and neck, until the shaking stops.</li></ol>
    <div class="grid"><div><h2>Do not</h2>${list(['Run outside while the ground is shaking', 'Stand in a doorway', 'Use elevators'])}</div>
    <div><h2>In bed · in a car · outside</h2>${list(['In bed: stay there and cover your head with a pillow', 'Driving: pull over away from bridges and wires, set the brake', 'Outside: move away from buildings, trees and power lines, then drop'])}</div></div>
    <h2>After the shaking stops</h2>${list(['Expect aftershocks. Drop, Cover and Hold On again each time.', 'Check people for injuries; put on shoes before walking through debris.', 'If you smell gas or hear hissing, leave and call the gas company from outside.', 'Text rather than call so lines stay open for emergencies.', 'Get the MyShake app for early warning: myshake.berkeley.edu'])}`, 'Practice it so your body knows what to do.');
  if (id === 'wildfire') return page('Wildfire: Ready, Set, Go!', '#B4502B', `
    <h2>Ready: before fire season</h2>${list(['Clear the first 5 feet around your home of anything that burns', 'Pack a go bag for every person and pet', 'Sign up for City alerts and look up your evacuation zone', 'Plan two ways out of your neighborhood and a meeting place'])}
    <h2>Set: when a fire is nearby or a Red Flag Warning is issued</h2>${list(['Put go bags, pets and carriers by the door', 'Park facing out with at least half a tank', 'Close windows, vents and doors; move furniture away from windows', 'Wear long sleeves, long pants and sturdy shoes', 'Stay tuned to official alerts'])}
    <h2>Go: when officials say go, or you feel unsafe</h2><div class="box big">Leave early. Do not wait for an order if you feel unsafe.</div>
    ${list(['Follow the routes officials give; roads may close', 'Take your go bags, pets, medications and phone charger', 'Tell your out-of-area contact where you are going'])}`, 'CAL FIRE\'s three-step wildfire plan. More: readyforwildfire.org');
  if (id === 'gobag') return page('Go-bag checklist', '#1D5B4D', `<div class="grid">
    <div><h2>For each person</h2><ul class="tick">${['Water (1 gallon per person per day)', 'Non-perishable food for 3 days', 'Medications and copies of prescriptions', 'Glasses, hearing aids, mobility aids', 'Change of clothes and sturdy shoes', 'N95 masks (smoke and dust)', 'Flashlight and extra batteries', 'Phone charger and battery pack'].map(i => `<li>${i}</li>`).join('')}</ul></div>
    <div><h2>For the household</h2><ul class="tick">${['Copies of IDs, insurance and deeds (or on a USB drive)', 'Cash in small bills', 'First aid kit', 'Printed contact list and map', 'Pet food, water, leash or carrier, vet records', 'Baby supplies if needed', 'Whistle', 'Sanitation supplies'].map(i => `<li>${i}</li>`).join('')}</ul></div></div>
    <div class="box">Check this bag every 6 months: replace water, food and batteries, and update medications.</div>`, 'Keep it by the door or in the car.');
  if (id === 'shutoffs') return page('Utility shutoffs', '#2E5A88', `
    <h2>Gas</h2>${list(['Only turn off the gas if you smell gas, hear a hiss, or see damage.', 'Use a wrench to turn the valve a quarter turn so it runs across the pipe.', 'Once it is off, only the gas company should turn it back on.'])}
    <div class="field"><b>Gas meter is at:</b> ${blank('', '60%')}</div><div class="field"><b>Wrench is kept at:</b> ${blank('', '60%')}</div>
    <h2>Electricity</h2>${list(['Turn off individual breakers first, then the main breaker.', 'Never touch the panel if you are standing in water.'])}
    <div class="field"><b>Main breaker is at:</b> ${blank('', '60%')}</div>
    <h2>Water</h2>${list(['Shut the main valve if pipes break, to save the water in your heater and pipes.'])}
    <div class="field"><b>Main water valve is at:</b> ${blank('', '60%')}</div>
    <div class="warn">Power out? Glendale Water &amp; Power outage map and alerts: glendaleca.gov (Power Outages).</div>`, 'Know where they are before you need them.');
  return null;
}

export function householdPlanPrintout({ name, address, hazards, household: h = {} }) {
  const members = [`${esc(name)} (account holder)`, ...(h.members || []).map(m => `${esc(m.name)} · ${m.ageGroup === 'senior' ? 'older adult' : esc(m.ageGroup)}${m.needsHelp ? ' · <b>may need help leaving</b>' : ''}`)];
  const pets = (h.pets || []).map(p => `${p.count} ${esc(p.kind)}${p.where ? ` (usually ${esc(p.where)})` : ''}`);
  return page('Our emergency plan', '#1D5B4D', `
    <div class="field"><b>Home:</b> ${blank(address)}</div>${mappedLine(hazards)}
    <div class="grid"><div><h2>Who lives here</h2>${list(members)}${pets.length ? `<b>Pets:</b> ${pets.join('; ')}` : ''}</div>
    <div><h2>If we are separated</h2>
      <div class="field"><b>Meet near home:</b><br>${blank(h.meetNear)}</div>
      <div class="field"><b>Meet outside the area:</b><br>${blank(h.meetFar)}</div>
      <div class="field"><b>Out-of-area contact:</b><br>${blank(h.contact)}</div></div></div>
    <h2>Important information</h2>
    <div class="field"><b>Our evacuation zone:</b> ${blank('', '40%')} <small>(protect.genasys.com)</small></div>
    <div class="field"><b>Utility shutoffs:</b> ${blank(h.utilities)}</div>
    <div class="field"><b>Help someone may need:</b> ${blank(h.assistance)}</div>
    <div class="field"><b>Doctor / pharmacy:</b> ${blank('')}</div>
    <h2>If we have to leave</h2><ol class="steps"><li>Grab go bags, medications, phone chargers${pets.length ? ' and the pets' : ''}.</li><li>Follow official instructions and routes. Leave early if you feel unsafe.</li><li>Text the out-of-area contact where you are going.</li></ol>`, 'Post this where everyone in the household can see it.');
}

export function businessPosterPrintout({ business: b = {}, address, hazards, name }) {
  const hazmat = (b.hazmat || []).length ? `<div class="warn"><b>Hazardous materials on site:</b> ${esc(b.hazmat.map(k => (hazmatKinds.find(([key]) => key === k) || [k, k])[1]).join('; '))}${b.hazmatNote ? ` (${esc(b.hazmatNote)})` : ''}. Tell firefighters on arrival.</div>` : '';
  return page(`${b.name || 'Business'}: in an emergency`, '#B3261A', `
    <div class="field"><b>Address:</b> ${blank(address)}</div>${mappedLine(hazards)}
    <h2>If you need to evacuate</h2><ol class="steps">
      <li>Leave by the nearest safe exit. <b>Do not use elevators.</b></li>
      <li>Help visitors and anyone who needs assistance to get out.</li>
      <li>Go to the assembly point: <span class="big">${blank(b.assembly, '45%')}</span></li>
      <li>Report to the key contact so everyone is counted. Do not go back inside.</li></ol>
    <div class="grid"><div><h2>Key contact</h2><div class="field"><b>Name:</b> ${blank(b.contactName || name)}</div><div class="field"><b>Phone:</b> ${blank(b.contactPhone)}</div></div>
    <div><h2>Know where they are</h2><div class="field"><b>Fire extinguishers:</b> ${blank('')}</div><div class="field"><b>First aid kit:</b> ${blank('')}</div><div class="field"><b>Utility shutoffs:</b> ${blank(b.utilities)}</div></div></div>
    ${hazmat}
    <div class="box"><b>Earthquake:</b> Drop, Cover, Hold On. <b>Fire:</b> pull the alarm, get out, call 911. <b>Smoke outside:</b> close doors and windows, set HVAC to recirculate.</div>`, 'Post near exits and in the break room.');
}
