// Public resources FirePath links out to. Every URL was opened and checked on 2026-09-26; re-check
// before a release (City pages move). Grouped for the Resources list; hazardViewers are the official
// map for each layer FirePath checks.
export const RESOURCES_CHECKED = '2026-09-26';

export const resourceGroups = [
  { title: 'Official alerts and evacuation', items: [
    { name: 'Glendale Citizen Alert (Everbridge)', what: 'Sign up for City emergency alerts by text, call and email.', url: 'https://www.glendaleca.gov/Everbridge' },
    { name: 'Know Your Zone (City of Glendale)', what: 'How Glendale uses evacuation zones and how to find yours.', url: 'https://www.glendaleca.gov/government/departments/fire-department/other-links/emergency-preparedness-response/know-your-zone' },
    { name: 'Genasys Protect', what: 'Look up your evacuation zone and live zone status.', url: 'https://protect.genasys.com/' },
    { name: 'MyShake app (UC Berkeley / ShakeAlert)', what: 'Earthquake early warning on your phone.', url: 'https://myshake.berkeley.edu/' },
    { name: 'National Weather Service, Los Angeles', what: 'Forecasts, Red Flag Warnings and weather alerts.', url: 'https://www.weather.gov/lox/' },
    { name: 'CAL FIRE current incidents', what: 'Active wildfires in California (10+ acres).', url: 'https://www.fire.ca.gov/incidents' },
  ] },
  { title: 'Glendale services', items: [
    { name: 'Make a Plan (Glendale Fire)', what: 'The City\'s household planning guide.', url: 'https://www.glendaleca.gov/government/departments/fire-department/emergency-preparedness/make-a-plan' },
    { name: 'Earthquake Preparedness (Glendale Fire)', what: 'City earthquake guidance.', url: 'https://www.glendaleca.gov/government/departments/fire-department/other/emergency-preparedness-response/earthquake-preparedness' },
    { name: 'Glendale CERT', what: 'Free Community Emergency Response Team training for residents and workers.', url: 'https://cert.glendaleca.gov/' },
    { name: 'Fire Prevention inspections', what: 'Including annual brush clearance inspections in High and Very High zones.', url: 'https://www.glendaleca.gov/government/departments/fire-department/fire-prevention/inspections' },
    { name: 'Glendale Water & Power: power outages', what: 'Outage map, reporting and outage text alerts.', url: 'https://www.glendaleca.gov/government/departments/glendale-water-and-power/safety-security/power-outages' },
    { name: 'Glendale Permits portal', what: 'Apply for building, fire and public works permits.', url: 'https://glendaleca-energovweb.tylerhost.net/apps/SelfService#/home' },
  ] },
  { title: 'Get ready', items: [
    { name: 'Ready for Wildfire (CAL FIRE)', what: 'Ready, Set, Go! wildfire preparation and home hardening.', url: 'https://www.readyforwildfire.org/prepare-for-wildfire/' },
    { name: 'Earthquake Brace + Bolt', what: 'Grants toward a seismic retrofit for older houses.', url: 'https://www.earthquakebracebolt.com/' },
    { name: 'Ready.gov', what: 'Federal guides for kits, plans and every hazard.', url: 'https://www.ready.gov/' },
    { name: 'Ready LA County', what: 'Los Angeles County preparedness and alerts.', url: 'https://ready.lacounty.gov/' },
    { name: 'Cal OES', what: 'California Governor\'s Office of Emergency Services.', url: 'https://www.caloes.ca.gov/' },
  ] },
  { title: 'Help and health', items: [
    { name: '211 LA', what: 'Call 2-1-1 for shelters, food, and help after a disaster.', url: 'https://211la.org/' },
    { name: 'American Red Cross, Los Angeles', what: 'Shelters, disaster help and training.', url: 'https://www.redcross.org/local/california/los-angeles.html' },
    { name: 'AirNow', what: 'Air quality and wildfire smoke by ZIP code.', url: 'https://www.airnow.gov/' },
  ] },
];

export const hazardViewers = {
  wildfire: { name: 'CAL FIRE Fire Hazard Severity Zones', url: 'https://osfm.fire.ca.gov/what-we-do/community-wildfire-preparedness-and-mitigation/fire-hazard-severity-zones' },
  flood: { name: 'FEMA Flood Map Service Center', url: 'https://msc.fema.gov/portal/home' },
  fault: { name: 'CGS Earthquake Zones of Required Investigation', url: 'https://maps.conservation.ca.gov/cgs/EQZApp/app/' },
  liquefaction: { name: 'CGS Earthquake Zones of Required Investigation', url: 'https://maps.conservation.ca.gov/cgs/EQZApp/app/' },
  landslide: { name: 'CGS Earthquake Zones of Required Investigation', url: 'https://maps.conservation.ca.gov/cgs/EQZApp/app/' },
  dam_inundation: { name: 'DWR dam breach inundation maps', url: 'https://fmds.water.ca.gov/maps/damim/' },
  debris_flow: { name: 'USGS post-fire debris-flow hazards', url: 'https://www.usgs.gov/programs/landslide-hazards/science/postfire-debris-flow-hazards' },
};
