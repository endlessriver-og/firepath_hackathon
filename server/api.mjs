// Resident account API for the FirePath prototype. Dependencies are injected so tests can run
// without the GIS package or the network.
import { randomUUID } from 'node:crypto';
import { buildRecommendations, businessKinds, hazardSeverity, businessPermitTypes, hazmatKinds, permitGuide, permitTypes, queryRecommendations, readiness, recommendationsFor } from '../src/readiness.js';
import { buildResponderSummary } from '../src/responder.js';
import { buildPlaybook, drillEvents } from '../src/playbooks.js';
import { planEvent, searchLicenses, searchPermits } from '../src/permit-catalog.js';
import { eventTemplates, venuePackage, venues } from '../src/venues.js';
import { hazardNames } from '../src/preparedness.js';
import { checkPassword, hashPassword, newCode, newToken, tokenKey } from './auth.mjs';
import { parcelNotes } from './parcels.mjs';
import { neighborhoodNotes } from './neighborhood.mjs';

const SESSION_DAYS = 30, CODE_DAYS = 14, MAX_CODE_ATTEMPTS = 5;
const DAY = 86_400_000;
const VENUE_NOTE_LINE = 'Prepared with FirePath from an example venue package. Not a City submission; confirm requirements with the City of Glendale.';
class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const oneOf = (value, options) => options.includes(value) ? value : undefined;

function occupancy(h) {
  const groups = { adult: 1, child: 0, senior: 0 }; // the account holder is counted as an adult
  for (const m of h.members || []) groups[m.ageGroup] += 1;
  const parts = [[groups.adult, 'adult'], [groups.child, 'child'], [groups.senior, 'older adult']].filter(([n]) => n).map(([n, label]) => `${n} ${label}${n > 1 ? (label === 'child' ? 'ren' : 's') : ''}`);
  const help = (h.members || []).filter(m => m.needsHelp).length;
  return `${h.people} ${h.people === 1 ? 'person' : 'people'}: ${parts.join(', ')}${help ? `; ${help} may need help leaving` : ''}`;
}

const playbookFor = (user, event, lang = 'en') => buildPlaybook(event, { type: user.type, household: user.household || {}, business: user.business || {}, hazards: user.hazards, done: user.done || {}, lang });
const playbookLang = url => oneOf(url.searchParams.get('lang'), ['en', 'es', 'hy', 'ko']) || 'en';

