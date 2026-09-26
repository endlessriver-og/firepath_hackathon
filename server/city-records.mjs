// Public City of Glendale records for an address, from the Glendale Permits (Tyler EnerGov) public
// search: permits, inspections, plans and the parcel number. Public-record data, read-only, no login.
// Code-enforcement cases are counted but never listed.
const SEARCH = 'https://glendaleca-energovweb.tylerhost.net/apps/selfservice/api/energov/search';
const PORTAL_SEARCH = 'https://glendaleca-energovweb.tylerhost.net/apps/SelfService#/search?m=1&fm=1&ps=10&pn=1&em=true&st=';
const HEADERS = { accept: 'application/json', 'content-type': 'application/json', tenantId: '1', tenantName: 'GlendaleCAProd' };
const MODULE = { 2: 'Permit', 3: 'Plan', 4: 'Inspection', 6: 'Request' };

// "1613 GLENCOE WAY, GLENDALE, CA, 91208" -> "1613 GLENCOE WAY" (the portal indexes street addresses)
export const streetAddress = address => String(address || '').split(',')[0].trim().toUpperCase();

export function summarizeRecords(result, address) {
  const entities = result?.EntityResults || [];
  const date = e => (e.FinalDate || e.IssueDate || e.ApplyDate || e.CompleteDate || e.ScheduleDate || e.RequestDate || '').slice(0, 10) || null;
  const listed = entities.filter(e => MODULE[e.ModuleName]).map(e => ({
    kind: MODULE[e.ModuleName], number: String(e.CaseNumber || '').trim(), type: e.CaseType || e.CaseWorkclass || 'Record',
    status: e.CaseStatus || null, date: date(e), description: String(e.Description || '').replace(/\s+/g, ' ').trim().slice(0, 120) || null,
  }));
  return {
    parcel: entities.find(e => e.MainParcel)?.MainParcel || null,
    totals: { total: result?.TotalFound ?? entities.length, permits: result?.PermitsFound ?? 0, inspections: result?.InspectionsFound ?? 0, plans: result?.PlansFound ?? 0, codeCases: result?.CodeCasesFound ?? 0 },
    recent: listed.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8),
    searchUrl: PORTAL_SEARCH + encodeURIComponent(streetAddress(address)),
    source: 'City of Glendale, Glendale Permits public search',
  };
}

export function createCityRecords(fetchImpl = fetch) {
  let criteria = null;
  const cache = new Map();
  return async function cityRecords(address) {
    const key = streetAddress(address);
    if (!key) return null;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - 6 * 3_600_000) return hit.value;
    criteria ??= (await (await fetchImpl(`${SEARCH}/criteria`, { headers: HEADERS, signal: AbortSignal.timeout(8000) })).json()).Result;
    const body = { ...criteria, Keyword: key, ExactMatch: true, SearchModule: 1, FilterModule: 1, PageNumber: 1, PageSize: 40 };
    const response = await fetchImpl(`${SEARCH}/search`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`city records ${response.status}`);
    const value = summarizeRecords((await response.json()).Result, key);
    cache.set(key, { at: Date.now(), value });
    return value;
  };
}
