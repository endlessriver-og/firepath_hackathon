import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoutes, guidance, routeFrom } from '../src/model.js';

test('different rooms receive different nearby exits', () => {
  const routes = computeRoutes(['KITCHEN']);
  assert.equal(routes.ROOM_A.exit, 'WEST_EXIT');
  assert.equal(routes.ROOM_B.exit, 'EAST_EXIT');
  assert.equal(routes.ROOM_C.exit, 'EAST_EXIT');
});

test('blocking the west corridor reroutes bedroom A to the east', () => {
  const route = routeFrom('ROOM_A', ['KITCHEN', 'WEST_HALL']);
  assert.equal(route.exit, 'EAST_EXIT');
  assert.ok(!route.path.includes('WEST_HALL'));
});

test('never suggests a route through a blocked start or disconnected exits', () => {
  assert.equal(routeFrom('ROOM_A', ['ROOM_A']), null);
  assert.equal(routeFrom('ROOM_A', ['WEST_HALL', 'EAST_HALL']), null);
  assert.equal(guidance('ROOM_A', null).id, 'NO_ROUTE');
});

test('speech message selects validated route and drill mode', () => {
  const route = routeFrom('ROOM_B', []);
  assert.match(guidance('ROOM_B', route, { language: 'es', drill: true }).text, /salida este/);
  assert.equal(guidance('ROOM_B', route).id, 'ALERT_ROOM_B_EAST_EXIT');
  assert.match(guidance('ROOM_A', routeFrom('ROOM_A', ['WEST_HALL']), { blocked: ['WEST_HALL'] }).text, /Turn left at the hallway.*Avoid the west hall/);
  assert.notEqual(guidance('ROOM_A', routeFrom('ROOM_A', ['WEST_HALL']), { blocked: ['WEST_HALL'] }).id, guidance('ROOM_B', route).id);
});
