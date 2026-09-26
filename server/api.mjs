// Resident account API for the FirePath prototype. Dependencies are injected so tests can run
// without the GIS package or the network.
import { randomUUID } from 'node:crypto';
import { buildRecommendations, permitGuide, permitTypes, queryRecommendations, readiness } from '../src/readiness.js';
import { buildResponderSummary } from '../src/responder.js';
import { checkPassword, hashPassword, newCode, newToken, tokenKey } from './auth.mjs';

const SESSION_DAYS = 30, CODE_DAYS = 14, MAX_CODE_ATTEMPTS = 5;
const DAY = 86_400_000;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const oneOf = (value, options) => options.includes(value) ? value : undefined;

function occupancy(h) {
  const groups = { adult: 1, child: 0, senior: 0 }; // the account holder is counted as an adult
  for (const m of h.members || []) groups[m.ageGroup] += 1;
  const parts = [[groups.adult, 'adult'], [groups.child, 'child'], [groups.senior, 'older adult']].filter(([n]) => n).map(([n, label]) => `${n} ${label}${n > 1 ? (label === 'child' ? 'ren' : 's') : ''}`);
  const help = (h.members || []).filter(m => m.needsHelp).length;
  return `${h.people} ${h.people === 1 ? 'person' : 'people'}: ${parts.join(', ')}${help ? `; ${help} may need help leaving` : ''}`;
}

