import { nodes, edges, rooms, exits, devices, computeRoutes, guidance } from './model.js';

const $ = id => document.getElementById(id);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const defaults = { household: 'The Rivera home', address: 'Glendale, California', meeting: 'Across the street by the big tree', language: 'en', needs: 'none' };
let profile;
try { profile = { ...defaults, ...JSON.parse(localStorage.getItem('firepath-profile') || '{}') }; }
catch { profile = { ...defaults }; }
const state = { mode: 'ready', blocked: new Set(), events: [], serial: null, reader: null, sendQueue: Promise.resolve(), profile };
let audioManifest = {};
let activeAudio = null;
let stopAudio = null;
let audioTurn = 0;
fetch('./audio/manifest.json').then(r => r.ok ? r.json() : {}).then(data => { audioManifest = data; }).catch(() => {});

function log(message, type = 'system') {
  state.events.unshift({ message, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  state.events = state.events.slice(0, 6);
  $('event-log').innerHTML = state.events.map(e => `<div class="event-item ${e.type === 'hazard' ? 'hazard' : ''}"><span>${safe(e.message)}</span><time>${e.time}</time></div>`).join('');
}

function makeMap(routes) {
  const active = state.mode !== 'ready';
  const routeSummary = rooms.map(room => `${nodes[room].label}: ${routes[room] ? nodes[routes[room].exit].label : 'no confirmed route'}`).join('; ');
  $('floor-map').setAttribute('aria-label', `Sample home floor plan. Hazards: ${[...state.blocked].map(id => nodes[id].label).join(', ') || 'none'}. ${routeSummary}`);
  const lines = edges.map(([a, b]) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${state.blocked.has(a) || state.blocked.has(b) ? '#e68270' : '#c9d5d2'}" stroke-width="${state.blocked.has(a) || state.blocked.has(b) ? 13 : 16}" stroke-linecap="round"/>`).join('');
  const routeColors = { ROOM_A: '#18a58a', ROOM_B: '#3a91b3', ROOM_C: '#b69a45' };
  const paths = active ? rooms.map(room => {
    const route = routes[room];
    if (!route) return '';
    const points = route.path.map(id => `${nodes[id].x},${nodes[id].y}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="white" stroke-width="11" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/><polyline points="${points}" fill="none" stroke="${routeColors[room]}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#route-arrow)"/>`;
  }).join('') : '';
  const dots = Object.entries(nodes).map(([id, node]) => {
    const blocked = state.blocked.has(id), isExit = node.kind === 'exit', isRoom = node.kind === 'room';
    if (node.kind === 'corridor' && !blocked) return '';
    const fill = blocked ? '#de6556' : isExit ? '#168f76' : isRoom ? '#fcfefd' : '#eff3ee';
    const stroke = blocked ? '#b34237' : isExit ? '#168f76' : '#afc5be';
    const r = blocked ? 17 : isExit ? 13 : 15;
    const labelY = isRoom ? node.y - 27 : node.y + (id === 'KITCHEN' ? 36 : -24);
    const nodeText = isExit ? 'E' : blocked ? '!' : isRoom ? id.slice(-1) : 'K';
    return `<g class="map-node" data-node="${id}"><circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${node.x}" y="${node.y + 4}" text-anchor="middle" fill="${blocked || isExit ? 'white' : '#476b68'}" font-size="12" font-weight="700">${nodeText}</text><text x="${node.x}" y="${labelY}" text-anchor="middle" fill="${blocked ? '#b64c3c' : '#455e60'}" font-size="12" font-weight="700">${safe(node.label)}</text></g>`;
  }).join('');
  $('floor-map').innerHTML = `<defs><marker id="route-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L0 7 L7 3.5 z" fill="#168f76"/></marker><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#eaf0ee" stroke-width="1"/></pattern></defs><rect width="950" height="490" fill="url(#grid)"/><rect x="92" y="45" width="760" height="397" rx="4" fill="none" stroke="#9cb6b0" stroke-width="10"/><rect x="174" y="48" width="232" height="151" rx="4" fill="#e8f1ec" stroke="#b8cbc4" stroke-width="2"/><rect x="552" y="48" width="234" height="151" rx="4" fill="#e8f1ec" stroke="#b8cbc4" stroke-width="2"/><rect x="370" y="305" width="224" height="135" rx="4" fill="#e8f1ec" stroke="#b8cbc4" stroke-width="2"/><rect x="620" y="305" width="204" height="135" rx="4" fill="#f2f1e9" stroke="#d4d3be" stroke-width="2"/><rect x="102" y="205" width="746" height="52" rx="9" fill="#e5edeb"/><text x="480" y="270" text-anchor="middle" fill="#9db1b0" font-size="10" font-weight="700" letter-spacing="2">MAIN HALLWAY</text>${lines}${paths}${dots}<text x="44" y="265" text-anchor="middle" fill="#178b75" font-size="10" font-weight="700">OUT</text><text x="905" y="265" text-anchor="middle" fill="#178b75" font-size="10" font-weight="700">OUT</text>`;
}

function renderGuidance(routes) {
  $('guidance-grid').innerHTML = devices.map(room => {
    const route = routes[room];
    const msg = guidance(room, route, { language: profile.language, drill: state.mode === 'drill', blocked: [...state.blocked] });
    return `<div class="guidance-card"><div class="room-header"><b>${safe(nodes[room].label)}</b><span class="device-state">● ${state.serial ? 'CONTROLLER LINKED' : 'SIMULATED'}</span></div><strong>${route ? safe(nodes[route.exit].label) : 'No confirmed route'}</strong><p>${state.mode === 'ready' ? 'Planned route ready for a household drill.' : safe(msg.text)}</p></div>`;
  }).join('');
}

function broadcast(routes) {
  if (!state.serial?.writable) return;
  for (const room of devices) {
    const route = routes[room];
    const message = state.mode === 'ready' ? { id: 'STANDBY', text: '' } : guidance(room, route, { language: profile.language, drill: state.mode === 'drill', blocked: [...state.blocked] });
    const command = { type: 'guidance', node: room, mode: state.mode, message_id: message.id, exit: route?.exit || null, path: route?.path || [], text: message.text, language: profile.language };
    state.sendQueue = state.sendQueue.then(async () => {
      const writer = state.serial.writable.getWriter();
      try { await writer.write(new TextEncoder().encode(JSON.stringify(command) + '\n')); }
      finally { writer.releaseLock(); }
    }).catch(() => log('Could not deliver a hardware command', 'hazard'));
  }
}

function speak(roomsToSpeak = devices) {
  const turn = ++audioTurn;
  stopAudio?.();
  activeAudio?.pause();
  activeAudio = null;
  window.speechSynthesis?.cancel();
  const routes = computeRoutes([...state.blocked]);
  const phrases = roomsToSpeak.map(room => guidance(room, routes[room], { language: profile.language, drill: state.mode === 'drill', blocked: [...state.blocked] }).text);
  if (phrases.every(text => audioManifest[text])) {
    (async () => {
      for (const phrase of phrases) {
        if (turn !== audioTurn) break;
        await new Promise(resolve => {
          stopAudio = resolve;
          activeAudio = new Audio(audioManifest[phrase]);
          activeAudio.onended = resolve;
          activeAudio.onerror = resolve;
          activeAudio.play().catch(resolve);
        });
        if (turn === audioTurn) stopAudio = null;
      }
      if (turn === audioTurn) activeAudio = null;
    })();
  } else if ('speechSynthesis' in window) {
    for (const phrase of phrases) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = profile.language === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = .98;
      window.speechSynthesis.speak(utterance);
    }
  } else {
    log('Audio unavailable; guidance remains visible on screen', 'hazard');
  }
}

function render({ announce = false, focus = devices } = {}) {
  const routes = computeRoutes([...state.blocked]);
  const hazards = state.blocked.size;
  $('home-name').textContent = profile.household;
  $('home-address').textContent = profile.address;
  $('hazard-count').textContent = String(hazards);
  $('hazard-caption').textContent = hazards ? [...state.blocked].map(id => nodes[id].label).join(' · ') : 'All routes available';
  $('safe-exits').textContent = `${exits.filter(id => !state.blocked.has(id)).length} of 2`;
  $('device-count').textContent = state.serial ? '3 configured' : '3 simulated';
  $('map-status').textContent = hazards ? `${hazards} hazard${hazards > 1 ? 's' : ''} detected` : state.mode === 'drill' ? 'Household drill in progress' : 'All corridors clear';
  $('map-substatus').textContent = hazards ? (state.blocked.has('WEST_HALL') ? 'Bedroom A now uses the east exit.' : 'Room-specific guidance is active.') : state.mode === 'drill' ? 'Follow the colored routes from each bedroom.' : 'Tap a scenario below to see the home respond.';
  const badge = $('mode-badge');
  badge.className = `mode-badge ${state.mode === 'alert' ? 'alert' : state.mode === 'drill' ? 'drill' : ''}`;
  badge.innerHTML = state.mode === 'alert' ? '<span>●</span> Emergency simulation' : state.mode === 'drill' ? '<span>●</span> Drill in progress' : '<span>●</span> Ready to practice';
  makeMap(routes);
  renderGuidance(routes);
  broadcast(routes);
  if (announce) speak(focus);
}

function ingest(message) {
  if (!message || message.type !== 'hazard' || !Object.hasOwn(nodes, message.node)) return false;
  const before = state.blocked.has(message.node);
  if (message.active === false) state.blocked.delete(message.node);
  else state.blocked.add(message.node);
  if (before === state.blocked.has(message.node)) return true;
  state.mode = state.blocked.size ? 'alert' : 'ready';
  log(`${nodes[message.node].label}: ${message.active === false ? 'hazard cleared' : 'hazard detected'}`, message.active === false ? 'system' : 'hazard');
  render({ announce: state.mode === 'alert', focus: message.node === 'WEST_HALL' ? ['ROOM_A'] : devices });
  return true;
}

async function connectSerial() {
  if (!('serial' in navigator)) { $('serial-status').textContent = 'Web Serial is unavailable here. Use Chrome or Edge on localhost, or use the built-in simulator.'; return; }
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    state.serial = port;
    $('connection-pill').textContent = '● Hardware connected';
    $('serial-status').textContent = 'Serial controller connected at 115200 baud. Listening for hazard events.';
    log('Physical controller connected');
    render();
    const decoder = new TextDecoder();
    let pending = '';
    while (port.readable) {
      const reader = port.readable.getReader();
      state.reader = reader;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split('\n'); pending = lines.pop();
          for (const line of lines) {
            try { if (line.trim()) ingest(JSON.parse(line)); }
            catch { log('Ignored malformed hardware event', 'hazard'); }
          }
        }
      } finally { reader.releaseLock(); state.reader = null; }
    }
  } catch (error) { $('serial-status').textContent = `Serial connection: ${error.message}`; }
  finally { state.serial = null; $('connection-pill').textContent = '● Simulator connected'; render(); }
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active-view', el.id === `${view}-view`));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('header-view').textContent = ({ command: 'LIVE COMMAND', household: 'HOUSEHOLD PLAN', devices: 'DEVICES & BRIDGE' })[view];
  $('page-title').textContent = ({ command: 'Know the route. Adapt when it changes.', household: 'A plan built around your home.', devices: 'Connect the physical layer.' })[view];
  $('page-subtitle').textContent = ({ command: 'One home plan for practice and for a changing emergency.', household: 'Plan the exits, practice together, then keep that plan ready.', devices: 'A simple contract keeps sensors and the route engine in sync.' })[view];
}

