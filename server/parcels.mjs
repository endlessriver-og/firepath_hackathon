// Parcel at a point, from the LA County Assessor's public parcel service (no key). Used by the 3D map's
// tap-to-inspect. Assessed dollar values are deliberately not requested: FirePath has no use for them.
const PARCELS = 'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';
const FIELDS = 'APN,SitusFullAddress,UseType,UseDescription,YearBuilt1,EffectiveYear1,SQFTmain1,Units1,Bedrooms1,Bathrooms1,TaxRateCity,CENTER_LAT,CENTER_LON,Shape.STArea()';
export const PARCEL_SOURCE = 'LA County Assessor parcels (public GIS)';

const clean = v => (typeof v === 'string' ? v.trim() : v) || null;

export function summarizeParcel(attributes, geometry) {
  const a = attributes;
  const year = Number(a.YearBuilt1) || null;
  return {
    apn: clean(a.APN),
    address: clean(a.SitusFullAddress),
    use: clean(a.UseDescription),
    useType: clean(a.UseType),
    yearBuilt: year,
    sqft: Number(a.SQFTmain1) || null,
    units: Number(a.Units1) || null,
    bedrooms: Number(a.Bedrooms1) || null,
    lotSqft: Math.round(a['Shape.STArea()']) || null, // State Plane feet, so this is square feet
    city: clean(a.TaxRateCity),
    outline: geometry?.rings || null,
    notes: parcelNotes(year, clean(a.UseType) === 'Residential'),
    source: PARCEL_SOURCE,
  };
}

// What the build year means for preparedness. Only claims tied to published program rules.
export function parcelNotes(year, residential = true) {
  if (!year) return [];
  const notes = [];
  if (year < 2008) notes.push(`Built ${year}, before California's 2008 wildfire building standards (Building Code Chapter 7A). Vents, eaves and roofing may predate ember-resistant rules.`);
  if (year < 1980 && residential) notes.push(`Built before 1980: houses this age may qualify for Earthquake Brace + Bolt retrofit grants (EarthquakeBraceBolt.com).`);
  return notes;
}

export function createParcels({ fetchImpl = fetch, ttlMs = 6 * 3600_000 } = {}) {
  const cache = new Map();
  async function query(lat, lon, distance) {
    const params = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: FIELDS, returnGeometry: 'true', outSR: '4326', f: 'json' });
    if (distance) { params.set('distance', String(distance)); params.set('units', 'esriSRUnit_Meter'); }
    const res = await fetchImpl(`${PARCELS}?${params}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Parcel service ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error('Parcel service error');
    return data.features || [];
  }
  return async function parcelAt(lat, lon) {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - ttlMs) return hit.value;
    let features = await query(lat, lon);
    // A tap on a street (no parcel): use the nearest parcel with a street address.
    if (!features.length) {
      const near = (await query(lat, lon, 40)).filter(f => clean(f.attributes.SitusFullAddress));
      const d = f => (f.attributes.CENTER_LAT - lat) ** 2 + ((f.attributes.CENTER_LON - lon) * 0.83) ** 2;
      if (near.length) features = [near.sort((x, y) => d(x) - d(y))[0]];
    }
    const value = features[0] ? summarizeParcel(features[0].attributes, features[0].geometry) : null;
    cache.set(key, { at: Date.now(), value });
    return value;
  };
}
