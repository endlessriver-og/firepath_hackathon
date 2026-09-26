"""Glendale hazard lookup via the separately installed GlendaleGisMcp snapshot.

The user's address is sent to the City of Glendale geocoder only when they submit it.
Coordinates are evaluated against the local snapshot without geocoding.
"""
import asyncio
import json
import sys

async def main():
    from glendale_gis.server import build_state
    from glendale_gis.core.config import Settings
    from glendale_gis.core.models import Location
    from glendale_gis.core.hazards import hazards_at_location

    payload = json.loads(sys.stdin.read(1024))
    if isinstance(payload.get('address'), str):
        location = Location(address=payload['address'].strip())
    else:
        location = Location(lat=payload['lat'], lon=payload['lon'])
    state = build_state(Settings.from_env())
    try:
        snapshot, geocoder, _ = state.require_snapshot()
        resolved = await geocoder.resolve(location)
        if not resolved.in_city:
            raise ValueError('Outside Glendale pilot coverage')
        result = hazards_at_location(snapshot, resolved).model_dump(mode='json', by_alias=True)
        # Retain the source and meaningful mapped attributes, not the large nearest-feature payload.
        hazards = {}
        for name in ('wildfire', 'flood', 'fault', 'liquefaction', 'landslide', 'dam_inundation', 'debris_flow'):
            value = result[name]
            hazards[name] = {key: value.get(key) for key in ('title', 'status', 'reason', 'notes', 'disclaimer', '_meta')}
            hazards[name]['matches'] = [{'attributes': match['attributes']} for match in value['matches']]
        print(json.dumps({'location': result['location'], 'hazards': hazards}))
    finally:
        await state.client.aclose()

try:
    asyncio.run(main())
except Exception as exc:
    # Errors may embed a user's address. Never return or log the exception verbatim.
    print(json.dumps({'error': 'Lookup could not be completed. Check the address or coordinates and the local GIS setup.'}))
    sys.exit(1)
