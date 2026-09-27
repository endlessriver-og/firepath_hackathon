import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { api, apiBase } from './api';
import MapFrame from './MapFrame';
import { describeHazard, hazardNames, nextSteps, summarizePlace } from './preparedness';
import { PERMIT_PORTAL, businessPermitTypes, categories, hazardSeverity, permitTypes, queryRecommendations } from './readiness';
import { drillEvents } from './playbooks';
import { eventQuestions } from './permit-catalog';
import { hazardViewers, resourceGroups, RESOURCES_CHECKED } from './resources';
import { businessPosterPrintout, householdPlanPrintout, standardPrintout, standardPrintouts } from './printouts';
import { printHtml } from './print';
import { useI18n } from './i18n';
import { connect as connectDevice, sendToDevice, subscribe as subscribeDevice } from './device';
import { AddressCheck, CityRecords } from './landing';
import { eventTemplates, venues, VENUE_NOTE } from './venues';
import { AddressPanel, AddressSearch, BusinessDetails, BusinessProfile, HouseholdForm } from './onboarding';
import { Toggle } from './ui';
import { Button, Caption, Card, Chips, CityDataCallout, ErrorText, Field, Link, Muted, ScoreBar, Collapsible, LanguageSettings, ProgressRing, Section, SubTabs, Segment, Select, SeverityBadge, Tag, Title, color, s } from './ui';

const EVERBRIDGE = 'https://www.glendaleca.gov/Everbridge';
const KNOW_YOUR_ZONE = 'https://www.glendaleca.gov/government/departments/fire-department/other-links/emergency-preparedness-response/know-your-zone';

function useToggle(me, onChange) {
  const [busy, setBusy] = useState(null);
  return [busy, async id => {
    setBusy(id);
    try { onChange(await api('PUT', '/api/me/tasks', { id, done: !me.done[id] })); } catch (e) { Alert.alert('Could not save', e.message); } finally { setBusy(null); }
  }];
}

// Checklist order: official alerts first, then mapped-hazard steps, then household, then general.
export const checklist = me => nextSteps(me.recommendations, {}, me.recommendations.length);

const shortTaskTitles = {
  alerts: 'Sign up for City alerts', kit: 'Pack a go bag', plan: 'Make a contact plan',
  quake: 'Secure heavy items', pets: 'Pack for pets', assistance: 'Arrange help and backup power',
  apartment: 'Know your building exits', kids: 'Plan school pickup',
  zone0: 'Clear combustibles near the building', wildfire: 'Review wildfire protections',
  ground: 'Ask about seismic safety', flood: 'Review flood coverage',
  drill: 'Practice an alert', 'responder-notes': 'Review responder notes',
  contacts: 'Set up a staff contact tree', assembly: 'Choose an assembly point',
  continuity: 'Make a continuity plan', extinguishers: 'Check extinguishers and exits',
  hood: 'Service kitchen suppression', assist: 'Plan help for evacuation',
  hmbp: 'Check hazardous materials filing',
};

export function TaskCard({ task, number, done, busy, onToggle, compact }) {
  const [open, setOpen] = useState(!compact);
  return <View style={[s.card, { flexDirection: 'row', gap: 14 }, compact && { paddingVertical: 12 }, done && { opacity: 0.62 }]}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done, busy }} accessibilityLabel={task.title} onPress={() => onToggle(task.id)} style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: color.green, backgroundColor: done ? color.green : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <Text style={{ color: '#FFF', fontWeight: '900' }}>{busy ? '…' : done ? '✓' : ''}</Text>
    </Pressable>
    <View style={{ flex: 1 }}>
      <Tag tone={task.tag.startsWith('Mapped') ? 'warm' : undefined}>{number ? `${number} · ${task.tag}` : task.tag}</Tag>
      <Text onPress={compact ? () => setOpen(!open) : undefined} style={{ color: color.ink, fontSize: 16, fontWeight: '700', marginBottom: 3, textDecorationLine: done ? 'line-through' : 'none' }}>{shortTaskTitles[task.id] || task.title}{compact ? <Text style={{ color: color.green }}>{open ? '  −' : '  +'}</Text> : null}</Text>
      {!done && open && <Muted>{task.description}</Muted>}
      {!done && open && task.url && <Link onPress={() => Linking.openURL(task.url)}>{task.link || 'Read guidance'} ↗</Link>}
    </View>
  </View>;
}

function HomeRecords({ me }) {
  const [records, setRecords] = useState(null);
  useEffect(() => { api('GET', '/api/me/records').then(r => setRecords(r.records)).catch(() => setRecords(null)); }, [me.address?.text]);
  return <CityRecords records={records} />;
}

