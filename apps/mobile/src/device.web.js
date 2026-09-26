// In-home device link over Web Serial (desktop Chrome/Edge on localhost or HTTPS). Speaks the same
// line-delimited JSON as examples/esp32_preparedness: we send {type:'alert',...,source:'demo'};
// the board answers {type:'ready'|'ack'|'sensor'}. A demo/drill command never implies a real alert.
let port = null, writer = null;
const listeners = new Set();
const hasSerial = () => typeof navigator !== 'undefined' && 'serial' in navigator;
const state = { supported: hasSerial(), connected: false, events: [] };
const emit = () => listeners.forEach(fn => fn({ ...state, events: [...state.events] }));
const log = event => { state.events = [{ ...event, at: new Date().toLocaleTimeString() }, ...state.events].slice(0, 5); emit(); };

export function subscribe(fn) { state.supported = hasSerial(); listeners.add(fn); fn({ ...state }); return () => listeners.delete(fn); }

export async function connect() {
  if (!hasSerial()) throw new Error('Connecting a USB device needs desktop Chrome or Edge.');
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  writer = port.writable.getWriter();
  state.connected = true; log({ type: 'connected' });
  (async () => {
    const decoder = new TextDecoder(); let pending = '';
    const reader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n'); pending = lines.pop();
        for (const line of lines) { try { log(JSON.parse(line)); } catch {} }
      }
    } catch {} finally { reader.releaseLock(); state.connected = false; log({ type: 'disconnected' }); }
  })();
}

// kind: 'test' | 'drill' | 'alert'. The firmware accepts source 'demo' only, so nothing here can be
// mistaken for an official alert on the device side either.
export async function sendToDevice({ hazard = 'general', severity = 'info', text = 'FirePath test', kind = 'test' }) {
  if (!writer) throw new Error('Connect the device first.');
  const command = { type: 'alert', hazard, severity, text: text.slice(0, 120), kind, source: 'demo' };
  await writer.write(new TextEncoder().encode(JSON.stringify(command) + '\n'));
  log({ type: 'sent', kind, hazard });
}
