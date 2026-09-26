// Crawl the City of Glendale permit catalog from its public Glendale Permits (Tyler EnerGov Self Service)
// search endpoints: every permit type with its work classes, plus business license types.
// Read-only, unauthenticated, the same calls the portal's public search page makes.
//   node scripts/crawl-permits.mjs   -> src/glendale-permits.json
import { writeFileSync } from 'node:fs';

const BASE = 'https://glendaleca-energovweb.tylerhost.net/apps/selfservice/api/energov';
const HEADERS = { accept: 'application/json', tenantId: '1', tenantName: 'GlendaleCAProd' };
const get = async path => {
  const response = await fetch(`${BASE}/${path}`, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return (await response.json()).Result;
};

// Types that are internal bookkeeping rather than something a resident or business applies for.
const INTERNAL = /^(Legacy|Legacy BL|Miscellaneous Receipt|Subpoena)$/;
const AUDIENCE = [
  [/Single Family|Express|Re-Roof|ADU|Pool|Fence|Kitchen and Bath|Solar|Seismic|Stucco|Indigenous Tree|Street Tree|Demolition|Grading|Combination|Window and Door/i, 'resident'],
  [/Commercial|Multi-Family|Sign|Mural|Back to Business|Sidewalk and Dining|Fire Hazmat|Storage Tank|Industrial Waste|Fire Alarm|Extinguishing|Sprinkler System Multi|Temporary Certificate/i, 'business'],
  [/Special Event|Filming|Temporary Structure|Street Use|Fire General/i, 'events'],
  [/^PW - |Shoring|Final Map|Standard Plan Review|Code Modification|Hydrant/i, 'contractor'],
];
const HAZARD = [[/Fire|Tree|Fuel|Re-Roof|Stucco|Solar/i, 'wildfire'], [/Seismic|Grading|Shoring|Building/i, 'earthquake']];

const setup = await get('permits/search/setup');
const types = setup.PermitTypes.filter(t => t.PermitTypeName && !INTERNAL.test(t.PermitTypeName)).map(t => {
  const name = t.PermitTypeName.trim();
  const workClasses = t.WorkClassTemplates.map(w => w.WorkclassName?.trim()).filter(w => w && !/^\(Legacy\)|^Legacy$/.test(w));
  return {
    name,
    workClasses,
    audience: [...new Set(AUDIENCE.filter(([re]) => re.test(name)).map(([, a]) => a))],
    hazards: [...new Set(HAZARD.filter(([re]) => re.test(name)).map(([, h]) => h))],
  };
});
const businessLicenses = (await get('licenses/business/businessTypes')).map(b => b.BusinessLicenseBusinessTypeName?.trim()).filter(Boolean);

const catalog = {
  source: 'City of Glendale, Glendale Permits portal (Tyler EnerGov Self Service), public search setup',
  portal: 'https://glendaleca-energovweb.tylerhost.net/apps/SelfService#/home',
  crawledAt: new Date().toISOString(),
  permitTypes: types,
  businessLicenseTypes: businessLicenses,
};
writeFileSync(new URL('../src/glendale-permits.json', import.meta.url), JSON.stringify(catalog));
console.log(`${types.length} permit types, ${types.reduce((n, t) => n + t.workClasses.length, 0)} work classes, ${businessLicenses.length} business license types`);