export function Home({ me, onChange, go }) {
  const { t } = useI18n();
  const r = me.readiness;
  const [busy, toggle] = useToggle(me, onChange);
  const place = me.hazards ? summarizePlace(me.hazards) : null;
  const ordered = checklist(me);
  const next = ordered.filter(t => !me.done[t.id]).slice(0, 3);
  const done = ordered.length - ordered.filter(t => !me.done[t.id]).length, total = ordered.length;
  return <>
    <Text style={s.muted}>{me.user.type === 'business' ? me.business?.name || 'Your business' : `Hi ${me.user.name.split(' ')[0]}`}</Text>
    <Card style={{ marginTop: 8, backgroundColor: color.green, borderColor: color.green, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <ProgressRing percent={r.score} track="#3E7667" fill="#F2C46D" textColor="#FFF" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#CFE3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{t('home.checklist')}</Text>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 2 }}>{t('home.done', { done, total })}</Text>
        <Text style={{ color: '#CFE3DA', fontSize: 13, marginTop: 4 }}>{done === total ? 'All done. Review your plan in a few months.' : 'Start with the steps below.'}</Text>
      </View>
    </Card>

    <Section>{t('home.next')}</Section>
    {next.map(task => <TaskCard key={task.id} compact task={task} number={ordered.indexOf(task) + 1} done={false} busy={busy === task.id} onToggle={toggle} />)}
    <Link onPress={() => go('Plan')}>{t('home.seeAll', { total })}</Link>

    <Section>{me.user.type === 'business' ? 'Your site' : 'Your home'}</Section>
    {!me.address ? <Card><Muted>Register your address to see which hazard maps include it.</Muted><Link onPress={() => go('Profile', null, 'address')}>Add your address →</Link></Card> : <>
      <Collapsible icon="🗺" title="What the maps show" summary={place.mapped.length ? place.mapped.map(i => { const sev = hazardSeverity(i.key, me.hazards[i.key]); return `⚠ ${i.name}${typeof sev.level === 'number' ? ` ${sev.label}` : ''}`; }).join('   ') : 'No checked map shows a zone here'}>
        <Caption>{me.address.text} · {me.address.verified === 'mail' ? 'verified' : 'not yet verified'}</Caption>
        {place.mapped.map(item => <View key={item.key} style={{ flexDirection: 'row', gap: 12, backgroundColor: color.warmBg, borderWidth: 1, borderColor: color.warmLine, borderRadius: 14, padding: 14, marginTop: 8 }}>
          <Text style={{ color: color.warm }}>●</Text><View style={{ flex: 1 }}><Text style={{ color: color.ink, fontWeight: '700' }}>{item.name} · {hazardSeverity(item.key, me.hazards[item.key]).label}</Text><Muted>{item.label}</Muted><Link style={{ marginTop: 6 }} onPress={() => go('Map', [item.key])}>See zones on the map →</Link></View></View>)}
        <Caption>Outside a mapped zone does not mean no risk. These are planning maps, not live incidents.</Caption>
      </Collapsible>
      <HomeRecords me={me} />
    </>}
    <Collapsible icon="🔗" title="How FirePath connects" summary="Maps, City records, alerts, your household and devices"><Muted style={{ marginTop: 10 }}>See every data source and device, and which are live today.</Muted><Link onPress={() => go('Systems')}>Open →</Link></Collapsible>
    <Collapsible icon="📚" title="Public resources" summary="20 official links: alerts, zones, CERT, outages, 211"><Resources compact /></Collapsible>
    <Pressable accessibilityRole="button" onPress={() => go('Walkthrough')} style={{ marginTop: 16, backgroundColor: '#12302A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 20, color: '#F2C46D' }}>▶</Text>
      <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: '800' }}>Take the tour</Text><Text style={{ color: '#CFE3DA', fontSize: 12, marginTop: 2 }}>Five stops, about a minute</Text></View>
    </Pressable>
  </>;
}

export function Actions({ me, onChange, sub, setSub }) {
  const [q, setQ] = useState(''), [category, setCategory] = useState('all'), [status, setStatus] = useState('open');
  const [showAll, setShowAll] = useState(false);
  const [busy, toggle] = useToggle(me, onChange);
  const ordered = checklist(me);
  const results = ordered.filter(t => queryRecommendations([t], { q, category, status, done: me.done }).length);
  const filtered = Boolean(q.trim()) || category !== 'all' || status !== 'open';
  const visible = showAll || filtered ? results : results.slice(0, 4);
  const complete = ordered.filter(r => me.done[r.id]).length;
  return <>
    <Title style={{ marginBottom: 2 }}>Your plan</Title>
    <Muted>{complete} of {ordered.length} steps done. Tap a step for details.</Muted>
    <SubTabs value={sub || 'todo'} options={[['todo', 'Steps'], ['print', 'Print & post']]} onChange={setSub} />
    {sub === 'print' ? <PrintSheets me={me} /> : <>
    <Collapsible title="Find a step" summary="Search and filters">
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Pets, roof, water…" autoCapitalize="none" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Select label="Topic" value={category} options={categories} onChange={v => setCategory(v || 'all')} /></View>
        <View style={{ flex: 1 }}><Select label="Show" value={status} options={[['open', 'To do'], ['done', 'Done'], ['all', 'All']]} onChange={v => setStatus(v || 'open')} /></View>
      </View>
    </Collapsible>
    {visible.length ? visible.map(task => <TaskCard key={task.id} compact task={task} number={ordered.indexOf(task) + 1} done={Boolean(me.done[task.id])} busy={busy === task.id} onToggle={toggle} />)
      : <Card><Muted>No steps match. Try another search.</Muted></Card>}
    {!filtered && results.length > 4 && <Link onPress={() => setShowAll(!showAll)}>{showAll ? 'Show fewer steps' : `See all ${results.length} steps`}</Link>}
    <Collapsible title="Future City connections" summary="What additional records could add"><CityDataCallout id="permitHistory" />{me.hazards && describeHazard('wildfire', me.hazards.wildfire).tone === 'mapped' && <CityDataCallout id="brushClearance" />}</Collapsible>
    </>}
  </>;
}

// A playbook: grouped steps, each with the reason FirePath included it. Checks are local to this view.
function Playbook({ playbook, drill }) {
  const [checked, setChecked] = useState({});
  return <View>
    {playbook.mappedHere.length > 0 && <Caption style={{ marginTop: 0 }}>Mapped at your address: {playbook.mappedHere.join(', ')}</Caption>}
    {playbook.groups.map(group => <View key={group.label} style={{ marginTop: 12 }}>
      <Tag tone={group.label === 'Do now' ? 'warm' : undefined}>{group.label}</Tag>
      {group.steps.map(step => { const key = `${group.label}:${step.text}`; const on = Boolean(checked[key]); return (
        <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setChecked(current => ({ ...current, [key]: !current[key] }))} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
          <Text style={{ width: 22, color: color.green, fontWeight: '900', fontSize: 16 }}>{on ? '☑' : '☐'}</Text>
          <View style={{ flex: 1 }}><Text style={{ color: color.ink, lineHeight: 20, textDecorationLine: on ? 'line-through' : 'none' }}>{step.text}</Text></View>
        </Pressable>); })}
    </View>)}
    {drill && <Caption>{Object.keys(checked).filter(k => checked[k]).length} of {playbook.groups.reduce((n, g) => n + g.steps.length, 0)} steps walked through</Caption>}
  </View>;
}

function Drill({ me, onChange }) {
  const device = useDevice();
  const [event, setEvent] = useState(null), [playbook, setPlaybook] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [practiced, setPracticed] = useState({});
  const open = e => { setEvent(e); setPlaybook(null); setPracticed({}); setError(''); if (e) api('GET', `/api/me/playbook?event=${encodeURIComponent(e)}`).then(setPlaybook).catch(err => setError(err.message)); };
  const practiceSteps = playbook ? [
    ...(playbook.groups.find(g => g.label === 'Do now')?.steps.slice(0, 2) || []),
    ...(playbook.groups.find(g => g.label === 'Check on')?.steps.slice(0, 1) || []),
    ...(playbook.groups.find(g => g.label === 'Before you leave')?.steps.slice(0, 1) || []),
  ].slice(0, 4) : [];
  const practicedCount = practiceSteps.filter((_, i) => practiced[i]).length;
  const finish = async () => { setBusy(true); try { if (!me.done.drill) onChange(await api('PUT', '/api/me/tasks', { id: 'drill', done: true })); setEvent(null); setPlaybook(null); setPracticed({}); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <>
    <Muted>Choose a scenario, say what you would do, then check each action. This is practice, not a real alert.</Muted>
    <Select label="Alert to practice" placeholder="Choose an alert" value={event} options={drillEvents.map(e => [e, e.replace(' Warning', '').replace(' Alert', '')])} onChange={open} />
    <ErrorText>{error}</ErrorText>
    {event && !playbook && !error && <Muted style={{ marginTop: 10 }}>Preparing your drill…</Muted>}
    {playbook && <Card style={{ borderColor: '#E3C98E', backgroundColor: '#FFFCF3' }}>
      <Text style={{ alignSelf: 'flex-start', backgroundColor: color.goldBg, color: color.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>DRILL · NOT A REAL ALERT</Text>
      <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>Imagine a {event} just arrived</Text>
      <Muted style={{ marginTop: 6 }}>Practice these {practiceSteps.length} actions out loud or with someone at home.</Muted>
      {practiceSteps.map((step, i) => <Pressable key={`${i}-${step.text}`} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(practiced[i]) }} onPress={() => setPracticed(current => ({ ...current, [i]: !current[i] }))} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ width: 26, fontSize: 18, color: color.green, fontWeight: '900' }}>{practiced[i] ? '☑' : '☐'}</Text><Text style={{ flex: 1, color: color.ink, lineHeight: 21 }}>{step.text}</Text>
      </Pressable>)}
      <Caption>{practicedCount} of {practiceSteps.length} practiced</Caption>
      <Collapsible title="See the full plan" summary="More actions for this scenario"><Playbook playbook={playbook} /></Collapsible>
      {device.connected && <Button kind="outline" onPress={() => sendToDevice({ kind: 'drill', hazard: playbook.kind, severity: 'drill', text: `DRILL: ${event}. Not a real alert.` }).catch(e => setError(e.message))}>Sound the in-home device</Button>}
      <Button busy={busy} disabled={practicedCount < practiceSteps.length || !practiceSteps.length} onPress={finish}>{me.done.drill ? 'Close practice' : 'Finish practice'}</Button>
    </Card>}
  </>;
}

export function Alerts({ me, onChange, sub, setSub }) {
  const [feed, setFeed] = useState(null), [error, setError] = useState('');
  const load = () => { setError(''); setFeed(null); api('GET', '/api/me/alerts').then(setFeed).catch(e => setError(e.message)); };
  useEffect(load, [me.address?.lat]);
  async function testNotification() {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Notifications off', 'Enable notifications in device settings to try the local test.');
      await Notifications.scheduleNotificationAsync({ content: { title: 'FirePath test', body: 'This is a local test, not an emergency alert.', data: { demo: true } }, trigger: null });
    } catch (e) { Alert.alert('Notification unavailable', String(e?.message || e)); }
  }
  const time = iso => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  return <>
    <Title>Alerts</Title>
    <SubTabs value={sub || 'live'} options={[['live', 'Live'], ['drill', 'Drill'], ['devices', 'Devices']]} onChange={setSub} />
    {(sub || 'live') === 'live' && <>
      {!me.address ? <Muted style={{ marginTop: 12 }}>Register your address to see alerts that include your home.</Muted>
        : error ? <ErrorText>{error}</ErrorText>
        : !feed ? <Muted style={{ marginTop: 12 }}>Checking the National Weather Service…</Muted>
        : feed.unavailable ? <Card><Muted>The National Weather Service could not be reached. Check official channels directly.</Muted><Link onPress={load}>Try again</Link></Card>
        : feed.alerts.length === 0 ? <Card><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>No weather alerts right now</Text><Caption>National Weather Service · checked {time(feed.checkedAt)}</Caption><Link onPress={load}>Refresh</Link></Card>
        : feed.alerts.map(a => <Card key={a.id} style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}>
            <Tag tone="warm">{a.severity} · {a.sender}</Tag>
            <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{a.event}</Text>
            <Muted style={{ marginTop: 4 }}>{a.headline}</Muted>
            {a.instruction ? <Text style={{ color: color.ink, marginTop: 8, lineHeight: 20 }}>{a.instruction}</Text> : null}
            <Caption>Until {time(a.expires)}</Caption>
            {a.playbook && <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: color.warmLine }}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>Your plan for this alert</Text><Playbook playbook={a.playbook} /></View>}
          </Card>)}
      <Card><Tag>Official</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>Get City evacuation orders</Text><Muted>FirePath doesn't receive these yet. Sign up with the City.</Muted><Link onPress={() => Linking.openURL(EVERBRIDGE)}>Sign up for City alerts ↗</Link><Link onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>Know your evacuation zone ↗</Link></Card>
      <Collapsible icon="🧩" title="What City data would add" summary="Live orders matched to your address"><CityDataCallout id="alertFeed" /><CityDataCallout id="evacuationZones" /></Collapsible>
      <Caption>In an emergency, call 911.</Caption>
    </>}
    {sub === 'drill' && <Drill me={me} onChange={onChange} />}
    {sub === 'devices' && <>
      <DeviceCard initiallyOpen />
      <Card><Tag>Phone notification · local test</Tag><Muted>Sends a notification from this device to itself. It is not an emergency alert.</Muted><Button kind="outline" onPress={testNotification}>Send test notification</Button></Card>
    </>}
  </>;
}

