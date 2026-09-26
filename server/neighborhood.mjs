// Neighborhood and zoning at a point: not hazards, but what shapes planning, permits and response.
// Exact zoning and historic status come live from the City of Glendale's public GIS; districts,
// neighborhoods, schools and stations come from the committed map layers (same public sources).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CITY = 'https://gismap.glendaleca.gov/arcgis/rest/services/Common';
const SCHOOL_ZONE_M = 152.4; // 500 ft, California Vehicle Code 22352

export function metres(lat1, lon1, lat2, lon2) {
  const dy = (lat2 - lat1) * 110_540, dx = (lon2 - lon1) * 111_320 * Math.cos(lat1 * Math.PI / 180);
  return Math.hypot(dx, dy);
}

function inRing(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Distance from a point to the nearest edge of a polygon's rings, in metres.
export function edgeMetres(rings, lat, lon) {
  const kx = 111_320 * Math.cos(lat * Math.PI / 180), ky = 110_540;
  let best = Infinity;
  for (const ring of rings) for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = [(ring[i - 1][0] - lon) * kx, (ring[i - 1][1] - lat) * ky], [bx, by] = [(ring[i][0] - lon) * kx, (ring[i][1] - lat) * ky];
    const t = Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / (((bx - ax) ** 2 + (by - ay) ** 2) || 1)));
    best = Math.min(best, Math.hypot(ax + t * (bx - ax), ay + t * (by - ay)));
  }
  return best;
}
export function contains(geometry, lon, lat) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.some(([outer, ...holes]) => inRing(outer, lon, lat) && !holes.some(h => inRing(h, lon, lat)));
}

const title = s => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bFar\b/g, 'FAR').replace(/\bDsp\b/g, 'Downtown Specific Plan');

export function createNeighborhood({ layerRoot, fetchImpl = fetch }) {
  const load = name => { try { return JSON.parse(readFileSync(resolve(layerRoot, `${name}.geojson`), 'utf8')).features; } catch { return []; } };
  const layers = { fire_districts: load('fire_districts'), neighborhoods: load('neighborhoods'), schools: load('schools'), fire_stations: load('fire_stations'), hospitals: load('hospitals') };
  const cache = new Map();

  async function cityQuery(path, lat, lon, near = 0) {
    const params = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: String(Boolean(near)), outSR: '4326', f: 'json' });
    if (near) { params.set('distance', String(near)); params.set('units', 'esriSRUnit_Meter'); }
    const res = await fetchImpl(`${CITY}/${path}/query?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`City GIS ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error('City GIS error');
    return (data.features || []).map(f => near ? { ...f.attributes, _m: edgeMetres(f.geometry?.rings || [], lat, lon) } : f.attributes);
  }
  const nearest = (features, lat, lon, n = 1) => features
    .map(f => ({ name: f.properties.name, m: Math.round(metres(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0])) }))
    .sort((a, b) => a.m - b.m).slice(0, n);

  return async function neighborhoodAt(lat, lon) {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - 6 * 3600_000) return hit.value;
    const [zoning, historicDistrict, historicParcel] = await Promise.all([
      cityQuery('Zoning/FeatureServer/2', lat, lon).catch(() => null),
      cityQuery('HistoricDistricts/FeatureServer/0', lat, lon).catch(() => null),
      cityQuery('HistoricParcels/FeatureServer/0', lat, lon).catch(() => null),
    ]);
    // Zoning polygons stop at the street and do not always meet the County parcel lines, so a tap in a
    // gap uses the closest zone within 25 m and says so.
    let z = zoning?.[0], nearbyZone = false;
    if (zoning && !z) { z = (await cityQuery('Zoning/FeatureServer/2', lat, lon, 25).catch(() => [])).sort((a, b) => a._m - b._m)[0]; nearbyZone = Boolean(z); }
    const district = layers.fire_districts.find(f => contains(f.geometry, lon, lat))?.properties.district || null;
    const stationNumber = district?.match(/\d+/)?.[0];
    const station = stationNumber && layers.fire_stations.find(f => f.properties.name.match(/\d+/)?.[0] === stationNumber);
    const schools = nearest(layers.schools, lat, lon, 2);
    const value = {
      zoning: z ? { code: z.ZONE_DISTR, description: title(z.ZONE_DESC), generalPlan: title(z.GPLANDESC), nearbyMetres: nearbyZone ? Math.round(z._m) : 0 } : null,
      historicDistrict: historicDistrict?.[0] ? { name: historicDistrict[0].District_Name, status: historicDistrict[0].Status } : null,
      historicResource: Boolean(historicParcel?.length),
      neighborhood: layers.neighborhoods.find(f => contains(f.geometry, lon, lat))?.properties.label || null,
      fireDistrict: district,
      fireStation: station ? { name: station.properties.name, m: Math.round(metres(lat, lon, station.geometry.coordinates[1], station.geometry.coordinates[0])) } : null,
      schools,
      schoolZone: schools[0] && schools[0].m <= SCHOOL_ZONE_M ? schools[0].name : null,
      hospital: nearest(layers.hospitals, lat, lon)[0] || null,
      live: Boolean(zoning),
      source: 'City of Glendale public GIS (zoning, historic districts, fire districts, schools)',
    };
    value.notes = neighborhoodNotes(value);
    cache.set(key, { at: Date.now(), value });
    return value;
  };
}

// What these mean for a resident. Each note ties to a published rule or a plain fact.
export function neighborhoodNotes(n) {
  const notes = [];
  if (n.schoolZone) notes.push(`Within 500 ft of ${n.schoolZone}: the 25 mph school-zone limit applies when children are present, and evacuation traffic can back up at drop-off and pick-up times.`);
  if (n.historicDistrict || n.historicResource) notes.push('Historic designation: exterior changes, including some fire-hardening work like replacing roofs, vents or windows, may need Historic Preservation review before a permit is issued.');
  return notes;
}
