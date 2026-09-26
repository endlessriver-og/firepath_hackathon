"""Build display-ready hazard map layers from the local Glendale GIS snapshot.

Clips each layer to the city boundary, simplifies geometry (~5 m), rounds coordinates, and tags each
polygon with the severity level its source defines. Output: data/map-layers/*.geojson + manifest.json.
Run after `glendale-gis-mcp --fetch-snapshot`:  .venv/bin/python scripts/build-map-layers.py

Severity rules mirror hazardSeverity() in src/readiness.js. Layers whose source has no severity
classes are tagged level "zone" (inside the mapped zone), never given an invented score.
"""
import json
import pathlib
import sys

import numpy as np
import shapely
from shapely.affinity import scale
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'map-layers'
CACHE = pathlib.Path.home() / 'Library/Caches/glendale-gis-mcp/snapshots'
SIMPLIFY = 0.00005  # degrees, roughly 5 m


def latest_snapshot():
    dirs = sorted(p for p in CACHE.glob('*') if p.is_dir()) if CACHE.exists() else []
    if not dirs:
        sys.exit('No GIS snapshot found. Run: .venv/bin/glendale-gis-mcp --fetch-snapshot')
    return dirs[-1]


def wildfire(p):
    return {'Very High': (3, 'Very high fire hazard severity zone'), 'High': (2, 'High fire hazard severity zone'), 'Moderate': (1, 'Moderate fire hazard severity zone')}.get(p.get('FHSZ_Description'))


def flood(p):
    if p.get('SFHA_TF') == 'T':
        return 3, f"Special flood hazard area, Zone {p.get('FLD_ZONE')} (1% annual chance)"
    if p.get('FLD_ZONE') == 'X' and '0.2' in (p.get('ZONE_SUBTY') or ''):
        return 1, 'Zone X, 0.2% annual chance flood area'
    if p.get('FLD_ZONE') == 'D':
        return 'unknown', 'Zone D, flood hazard undetermined (not studied)'
    return None  # minimal-hazard Zone X is not drawn


def zone(label):
    return lambda p: ('zone', label)


LAYERS = {
    'wildfire': ('calfire_fhsz_lra', wildfire, 'CAL FIRE Fire Hazard Severity Zones (LRA, 2025)'),
    'flood': ('fema_flood_zones', flood, 'FEMA National Flood Hazard Layer'),
    'fault': ('cgs_fault_zones', zone('Alquist-Priolo earthquake fault zone'), 'California Geological Survey'),
    'liquefaction': ('cgs_liquefaction_zones', zone('Seismic hazard zone: liquefaction'), 'California Geological Survey'),
    'landslide': ('cgs_landslide_zones', zone('Seismic hazard zone: earthquake-induced landslide'), 'California Geological Survey'),
    'dam_inundation': ('dwr_dam_inundation', lambda p: ('zone', f"Dam inundation planning area: {p.get('DamName') or 'dam'}"), 'California DWR, Division of Safety of Dams'),
    'debris_flow': ('usgs_debris_flow', zone('USGS post-fire debris-flow assessment basin'), 'USGS'),
}
PLACES = {'fire_stations': ('NAME', 'Fire station'), 'hospitals': ('NAME', 'Hospital'), 'schools': ('SCHOOL', 'School')}


def rounded(geom):
    return json.loads(json.dumps(mapping(geom)), parse_float=lambda x: round(float(x), 5))


# --- Combined planning index ---------------------------------------------------------
# A FirePath-derived grid, NOT an official risk score. Each ~150 m cell sums the mapped layers at its
# centre with illustrative weights; wildfire also decays outward from High/Very High zones because
# embers travel beyond zone lines. Every cell keeps its breakdown so the map can explain the number.
GRID_M = 150
WEIGHTS = {'W3': 6, 'W2': 4, 'W1': 2, 'E2': 2, 'E1': 1, 'F3': 4, 'F1': 1, 'fault': 3, 'liquefaction': 2, 'landslide': 2, 'dam_inundation': 2}
LABELS = {'W3': 'Wildfire Very high', 'W2': 'Wildfire High', 'W1': 'Wildfire Moderate', 'E2': 'Within 400 m of a High/Very high fire zone', 'E1': 'Within 800 m of a High/Very high fire zone', 'F3': 'Special flood hazard area', 'F1': '0.2% annual chance flood area', 'fault': 'Earthquake fault zone', 'liquefaction': 'Liquefaction zone', 'landslide': 'Landslide zone', 'dam_inundation': 'Dam inundation area'}