const CITY_FEE_SCHEDULE = 'https://www.glendaleca.gov/government/departments/finance/revenue/citywide-fee-schedule';
const withPermitPricing = (summary, outside = false) => `${summary}\n\nPermit pricing: City fees depend on project scope; request a quote before budgeting. Check the current Citywide Fee Schedule: ${CITY_FEE_SCHEDULE}${outside ? '\nOther-agency fees: confirm directly with each issuing agency.' : ''}`;

// The public catalog has permit names and work classes, not a final fee for every project.
function PermitPrice({ otherAgency = false }) {
  return <Text style={{ color: color.gold, fontSize: 12, fontWeight: '700', marginTop: 5 }}>
    {otherAgency ? 'Price: check with the issuing agency' : 'City permit fee: quote required for this project'}
  </Text>;
}
function FeeGuide() {
  return <Collapsible icon="💲" title="What will it cost?" summary="The City quotes each project">
    <Muted style={{ marginTop: 8 }}>Fees depend on your project's scope. Expect a City quote, and possibly plan review, inspection or other-agency charges. FirePath does not calculate or collect fees.</Muted>
    <Link onPress={() => Linking.openURL(CITY_FEE_SCHEDULE)}>Glendale fee schedule ↗</Link>
  </Collapsible>;
}

