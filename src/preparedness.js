export const hazardNames = { wildfire: 'Wildfire', flood: 'Flood', fault: 'Earthquake fault', liquefaction: 'Liquefaction', landslide: 'Landslide', dam_inundation: 'Dam inundation', debris_flow: 'Debris flow' };

export function describeHazard(key, value) {
  if (!value || value.status === 'unavailable') return { tone: 'unknown', label: 'Data unavailable', detail: value?.reason || 'This map could not be checked.' };
  const attrs = value.matches?.[0]?.attributes || {};
  if (key === 'wildfire') {
    const zone = attrs.FHSZ_Description;
    return value.status === 'in_zone' ? { tone: 'mapped', label: `${zone || 'Mapped'} hazard zone`, detail: 'CAL FIRE fire hazard severity zone at this point.' } : { tone: 'outside', label: 'Outside mapped zone', detail: 'Unzoned does not mean no wildfire exposure.' };
  }
  if (key === 'flood') {
    const zone = attrs.FLD_ZONE;
    if (attrs.SFHA_TF === 'T') return { tone: 'mapped', label: `Special flood hazard area · Zone ${zone || '?'}`, detail: 'Review the official flood map and insurance options.' };
    if (zone) return { tone: 'outside', label: `FEMA Zone ${zone}`, detail: attrs.ZONE_SUBTY || 'Outside the mapped special flood hazard area; flooding remains possible.' };
  }
  return value.status === 'in_zone' ? { tone: 'mapped', label: 'Mapped at this point', detail: value.notes?.[0] || 'Review the mapped layer for details.' } : { tone: 'outside', label: 'Not mapped at this point', detail: value.notes?.[0] || 'A map boundary does not rule out a hazard.' };
}

export function buildTasks(profile = {}, hazards = null) {
  const tasks = [
    { id: 'alerts', tag: 'Stay informed', title: 'Enroll in Glendale emergency alerts', description: 'Register for official Everbridge notifications, then check your evacuation zone.', url: 'https://www.glendaleca.gov/Everbridge', link: 'Enroll with the City' },
    { id: 'kit', tag: 'First steps', title: 'Pack a grab-and-go kit', description: 'Set aside water, food, medications, documents, a flashlight and supplies for your household.', url: 'https://www.ready.gov/kit', link: 'Ready.gov kit guide' },
    { id: 'plan', tag: 'First steps', title: 'Make a household contact plan', description: 'Choose a meeting place, an out-of-area contact and a way to reach each other if networks fail.', url: 'https://www.glendaleca.gov/government/departments/fire-department/emergency-preparedness/make-a-plan', link: 'City planning guide' },
    { id: 'quake', tag: 'Earthquake', title: 'Secure tall furniture and practice Drop, Cover, Hold On', description: 'Earthquake preparation matters across Glendale, regardless of the mapped fault or liquefaction layer.', url: 'https://www.glendaleca.gov/government/departments/fire-department/other/emergency-preparedness-response/earthquake-preparedness', link: 'City earthquake guide' },
  ];
  if (profile.pets) tasks.push({ id: 'pets', tag: 'Your household', title: 'Add pet supplies and a carrier', description: 'Include food, water, medications, a leash or carrier and identification in your evacuation plan.' });
  if (profile.assistance) tasks.push({ id: 'assistance', tag: 'Your household', title: 'Plan for assistance and backup power', description: 'Identify people who can help and arrange a backup for essential mobility or medical equipment.' });
  if (profile.homeType === 'apartment') tasks.push({ id: 'apartment', tag: 'Your building', title: 'Find your building exits and assembly point', description: 'Ask building management about stair routes, assistance procedures and where residents meet outside.' });
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  const flood = hazards?.flood?.matches?.some(match => match.attributes?.SFHA_TF === 'T');
  const dam = hazards?.dam_inundation?.status === 'in_zone';
  if (wildfire) tasks.push({ id: 'wildfire', tag: 'Mapped wildfire zone', title: profile.housing === 'rent' ? 'Ask about building wildfire protections' : 'Review home hardening and vegetation', description: profile.housing === 'rent' ? 'Ask your property manager about vents, vegetation and evacuation routes.' : 'Inspect vents, roof and nearby vegetation using local wildfire guidance.', url: 'https://www.ready.gov/wildfires', link: 'Wildfire guidance' });
  if (flood || dam) tasks.push({ id: 'flood', tag: 'Mapped water hazard', title: 'Review flood coverage and evacuation options', description: 'Ask an insurance professional what your policy covers; check official flood or inundation maps before making a decision.', url: 'https://www.floodsmart.gov/', link: 'FloodSmart' });
  return tasks;
}
