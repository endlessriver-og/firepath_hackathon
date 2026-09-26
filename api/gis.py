"""Vercel function: hazard lookup at a point with HackerFund's GlendaleGisMcp (same output as
scripts/lookup-hazards.py). The package downloads and verifies its published snapshot into /tmp on
a cold start and reuses it while the instance stays warm. Coordinates only: FirePath geocodes first.
"""
import asyncio
import json
import os
from http.server import BaseHTTPRequestHandler

os.environ.setdefault('GLENDALE_GIS_CACHE_DIR', '/tmp/glendale-gis')

from glendale_gis.core.config import Settings
from glendale_gis.core.hazards import hazards_at_location
from glendale_gis.core.models import Location
from glendale_gis.server import build_state

LAYERS = ('wildfire', 'flood', 'fault', 'liquefaction', 'landslide', 'dam_inundation', 'debris_flow')
loop = asyncio.new_event_loop()
state = None


async def lookup(lat, lon):
    global state
    state = state or build_state(Settings.from_env())
    snapshot, geocoder, _ = state.require_snapshot()
    resolved = await geocoder.resolve(Location(lat=lat, lon=lon))
    result = hazards_at_location(snapshot, resolved).model_dump(mode='json', by_alias=True)
    hazards = {}
    for name in LAYERS:
        value = result[name]
        hazards[name] = {key: value.get(key) for key in ('title', 'status', 'reason', 'notes', 'disclaimer', '_meta')}
        hazards[name]['matches'] = [{'attributes': match['attributes']} for match in value['matches']]
    return {'location': result['location'], 'hazards': hazards}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = json.loads(self.rfile.read(min(int(self.headers.get('content-length') or 0), 1024)))
            lat, lon = float(payload['lat']), float(payload['lon'])
            if not (34.0 < lat < 34.4 and -118.4 < lon < -118.1):
                raise ValueError('outside')
            status, body = 200, loop.run_until_complete(lookup(lat, lon))
        except Exception:
            # Never echo the exception: it can contain a location.
            status, body = 422, {'error': 'Lookup could not be completed for that point.'}
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