// Plain-language search across the City of Glendale's full permit catalog (crawled from Glendale Permits).
function PermitSearch({ me }) {
  const [q, setQ] = useState(''), [result, setResult] = useState(null);
  const audience = me.user.type === 'business' ? 'business' : 'resident';
  useEffect(() => {
    if (q.trim().length < 3) { setResult(null); return; }
    const timer = setTimeout(() => api('GET', `/api/permits/search?q=${encodeURIComponent(q)}&audience=${audience}`).then(setResult).catch(() => setResult(null)), 250);
    return () => clearTimeout(timer);
  }, [q]);
  return <>
    <Field label="What are you planning?" value={q} onChangeText={setQ} placeholder={audience === 'business' ? 'e.g., outdoor dining, block party, sign, propane' : 'e.g., new roof, ADU, solar, remove an oak tree'} autoCapitalize="none" />
    {result && <View>
      <FeeGuide />
      {result.permits.length === 0 ? <Caption>No City permit type matches. Try other words, or ask the City's Permit Services Center.</Caption> : result.permits.slice(0, 5).map(p => <Card key={p.name} style={{ marginTop: 8, padding: 14 }}>
        <Text style={{ color: color.ink, fontSize: 15, fontWeight: '800' }}>{p.name}</Text><PermitPrice />
        {p.matched.length > 0 && <Text style={{ color: color.muted, fontSize: 13, marginTop: 4 }}>Work class: {p.matched.slice(0, 3).join(' · ')}</Text>}
        {p.hazards.includes('wildfire') && me.hazards && describeHazard('wildfire', me.hazards.wildfire).tone === 'mapped' && <Text style={{ color: color.warm, fontSize: 12, marginTop: 4 }}>Your address is in a mapped fire zone; ask about wildfire-related rules.</Text>}
      </Card>)}
      {result.licenses.length > 0 && <><Caption>Matching business license types: {result.licenses.join(', ')}</Caption><PermitPrice /></>}
      <Caption>Official names from the City's permit catalog (Glendale Permits, crawled {result.crawledAt?.slice(0, 10)}). Search for them when you apply.</Caption>
      <Link onPress={() => Linking.openURL(PERMIT_PORTAL)}>Open Glendale Permits ↗</Link>
    </View>}
  </>;
}

