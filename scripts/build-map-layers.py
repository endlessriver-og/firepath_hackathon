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


def main():
    snap = latest_snapshot()
    OUT.mkdir(parents=True, exist_ok=True)
    city = unary_union([shape(f['geometry']) for f in json.load(open(snap / 'city_boundary.geojson'))['features']])
    json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {}, 'geometry': rounded(city.simplify(SIMPLIFY))}]}, open(OUT / 'city_boundary.geojson', 'w'))
    manifest = {'snapshot': snap.name, 'layers': {}, 'places': {}}
    for key, (file, classify, source) in LAYERS.items():
        features = []
        for f in json.load(open(snap / f'{file}.geojson')).get('features', []):
            level = classify(f.get('properties') or {})
            if not level:
                continue
            geom = shape(f['geometry']).buffer(0).intersection(city).simplify(SIMPLIFY, preserve_topology=True)
            if geom.is_empty:
                continue
            features.append({'type': 'Feature', 'properties': {'level': level[0], 'label': level[1]}, 'geometry': rounded(geom)})
        json.dump({'type': 'FeatureCollection', 'features': features}, open(OUT / f'{key}.geojson', 'w'), separators=(',', ':'))
        manifest['layers'][key] = {'source': source, 'features': len(features), 'bytes': (OUT / f'{key}.geojson').stat().st_size}
    for key, (name_field, kind) in PLACES.items():
        features = [{'type': 'Feature', 'properties': {'name': (f['properties'] or {}).get(name_field) or kind, 'kind': kind}, 'geometry': rounded(shape(f['geometry']))} for f in json.load(open(snap / f'{key}.geojson'))['features']]
        json.dump({'type': 'FeatureCollection', 'features': features}, open(OUT / f'{key}.geojson', 'w'), separators=(',', ':'))
        manifest['places'][key] = {'kind': kind, 'features': len(features)}
    json.dump(manifest, open(OUT / 'manifest.json', 'w'), indent=1)
    for key, info in manifest['layers'].items():
        print(f"{key:15} {info['features']:4} features {info['bytes'] / 1024:8.0f} KB")


if __name__ == '__main__':
    main()