document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => switchView(el.dataset.view)));
$('present-btn').addEventListener('click', () => {
  switchView('command');
  const enabled = document.body.classList.toggle('presenting');
  $('present-btn').textContent = enabled ? '× Exit presentation' : '▣ Present mode';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('presenting')) $('present-btn').click();
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (event.key === '1') $('fire-btn').click();
  if (event.key === '2') $('smoke-btn').click();
  if (event.key === '0') $('reset-btn').click();
});
const drill = () => { state.blocked.clear(); state.mode = 'drill'; switchView('command'); log('Household drill started'); render({ announce: true }); };
$('drill-btn').addEventListener('click', drill);
$('plan-drill-btn').addEventListener('click', drill);
$('fire-btn').addEventListener('click', () => ingest({ type: 'hazard', node: 'KITCHEN', active: true }));
$('smoke-btn').addEventListener('click', () => ingest({ type: 'hazard', node: 'WEST_HALL', active: true }));
$('reset-btn').addEventListener('click', () => { state.blocked.clear(); state.mode = 'ready'; audioTurn++; stopAudio?.(); activeAudio?.pause(); window.speechSynthesis?.cancel(); log('Simulation reset'); render(); });
$('speak-btn').addEventListener('click', () => speak());
$('serial-btn').addEventListener('click', connectSerial);
for (const [key, id] of [['household','household-input'], ['address','address-input'], ['meeting','meeting-input'], ['language','language-select'], ['needs','needs-select']]) $(id).value = profile[key];
$('meeting-preview').textContent = `${profile.meeting}.`;
function updateNeeds() {
  $('needs-preview').textContent = profile.needs === 'mobility' ? 'Check the route for step-free access with a qualified reviewer; this prototype has not verified it.' : profile.needs === 'assistance' ? 'Assign a helper and practice the route together from every room.' : 'No extra assistance noted. Rehearse out loud from each bedroom.';
}
updateNeeds();
$('save-plan').addEventListener('click', () => {
  for (const [key, id] of [['household','household-input'], ['address','address-input'], ['meeting','meeting-input'], ['language','language-select'], ['needs','needs-select']]) profile[key] = $(id).value.trim() || defaults[key];
  localStorage.setItem('firepath-profile', JSON.stringify(profile));
  $('meeting-preview').textContent = `${profile.meeting}.`;
  updateNeeds();
  log('Household practice plan saved');
  render();
});
// Useful for the hardware partner and scripted demos; validates events like serial input.
window.firepath = { ingest, snapshot: () => ({ mode: state.mode, blocked: [...state.blocked], routes: computeRoutes([...state.blocked]) }) };
log('Sample home model loaded');
render();