def combined_index(city, by_key):
    lat0 = city.centroid.y
    kx, ky = 111_320 * np.cos(np.radians(lat0)), 110_540  # degrees -> metres (local equirectangular)
    to_m = lambda g: scale(g, xfact=kx, yfact=ky, origin=(0, 0))
    minx, miny, maxx, maxy = city.bounds
    xs = np.arange(minx, maxx, GRID_M / kx) + GRID_M / kx / 2
    ys = np.arange(miny, maxy, GRID_M / ky) + GRID_M / ky / 2
    gx, gy = [a.ravel() for a in np.meshgrid(xs, ys)]
    inside = shapely.contains_xy(city, gx, gy)
    gx, gy = gx[inside], gy[inside]
    codes = [[] for _ in gx]
    def mark(geom, code, mask=None):
        hit = shapely.contains_xy(geom, gx, gy) if mask is None else mask
        for i in np.nonzero(hit)[0]:
            codes[i].append(code)
        return hit
    fire = {lvl: unary_union([g for l, g in by_key['wildfire'] if l == lvl] or [shapely.Polygon()]) for lvl in (1, 2, 3)}
    in_fire = mark(fire[3], 'W3') | mark(fire[2], 'W2') | mark(fire[1], 'W1')
    severe_m = to_m(unary_union([fire[2], fire[3]]))
    dist = shapely.distance(severe_m, shapely.points(gx * kx, gy * ky))
    mark(None, 'E2', (~in_fire) & (dist <= 400))
    mark(None, 'E1', (~in_fire) & (dist > 400) & (dist <= 800))
    for lvl, code in ((3, 'F3'), (1, 'F1')):
        mark(unary_union([g for l, g in by_key['flood'] if l == lvl] or [shapely.Polygon()]), code)
    for key in ('fault', 'liquefaction', 'landslide', 'dam_inundation'):
        mark(unary_union([g for _, g in by_key[key]] or [shapely.Polygon()]), key)
    cells = [[round(float(y), 5), round(float(x), 5), sum(WEIGHTS[c] for c in cs), ','.join(cs)] for x, y, cs in zip(gx, gy, codes) if cs]
    return {'grid_m': GRID_M, 'weights': WEIGHTS, 'labels': LABELS, 'max': max((c[2] for c in cells), default=0), 'cells': cells}


def main():
    snap = latest_snapshot()
    OUT.mkdir(parents=True, exist_ok=True)
    city = unary_union([shape(f['geometry']) for f in json.load(open(snap / 'city_boundary.geojson'))['features']])
    json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {}, 'geometry': rounded(city.simplify(SIMPLIFY))}]}, open(OUT / 'city_boundary.geojson', 'w'))
    manifest = {'snapshot': snap.name, 'layers': {}, 'places': {}}
    by_key = {}
    for key, (file, classify, source) in LAYERS.items():
        features = []
        raw = by_key.setdefault(key, [])
        for f in json.load(open(snap / f'{file}.geojson')).get('features', []):
            level = classify(f.get('properties') or {})
            if not level:
                continue
            geom = shape(f['geometry']).buffer(0).intersection(city).simplify(SIMPLIFY, preserve_topology=True)
            if geom.is_empty:
                continue
            raw.append((level[0], shape(f['geometry']).buffer(0).intersection(city)))
            features.append({'type': 'Feature', 'properties': {'level': level[0], 'label': level[1]}, 'geometry': rounded(geom)})
        json.dump({'type': 'FeatureCollection', 'features': features}, open(OUT / f'{key}.geojson', 'w'), separators=(',', ':'))
        manifest['layers'][key] = {'source': source, 'features': len(features), 'bytes': (OUT / f'{key}.geojson').stat().st_size}
    for key, (name_field, kind) in PLACES.items():
        features = [{'type': 'Feature', 'properties': {'name': (f['properties'] or {}).get(name_field) or kind, 'kind': kind}, 'geometry': rounded(shape(f['geometry']))} for f in json.load(open(snap / f'{key}.geojson'))['features']]
        json.dump({'type': 'FeatureCollection', 'features': features}, open(OUT / f'{key}.geojson', 'w'), separators=(',', ':'))
        manifest['places'][key] = {'kind': kind, 'features': len(features)}
    combined = combined_index(city, by_key)
    json.dump(combined, open(OUT / 'combined.json', 'w'), separators=(',', ':'))
    manifest['combined'] = {'cells': len(combined['cells']), 'grid_m': GRID_M, 'max': combined['max']}
    print(f"combined index  {len(combined['cells'])} scored cells of {GRID_M} m, max {combined['max']}")
    json.dump(manifest, open(OUT / 'manifest.json', 'w'), indent=1)
    for key, info in manifest['layers'].items():
        print(f"{key:15} {info['features']:4} features {info['bytes'] / 1024:8.0f} KB")


if __name__ == '__main__':
    main()