// Event planner: a few yes/no questions -> the City permits an event likely needs, with fire-zone notes.
function EventPlanner({ me }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [attendees, setAttendees] = useState(''), [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const [where, setWhere] = useState('mine'), [location, setLocation] = useState(''), [locationKey, setLocationKey] = useState(null);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setPlan(await api('POST', '/api/me/permits/event', { name, attendees: Number(attendees) || 0, answers, ...(where === 'other' ? { location, magicKey: locationKey } : {}) })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!open) return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Tag>New</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>Plan an event</Text>
    <Muted style={{ marginTop: 4 }}>{me.user.type === 'business' ? 'Hosting a sidewalk sale, tasting, festival or filming?' : 'Block party, fair or big gathering?'} Six questions, then the permits you likely need.</Muted>
    <Button kind="outline" onPress={() => setOpen(true)}>Start</Button>
  </Card>;
  return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>Plan an event</Text>
    <Field label="Event name" value={name} onChangeText={setName} placeholder="e.g., Harvest fair" maxLength={100} />
    <Select label="Where?" value={where} options={[['mine', me.user.type === 'business' ? 'At my business' : 'At my home'], ['other', 'Another location']]} onChange={v => { setPlan(null); setWhere(v); }} />
    {where === 'other' && <AddressSearch label="Event address" value={location} onChangeText={t => { setLocation(t); setLocationKey(null); setPlan(null); }} onPick={(t, key) => { setLocation(t); setLocationKey(key); }} onSubmit={() => {}} suggestPath="/api/public/suggest" />}
    <Field label="Expected attendance" value={attendees} onChangeText={t => setAttendees(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g., 250" maxLength={7} />
    {eventQuestions.map(([key, label]) => <Toggle key={key} label={label} value={Boolean(answers[key])} onChange={v => { setPlan(null); setAnswers(current => ({ ...current, [key]: v })); }} />)}
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={build}>Get my permit list</Button>
    {plan && <View style={{ marginTop: 14 }}>
      <Caption style={{ marginTop: 0 }}>Location: {plan.location}</Caption>
      <Tag>{`Likely City permits · ${plan.items.length}`}</Tag><FeeGuide />
      {plan.items.map(i => <View key={`${i.type}-${i.workClass}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{i.type}{i.workClass && !i.type.includes(i.workClass) ? ` · ${i.workClass}` : ''}</Text><PermitPrice />
        <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{i.why}</Text>
      </View>)}
      {plan.notes.map(n => <Text key={n} style={{ color: /CAL FIRE/.test(n) ? color.warm : color.ink, lineHeight: 20, marginTop: 8 }}>• {n}</Text>)}
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(plan.summary)); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy summary'}</Button>
      <Button onPress={() => Linking.openURL(plan.portal)}>Apply in Glendale Permits ↗</Button>
    </View>}
    <Link onPress={() => { setOpen(false); setPlan(null); }}>Close</Link>
  </Card>;
}

// City event venues with pre-set permit packages (example configuration; see src/venues.js).
const VENUE_QUESTIONS = [['commercial', 'Ticketed or run by a business'], ['tents', 'Tents, booths or a stage'], ['food', 'Food vendors'], ['flame', 'Cooking or open flame'], ['alcohol', 'Alcohol served'], ['sound', 'Amplified sound or music'], ['filming', 'Commercial filming']];
const HOURS = Array.from({ length: 36 }, (_, i) => { const h = 6 + Math.floor(i / 2), m = i % 2 ? '30' : '00'; const v = `${String(h).padStart(2, '0')}:${m}`; return [v, `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`]; });

function VenuePlanner({ me }) {
  const [venueId, setVenueId] = useState(null), [templateId, setTemplateId] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', start: '17:00', end: '21:00', attendees: '', answers: {} });
  const [pkg, setPkg] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const set = patch => { setPkg(null); setForm(current => ({ ...current, ...patch })); };
  const useTemplate = id => { setTemplateId(id); const t = eventTemplates.find(x => x.id === id); if (t) set({ answers: { ...t.answers }, start: t.start, end: t.end, name: form.name || t.name }); };
  const venue = venues.find(v => v.id === venueId);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setPkg(await api('POST', '/api/me/venues/package', { venueId, ...form, attendees: Number(form.attendees) || 0 })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Card style={{ borderColor: '#2E5A88', borderWidth: 1.5 }}>
    <Tag>City event venues · example</Tag>
    <Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>Host at a City venue</Text>
    <Muted style={{ marginTop: 4 }}>Pick a venue and event type for a ready permit package.</Muted>
    <Select label="Venue" value={venueId} placeholder="Choose a venue" options={venues.map(v => [v.id, v.name])} onChange={id => { setVenueId(id); setPkg(null); }} />
    {venue && <Caption>{venue.where}. {venue.about}</Caption>}
    {venue && <>
      <Select label="Type of event" value={templateId} placeholder="Choose a starting point" options={eventTemplates.map(t => [t.id, t.name])} onChange={useTemplate} />
      <Field label="Event name" value={form.name} onChangeText={name => set({ name })} placeholder="e.g., Artsakh Night Market" maxLength={100} />
      <Field label="Date" hint="YYYY-MM-DD" value={form.date} onChangeText={date => set({ date: date.replace(/[^\d-]/g, '') })} placeholder="2026-10-17" maxLength={10} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Select label="Starts" value={form.start} options={HOURS} onChange={start => set({ start })} /></View>
        <View style={{ flex: 1 }}><Select label="Ends" value={form.end} options={HOURS} onChange={end => set({ end })} /></View>
      </View>
      <Field label="Expected attendance" value={form.attendees} onChangeText={t => set({ attendees: t.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="e.g., 800" maxLength={7} />
      {VENUE_QUESTIONS.map(([key, label]) => <Toggle key={key} label={label} value={Boolean(form.answers[key])} onChange={v => set({ answers: { ...form.answers, [key]: v } })} />)}
      <ErrorText>{error}</ErrorText>
      <Button busy={busy} onPress={build}>Build my package</Button>
    </>}
    {pkg && <View style={{ marginTop: 16 }}>
      <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{form.name || 'Your event'} · {pkg.venue.name}</Text>
      <Tag>{`City of Glendale permits · ${pkg.items.length}`}</Tag><FeeGuide />
      {pkg.items.map(i => <View key={`${i.type}-${i.workClass}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{i.type}{i.workClass && !i.type.includes(i.workClass) ? ` · ${i.workClass}` : ''}</Text><PermitPrice />
        <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{i.why}</Text>
      </View>)}
      {pkg.outside.length > 0 && <><Text style={[s.tag, { marginTop: 14 }]}>OTHER AGENCIES</Text>
        {pkg.outside.map(o => <Pressable key={o.name} accessibilityRole="link" onPress={() => Linking.openURL(o.url)} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
          <Text style={{ color: '#086B56', fontWeight: '700' }}>{o.name} ↗</Text><PermitPrice otherAgency /><Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{o.who}. {o.why}</Text>
        </Pressable>)}</>}
      <Text style={[s.tag, { marginTop: 14 }]}>TIMELINE</Text>
      {pkg.timeline.map(t => <View key={t.when + t.what} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}><Text style={{ width: 110, color: color.green, fontWeight: '800', fontSize: 12 }}>{t.when}</Text><Text style={{ flex: 1, color: color.ink }}>{t.what}</Text></View>)}
      {pkg.notes.map(n => <Text key={n} style={{ color: /CAL FIRE/.test(n) ? color.warm : color.ink, lineHeight: 20, marginTop: 8 }}>• {n}</Text>)}
      <View style={s.callout}><Text style={s.calloutTag}>EXAMPLE PACKAGE</Text><Text style={s.calloutText}>{VENUE_NOTE}</Text></View>
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(pkg.summary, pkg.outside.length > 0)); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy package summary'}</Button>
      <Button onPress={() => Linking.openURL(pkg.portal)}>Apply in Glendale Permits ↗</Button>
    </View>}
  </Card>;
}

export function Permits({ me, top, sub, setSub }) {
  const [type, setType] = useState(null), [description, setDescription] = useState('');
  const [guide, setGuide] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setGuide(await api('POST', '/api/me/permits/guide', { type, description })); top?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (guide) return <>
    <Link style={{ marginTop: 0 }} onPress={() => { setGuide(null); top?.(); }}>← All projects</Link>
    <Title style={{ marginTop: 10 }}>{guide.title}</Title>
    <Card><Tag>Likely permit</Tag><Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{guide.permit}</Text><PermitPrice /></Card>
    <FeeGuide />
    {guide.notes.length > 0 && <Card style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}><Tag tone="warm">For your address</Tag>{guide.notes.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 20, marginTop: 6 }}>• {n}</Text>)}</Card>}
    <Card><Tag>What you'll usually need</Tag>{guide.needs.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 22 }}>☐ {n}</Text>)}</Card>
    <Card><Tag>Your project summary</Tag><Text selectable style={{ color: color.ink, fontFamily: 'Courier', fontSize: 12, lineHeight: 18 }}>{withPermitPricing(guide.summary)}</Text>
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(guide.summary)); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy summary'}</Button></Card>
    <Button onPress={() => Linking.openURL(PERMIT_PORTAL)}>Open Glendale Permits portal ↗</Button>
    {guide.url !== PERMIT_PORTAL && <Link onPress={() => Linking.openURL(guide.url)}>City guidance for this project ↗</Link>}
    <CityDataCallout id="permitZones" />
    <Caption>FirePath does not submit permits or guarantee requirements. The City of Glendale decides what your project needs.</Caption>
  </>;
  return <>
    <Title>Permits</Title>
    <SubTabs value={sub || 'search'} options={[['search', 'Search'], ['events', 'Events'], ['projects', 'Projects']]} onChange={setSub} />
    {(sub || 'search') === 'search' && <PermitSearch me={me} />}
    {sub === 'events' && <><VenuePlanner me={me} /><EventPlanner me={me} /></>}
    {sub === 'projects' && <>
    <Muted style={{ marginTop: 12 }}>Pick a project to see what the City asks for.</Muted>
    <Select label="Your project" value={type} placeholder="Choose a project" options={(me.user.type === 'business' ? businessPermitTypes : permitTypes).map(t => [t.id, t.title])} onChange={v => { setType(v); setGuide(null); }} />
    {type && <>
      <Card><Text style={{ color: color.ink, fontWeight: '700' }}>{(me.user.type === 'business' ? businessPermitTypes : permitTypes).find(t => t.id === type)?.permit}</Text><PermitPrice /></Card>
      <Field label="Describe the project (optional)" value={description} onChangeText={setDescription} placeholder="e.g., add a 200 sq ft bedroom at the back" multiline maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button busy={busy} onPress={build}>Get my permit checklist</Button>
    </>}
    </>}
    <FeeGuide />
  </>;
}

