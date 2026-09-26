// A small fictional home graph for an interactive prototype. A reviewed building model
// would be required for any real emergency guidance.
export const nodes = {
  WEST_EXIT: { x: 45, y: 230, label: 'West exit', kind: 'exit' },
  WEST_HALL: { x: 165, y: 230, label: 'West hall', kind: 'corridor' },
  WEST_JUNCTION: { x: 325, y: 230, label: 'West junction', kind: 'corridor' },
  CENTER: { x: 480, y: 230, label: 'Main hallway', kind: 'corridor' },
  EAST_JUNCTION: { x: 635, y: 230, label: 'East junction', kind: 'corridor' },
  EAST_HALL: { x: 785, y: 230, label: 'East hall', kind: 'corridor' },
  EAST_EXIT: { x: 905, y: 230, label: 'East exit', kind: 'exit' },
  ROOM_A: { x: 290, y: 100, label: 'Bedroom A', kind: 'room' },
  ROOM_B: { x: 670, y: 100, label: 'Bedroom B', kind: 'room' },
  ROOM_C: { x: 480, y: 390, label: 'Bedroom C', kind: 'room' },
  KITCHEN: { x: 730, y: 390, label: 'Kitchen', kind: 'hazard' }
};

export const edges = [
  ['WEST_EXIT', 'WEST_HALL'], ['WEST_HALL', 'WEST_JUNCTION'],
  ['WEST_JUNCTION', 'CENTER'], ['CENTER', 'EAST_JUNCTION'],
  ['EAST_JUNCTION', 'EAST_HALL'], ['EAST_HALL', 'EAST_EXIT'],
  ['ROOM_A', 'WEST_JUNCTION'], ['ROOM_B', 'EAST_JUNCTION'],
  ['ROOM_C', 'CENTER'], ['KITCHEN', 'EAST_JUNCTION']
];
export const rooms = ['ROOM_A', 'ROOM_B', 'ROOM_C'];
export const exits = ['WEST_EXIT', 'EAST_EXIT'];
export const devices = ['ROOM_A', 'ROOM_B', 'ROOM_C'];

function distance(a, b) {
  return Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
}

// Blocked nodes are excluded. Dijkstra's algorithm finds the shortest remaining
// route to either exit; no model makes a route if both exits become unreachable.
export function routeFrom(start, blocked = []) {
  const forbidden = new Set(blocked);
  if (!nodes[start] || forbidden.has(start)) return null;
  const remaining = new Set(Object.keys(nodes).filter(id => !forbidden.has(id)));
  const dist = Object.fromEntries([...remaining].map(id => [id, Infinity]));
  const previous = {};
  dist[start] = 0;
  while (remaining.size) {
    const current = [...remaining].reduce((best, id) => dist[id] < dist[best] ? id : best);
    if (!Number.isFinite(dist[current])) break;
    remaining.delete(current);
    if (exits.includes(current)) {
      const path = [current];
      while (previous[path[0]]) path.unshift(previous[path[0]]);
      return { exit: current, path, distance: dist[current] };
    }
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : null;
      if (!next || !remaining.has(next)) continue;
      const candidate = dist[current] + distance(current, next);
      if (candidate < dist[next]) { dist[next] = candidate; previous[next] = current; }
    }
  }
  return null;
}

export function computeRoutes(blocked = []) {
  return Object.fromEntries(rooms.map(room => [room, routeFrom(room, blocked)]));
}

function firstTurn(route) {
  if (!route || route.path.length < 3) return null;
  const [start, junction, next] = route.path;
  const incoming = { x: nodes[junction].x - nodes[start].x, y: nodes[junction].y - nodes[start].y };
  const outgoing = { x: nodes[next].x - nodes[junction].x, y: nodes[next].y - nodes[junction].y };
  const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
  return Math.abs(cross) < 100 ? null : cross > 0 ? 'right' : 'left';
}

export function guidance(room, route, { language = 'en', drill = false, blocked = [] } = {}) {
  const es = language === 'es';
  const prefix = es ? (drill ? 'Simulacro de incendio. ' : 'Alerta de incendio. ') : (drill ? 'Fire drill. ' : 'Fire alert. ');
  if (!route) return { id: 'NO_ROUTE', text: es ? 'No hay una ruta segura confirmada. Aléjese del peligro y siga las instrucciones de los equipos de emergencia.' : 'No confirmed safe route. Move away from danger and follow emergency personnel instructions.' };
  const destination = route.exit === 'WEST_EXIT' ? (es ? 'la salida oeste' : 'the west exit') : (es ? 'la salida este' : 'the east exit');
  const turn = firstTurn(route);
  const steps = es ? `Salga de ${nodes[room]?.label || room}. ${turn ? `Gire a la ${turn === 'right' ? 'derecha' : 'izquierda'} en el pasillo. ` : ''}Continúe hacia ${destination}.` : `Leave ${nodes[room]?.label || room}. ${turn ? `Turn ${turn} at the hallway. ` : ''}Continue to ${destination}.`;
  const hazard = blocked.includes('WEST_HALL') ? (es ? 'Evite el pasillo oeste.' : 'Avoid the west hall.') : blocked.includes('KITCHEN') ? (es ? 'Evite la cocina.' : 'Avoid the kitchen.') : '';
  return {
    id: `${drill ? 'DRILL' : 'ALERT'}_${route.exit}`,
    text: `${prefix}${steps}${hazard ? ` ${hazard}` : ''}`
  };
}
