import { hazardNames, describeHazard, buildTasks } from './preparedness.js';
import { buildResponderSummary } from './responder.js';
import { buildWorkspace } from './workspace.js';
const $ = id => document.getElementById(id);
const escape = input => String(input ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const keys = Object.keys(hazardNames);
let profile = {}, hazards = null, serial = null;
let sampleMap = false;
const workspace = { mode: 'resident', scenario: 'earthquake', source: 'fictional', layout: 'dispatch' };
try { profile = JSON.parse(localStorage.getItem('firepath-prep-profile') || '{}'); } catch {}
let done = {};
try { done = JSON.parse(localStorage.getItem('firepath-prep-done') || '{}'); } catch {}
let responderDraft = {};
try { responderDraft = JSON.parse(localStorage.getItem('firepath-responder-draft') || '{}'); } catch {}
const responderFields = { parcelId: 'parcel-id', occupants: 'occupants', pets: 'responder-pets', assistance: 'responder-assistance', access: 'access-note', utilities: 'utilities-note' };

function renderResponder() {
  $('responder-summary').textContent = buildResponderSummary(profile, responderDraft, hazards);
  renderWorkspace();
}

function renderWorkspace() {
  const data = buildWorkspace({ scenario: workspace.scenario, source: workspace.source, profile, draft: responderDraft, hazards: sampleMap ? null : hazards });
  $('brief-scenario-name').textContent = data.title;
  $('brief-location').textContent = data.place;
  $('priority-title').textContent = data.focus;
  $('priority-detail').textContent = data.detail;
  $('fact-count').textContent = `${data.facts.length} ${data.facts.length === 1 ? 'FACT' : 'FACTS'}`;
  $('workspace-facts').innerHTML = data.facts.length ? data.facts.map((fact, index) => `<div class="workspace-fact"><span class="fact-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${escape(fact.label)}</strong><p>${escape(fact.value)}</p><small>${escape(fact.source)}</small></div></div>`).join('') : '<div class="empty-facts">No facts saved for this property. Missing information is unknown.</div>';
  $('workspace-readout').textContent = data.readout;
  $('fact-source-title').textContent = workspace.source === 'fictional' ? 'Fictional sample' : 'Resident draft · unverified';
  $('fact-source-detail').textContent = workspace.source === 'fictional' ? 'Training data, not a real household' : data.updatedAt ? `Saved locally ${data.updatedAt}` : 'No confirmed update date';
  $('hazard-source-detail').textContent = data.mapLinked ? 'Public planning layers checked for this location; not live incidents' : 'No property map linked to this exercise';
  for (const button of document.querySelectorAll('.scenario')) {
    const selected = button.dataset.scenario === workspace.scenario;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  $('fictional-source').setAttribute('aria-pressed', String(workspace.source === 'fictional'));
  $('draft-source').setAttribute('aria-pressed', String(workspace.source === 'local'));
}

function setMode(mode, { showDraft = false } = {}) {
  workspace.mode = mode;
  if (showDraft) workspace.source = 'local';
  $('resident-view').hidden = mode !== 'resident';
  $('responder-view').hidden = mode !== 'responder';
  $('resident-nav').hidden = mode !== 'resident';
  $('field-nav').hidden = mode !== 'responder';
  $('rail-label').textContent = mode === 'resident' ? 'RESIDENT WORKSPACE' : 'RESPONDER DEMO';
  $('workspace-name').textContent = mode === 'resident' ? 'RESIDENT VIEW' : 'RESPONDER EXERCISE';
  $('resident-mode').setAttribute('aria-pressed', String(mode === 'resident'));
  $('responder-mode').setAttribute('aria-pressed', String(mode === 'responder'));
  document.title = mode === 'resident' ? 'FirePath — Prepared for where you live' : 'FirePath — Responder training demo';
  if (mode === 'responder') renderWorkspace();
  history.replaceState(null, '', mode === 'resident' ? '#home' : '#responder-workspace');
  window.scrollTo(0, 0);
}

function renderHazards() {
  $('hazard-grid').innerHTML = keys.map((key, index) => {
    const value = hazards?.[key], description = value ? describeHazard(key, value) : { tone: 'pending', label: 'Add a location', detail: 'A map layer will appear here.' };
    const meta = value?._meta;
    const asOf = meta?.as_of ? `Snapshot ${new Date(meta.as_of).toLocaleDateString()}` : 'Map snapshot';
    const detail = value?.notes?.[0] || description.detail;
    const source = meta?.url?.startsWith('https://') ? `<a href="${escape(meta.url)}" target="_blank" rel="noopener">${escape(meta.source || 'View map')} ↗</a>` : '';
    return `<article class="hazard-card ${description.tone}"><div class="hazard-head"><span class="hazard-symbol">${['♨','≈','⌁','◈','△','◌','≋'][index]}</span><span class="status-chip">${description.tone === 'mapped' ? '● ON MAP' : description.tone === 'outside' ? '○ OUTSIDE ZONE' : '– PENDING'}</span></div><h3>${escape(hazardNames[key])}</h3><strong>${escape(description.label)}</strong><p>${escape(detail)}</p><div class="source-line">${source}<small>${escape(asOf)}</small></div></article>`;
  }).join('');
  const dates = keys.map(k => hazards?.[k]?._meta?.as_of).filter(Boolean).sort();
  $('snapshot-date').textContent = dates.length ? `MAP SNAPSHOT · ${new Date(dates[0]).toLocaleDateString()}` : 'MAP DATA · WAITING FOR LOCATION';
}
function renderTasks() {
  const tasks = buildTasks(profile, hazards);
  $('progress').textContent = `${tasks.filter(task => done[task.id]).length} OF ${tasks.length} COMPLETE`;
  $('task-grid').innerHTML = tasks.map((task, i) => `<article class="task ${done[task.id] ? 'done' : ''}"><label class="task-check"><input type="checkbox" data-task="${escape(task.id)}" ${done[task.id] ? 'checked' : ''}><span class="fake-check">✓</span></label><div class="task-body"><div class="task-tag">${escape(task.tag)} <span>· ${String(i + 1).padStart(2, '0')}</span></div><h3>${escape(task.title)}</h3><p>${escape(task.description)}</p>${task.url ? `<a href="${escape(task.url)}" target="_blank" rel="noopener">${escape(task.link)} ↗</a>` : ''}</div></article>`).join('');
}
function render() {
  $('address').value = profile.address || '';
  $('latitude').value = profile.lat ?? '';
  $('longitude').value = profile.lon ?? '';
  $('housing').value = profile.housing || 'own';
  $('home-type').value = profile.homeType || 'house';
  $('pets').checked = Boolean(profile.pets);
  $('assistance').checked = Boolean(profile.assistance);
  for (const [key, id] of Object.entries(responderFields)) $(id).value = responderDraft[key] || '';
  renderHazards(); renderTasks();
  renderResponder();
}
$('task-grid').addEventListener('change', event => {
  const id = event.target.dataset.task;
  if (!id) return;
  done[id] = event.target.checked;
  localStorage.setItem('firepath-prep-done', JSON.stringify(done));
  renderTasks();
});
$('address').addEventListener('input', () => { if ($('address').value.trim()) { $('latitude').value = ''; $('longitude').value = ''; } });
for (const id of ['latitude', 'longitude']) $(id).addEventListener('input', () => { if ($(id).value.trim()) $('address').value = ''; });
$('example-point').addEventListener('click', async () => {
  try {
    const response = await fetch('./src/sample-location.json');
    if (!response.ok) throw new Error('Sample unavailable');
    const sample = await response.json();
    hazards = sample.hazards;
    sampleMap = true;
    profile = { housing: $('housing').value, homeType: $('home-type').value, pets: $('pets').checked, assistance: $('assistance').checked };
    $('hazard-intro').textContent = 'Sample public map point near Glendale Civic Center (34.1466, -118.2483). This is not your home.';
    $('plan-intro').textContent = 'Illustrative checklist for the sample point and the household choices above.';
    $('form-status').textContent = 'Sample snapshot loaded. Enter your own location to build your plan.';
    renderHazards(); renderTasks();
    renderResponder();
    $('hazards').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch { $('form-status').textContent = 'Could not load the sample map snapshot.'; }
});
$('profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const address = $('address').value.trim(), latText = $('latitude').value.trim(), lonText = $('longitude').value.trim();
  const coordinates = latText !== '' && lonText !== '';
  if (!coordinates && !address) { $('form-status').textContent = 'Enter a Glendale address or both coordinates.'; return; }
  if ((latText || lonText) && !coordinates) { $('form-status').textContent = 'Enter both latitude and longitude.'; return; }
  profile = { address: coordinates ? '' : address, lat: coordinates ? Number(latText) : null, lon: coordinates ? Number(lonText) : null, housing: $('housing').value, homeType: $('home-type').value, pets: $('pets').checked, assistance: $('assistance').checked };
  localStorage.setItem('firepath-prep-profile', JSON.stringify(profile));
  const payload = coordinates ? { lat: Number(latText), lon: Number(lonText) } : { address };
  const button = $('profile-form').querySelector('button[type=submit]');
  button.disabled = true;
  $('form-status').textContent = 'Checking Glendale map layers…';
  try {
    const response = await fetch('/api/hazards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lookup unavailable');
    hazards = data.hazards;
    sampleMap = false;
    const name = data.location.matched_address || (coordinates ? `Map point ${payload.lat.toFixed(4)}, ${payload.lon.toFixed(4)}` : address);
    $('hazard-intro').textContent = `Mapped layers for ${name}. Check each layer's source and date.`;
    $('plan-intro').textContent = 'Your household checklist, with extra steps when a relevant mapped zone is present.';
    $('form-status').textContent = 'Map layers checked. Your action plan is ready below.';
    renderHazards(); renderTasks(); renderResponder();
    $('hazards').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    hazards = null; sampleMap = false; renderHazards(); renderTasks(); renderResponder();
    $('form-status').textContent = error.message || 'Lookup unavailable. Review the local GIS setup.';
  } finally { button.disabled = false; }
});
$('responder-form').addEventListener('submit', event => {
  event.preventDefault();
  responderDraft = Object.fromEntries(Object.entries(responderFields).map(([key, id]) => [key, $(id).value.trim()]));
  responderDraft.updatedAt = new Date().toLocaleString();
  localStorage.setItem('firepath-responder-draft', JSON.stringify(responderDraft));
  renderResponder();
  $('responder-status').textContent = 'Saved on this device only. No city system received this draft.';
});
$('clear-responder').addEventListener('click', () => {
  responderDraft = {};
  localStorage.removeItem('firepath-responder-draft');
  $('responder-form').reset();
  renderResponder();
  $('responder-status').textContent = 'Local responder draft deleted.';
});
$('copy-responder').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('responder-summary').textContent); $('responder-status').textContent = 'Draft copied. It has not been sent to any city system.'; }
  catch { $('responder-status').textContent = 'Clipboard unavailable in this browser.'; }
});
$('resident-mode').addEventListener('click', () => setMode('resident'));
$('responder-mode').addEventListener('click', () => setMode('responder'));
$('preview-in-workspace').addEventListener('click', () => setMode('responder', { showDraft: true }));
$('back-to-resident').addEventListener('click', () => {
  setMode('resident');
  $('responders').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
for (const button of document.querySelectorAll('.scenario')) button.addEventListener('click', () => {
  workspace.scenario = button.dataset.scenario;
  $('workspace-status').textContent = '';
  renderWorkspace();
});
for (const [id, source] of [['fictional-source', 'fictional'], ['draft-source', 'local']]) $(id).addEventListener('click', () => {
  workspace.source = source;
  $('workspace-status').textContent = '';
  renderWorkspace();
});
for (const [id, layout] of [['dispatch-layout', 'dispatch'], ['field-layout', 'field']]) $(id).addEventListener('click', () => {
  workspace.layout = layout;
  $('responder-view').classList.toggle('field-mode', layout === 'field');
  $('dispatch-layout').setAttribute('aria-pressed', String(layout === 'dispatch'));
  $('field-layout').setAttribute('aria-pressed', String(layout === 'field'));
});
$('copy-workspace').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('workspace-readout').textContent); $('workspace-status').textContent = 'Exercise brief copied locally. No responder system received it.'; }
  catch { $('workspace-status').textContent = 'Clipboard unavailable in this browser.'; }
});
$('connect-device').addEventListener('click', async () => {
  if (!('serial' in navigator)) { $('device-status').textContent = 'Web Serial requires a supported desktop browser on localhost or HTTPS.'; return; }
  try {
    serial = await navigator.serial.requestPort();
    await serial.open({ baudRate: 115200 });
    $('device-status').textContent = 'USB device connected at 115200 baud · demo commands enabled.';
    readDevice();
  } catch { $('device-status').textContent = 'Device connection was canceled or failed.'; }
});
async function readDevice() {
  const decoder = new TextDecoder(); let pending = '';
  try {
    while (serial?.readable) {
      const reader = serial.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split('\n'); pending = lines.pop();
          for (const line of lines) {
            try { const event = JSON.parse(line); if (event.type === 'sensor' && event.sensor === 'mq2') $('device-status').textContent = `Local MQ-2 sensor ${event.active ? 'triggered' : 'clear'} · reading ${Number(event.value) || 0}. Prototype only.`; } catch {}
          }
        }
      } finally { reader.releaseLock(); }
    }
  } catch { $('device-status').textContent = 'USB device disconnected.'; serial = null; }
}
$('demo-alert').addEventListener('click', async () => {
  const command = { type: 'alert', hazard: 'wildfire', severity: 'warning', text: 'Demo only. Check official Glendale alerts for real instructions.', source: 'demo' };
  if (serial?.writable) {
    try {
      const writer = serial.writable.getWriter();
      try { await writer.write(new TextEncoder().encode(JSON.stringify(command) + '\n')); } finally { writer.releaseLock(); }
      $('device-status').textContent = 'SIMULATED wildfire alert sent to USB device. Check official sources for real events.';
    } catch { $('device-status').textContent = 'Could not send demo command to the device.'; }
  } else $('device-status').textContent = 'SIMULATED alert preview. Connect a USB device to sound the buzzer. No live alert was sent.';
});
render();
if (location.hash.startsWith('#responder-')) setMode('responder');