export function Profile({ me, onChange, onSignOut, sub, setSub }) {
  const [brief, setBrief] = useState(null);
  useEffect(() => { api('GET', '/api/me/responder').then(setBrief).catch(() => setBrief(null)); }, [me]);
  const tab = sub || 'household';
  return <>
    <Title>{me.user.name}</Title>
    <Muted>{me.user.demo ? 'Fictional demo household' : me.user.email}</Muted>
    <SubTabs value={tab} options={[['household', me.user.type === 'business' ? 'Business' : 'Household'], ['address', 'Address'], ['responders', 'Responders'], ['settings', 'Settings']]} onChange={setSub} />
    {tab === 'settings' && <><LanguageSettings /><Caption>More of the app will be translated over time. Emergency steps, the home screen and the public page are translated now; translations have not yet been reviewed by native speakers.</Caption></>}
    {tab === 'household' && (me.user.type === 'business' ? <><BusinessProfile me={me} onSaved={onChange} /><BusinessDetails me={me} onSaved={onChange} /></> : <HouseholdForm me={me} onSaved={onChange} />)}
    {tab === 'address' && <View style={{ marginTop: 8 }}><AddressPanel me={me} onChange={onChange} /></View>}
    {tab === 'responders' && <>
      <Muted style={{ marginTop: 12 }}>{brief?.shareWithResponders ? 'You have consented to sharing this once a City connection exists. Nothing is sent today.' : 'Sharing is off. Nothing is sent today either way.'}</Muted>
      {brief && <Card><Tag>Responder preview</Tag>{String(brief.brief || '').split(/\n+/).filter(Boolean).map((line, i) => <Text key={i} selectable style={{ color: color.ink, fontSize: 13, lineHeight: 21, marginTop: 10 }}>{line}</Text>)}</Card>}
      <CityDataCallout id="cad" />
    </>}
    <Button kind="outline" onPress={onSignOut} style={{ marginTop: 28 }}>Sign out</Button>
    <Caption>{me.user.demo ? 'Demo account on this demo server.' : 'Prototype account on this demo server.'}</Caption>
  </>;
}


