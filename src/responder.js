import { describeHazard } from './preparedness.js';

export function buildResponderSummary(profile = {}, details = {}, hazards = null) {
  const lines = ['FIREPATH DRAFT - NOT CONNECTED TO DISPATCH OR CAD'];
  if (profile.address) lines.push(`Location (resident entered): ${profile.address}`);
  else if (Number.isFinite(profile.lat) && Number.isFinite(profile.lon)) lines.push(`Map point (resident entered): ${profile.lat.toFixed(4)}, ${profile.lon.toFixed(4)}`);
  else lines.push('Location: not set');
  if (details.parcelId?.trim()) lines.push(`Parcel reference (resident entered, unverified): ${details.parcelId.trim()}`);
  else lines.push('Parcel reference: not linked');
  if (details.occupants?.trim()) lines.push(`Usual occupants (resident reported): ${details.occupants.trim()}`);
  if (details.pets?.trim()) lines.push(`Animals / where they may be (resident reported): ${details.pets.trim()}`);
  if (details.assistance?.trim()) lines.push(`Assistance consideration (resident reported): ${details.assistance.trim()}`);
  if (details.access?.trim()) lines.push(`Access / building layout note (resident reported): ${details.access.trim()}`);
  if (details.utilities?.trim()) lines.push(`Utility shutoff note (resident reported): ${details.utilities.trim()}`);
  const wildfire = hazards?.wildfire;
  if (wildfire && describeHazard('wildfire', wildfire).tone === 'mapped') {
    const zone = wildfire.matches?.[0]?.attributes?.FHSZ_Description || 'mapped';
    lines.push(`CAL FIRE mapped wildfire zone: ${zone} (planning layer, not an incident)`);
  }
  if (hazards?.flood?.matches?.some(match => match.attributes?.SFHA_TF === 'T')) lines.push('FEMA special flood hazard area mapped (planning layer, not an incident)');
  lines.push('City permit fire zone: not connected; do not infer it from CAL FIRE');
  if (details.updatedAt) lines.push(`Resident draft updated: ${details.updatedAt}`);
  return lines.join('\n');
}
