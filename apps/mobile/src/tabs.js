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
import { AddressPanel, BusinessDetails, BusinessProfile, HouseholdForm } from './onboarding';
import { Toggle } from './ui';
import { Button, Caption, Card, Chips, CityDataCallout, ErrorText, Field, Link, Muted, ScoreBar, Section, SeverityBadge, Tag, Title, color, s } from './ui';

const EVERBRIDGE = 'https://www.glendaleca.gov/Everbridge';
const KNOW_YOUR_ZONE = 'https://www.glendaleca.gov/government/departments/fire-department/other-links/emergency-preparedness-response/know-your-zone';

function useToggle(me, onChange) {
  const [busy, setBusy] = useState(null);
  return [busy, async id => {
    setBusy(id);
    try { onChange(await api('PUT', '/api/me/tasks', { id, done: !me.done[id] })); } catch (e) { Alert.alert('Could not save', e.message); } finally { setBusy(null); }
  }];
}

export function TaskCard({ task, done, busy, onToggle }) {
  return <View style={[s.card, { flexDirection: 'row', gap: 14 }, done && { opacity: 0.62 }]}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done, busy }} accessibilityLabel={task.title} onPress={() => onToggle(task.id)} style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: color.green, backgroundColor: done ? color.green : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
      <Text style={{ color: '#FFF', fontWeight: '900' }}>{busy ? '…' : done ? '✓' : ''}</Text>
    </Pressable>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Tag tone={task.tag.startsWith('Mapped') ? 'warm' : undefined}>{task.tag}</Tag><Text style={{ color: color.gold, fontWeight: '800', fontSize: 11 }}>+{task.points}</Text></View>
      <Text style={{ color: color.ink, fontSize: 16, fontWeight: '700', marginBottom: 3, textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</Text>
      {!done && <Muted>{task.description}</Muted>}
      {!done && task.url && <Link onPress={() => Linking.openURL(task.url)}>{task.link || 'Read guidance'} ↗</Link>}
    </View>
  </View>;
}

export function Home({ me, onChange, go }) {
  const r = me.readiness;
  const [busy, toggle] = useToggle(me, onChange);
  const place = me.hazards ? summarizePlace(me.hazards) : null;
  const next = nextSteps(me.recommendations, me.done);
  return <>
    <Text style={s.muted}>{me.user.type === 'business' ? me.business?.name || 'Your business' : `Hi ${me.user.name.split(' ')[0]}`}</Text>
    <Card style={{ marginTop: 8, backgroundColor: color.green, borderColor: color.green }}>
      <Text style={{ color: '#CFE3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>READINESS</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}><Text style={{ color: '#FFF', fontSize: 44, fontWeight: '900' }}>{r.score}</Text><Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>{r.level}</Text></View>
      <View style={{ height: 10, backgroundColor: '#3E7667', borderRadius: 5, overflow: 'hidden' }}><View style={{ height: 10, width: `${r.score}%`, backgroundColor: '#F2C46D' }} /></View>
      <Text style={{ color: '#CFE3DA', fontSize: 12, marginTop: 8 }}>{r.nextLevel ? `${r.nextLevel.at - r.score} points to ${r.nextLevel.name}` : 'Every step is done. Review your plan every few months.'}</Text>
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{r.badges.map(b =>
      <View key={b.id} accessibilityLabel={`${b.title}${b.earned ? ', earned' : ', not yet earned'}`} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: b.earned ? color.goldBg : '#ECEFEA', borderWidth: 1, borderColor: b.earned ? '#E3C98E' : '#E0E5DE' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: b.earned ? color.gold : '#9AA8A2' }}>{b.earned ? '★ ' : '☆ '}{b.title}</Text>
      </View>)}</View>

    <Section>{me.user.type === 'business' ? 'What the maps show at your site' : 'What the maps show at home'}</Section>
    {!me.address ? <Card><Muted>Register your address to see which hazard maps include it.</Muted><Link onPress={() => go('Profile')}>Add your address →</Link></Card> : <>
      <Caption style={{ marginTop: 0 }}>{me.address.text} · {me.address.verified === 'mail' ? 'verified' : 'not yet verified'}</Caption>
      {place.mapped.length ? place.mapped.map(item => <View key={item.key} style={{ flexDirection: 'row', gap: 12, backgroundColor: color.warmBg, borderWidth: 1, borderColor: color.warmLine, borderRadius: 14, padding: 14, marginTop: 8 }}>
        <Text style={{ color: color.warm }}>●</Text><View style={{ flex: 1 }}><Text style={{ color: color.ink, fontWeight: '700' }}>{item.name} · {hazardSeverity(item.key, me.hazards[item.key]).label}</Text><Muted>{item.label}</Muted><Link style={{ marginTop: 6 }} onPress={() => go('Map', [item.key])}>See zones on the map →</Link></View></View>)
        : <Muted>No mapped hazard zone includes this address. That is not the same as no risk.</Muted>}
      <Caption>Planning maps, not live incidents. Not mapped here: {place.outside.map(i => i.name.toLowerCase()).join(', ') || 'none'}.</Caption>
    </>}

    <Section>Your next steps</Section>
    {next.map(task => <TaskCard key={task.id} task={task} done={false} busy={busy === task.id} onToggle={toggle} />)}
    <Link onPress={() => go('Plan')}>Search all {me.recommendations.length} recommendations →</Link>
  </>;
}

export function Actions({ me, onChange }) {
  const [q, setQ] = useState(''), [category, setCategory] = useState('all'), [status, setStatus] = useState('open');
  const [busy, toggle] = useToggle(me, onChange);
  const results = queryRecommendations(me.recommendations, { q, category, status, done: me.done });
  const complete = me.recommendations.filter(r => me.done[r.id]).length;
  return <>
    <Title>Recommendations</Title>
    <Muted>Built from your address and profile. {complete} of {me.recommendations.length} done.</Muted>
    <ScoreBar value={(complete / me.recommendations.length) * 100} />
    <Field label="Search" value={q} onChangeText={setQ} placeholder="Try “pets”, “roof”, “water”" autoCapitalize="none" />
    <Chips value={category} options={categories} onChange={setCategory} />
    <Chips value={status} options={[['open', 'To do'], ['done', 'Done'], ['all', 'All']]} onChange={setStatus} />
    {results.length ? results.map(task => <TaskCard key={task.id} task={task} done={Boolean(me.done[task.id])} busy={busy === task.id} onToggle={toggle} />)
      : <Card><Muted>No recommendations match. Try another word or filter.</Muted></Card>}
    <CityDataCallout id="permitHistory" />
    {me.hazards && describeHazard('wildfire', me.hazards.wildfire).tone === 'mapped' && <CityDataCallout id="brushClearance" />}
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
          <View style={{ flex: 1 }}><Text style={{ color: color.ink, lineHeight: 20, textDecorationLine: on ? 'line-through' : 'none' }}>{step.text}</Text><Text style={{ color: '#7A8A83', fontSize: 11, marginTop: 2 }}>{step.why}</Text></View>
        </Pressable>); })}
    </View>)}
    {drill && <Caption>{Object.keys(checked).filter(k => checked[k]).length} of {playbook.groups.reduce((n, g) => n + g.steps.length, 0)} steps walked through</Caption>}
  </View>;
}