export function MapTab({ me, layers, setLayers, top }) {
  const lat = me.address?.lat, lon = me.address?.lon;
  const [view3d, setView3d] = useState(false);
  const src = `${apiBase()}/${view3d ? 'map3d' : 'map'}.html?layers=${layers.join(',')}${lat ? `&lat=${lat}&lon=${lon}` : ''}`;
  const order = me.hazards ? Object.keys(hazardNames).sort((a, b) => {
    const rank = k => { const l = hazardSeverity(k, me.hazards[k]).level; return typeof l === 'number' ? -l : l === 'zone' ? -1.5 : 1; };
    return rank(a) - rank(b);
  }) : [];
  const [other, setOther] = useState(false);
  const mode = <Select label="Address" value={other ? 'other' : 'mine'} options={[['mine', me.user.type === 'business' ? 'My business' : 'My home'], ['other', 'Check another address']]} onChange={v => setOther(v === 'other')} />;
  if (other) return <>
    <Title>Check any address</Title>
    {mode}
    <Muted style={{ marginTop: 10 }}>Check another address without changing yours.</Muted>
    <AddressCheck showPreview={false} />
  </>;
  return <>
    <Title>Hazard map</Title>
    {mode}
    <MapFrame key={src} src={src} style={{ height: 560, borderRadius: 17, marginTop: 12, borderWidth: 1, borderColor: color.line }} />
    <Select label="Map view" value={view3d ? '3d' : '2d'} options={[['2d', 'Flat map'], ['3d', '3D terrain']]} onChange={v => setView3d(v === '3d')} />
    <Caption>Tap the map to inspect a location. Shading shows planning zones, not live incidents.</Caption>
    {me.hazards ? <>
      <Collapsible icon="🗺" title="At your address" summary={`${order.filter(k => describeHazard(k, me.hazards[k]).tone === 'mapped').length} of ${order.length} maps show a zone here`}>
      {order.map(key => { const sev = hazardSeverity(key, me.hazards[key]); const meta = me.hazards[key]?._meta || {}; const on = layers.includes(key); return (
        <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setLayers([key]); top?.(); }} style={[s.card, on && { borderColor: color.green, borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: color.ink, fontSize: 15, fontWeight: '800' }}>{hazardNames[key]}</Text><Text style={{ color: describeHazard(key, me.hazards[key]).tone === 'mapped' ? color.warm : color.muted, fontWeight: '800', fontSize: 12 }}>{describeHazard(key, me.hazards[key]).tone === 'mapped' ? `⚠ ${typeof sev.level === 'number' ? sev.label : 'In zone'}` : describeHazard(key, me.hazards[key]).tone === 'unknown' ? '? Unavailable' : '○ Outside'}</Text></View>
          {hazardViewers[key] && <Link style={{ marginTop: 6 }} onPress={() => Linking.openURL(hazardViewers[key].url)}>Official map: {hazardViewers[key].name} ↗</Link>}
        </Pressable>); })}
      </Collapsible>
    </> : <Card><Muted>Register your address to see how each layer rates at your home.</Muted></Card>}
    <CityDataCallout id="evacuationZones" />
    <CityDataCallout id="closures" />
  </>;
}


// Official public resources, grouped. `limit` shows the first group only (with a "see all" toggle).
export function Resources({ compact }) {
  const [all, setAll] = useState(!compact);
  const groups = all ? resourceGroups : resourceGroups.slice(0, 1);
  return <>
    {groups.map(g => <View key={g.title} style={{ marginTop: 14 }}>
      <Tag>{g.title}</Tag>
      {g.items.map(r => <Pressable key={r.url} accessibilityRole="link" onPress={() => Linking.openURL(r.url)} style={{ paddingVertical: 9, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: '#086B56', fontWeight: '700' }}>{r.name} ↗</Text>
        <Text style={{ color: color.muted, fontSize: 13, marginTop: 2 }}>{r.what}</Text>
      </Pressable>)}
    </View>)}
    {compact && <Link onPress={() => setAll(!all)}>{all ? 'Show fewer' : `See all ${resourceGroups.reduce((n, g) => n + g.items.length, 0)} public resources`}</Link>}
    <Caption>Links checked {RESOURCES_CHECKED}. FirePath is not affiliated with these agencies.</Caption>
  </>;
}