export function createApi({ store, lookupHazards, fetchAlerts, demoMailbox = true, now = () => Date.now() }) {
  const { data } = store;
  const failures = new Map(); // email -> [timestamps] of failed logins, in memory only
  const alertCache = new Map();

  function session(req) {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    const found = token && data.sessions[tokenKey(token)];
    if (!found || found.expires < now() || !data.users[found.userId]) fail(401, 'Please sign in again.');
    return data.users[found.userId];
  }

  function startSession(user) {
    const token = newToken();
    data.sessions[tokenKey(token)] = { userId: user.id, expires: now() + SESSION_DAYS * DAY };
    return token;
  }

  function view(user) {
    const household = user.household || {};
    const recommendations = buildRecommendations(user, household, user.hazards);
    return {
      user: { id: user.id, email: user.email, name: user.name, type: user.type, createdAt: user.createdAt },
      address: user.address ? { text: user.address, lat: user.lat, lon: user.lon, verified: user.addressVerified, checkedAt: user.hazardsCheckedAt, codePending: Boolean(user.verification && user.addressVerified !== 'mail') } : null,
      hazards: user.hazards || null,
      household,
      done: user.done || {},
      recommendations,
      readiness: readiness(recommendations, user.done, user, household),
    };
  }

  const routes = {
    'POST /api/account/signup': async (req, body) => {
      const email = text(body.email, 200).toLowerCase();
      const name = text(body.name, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
      if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) fail(400, 'Use a password of at least 8 characters.');
      if (!name) fail(400, 'Enter your name.');
      if (Object.values(data.users).some(u => u.email === email)) fail(409, 'An account with that email already exists. Sign in instead.');
      const user = { id: randomUUID(), email, name, type: 'resident', passwordHash: hashPassword(body.password), createdAt: new Date(now()).toISOString(), household: {}, done: {} };
      data.users[user.id] = user;
      const token = startSession(user);
      store.save();
      return { status: 201, body: { token, ...view(user) } };
    },

    'POST /api/account/login': async (req, body) => {
      const email = text(body.email, 200).toLowerCase();
      const recent = (failures.get(email) || []).filter(t => t > now() - 10 * 60_000);
      if (recent.length >= 5) fail(429, 'Too many attempts. Wait 10 minutes and try again.');
      const user = Object.values(data.users).find(u => u.email === email);
      if (!user || typeof body.password !== 'string' || !checkPassword(body.password, user.passwordHash)) {
        failures.set(email, [...recent, now()]);
        fail(401, 'Email or password is incorrect.');
      }
      failures.delete(email);
      const token = startSession(user);
      store.save();
      return { body: { token, ...view(user) } };
    },

    'POST /api/account/logout': async req => {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
      if (token) delete data.sessions[tokenKey(token)];
      store.save();
      return { body: { ok: true } };
    },

    'GET /api/me': async req => ({ body: view(session(req)) }),

    'PUT /api/me/profile': async (req, body) => {
      const user = session(req);
      const name = text(body.name, 80);
      if (!name) fail(400, 'Enter your name.');
      user.name = name;
      store.save();
      return { body: view(user) };
    },

    'PUT /api/me/household': async (req, body) => {
      const user = session(req);
      const pets = Array.isArray(body.pets) ? body.pets.slice(0, 10).map(p => ({ kind: text(p?.kind, 40), count: Math.min(Math.max(Number.parseInt(p?.count, 10) || 1, 1), 50), where: text(p?.where, 80) })).filter(p => p.kind) : [];
      // Other residents besides the account holder. The responder brief only shows counts by age group.
      const members = Array.isArray(body.members) ? body.members.slice(0, 15).map(m => ({ name: text(m?.name, 40), ageGroup: oneOf(m?.ageGroup, ['child', 'adult', 'senior']) || 'adult', needsHelp: m?.needsHelp === true })).filter(m => m.name) : [];
      user.household = {
        housing: oneOf(body.housing, ['own', 'rent']),
        homeType: oneOf(body.homeType, ['house', 'apartment']),
        members,
        people: members.length + 1,
        pets,
        assistance: text(body.assistance, 120),
        access: text(body.access, 140),
        utilities: text(body.utilities, 120),
        meetNear: text(body.meetNear, 80),
        meetFar: text(body.meetFar, 80),
        contact: text(body.contact, 80),
        shareWithResponders: body.shareWithResponders === true,
        updatedAt: new Date(now()).toISOString(),
      };
      store.save();
      return { body: view(user) };
    },

    'POST /api/me/address': async (req, body) => {
      const user = session(req);
      const address = text(body.address, 200);
      if (address.length < 5) fail(400, 'Enter a Glendale street address.');
      let result;
      try { result = await lookupHazards({ address }); } catch { fail(422, 'That address could not be matched in Glendale. Check the street number and name.'); }
      if (!result?.location?.in_city) fail(422, 'That address is outside the Glendale pilot area.');
      Object.assign(user, {
        address: result.location.matched_address || address,
        lat: result.location.lat, lon: result.location.lon,
        addressScore: result.location.score ?? null,
        addressVerified: 'matched',
        hazards: result.hazards,
        hazardsCheckedAt: new Date(now()).toISOString(),
        verification: null,
      });
      alertCache.delete(user.id);
      store.save();
      return { body: view(user) };
    },

    // Address verification by mailed code. Production would print this code on a postcard sent to the
    // matched address; the local demo returns it in a clearly labelled "demo mailbox" instead.
    'POST /api/me/address/mail': async req => {
      const user = session(req);
      if (!user.address) fail(400, 'Register an address first.');
      const code = newCode();
      user.verification = { codeKey: tokenKey(`${user.id}:${code}`), expires: now() + CODE_DAYS * DAY, attempts: 0, sentAt: new Date(now()).toISOString() };
      store.save();
      return { body: { ...view(user), demoMailbox: demoMailbox ? { code, note: 'Demo only: in production this code is printed on a postcard mailed to the address.' } : null } };
    },

    'POST /api/me/address/verify': async (req, body) => {
      const user = session(req);
      const pending = user.verification;
      if (!pending) fail(400, 'Request a verification code first.');
      if (pending.expires < now()) fail(410, 'That code has expired. Request a new one.');
      if (pending.attempts >= MAX_CODE_ATTEMPTS) fail(429, 'Too many incorrect codes. Request a new one.');
      if (tokenKey(`${user.id}:${text(body.code, 12)}`) !== pending.codeKey) {
        pending.attempts += 1;
        store.save();
        fail(400, `That code does not match. ${MAX_CODE_ATTEMPTS - pending.attempts} tries left.`);
      }
      user.addressVerified = 'mail';
      user.verifiedAt = new Date(now()).toISOString();
      user.verification = null;
      store.save();
      return { body: view(user) };
    },

    'PUT /api/me/tasks': async (req, body) => {
      const user = session(req);
      const id = text(body.id, 40);
      if (!buildRecommendations(user, user.household, user.hazards).some(r => r.id === id)) fail(404, 'Unknown step.');
      user.done = { ...user.done, [id]: body.done === true };
      store.save();
      return { body: view(user) };
    },

    'GET /api/me/recommendations': async (req, body, url) => {
      const user = session(req);
      const all = buildRecommendations(user, user.household, user.hazards);
      const results = queryRecommendations(all, { q: url.searchParams.get('q') || '', category: url.searchParams.get('category') || 'all', status: url.searchParams.get('status') || 'all', done: user.done || {} });
      return { body: { results, total: all.length } };
    },

    'GET /api/me/alerts': async req => {
      const user = session(req);
      if (!Number.isFinite(user.lat)) return { body: { source: null, alerts: [], note: 'Register an address to see alerts for your location.' } };
      const cached = alertCache.get(user.id);
      if (cached && cached.at > now() - 120_000) return { body: cached.value };
      let value;
      try { value = { source: 'National Weather Service', checkedAt: new Date(now()).toISOString(), alerts: await fetchAlerts(user.lat, user.lon) }; }
      catch { value = { source: 'National Weather Service', checkedAt: new Date(now()).toISOString(), alerts: [], unavailable: true }; }
      alertCache.set(user.id, { at: now(), value });
      return { body: value };
    },

    'GET /api/permits': async () => ({ body: { types: permitTypes.map(({ id, title, permit }) => ({ id, title, permit })) } }),

    'POST /api/me/permits/guide': async (req, body) => {
      const user = session(req);
      const guide = permitGuide(text(body.type, 20), { profile: user, household: user.household, hazards: user.hazards, description: text(body.description, 500) });
      if (!guide) fail(404, 'Unknown project type.');
      return { body: guide };
    },

    'GET /api/me/responder': async req => {
      const user = session(req);
      const h = user.household || {};
      const verification = user.addressVerified === 'mail' ? 'verified by mailed code (not proof of ownership)' : user.addressVerified === 'matched' ? 'matched to a City address point; not verified' : 'no address';
      const brief = buildResponderSummary({ address: user.address }, {
        occupants: h.people ? occupancy(h) : '',
        pets: (h.pets || []).map(p => `${p.count} ${p.kind}${p.where ? ` (${p.where})` : ''}`).join('; '),
        assistance: h.assistance, access: h.access, utilities: h.utilities, updatedAt: h.updatedAt,
      }, user.hazards).replace('\n', `\nAddress status: ${verification}\n`);
      return { body: { brief, shareWithResponders: Boolean(h.shareWithResponders), connected: false } };
    },
  };

  return async function handle(req, res, url) {
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return false;
    let status = 200, body;
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 16_384) fail(413, 'Request too large.'); }
      const parsed = raw ? JSON.parse(raw) : {};
      ({ status = 200, body } = await handler(req, parsed && typeof parsed === 'object' ? parsed : {}, url));
    } catch (error) {
      status = error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500;
      body = { error: error instanceof HttpError ? error.message : status === 400 ? 'Invalid request.' : 'Something went wrong.' };
    }
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  };
}

// Official NWS active alerts that contain the point. Weather alerts only: not City evacuation orders.
export async function fetchNwsAlerts(lat, lon) {
  const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: { 'user-agent': 'FirePath Glendale prototype', accept: 'application/geo+json' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`NWS ${response.status}`);
  const json = await response.json();
  return (json.features || []).map(({ properties: p }) => ({ id: p.id, event: p.event, severity: p.severity, urgency: p.urgency, headline: p.headline, description: p.description, instruction: p.instruction, effective: p.effective, expires: p.expires, sender: p.senderName }));
}