function Drill({ me, onChange }) {
  const [event, setEvent] = useState(null), [playbook, setPlaybook] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const open = e => { setEvent(e); setPlaybook(null); setError(''); api('GET', `/api/me/playbook?event=${encodeURIComponent(e)}`).then(setPlaybook).catch(err => setError(err.message)); };
  const finish = async () => { setBusy(true); try { if (!me.done.drill) onChange(await api('PUT', '/api/me/tasks', { id: 'drill', done: true })); setEvent(null); setPlaybook(null); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <>
    <Section>Practice drill</Section>
    <Muted>Pick an alert type to see the plan FirePath would build for {me.user.type === 'business' ? 'your business' : 'your household'} if it were real.{me.done.drill ? ' You have completed a drill.' : ' Finishing one earns points.'}</Muted>
    <Chips value={event} options={drillEvents.map(e => [e, e.replace(' Warning', '').replace(' Alert', '')])} onChange={open} />
    <ErrorText>{error}</ErrorText>
    {event && !playbook && !error && <Muted style={{ marginTop: 10 }}>Building your plan…</Muted>}
    {playbook && <Card style={{ borderColor: '#E3C98E', backgroundColor: '#FFFCF3' }}>
      <Text style={{ alignSelf: 'flex-start', backgroundColor: color.goldBg, color: color.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>DRILL · NOT A REAL ALERT</Text>
      <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>If a {event} covered your address</Text>
      <Playbook playbook={playbook} drill />
      <Button busy={busy} onPress={finish}>{me.done.drill ? 'Close drill' : 'Finish drill (+15)'}</Button>
    </Card>}
  </>;
}

export function Alerts({ me, onChange }) {
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
    <Section>Live weather alerts for your address</Section>
    {!me.address ? <Muted>Register your address to see alerts that include your home.</Muted>
      : error ? <ErrorText>{error}</ErrorText>
      : !feed ? <Muted>Checking the National Weather Service…</Muted>
      : feed.unavailable ? <Card><Muted>The National Weather Service could not be reached. Check official channels directly.</Muted><Link onPress={load}>Try again</Link></Card>
      : feed.alerts.length === 0 ? <Card><Tag>No active alerts</Tag><Muted>The National Weather Service has no active alerts that include your address as of {time(feed.checkedAt)}.</Muted><Link onPress={load}>Refresh</Link></Card>
      : feed.alerts.map(a => <Card key={a.id} style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}>
          <Tag tone="warm">{a.severity} · {a.sender}</Tag>
          <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{a.event}</Text>
          <Muted style={{ marginTop: 4 }}>{a.headline}</Muted>
          {a.instruction ? <Text style={{ color: color.ink, marginTop: 8, lineHeight: 20 }}>{a.instruction}</Text> : null}
          <Caption>Until {time(a.expires)}</Caption>
          {a.playbook && <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: color.warmLine }}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>Your plan for this alert</Text><Playbook playbook={a.playbook} /></View>}
        </Card>)}
    <Caption>Source: National Weather Service (api.weather.gov). Weather alerts only: they are not City evacuation orders.</Caption>
    <Drill me={me} onChange={onChange} />

    <Section>City emergency alerts</Section>
    <Card><Tag>Official</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>Sign up with the City of Glendale</Text><Muted>Evacuation orders and City emergency messages come from the City's Everbridge system. FirePath does not receive them yet.</Muted><Link onPress={() => Linking.openURL(EVERBRIDGE)}>Sign up with the City ↗</Link><Link onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>Know your evacuation zone ↗</Link></Card>
    <CityDataCallout id="alertFeed" />
    <CityDataCallout id="evacuationZones" />
    <Card><Tag>Local test only</Tag><Muted>Sends a notification from this device to itself. It is not an emergency alert.</Muted><Button kind="outline" onPress={testNotification}>Send test notification</Button></Card>
    <Caption>For an emergency, follow official instructions. Call 911 for immediate danger.</Caption>
  </>;
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
      {result.permits.length === 0 ? <Caption>No City permit type matches. Try other words, or ask the City's Permit Services Center.</Caption> : result.permits.slice(0, 5).map(p => <Card key={p.name} style={{ marginTop: 8, padding: 14 }}>
        <Text style={{ color: color.ink, fontSize: 15, fontWeight: '800' }}>{p.name}</Text>
        {p.matched.length > 0 && <Text style={{ color: color.muted, fontSize: 13, marginTop: 4 }}>Work class: {p.matched.slice(0, 3).join(' · ')}</Text>}
        {p.hazards.includes('wildfire') && me.hazards && describeHazard('wildfire', me.hazards.wildfire).tone === 'mapped' && <Text style={{ color: color.warm, fontSize: 12, marginTop: 4 }}>Your address is in a mapped fire zone; ask about wildfire-related rules.</Text>}
      </Card>)}
      {result.licenses.length > 0 && <Caption>Matching business license types: {result.licenses.join(', ')}</Caption>}
      <Caption>Official names from the City's permit catalog (Glendale Permits, crawled {result.crawledAt?.slice(0, 10)}). Search for them when you apply.</Caption>
      <Link onPress={() => Linking.openURL(PERMIT_PORTAL)}>Open Glendale Permits ↗</Link>
    </View>}
  </>;
}

