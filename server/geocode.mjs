// FirePath's own address step against the City of Glendale geocoder (the same service the GIS package
// uses). Typed text goes to the City only; results come back as a matched address plus coordinates,
// and hazards are then checked by coordinates against the local snapshot.
const CITY_GEOCODER = 'https://gismap.glendaleca.gov/arcgis/rest/services/Common/CAD_SiteAddress_Street/GeocodeServer';
const WORDS = { north: 'N', south: 'S', east: 'E', west: 'W', street: 'St', avenue: 'Ave', boulevard: 'Blvd', drive: 'Dr', road: 'Rd', place: 'Pl', court: 'Ct', lane: 'Ln', terrace: 'Ter', circle: 'Cir', parkway: 'Pkwy', highway: 'Hwy' };
const PRECISE = new Set(['PointAddress', 'Subaddress', 'StreetAddress']);

// "1601 West Mountain Street, Glendale, CA 91201" -> "1601 W Mountain St"
export function normalizeAddress(text) {
  return String(text || '')
    .replace(/,?\s*(glendale|montrose|la crescenta|verdugo city)\b.*$/i, '')
    .replace(/,?\s*(ca|california)?\s*\d{5}(-\d{4})?\s*$/i, '')
    .replace(/[.,#]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map(word => WORDS[word.toLowerCase()] || word)
    .join(' ');
}

const streetPart = text => text.split(',')[0].trim().toUpperCase();

async function get(path, params, fetchImpl) {
  const url = `${CITY_GEOCODER}/${path}?${new URLSearchParams({ ...params, f: 'json' })}`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`geocoder ${response.status}`);
  return response.json();
}

export function createGeocoder(fetchImpl = fetch) {
  return {
    // Glendale-only suggestions, one per street address (the City index lists some twice by ZIP).
    async suggest(text) {
      const q = normalizeAddress(text);
      if (q.length < 3) return [];
      const json = await get('suggest', { text: q, maxSuggestions: 10 }, fetchImpl);
      const seen = new Set();
      const dir = q.split(' ').find(w => /^[NSEW]$/.test(w));
      return (json.suggestions || []).filter(s => /GLENDALE/i.test(s.text)).filter(s => !dir || !/^\d+\s+[NSEW]\s/.test(streetPart(s.text)) || new RegExp(`^\\d+\\s+${dir}\\s`).test(streetPart(s.text))).filter(s => !seen.has(streetPart(s.text)) && seen.add(streetPart(s.text))).slice(0, 6).map(s => ({ text: s.text, magicKey: s.magicKey }));
    },

    // Returns { address, lat, lon, score } or throws { candidates } when the choice is ambiguous.
    async resolve(text, magicKey) {
      const attempts = magicKey ? [[text, magicKey]] : [[text], [normalizeAddress(text)]];
      // If the user typed a direction (E, W...), drop candidates on the opposite side of the street grid.
      const typedDir = normalizeAddress(text).split(' ').find(w => /^[NSEW]$/.test(w));
      let ambiguous = null, streetOnly = false;
      for (const [line, key] of attempts) {
        if (!line) continue;
        const json = await get('findAddressCandidates', { SingleLine: line, ...(key ? { magicKey: key } : {}), outFields: 'Match_addr,Addr_type,Score', maxLocations: 6, outSR: 4326 }, fetchImpl);
        const found = (json.candidates || []).filter(c => c.location && /GLENDALE/i.test(c.address || ''));
        const precise = found.filter(c => PRECISE.has(c.attributes?.Addr_type) && c.score >= 80);
        const distinct = [...new Map(precise.map(c => [streetPart(c.address), c])).values()].filter((c, _, all) => !typedDir || all.length < 2 || new RegExp(`^\\d+\\s+${typedDir}\\s`).test(streetPart(c.address)) || !all.some(o => new RegExp(`^\\d+\\s+${typedDir}\\s`).test(streetPart(o.address))));
        if (distinct.length === 1 || (distinct.length > 1 && distinct[0].score >= 95 && distinct[0].score - distinct[1].score >= 5)) {
          const best = distinct[0];
          return { address: best.address, lat: best.location.y, lon: best.location.x, score: best.score };
        }
        if (distinct.length > 1) ambiguous = distinct.slice(0, 5).map(c => c.address);
        else if (found.some(c => c.attributes?.Addr_type === 'StreetName')) streetOnly = true;
      }
      if (ambiguous) throw Object.assign(new Error('ambiguous'), { candidates: ambiguous });
      if (streetOnly) throw Object.assign(new Error('street only'), { streetOnly: true });
      return null;
    },
  };
}
