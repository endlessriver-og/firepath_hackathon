// Data FirePath does not have today, with an illustrative example record and the capability it would unlock.
// Examples are invented to show the shape of the data; they are not real City records.
export const cityData = {
  evacuationZones: { dataset: 'evacuation zone boundaries and IDs', example: 'your home is in zone GLN-E-012', unlocks: 'show your evacuation zone and match every live order or warning to your exact address' },
  alertFeed: { dataset: 'emergency alert feed (the system behind City Everbridge messages)', example: '"Evacuation Warning, zone GLN-E-012, issued 3:14 PM"', unlocks: 'send official City alerts straight to your phone, with cancellations and all-clears' },
  permitZones: { dataset: 'red/yellow/green permit fire zones', example: 'parcel 5612-004-019 is in a red zone', unlocks: 'tell you exactly which fire-code rules apply to your project before you apply' },
  parcels: { dataset: 'ownership and unit records for each parcel', example: 'parcel 5615014901, owner of record matches your name', unlocks: 'verify your address instantly instead of mailing a code, and link units for renters (FirePath already reads the parcel number from public permit records)' },
  permitHistory: { dataset: 'building details behind each permit', example: '2019 re-roof used Class A material; seismic retrofit completed', unlocks: 'skip steps you have already done and tailor home-hardening advice (FirePath already shows the permit and inspection list)' },
  brushClearance: { dataset: 'brush clearance inspection results', example: 'inspection passed May 12; next due May 2027', unlocks: 'show your inspection status and remind you before the deadline' },
  cad: { dataset: 'dispatch (CAD) test connection', example: 'a call at your address shows your consented note to the responding unit', unlocks: 'get your pets, access and assistance notes to responders en route' },
  fireInspections: { dataset: 'fire inspection and hazardous-materials (CUPA) records', example: 'annual fire inspection passed March 2026; HMBP on file for 2 propane tanks', unlocks: 'pre-fill your compliance status and give responders verified facts instead of self-reported ones' },
  closures: { dataset: 'live road closures and evacuation routes', example: 'Glencoe Way closed at Honolulu Ave', unlocks: 'suggest a way out that avoids closed roads, instead of only meeting places' },
};