// Event planner: a few yes/no questions -> the City permits an event likely needs, with fire-zone notes.
function EventPlanner({ me }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [attendees, setAttendees] = useState(''), [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setPlan(await api('POST', '/api/me/permits/event', { name, attendees: Number(attendees) || 0, answers })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!open) return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Tag>New</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>Plan an event</Text>
    <Muted style={{ marginTop: 4 }}>{me.user.type === 'business' ? 'Hosting a sidewalk sale, tasting, festival or filming?' : 'Block party, fair or big gathering?'} Answer six questions to get the City permits you likely need.</Muted>
    <Button kind="outline" onPress={() => setOpen(true)}>Start</Button>
  </Card>;
  return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>Plan an event</Text>
    <Field label="Event name" value={name} onChangeText={setName} placeholder="e.g., Harvest fair" maxLength={100} />
    <Field label="Expected attendance" value={attendees} onChangeText={t => setAttendees(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g., 250" maxLength={7} />
    {eventQuestions.map(([key, label]) => <Toggle key={key} label={label} value={Boolean(answers[key])} onChange={v => { setPlan(null); setAnswers(current => ({ ...current, [key]: v })); }} />)}
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={build}>Get my permit list</Button>
    {plan && <View style={{ marginTop: 14 }}>
      <Tag>{`Likely City permits · ${plan.items.length}`}</Tag>
      {plan.items.map(i => <View key={`${i.type}-${i.workClass}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{i.type}{i.workClass && !i.type.includes(i.workClass) ? ` · ${i.workClass}` : ''}</Text>
        <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{i.why}</Text>
      </View>)}
      {plan.notes.map(n => <Text key={n} style={{ color: /CAL FIRE/.test(n) ? color.warm : color.ink, lineHeight: 20, marginTop: 8 }}>• {n}</Text>)}
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(plan.summary); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy summary'}</Button>
      <Button onPress={() => Linking.openURL(plan.portal)}>Apply in Glendale Permits ↗</Button>
    </View>}
    <Link onPress={() => { setOpen(false); setPlan(null); }}>Close</Link>
  </Card>;
}

export function Permits({ me, top }) {
  const [type, setType] = useState(null), [description, setDescription] = useState('');
  const [guide, setGuide] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setGuide(await api('POST', '/api/me/permits/guide', { type, description })); top?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (guide) return <>
    <Link style={{ marginTop: 0 }} onPress={() => { setGuide(null); top?.(); }}>← All projects</Link>
    <Title style={{ marginTop: 10 }}>{guide.title}</Title>
    <Card><Tag>Likely permit</Tag><Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{guide.permit}</Text></Card>
    {guide.notes.length > 0 && <Card style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}><Tag tone="warm">For your address</Tag>{guide.notes.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 20, marginTop: 6 }}>• {n}</Text>)}</Card>}
    <Card><Tag>What you'll usually need</Tag>{guide.needs.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 22 }}>☐ {n}</Text>)}</Card>
    <Card><Tag>Your project summary</Tag><Text selectable style={{ color: color.ink, fontFamily: 'Courier', fontSize: 12, lineHeight: 18 }}>{guide.summary}</Text>
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(guide.summary); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy summary'}</Button></Card>
    <Button onPress={() => Linking.openURL(PERMIT_PORTAL)}>Open Glendale Permits portal ↗</Button>
    {guide.url !== PERMIT_PORTAL && <Link onPress={() => Linking.openURL(guide.url)}>City guidance for this project ↗</Link>}
    <CityDataCallout id="permitZones" />
    <Caption>FirePath does not submit permits or guarantee requirements. The City of Glendale decides what your project needs.</Caption>
  </>;
  return <>
    <Title>Permits</Title>
    <PermitSearch me={me} />
    <EventPlanner me={me} />
    <Section>Guided projects</Section>
    <Muted>Pick a project. We'll list what the City usually asks for, flag anything your address's hazard maps change, and prepare a summary to paste into the City's portal.</Muted>
    {(me.user.type === 'business' ? businessPermitTypes : permitTypes).map(t => <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ selected: type === t.id }} onPress={() => setType(t.id)} style={[s.card, type === t.id && { borderColor: color.green, borderWidth: 2 }]}>
      <Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{t.title}</Text><Caption style={{ marginTop: 4 }}>{t.permit}</Caption>
    </Pressable>)}
    {type && <>
      <Field label="Describe the project (optional)" value={description} onChangeText={setDescription} placeholder="e.g., add a 200 sq ft bedroom at the back" multiline maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button busy={busy} onPress={build}>Get my permit checklist</Button>
    </>}
  </>;
}

export function Profile({ me, onChange, onSignOut }) {
  const [brief, setBrief] = useState(null);
  useEffect(() => { api('GET', '/api/me/responder').then(setBrief).catch(() => setBrief(null)); }, [me]);
  return <>
    <Title>{me.user.name}</Title>
    <Muted>{me.user.email}</Muted>
    <Section>Address</Section>
    <AddressPanel me={me} onChange={onChange} />
    {me.user.type === 'business' ? <><BusinessProfile me={me} onSaved={onChange} /><BusinessDetails me={me} onSaved={onChange} /></> : <HouseholdForm me={me} onSaved={onChange} />}
    <Section>What a responder would see</Section>
    <Muted>{brief?.shareWithResponders ? 'You have consented to sharing this once a City connection exists.' : 'Sharing is off. Nothing is shared today either way.'}</Muted>
    {brief && <Card><Text selectable style={{ color: color.ink, fontFamily: 'Courier', fontSize: 12, lineHeight: 18 }}>{brief.brief}</Text></Card>}
    <Button kind="outline" onPress={onSignOut}>Sign out</Button>
    <Caption>Prototype account on this demo server. Hazard results: {me.hazards ? Object.keys(hazardNames).map(k => `${hazardNames[k]} (${me.hazards[k]?._meta?.source || '?'})`).join(', ') : 'none yet'}.</Caption>
  </>;
}


export function MapTab({ me, layers, setLayers, top }) {
  const lat = me.address?.lat, lon = me.address?.lon;
  const src = `${apiBase()}/map.html?layers=${layers.join(',')}${lat ? `&lat=${lat}&lon=${lon}` : ''}`;
  const order = me.hazards ? Object.keys(hazardNames).sort((a, b) => {
    const rank = k => { const l = hazardSeverity(k, me.hazards[k]).level; return typeof l === 'number' ? -l : l === 'zone' ? -1.5 : 1; };
    return rank(a) - rank(b);
  }) : [];
  return <>
    <Title>Hazard map</Title>
    <Muted>Tap a filter on the map, or a layer below, to shade its zones across Glendale.</Muted>
    <MapFrame key={src} src={src} style={{ height: 460, borderRadius: 17, marginTop: 12, borderWidth: 1, borderColor: color.line }} />
    {me.hazards ? <>
      <Section>At your address</Section>
      {order.map(key => { const sev = hazardSeverity(key, me.hazards[key]); const meta = me.hazards[key]?._meta || {}; const on = layers.includes(key); return (
        <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setLayers([key]); top?.(); }} style={[s.card, on && { borderColor: color.green, borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>{hazardNames[key]}</Text><SeverityBadge severity={sev} /></View>
          <Muted>{describeHazard(key, me.hazards[key]).detail}</Muted>
          {sev.scale ? <Caption>{sev.scale}</Caption> : null}
          <Caption style={{ marginTop: 4 }}>{meta.source || 'Unknown source'} · checked {meta.as_of ? meta.as_of.slice(0, 10) : 'unknown'} · {on ? 'showing on map' : 'tap to show on map'}</Caption>
        </Pressable>); })}
    </> : <Card><Muted>Register your address to see how each layer rates at your home.</Muted></Card>}
    <CityDataCallout id="evacuationZones" />
    <CityDataCallout id="closures" />
  </>;
}