export function createApi({ store, lookupHazards, fetchAlerts, geocoder = null, combinedIndex = () => null, cityRecords = async () => null, parcelAt = async () => null, neighborhoodAt = async () => null, version = 'local', permitCatalog = { permitTypes: [], businessLicenseTypes: [] }, demoMailbox = true, now = () => Date.now(), ipHeaders = process.env.VERCEL ? ['x-vercel-forwarded-for', 'x-real-ip'] : ['cf-connecting-ip', 'x-forwarded-for'] }) {
  const { data } = store;
  const failures = new Map(); // email -> [timestamps] of failed logins, in memory only
  const alertCache = new Map();
  const venueHazards = new Map(); // venue id -> hazard lookup (venues are fixed points, so cache for the process)
  const publicHits = new Map(); // ip -> timestamps; public checks are capped per visitor, in memory only
  // Per IP and per route over 10 minutes. Each route counts only its own traffic, so typing an address
  // (many suggestions) never uses up the sign-up allowance.
  function throttle(req, limit, route) {
    // Trust only headers the host itself sets: on Vercel its own client-IP headers (a visitor can send a
    // cf-connecting-ip of their choosing, which would dodge every limit); behind the local tunnel, Cloudflare's.
    const header = ipHeaders.map(h => req.headers?.[h]).find(Boolean);
    const ip = String(header || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
    const key = `${route}:${ip}`;
    const recent = (publicHits.get(key) || []).filter(t => t > now() - 10 * 60_000);
    if (recent.length >= limit) fail(429, 'Too many checks from this device. Try again in a few minutes.');
    publicHits.set(key, [...recent, now()]);
  }
  // Geocode (City geocoder when available) + coordinate hazard lookup. Shared by registration and the public check.
  // Demo households are throwaway: drop ones older than a day, and any session that expired or
  // points at a removed account, so the shared store does not grow with every tour.
  function pruneDemos() {
    for (const [id, user] of Object.entries(data.users)) if (user.demo && Date.parse(user.createdAt) < now() - DAY) delete data.users[id];
    for (const [key, sessionRow] of Object.entries(data.sessions)) if (!data.users[sessionRow.userId] || sessionRow.expires < now()) delete data.sessions[key];
  }

  async function locate(address, magicKey) {
    let matched = null, result;
    if (geocoder) {
      try { matched = await geocoder.resolve(address, magicKey); }
      catch (e) {
        if (e.candidates) fail(422, 'That address matches more than one place in Glendale. Pick one:', { candidates: e.candidates });
        if (e.streetOnly) fail(422, 'Only the street matched. Add the house number.');
        fail(503, 'The City address service did not respond. Try again in a moment.');
      }
      if (!matched) fail(422, 'No Glendale address matched. Check the house number and street, e.g. "613 E Broadway".');
    }
    try { result = await lookupHazards(matched ? { lat: matched.lat, lon: matched.lon } : { address }); } catch { fail(422, 'That address could not be matched in Glendale. Check the street number and name.'); }
    if (!result?.location?.in_city) fail(422, 'That address is outside the Glendale pilot area.');
    if (matched) result.location = { ...result.location, matched_address: matched.address, score: matched.score };
    return result;
  }

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
    const household = (user.type === 'business' ? user.business : user.household) || {};
    const recommendations = recommendationsFor(user, household, user.hazards);
    return {
      user: { id: user.id, email: user.email, name: user.name, type: user.type, createdAt: user.createdAt, demo: Boolean(user.demo) },
      address: user.address ? { text: user.address, lat: user.lat, lon: user.lon, verified: user.addressVerified, checkedAt: user.hazardsCheckedAt, codePending: Boolean(user.verification && user.addressVerified !== 'mail') } : null,
      hazards: user.hazards || null,
      household: user.type === 'business' ? {} : household,
      business: user.type === 'business' ? household : null,
      done: user.done || {},
      recommendations,
      readiness: readiness(recommendations, user.done, user, household),
    };
  }

  const routes = {
    'POST /api/account/signup': async (req, body) => {
      throttle(req, 20, 'signup');
      const email = text(body.email, 200).toLowerCase();
      const name = text(body.name, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
      if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) fail(400, 'Use a password of at least 8 characters.');
      if (!name) fail(400, 'Enter your name.');
      const isBusiness = body.type === 'business';
      const businessName = text(body.businessName, 100), businessKind = oneOf(body.businessKind, businessKinds.map(([k]) => k));
      if (isBusiness && (!businessName || !businessKind)) fail(400, 'Enter the business name and choose its type.');
      if (Object.values(data.users).some(u => u.email === email)) fail(409, 'An account with that email already exists. Sign in instead.');
      const user = { id: randomUUID(), email, name, type: body.type === 'business' ? 'business' : 'resident', passwordHash: hashPassword(body.password), createdAt: new Date(now()).toISOString(), household: {}, business: isBusiness ? { name: businessName, kind: businessKind } : {}, done: {} };
      data.users[user.id] = user;
      const token = startSession(user);
      store.save();
      return { status: 201, body: { token, ...view(user) } };
    },

    // Walkthrough: a fresh, clearly fictional demo household at a public address, so a demo never needs
    // a real sign-up. Each call creates its own account; nothing real is stored.
    'POST /api/demo/start': async req => {
      throttle(req, 60, 'demo');
      pruneDemos();
      const id = randomUUID();
      let lookup;
      try { lookup = await lookupHazards({ lat: 34.199055, lon: -118.230606 }); } catch { fail(503, 'Demo data is unavailable right now.'); }
      const user = {
        id, email: `demo-${id.slice(0, 8)}@firepath.demo`, name: 'Dana Rivera', type: 'resident', demo: true, passwordHash: 'demo:no-login',
        createdAt: new Date(now()).toISOString(),
        address: '1613 GLENCOE WAY, GLENDALE, CA, 91208', lat: 34.199055, lon: -118.230606, addressScore: 100, addressVerified: 'mail',
        hazards: lookup.hazards, hazardsCheckedAt: new Date(now()).toISOString(), business: {},
        household: { housing: 'own', homeType: 'house', members: [{ name: 'Mia', ageGroup: 'child', needsHelp: false }, { name: 'Rosa', ageGroup: 'senior', needsHelp: true }], people: 3,
          pets: [{ kind: 'dogs', count: 2, where: 'backyard' }], assistance: 'Rosa uses a walker; needs a step-free exit', access: 'Side gate on the left', utilities: 'Gas meter on the east wall',
          meetNear: 'Corner mailbox', meetFar: 'Montrose library', contact: 'Aunt Lucia in Fresno', shareWithResponders: true, updatedAt: new Date(now()).toISOString() },
        done: { alerts: true, kit: true },
      };
      data.users[id] = user;
      const token = startSession(user);
      store.save();
      return { status: 201, body: { token, ...view(user) } };
    },

    'POST /api/account/login': async (req, body) => {
      throttle(req, 60, 'login');
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

    // Delete the account for good: the user record (household, business, address) and every session.
    // Real accounts confirm with their password; the fictional demo household does not have one.
    'POST /api/account/delete': async (req, body) => {
      throttle(req, 10, 'delete');
      const user = session(req);
      if (!user.demo && (typeof body.password !== 'string' || !checkPassword(body.password, user.passwordHash))) fail(403, 'That password is not right.');
      for (const [key, row] of Object.entries(data.sessions)) if (row.userId === user.id) delete data.sessions[key];
      delete data.users[user.id];
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

    'PUT /api/me/business': async (req, body) => {
      const user = session(req);
      if (user.type !== 'business') fail(400, 'This is a resident account.');
      const count = (value, max) => Math.min(Math.max(Number.parseInt(value, 10) || 0, 0), max) || undefined;
      user.business = {
        name: text(body.name, 100),
        kind: oneOf(body.kind, businessKinds.map(([k]) => k)),
        employees: count(body.employees, 5000),
        visitors: count(body.visitors, 20000),
        floors: count(body.floors, 100),
        hours: text(body.hours, 80),
        needsHelp: count(body.needsHelp, 5000),
        hazmat: Array.isArray(body.hazmat) ? body.hazmat.filter(h => hazmatKinds.some(([k]) => k === h)) : [],
        hazmatNote: text(body.hazmatNote, 140),
        sprinklers: oneOf(body.sprinklers, ['yes', 'no', 'unknown']) || 'unknown',
        contactName: text(body.contactName, 80),
        contactPhone: text(body.contactPhone, 30),
        assembly: text(body.assembly, 100),
        access: text(body.access, 140),
        utilities: text(body.utilities, 120),
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
      const result = await locate(address, text(body.magicKey, 200) || undefined);
      Object.assign(user, {
        address: result.location.matched_address || address,
        lat: result.location.lat, lon: result.location.lon,
        addressScore: result.location.score ?? null,
        addressVerified: 'matched',
        hazards: result.hazards,
        hazardsCheckedAt: new Date(now()).toISOString(),
        verification: null,
      });
      for (const key of alertCache.keys()) if (key.startsWith(`${user.id}:`)) alertCache.delete(key);
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

    // Public, no account: check any Glendale address. Nothing is stored.
    'GET /api/public/suggest': async (req, body, url) => {
      throttle(req, 200, 'suggest');
      if (!geocoder) return { body: { suggestions: [] } };
      try { return { body: { suggestions: await geocoder.suggest(text(url.searchParams.get('q'), 120)) } }; }
      catch { return { body: { suggestions: [], unavailable: true } }; }
    },

    'POST /api/public/check': async (req, body) => {
      throttle(req, 20, 'check');
      const address = text(body.address, 200);
      if (address.length < 5) fail(400, 'Enter a Glendale street address.');
      // City records (about 3 s) load separately via GET /api/public/records, so the hazard result shows first.
      const result = await locate(address, text(body.magicKey, 200) || undefined);
      const layers = Object.keys(hazardNames).map(key => ({ key, name: hazardNames[key], ...hazardSeverity(key, result.hazards[key]), source: result.hazards[key]?._meta?.source || null }));
      const preview = buildRecommendations({}, {}, result.hazards).filter(r => r.tag.startsWith('Mapped') || r.id === 'alerts').slice(0, 3).map(({ id, title, description }) => ({ id, title, description }));
      return { body: { address: result.location.matched_address || address, lat: result.location.lat, lon: result.location.lon, layers, combined: combinedIndex(result.location.lat, result.location.lon), preview, checkedAt: new Date(now()).toISOString() } };
    },

    // Tap-to-inspect on the 3D map: the parcel, mapped hazards, combined index and City records at a point.
    'GET /api/public/point': async (req, body, url) => {
      throttle(req, 60, 'point');
      const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
      if (!(lat > 34.1 && lat < 34.3 && lon > -118.33 && lon < -118.16)) fail(400, 'Pick a point in Glendale.');
      let [parcel, lookup, neighborhood] = await Promise.all([parcelAt(lat, lon).catch(() => null), lookupHazards({ lat, lon }).catch(() => null), neighborhoodAt(lat, lon).catch(() => null)]);
      const layers = lookup ? Object.keys(hazardNames).map(key => ({ key, name: hazardNames[key], ...hazardSeverity(key, lookup.hazards[key]) })) : null;
      // The City's permit system is keyed to the same parcel number (AIN = APN without dashes).
      const records = parcel?.apn && parcel.city === 'GLENDALE' ? await cityRecords(parcel.apn.replace(/-/g, '')).catch(() => null) : null;
      // Notes come back in the viewer's language; copies, so the cached English stays intact.
      const lang = url.searchParams.get('lang');
      if (lang && lang !== 'en') {
        if (parcel) parcel = { ...parcel, notes: parcelNotes(parcel.yearBuilt, parcel.useType === 'Residential', lang) };
        if (neighborhood) neighborhood = { ...neighborhood, notes: neighborhoodNotes(neighborhood, lang) };
      }
      return { body: { lat, lon, parcel, neighborhood, layers, combined: combinedIndex(lat, lon), records, inCity: !!lookup, checkedAt: new Date(now()).toISOString() } };
    },

    // Public City permit and inspection records for a matched Glendale address (from the address check).
    'GET /api/public/records': async (req, body, url) => {
      throttle(req, 40, 'records');
      const address = text(url.searchParams.get('address'), 200);
      if (address.length < 5) fail(400, 'Enter a Glendale street address.');
      return { body: { records: await cityRecords(address).catch(() => null) } };
    },

    // Plain-language search over the City of Glendale permit catalog (crawled by scripts/crawl-permits.mjs).
    'GET /api/permits/search': async (req, body, url) => {
      throttle(req, 300, 'permits');
      const q = text(url.searchParams.get('q'), 120);
      const audience = oneOf(url.searchParams.get('audience'), ['resident', 'business', 'events']) || null;
      return { body: { query: q, permits: searchPermits(permitCatalog, q, { audience }).map(({ score, ...t }) => t), licenses: audience === 'business' ? searchLicenses(permitCatalog, q) : [], source: permitCatalog.source, crawledAt: permitCatalog.crawledAt, portal: permitCatalog.portal } };
    },

    // Public City records (permits, inspections, parcel) for the registered address.
    'GET /api/me/records': async req => {
      const user = session(req);
      if (!user.address) return { body: { records: null } };
      try { return { body: { records: await cityRecords(user.address) } }; } catch { return { body: { records: null, unavailable: true } }; }
    },

    'GET /api/address/suggest': async (req, body, url) => {
      session(req);
      if (!geocoder) return { body: { suggestions: [] } };
      try { return { body: { suggestions: await geocoder.suggest(text(url.searchParams.get('q'), 120)) } }; }
      catch { return { body: { suggestions: [], unavailable: true } }; }
    },

    'PUT /api/me/tasks': async (req, body) => {
      const user = session(req);
      const id = text(body.id, 40);
      if (!recommendationsFor(user, user.type === 'business' ? user.business : user.household, user.hazards).some(r => r.id === id)) fail(404, 'Unknown step.');
      user.done = { ...user.done, [id]: body.done === true };
      store.save();
      return { body: view(user) };
    },

    'GET /api/me/recommendations': async (req, body, url) => {
      const user = session(req);
      const all = recommendationsFor(user, user.type === 'business' ? user.business : user.household, user.hazards);
      const results = queryRecommendations(all, { q: url.searchParams.get('q') || '', category: url.searchParams.get('category') || 'all', status: url.searchParams.get('status') || 'all', done: user.done || {} });
      return { body: { results, total: all.length } };
    },

    'GET /api/me/alerts': async (req, body, url) => {
      const user = session(req), lang = playbookLang(url), cacheKey = `${user.id}:${lang}`;
      if (!Number.isFinite(user.lat)) return { body: { source: null, alerts: [], note: 'Register an address to see alerts for your location.' } };
      const cached = alertCache.get(cacheKey);
      if (cached && cached.at > now() - 120_000) return { body: cached.value };
      let value;
      try { value = { source: 'National Weather Service', checkedAt: new Date(now()).toISOString(), alerts: (await fetchAlerts(user.lat, user.lon)).map(a => ({ ...a, playbook: playbookFor(user, a.event, lang) })) }; }
      catch { value = { source: 'National Weather Service', checkedAt: new Date(now()).toISOString(), alerts: [], unavailable: true }; }
      alertCache.set(cacheKey, { at: now(), value });
      return { body: value };
    },

    // Practice drill: the same playbook a real alert would get, for an event type the user picks.
    'GET /api/me/playbook': async (req, body, url) => {
      const user = session(req);
      const event = url.searchParams.get('event');
      if (!drillEvents.includes(event)) fail(400, 'Pick one of the drill types.');
      return { body: { drill: true, ...playbookFor(user, event, playbookLang(url)) } };
    },

    'GET /api/permits': async (req, body, url) => ({ body: { types: (url.searchParams.get('type') === 'business' ? businessPermitTypes : permitTypes).map(({ id, title, permit }) => ({ id, title, permit })) } }),

    'POST /api/me/permits/guide': async (req, body) => {
      const user = session(req);
      const guide = permitGuide(text(body.type, 20), { profile: user, household: user.type === 'business' ? user.business : user.household, hazards: user.hazards, description: text(body.description, 500), lang: text(body.lang, 5) || 'en' });
      if (!guide) fail(404, 'Unknown project type.');
      return { body: guide };
    },

    // Example City-configured venues with pre-set permit packages (see src/venues.js).
    // Which build is running (the commit stamped into VERSION by git archive), for deploy checks.
    'GET /api/health': async () => ({ body: { ok: true, version, time: new Date(now()).toISOString() } }),

    'GET /api/venues': async () => ({ body: { venues: venues.map(({ id, name, where, about, kind, url }) => ({ id, name, where, about, kind, url })), templates: eventTemplates } }),

    'POST /api/me/venues/package': async (req, body) => {
      const user = session(req);
      const venue = venues.find(v => v.id === text(body.venueId, 40));
      if (!venue) fail(404, 'Unknown venue.');
      if (!venueHazards.has(venue.id)) { try { venueHazards.set(venue.id, (await lookupHazards({ lat: venue.lat, lon: venue.lon })).hazards); } catch { venueHazards.set(venue.id, null); } }
      const answers = Object.fromEntries(['commercial', 'tents', 'flame', 'fireworks', 'filming', 'alcohol', 'food', 'sound'].map(k => [k, body.answers?.[k] === true]));
      const time = t => /^\d{2}:\d{2}$/.test(t || '') ? t : '';
      const input = { answers, attendees: Math.min(Math.max(Number.parseInt(body.attendees, 10) || 0, 0), 1_000_000), start: time(body.start), end: time(body.end) };
      const pkg = venuePackage(permitCatalog, venue.id, input, venueHazards.get(venue.id), text(body.lang, 5) || 'en');
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : '';
      const summary = [`Event: ${text(body.name, 100) || 'unnamed event'} at ${venue.name} (${venue.where})`, `When: ${date || 'date not set'}${input.start ? `, ${input.start}` : ''}${input.end ? ` to ${input.end}` : ''}${input.attendees ? `, about ${input.attendees} people` : ''}`, `Organizer: ${user.type === 'business' ? `${user.business?.name || 'business'} · ${user.name}` : user.name}`, 'City of Glendale permits:', ...pkg.items.map(i => `- ${i.type}${i.workClass && !i.type.includes(i.workClass) ? ` (${i.workClass})` : ''}`), ...(pkg.outside.length ? ['Other agencies:', ...pkg.outside.map(o => `- ${o.name} (${o.who})`)] : []), VENUE_NOTE_LINE].join('\n');
      return { body: { ...pkg, summary, hazardsChecked: Boolean(venueHazards.get(venue.id)), portal: permitCatalog.portal } };
    },

    'POST /api/me/permits/event': async (req, body) => {
      const user = session(req);
      const answers = Object.fromEntries(['commercial', 'publicWay', 'tents', 'flame', 'fireworks', 'filming'].map(k => [k, body.answers?.[k] === true]));
      const attendees = Math.min(Math.max(Number.parseInt(body.attendees, 10) || 0, 0), 1_000_000);
      // The event can be somewhere other than the account's address (e.g. a business hosting off-site).
      let site = { address: user.address, hazards: user.hazards };
      const location = text(body.location, 200);
      if (location) { const found = await locate(location, text(body.magicKey, 200) || undefined); site = { address: found.location.matched_address || location, hazards: found.hazards }; }
      const plan = planEvent(permitCatalog, answers, { hazards: site.hazards, attendees, lang: text(body.lang, 5) || 'en' });
      const summary = [`Event: ${text(body.name, 100) || 'unnamed event'}${attendees ? `, about ${attendees} people` : ''}`, `Location: ${site.address || 'not set'}`, `Organizer: ${user.type === 'business' ? `${user.business?.name || 'business'} · ${user.name}` : user.name}`, 'Likely City of Glendale permits:', ...plan.items.map(i => `- ${i.type}${i.workClass && !i.type.includes(i.workClass) ? ` (${i.workClass})` : ''}`), 'Prepared with FirePath. Not a City submission; confirm requirements with the City of Glendale.'].join('\n');
      return { body: { ...plan, location: site.address || 'not set', summary, portal: permitCatalog.portal, crawledAt: permitCatalog.crawledAt } };
    },

    'GET /api/me/responder': async req => {
      const user = session(req);
      if (user.type === 'business') {
        const b = user.business || {};
        const lines = ['FIREPATH DRAFT - NOT CONNECTED TO DISPATCH OR CAD',
          `Address status: ${user.addressVerified === 'mail' ? 'verified by mailed code (not proof of occupancy rights)' : user.addressVerified === 'matched' ? 'matched to a City address point; not verified' : 'no address'}`,
          `Business (self-reported): ${b.name || 'not set'}${b.kind ? ` · ${businessKinds.find(([k]) => k === b.kind)[1]}` : ''}`,
          `Location: ${user.address || 'not set'}`,
          b.employees || b.visitors ? `Typical occupancy (self-reported): ${b.employees || 0} staff, up to ${b.visitors || 0} visitors${b.hours ? `, ${b.hours}` : ''}` : null,
          b.floors ? `Floors: ${b.floors}` : null,
          b.needsHelp ? `People who may need help leaving (typical): ${b.needsHelp}` : null,
          `Sprinklers (self-reported): ${b.sprinklers || 'unknown'}`,
          (b.hazmat || []).length ? `Hazardous materials on site (self-reported): ${b.hazmat.map(h => hazmatKinds.find(([k]) => k === h)[1]).join('; ')}${b.hazmatNote ? ` (${b.hazmatNote})` : ''}` : 'Hazardous materials: none reported (not verified)',
          b.contactName ? `Key contact: ${b.contactName}${b.contactPhone ? `, ${b.contactPhone}` : ''}` : null,
          b.assembly ? `Staff assembly point: ${b.assembly}` : null,
          b.access ? `Access note: ${b.access}` : null,
          b.utilities ? `Utility shutoffs: ${b.utilities}` : null,
          'City fire inspection and CUPA records: not connected',
        ].filter(Boolean);
        return { body: { brief: lines.join('\n'), shareWithResponders: Boolean(b.shareWithResponders), connected: false } };
      }
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

  // The same lookups by POST, so an address or map point travels in the body rather than the URL
  // (URLs end up in hosting logs). The GET forms stay for the maps' older links and the smoke test.
  for (const path of ['/api/public/suggest', '/api/public/point', '/api/public/records', '/api/address/suggest']) {
    routes[`POST ${path}`] = (req, body, url) => {
      const inBody = new URL(url);
      for (const [key, value] of Object.entries(body)) if (typeof value === 'string' || typeof value === 'number') inBody.searchParams.set(key, String(value));
      return routes[`GET ${path}`](req, body, inBody);
    };
  }

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
      body = { error: error instanceof HttpError ? error.message : status === 400 ? 'Invalid request.' : 'Something went wrong.', ...(error.extra || {}) };
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