// Print-and-post sheets: a custom one from the account's saved data, plus standard guidance sheets.
export function PrintSheets({ me }) {
  const [error, setError] = useState('');
  const business = me.user.type === 'business';
  const run = async html => { setError(''); try { await printHtml(html); } catch (e) { setError(e.message); } };
  const custom = () => business
    ? businessPosterPrintout({ business: me.business, address: me.address?.text, hazards: me.hazards, name: me.user.name })
    : householdPlanPrintout({ name: me.user.name, address: me.address?.text, hazards: me.hazards, household: me.household });
  return <>
    <Muted style={{ marginTop: 12 }}>One-page sheets for the fridge, the front door or the break room. Anything not saved yet prints as a blank line to fill in by hand.</Muted>
    <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
      <Tag>Made for you</Tag>
      <Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>{business ? `${me.business?.name || 'Business'}: in an emergency` : 'Our emergency plan'}</Text>
      <Muted style={{ marginTop: 4 }}>{business ? 'Assembly point, key contact, hazardous materials and evacuation steps for staff.' : 'Who lives here, meeting places, contacts, pets, shutoffs and your mapped hazards.'}</Muted>
      <Button onPress={() => run(custom())}>Print</Button>
    </Card>
    {standardPrintouts.map(d => <View key={d.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
      <Text style={{ color: color.ink, fontWeight: '700', flex: 1 }}>{d.title}</Text>
      <Pressable accessibilityRole="button" onPress={() => run(standardPrintout(d.id))} style={{ borderWidth: 1.5, borderColor: color.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: color.green, fontWeight: '800' }}>Print</Text></Pressable>
    </View>)}
    <ErrorText>{error}</ErrorText>
  </>;
}


// In-home device (ESP32 prototype) status + controls. Shared by Alerts, drills and the systems page.
export function useDevice() {
  const [device, setDevice] = useState({ supported: false, connected: false, events: [] });
  useEffect(() => subscribeDevice(setDevice), []);
  return device;
}

export function DeviceCard({ initiallyOpen }) {
  const device = useDevice();
  const [error, setError] = useState('');
  const run = async fn => { setError(''); try { await fn(); } catch (e) { if (e?.name !== 'NotFoundError') setError(e.message); } };
  const last = device.events[0];
  return <Collapsible icon="📟" initiallyOpen={initiallyOpen} title="In-home alert device" summary={device.connected ? `Connected${last ? ` · last: ${last.type}${last.kind ? ` (${last.kind})` : ''}` : ''}` : device.supported ? 'Not connected · USB prototype' : 'Prototype · connect from desktop Chrome'}>
    <Muted style={{ marginTop: 10 }}>An ESP32 speaker for people who might miss a phone alert. It sounds for drills and tests you send, and reports its own smoke-sensor readings. It is not a certified alarm; keep your smoke and CO alarms.</Muted>
    {!device.connected ? <Button kind="outline" disabled={!device.supported} onPress={() => run(connectDevice)}>Connect USB device</Button>
      : <Button kind="outline" onPress={() => run(() => sendToDevice({ kind: 'test', text: 'FirePath test. Not an emergency.' }))}>Send a test sound</Button>}
    {device.events.length > 0 && <View style={{ marginTop: 10 }}>{device.events.map((e, i) => <Text key={i} style={{ color: color.muted, fontSize: 12 }}>{e.at} · {e.type === 'ack' ? 'device confirmed it sounded' : e.type === 'ready' ? 'device ready' : e.type === 'sensor' ? `smoke sensor ${e.active ? 'triggered' : 'clear'} (${e.value})` : e.type === 'sent' ? `sent ${e.kind}` : e.type}</Text>)}</View>}
    <ErrorText>{error}</ErrorText>
  </Collapsible>;
}

// How the pieces connect: data in -> FirePath -> people and devices, each marked Live / Prototype / Needs City.
const SYSTEMS = [
  ['Data coming in', [
    ['CAL FIRE, FEMA, CGS, DWR and USGS hazard maps', 'live', 'Dated snapshot via HackerFund\'s open Glendale GIS project'],
    ['National Weather Service alerts', 'live', 'Checked live for each registered address'],
    ['City of Glendale address list (geocoder)', 'live', 'Autocomplete and address matching'],
    ['Glendale Permits: catalog, permits, inspections, parcel', 'live', 'Public records per address'],
    ['City emergency alert feed (Everbridge)', 'city', 'Would push City alerts with steps for each household'],
    ['Evacuation zones (Genasys)', 'city', 'Would match every order to the exact address'],
    ['Dispatch (CAD) and road closures', 'city', 'Would send consented notes en route and suggest open routes'],
  ]],
  ['FirePath in the middle', [
    ['Address and parcel as the shared key', 'live', 'The same key City departments already use'],
    ['Household and business profiles with consent', 'prototype', 'Who needs help, pets, hazardous materials, contacts'],
    ['Playbook engine', 'live', 'Turns any alert or emergency into steps for this household'],
    ['Permit matcher and event packages', 'live', 'Plain words to the City permit catalog'],
  ]],
  ['Out to people and devices', [
    ['Phone and web app', 'prototype', 'Checklist, map, alerts, emergency steps'],
    ['Printed sheets on the fridge or break room', 'live', 'Custom plans that work with no power or signal'],
    ['In-home alert device (ESP32)', 'prototype', 'Sounds for drills and tests over USB today'],
    ['Responder brief', 'prototype', 'Ready for a CAD connection; nothing is sent today'],
  ]],
];
const BADGE = { live: ['LIVE', '#1D5B4D', '#E6EFE9'], prototype: ['PROTOTYPE', '#8A5A12', '#F6E6C8'], city: ['NEEDS CITY', '#2E5A88', '#EAF1F8'] };

export function Systems({ go }) {
  const device = useDevice();
  return <>
    <Link style={{ marginTop: 0 }} onPress={() => go('Home')}>← Home</Link>
    <Title style={{ marginTop: 10 }}>How FirePath connects</Title>
    <Muted>One address-keyed record links public data, your household and your devices, so every alert turns into steps for the people actually there.</Muted>
    {SYSTEMS.map(([group, items], gi) => <View key={group}>
      <Section>{group}</Section>
      {items.map(([name, status, what]) => { const [label, fg, bg] = BADGE[status]; const deviceLive = name.startsWith('In-home') && device.connected; return (
        <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: color.line }}>
          <View style={{ flex: 1 }}><Text style={{ color: color.ink, fontWeight: '700' }}>{name}</Text><Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{deviceLive ? 'Connected now over USB' : what}</Text></View>
          <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: deviceLive ? '#1D5B4D' : fg, backgroundColor: deviceLive ? '#E6EFE9' : bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' }}>{deviceLive ? 'CONNECTED' : label}</Text>
        </View>); })}
      {gi < SYSTEMS.length - 1 && <Text style={{ textAlign: 'center', color: color.green, fontSize: 20, marginTop: 8 }}>↓</Text>}
    </View>)}
    <DeviceCard />
    <Caption>Live: working now with real data. Prototype: built and demonstrable, not in production. Needs City: waits on a City data connection.</Caption>
  </>;
}


