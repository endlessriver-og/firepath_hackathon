// Native: the prototype device uses USB serial, which phones do not expose to apps. A production
// device would pair over Bluetooth LE or Wi-Fi; until then the link lives in the web app.
const state = { supported: false, connected: false, events: [] };
export function subscribe(fn) { fn(state); return () => {}; }
export async function connect() { throw new Error('The prototype device connects over USB from the web app in desktop Chrome.'); }
export async function sendToDevice() { throw new Error('Device not connected.'); }
