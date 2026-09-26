import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import { describeHazard, hazardNames, nextSteps, summarizePlace } from './preparedness';
import { PERMIT_PORTAL, categories, permitTypes, queryRecommendations } from './readiness';
import { AddressPanel, HouseholdForm } from './onboarding';
import { Button, Caption, Card, Chips, CityDataCallout, ErrorText, Field, Link, Muted, ScoreBar, Section, Tag, Title, color, s } from './ui';

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
    <Text style={s.muted}>Hi {me.user.name.split(' ')[0]}</Text>
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

    <Section>What the maps show at home</Section>
    {!me.address ? <Card><Muted>Register your address to see which hazard maps include your home.</Muted><Link onPress={() => go('Profile')}>Add your address →</Link></Card> : <>
      <Caption style={{ marginTop: 0 }}>{me.address.text} · {me.address.verified === 'mail' ? 'verified' : 'not yet verified'}</Caption>
      {place.mapped.length ? place.mapped.map(item => <View key={item.key} style={{ flexDirection: 'row', gap: 12, backgroundColor: color.warmBg, borderWidth: 1, borderColor: color.warmLine, borderRadius: 14, padding: 14, marginTop: 8 }}>
        <Text style={{ color: color.warm }}>●</Text><View style={{ flex: 1 }}><Text style={{ color: color.ink, fontWeight: '700' }}>{item.name}</Text><Muted>{item.label}</Muted></View></View>)
        : <Muted>No mapped hazard zone includes your home. That is not the same as no risk.</Muted>}
      <Caption>Planning maps, not live incidents. Not mapped here: {place.outside.map(i => i.name.toLowerCase()).join(', ') || 'none'}.</Caption>
    </>}

    <Section>Your next steps</Section>
    {next.map(task => <TaskCard key={task.id} task={task} done={false} busy={busy === task.id} onToggle={toggle} />)}
    <Link onPress={() => go('Actions')}>Search all {me.recommendations.length} recommendations →</Link>
  </>;
}

export function Actions({ me, onChange }) {
  const [q, setQ] = useState(''), [category, setCategory] = useState('all'), [status, setStatus] = useState('open');
  const [busy, toggle] = useToggle(me, onChange);
  const results = queryRecommendations(me.recommendations, { q, category, status, done: me.done });
  const complete = me.recommendations.filter(r => me.done[r.id]).length;
  return <>
    <Title>Recommendations</Title>
    <Muted>Built from your address, household and pets. {complete} of {me.recommendations.length} done.</Muted>
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

export function Alerts({ me }) {
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
        </Card>)}
    <Caption>Source: National Weather Service (api.weather.gov). Weather alerts only: they are not City evacuation orders.</Caption>

    <Section>City emergency alerts</Section>
    <Card><Tag>Official</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>Sign up with the City of Glendale</Text><Muted>Evacuation orders and City emergency messages come from the City's Everbridge system. FirePath does not receive them yet.</Muted><Link onPress={() => Linking.openURL(EVERBRIDGE)}>Sign up with the City ↗</Link><Link onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>Know your evacuation zone ↗</Link></Card>
    <CityDataCallout id="alertFeed" />
    <CityDataCallout id="evacuationZones" />
    <Card><Tag>Local test only</Tag><Muted>Sends a notification from this device to itself. It is not an emergency alert.</Muted><Button kind="outline" onPress={testNotification}>Send test notification</Button></Card>
    <Caption>For an emergency, follow official instructions. Call 911 for immediate danger.</Caption>
  </>;
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
    <Muted>Pick a project. We'll list what the City usually asks for, flag anything your address's hazard maps change, and prepare a summary to paste into the City's portal.</Muted>
    {permitTypes.map(t => <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ selected: type === t.id }} onPress={() => setType(t.id)} style={[s.card, type === t.id && { borderColor: color.green, borderWidth: 2 }]}>
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
    <HouseholdForm me={me} onSaved={onChange} />
    <Section>What a responder would see</Section>
    <Muted>{brief?.shareWithResponders ? 'You have consented to sharing this once a City connection exists.' : 'Sharing is off. Nothing is shared today either way.'}</Muted>
    {brief && <Card><Text selectable style={{ color: color.ink, fontFamily: 'Courier', fontSize: 12, lineHeight: 18 }}>{brief.brief}</Text></Card>}
    <Button kind="outline" onPress={onSignOut}>Sign out</Button>
    <Caption>Prototype account on this demo server. Hazard results: {me.hazards ? Object.keys(hazardNames).map(k => `${hazardNames[k]} (${me.hazards[k]?._meta?.source || '?'})`).join(', ') : 'none yet'}.</Caption>
  </>;
}
