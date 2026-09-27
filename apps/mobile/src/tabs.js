import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { api, apiBase } from './api';
import MapFrame from './MapFrame';
import { describeHazard, hazardNames, nextSteps, summarizePlace } from './preparedness';
import { PERMIT_PORTAL, businessPermitTypes, hazardSeverity, permitTypes } from './readiness';
import { drillEvents } from './playbooks';
import { eventQuestions } from './permit-catalog';
import { hazardViewers, resourceGroups, RESOURCES_CHECKED } from './resources';
import { businessPosterPrintout, businessPosterTitle, householdPlanPrintout, printoutTitle, standardPrintout, standardPrintouts } from './printouts';
import { printHtml } from './print';
import { taskTitles, useI18n } from './i18n';
import { connect as connectDevice, sendToDevice, subscribe as subscribeDevice } from './device';
import { AddressCheck, CityRecords } from './landing';
import { eventTemplates, venues } from './venues';
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

export function TaskCard({ task, number, done, busy, onToggle }) {
  const { lang, t } = useI18n();
  const title = taskTitles[lang]?.[task.id] || shortTaskTitles[task.id] || task.title;
  return <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }]}>
    <Pressable accessibilityRole="checkbox" aria-checked={Boolean(done)} accessibilityState={{ checked: done, busy }} accessibilityLabel={title} onPress={() => onToggle(task.id)} style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: color.green, backgroundColor: done ? color.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontWeight: '900' }}>{busy ? '…' : done ? '✓' : ''}</Text>
    </Pressable>
    <Text style={{ flex: 1, color: done ? color.muted : color.ink, fontSize: 16, fontWeight: done ? '600' : '700', textDecorationLine: done ? 'line-through' : 'none' }}>{number ? `${number}. ` : ''}{title}</Text>
    {task.url ? <Pressable accessibilityRole="link" accessibilityLabel={t('mx.guideFor', { title })} onPress={() => Linking.openURL(task.url)} hitSlop={10}><Text style={{ color: color.green, fontSize: 18, fontWeight: '800' }}>↗</Text></Pressable> : null}
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
    <Text role="heading" aria-level={1} style={s.muted}>{me.user.type === 'business' ? me.business?.name || 'Your business' : t('home.hi', { name: me.user.name.split(' ')[0] })}</Text>
    <Card style={{ marginTop: 8, backgroundColor: color.green, borderColor: color.green, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <ProgressRing percent={r.score} track="#3E7667" fill="#F2C46D" textColor="#FFF" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#CFE3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{t('home.checklist')}</Text>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 2 }}>{t('home.done', { done, total })}</Text>
        <Text style={{ color: '#CFE3DA', fontSize: 13, marginTop: 4 }}>{done === total ? t('home.allDone') : t('home.hint')}</Text>
      </View>
    </Card>

    <Section>{t('home.next')}</Section>
    {next.map((task, i) => <TaskCard key={task.id} task={task} number={i + 1} done={false} busy={busy === task.id} onToggle={toggle} />)}
    <Link onPress={() => go('Plan')}>{t('home.seeAll', { total })}</Link>

    <Section>{t(me.user.type === 'business' ? 'home.yourSite' : 'home.yourHome')}</Section>
    {!me.address ? <Card><Muted>{t('home.noAddress')}</Muted><Link onPress={() => go('Profile', null, 'address')}>{t('home.addAddress')}</Link></Card> : <>
      <Collapsible icon="🗺" title={t('home.maps')} summary={place.mapped.length ? place.mapped.map(i => { const sev = hazardSeverity(i.key, me.hazards[i.key]); return `⚠ ${t(`hz.${i.key}`)}${typeof sev.level === 'number' ? ` ${t(`lvl.${sev.label}`) === `lvl.${sev.label}` ? sev.label : t(`lvl.${sev.label}`)}` : ''}`; }).join('   ') : t('home.noZone')}>
        <Caption>{me.address.text} · {me.address.verified === 'mail' ? 'verified' : 'not yet verified'}</Caption>
        {place.mapped.map(item => <View key={item.key} style={{ flexDirection: 'row', gap: 12, backgroundColor: color.warmBg, borderWidth: 1, borderColor: color.warmLine, borderRadius: 14, padding: 14, marginTop: 8 }}>
          <Text style={{ color: color.warm }}>●</Text><View style={{ flex: 1 }}><Text style={{ color: color.ink, fontWeight: '700' }}>{item.name} · {hazardSeverity(item.key, me.hazards[item.key]).label}</Text><Muted>{item.label}</Muted><Link style={{ marginTop: 6 }} onPress={() => go('Map', [item.key])}>See zones on the map →</Link></View></View>)}
        <Caption>{t('mx.outsideNote')}</Caption>
      </Collapsible>
      <HomeRecords me={me} />
    </>}
    <Collapsible icon="🔗" title={t('home.connects')} summary={t(me.user.type === 'business' ? 'home.connectsSite' : 'home.connectsHome')}><Muted style={{ marginTop: 10 }}>{t('mx.sources')}</Muted><Link onPress={() => go('Systems')}>{t('mx.open')}</Link></Collapsible>
    <Collapsible icon="📚" title={t('home.resources')} summary={t('home.resourcesSub')}><Resources compact /></Collapsible>
    <Pressable accessibilityRole="button" onPress={() => go('Walkthrough')} style={{ marginTop: 16, backgroundColor: '#12302A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 20, color: '#F2C46D' }}>▶</Text>
      <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: '800' }}>{t('home.tour')}</Text><Text style={{ color: '#CFE3DA', fontSize: 12, marginTop: 2 }}>{t('home.tourSub')}</Text></View>
    </Pressable>
  </>;
}

export function Actions({ me, onChange, sub, setSub }) {
  const { t } = useI18n();
  const [busy, toggle] = useToggle(me, onChange);
  const ordered = checklist(me);
  const complete = ordered.filter(r => me.done[r.id]).length;
  const steps = [...ordered.filter(t => !me.done[t.id]), ...ordered.filter(t => me.done[t.id])];
  return <>
    <Title style={{ marginBottom: 2 }}>{t('plan.title')}</Title>
    <Muted>{t('plan.done', { done: complete, total: ordered.length })}</Muted>
    <SubTabs value={sub || 'todo'} options={[['todo', t('plan.steps')], ['print', t('plan.print')]]} onChange={setSub} />
    {sub === 'print' ? <PrintSheets me={me} /> : steps.map((task, i) => <TaskCard key={task.id} task={task} number={me.done[task.id] ? null : i + 1} done={Boolean(me.done[task.id])} busy={busy === task.id} onToggle={toggle} />)}
  </>;
}

// A playbook: grouped steps, each with the reason FirePath included it. Checks are local to this view.
function Playbook({ playbook, drill }) {
  const { t } = useI18n();
  const [checked, setChecked] = useState({});
  return <View>
    {playbook.mappedHere.length > 0 && <Caption style={{ marginTop: 0 }}>{t('pb.mapped', { list: playbook.mappedHere.map(name => { const key = Object.keys(hazardNames).find(k => hazardNames[k] === name); return key ? t(`hz.${key}`) : name; }).join(', ') })}</Caption>}
    {playbook.groups.map(group => <View key={group.label} style={{ marginTop: 12 }}>
      <Tag tone={group.label === 'Do now' ? 'warm' : undefined}>{group.title || group.label}</Tag>
      {group.steps.map(step => { const key = `${group.label}:${step.text}`; const on = Boolean(checked[key]); return (
        <Pressable key={key} accessibilityRole="checkbox" aria-checked={Boolean(on)} accessibilityState={{ checked: on }} onPress={() => setChecked(current => ({ ...current, [key]: !current[key] }))} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
          <Text style={{ width: 22, color: color.green, fontWeight: '900', fontSize: 16 }}>{on ? '☑' : '☐'}</Text>
          <View style={{ flex: 1 }}><Text style={{ color: color.ink, lineHeight: 20, textDecorationLine: on ? 'line-through' : 'none' }}>{step.text}</Text></View>
        </Pressable>); })}
    </View>)}
    {drill && <Caption>{t('pb.walked', { done: Object.keys(checked).filter(k => checked[k]).length, total: playbook.groups.reduce((n, g) => n + g.steps.length, 0) })}</Caption>}
  </View>;
}

function Drill({ me, onChange }) {
  const { t, lang } = useI18n();
  const device = useDevice();
  const [event, setEvent] = useState(null), [playbook, setPlaybook] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [practiced, setPracticed] = useState({});
  const open = e => { setEvent(e); setPlaybook(null); setPracticed({}); setError(''); if (e) api('GET', `/api/me/playbook?event=${encodeURIComponent(e)}&lang=${lang}`).then(setPlaybook).catch(err => setError(err.message)); };
  const practiceSteps = playbook ? [
    ...(playbook.groups.find(g => g.label === 'Do now')?.steps.slice(0, 2) || []),
    ...(playbook.groups.find(g => g.label === 'Check on')?.steps.slice(0, 1) || []),
    ...(playbook.groups.find(g => g.label === 'Before you leave')?.steps.slice(0, 1) || []),
  ].slice(0, 4) : [];
  const practicedCount = practiceSteps.filter((_, i) => practiced[i]).length;
  const finish = async () => { setBusy(true); try { if (!me.done.drill) onChange(await api('PUT', '/api/me/tasks', { id: 'drill', done: true })); setEvent(null); setPlaybook(null); setPracticed({}); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <>
    <Muted>{t('dr.intro')}</Muted>
    <Select label={t('dr.pick')} placeholder={t('dr.choose')} value={event} options={drillEvents.map(e => [e, t(`evs.${e}`)])} onChange={open} />
    <ErrorText>{error}</ErrorText>
    {event && !playbook && !error && <Muted style={{ marginTop: 10 }}>{t('dr.preparing')}</Muted>}
    {playbook && <Card style={{ borderColor: '#E3C98E', backgroundColor: '#FFFCF3' }}>
      <Text style={{ alignSelf: 'flex-start', backgroundColor: color.goldBg, color: color.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>{t('dr.badge')}</Text>
      <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{t('dr.imagine', { event: t(`ev.${event}`) === `ev.${event}` ? event : t(`ev.${event}`) })}</Text>
      <Muted style={{ marginTop: 6 }}>{t('dr.practice', { n: practiceSteps.length })}</Muted>
      {practiceSteps.map((step, i) => <Pressable key={`${i}-${step.text}`} accessibilityRole="checkbox" aria-checked={Boolean(Boolean(practiced[i]))} accessibilityState={{ checked: Boolean(practiced[i]) }} onPress={() => setPracticed(current => ({ ...current, [i]: !current[i] }))} style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ width: 26, fontSize: 18, color: color.green, fontWeight: '900' }}>{practiced[i] ? '☑' : '☐'}</Text><Text style={{ flex: 1, color: color.ink, lineHeight: 21 }}>{step.text}</Text>
      </Pressable>)}
      <Caption>{t('dr.count', { done: practicedCount, total: practiceSteps.length })}</Caption>
      <Collapsible title={t('dr.fullPlan')} summary={t('dr.fullPlanSub')}><Playbook playbook={playbook} /></Collapsible>
      {device.connected && <Button kind="outline" onPress={() => sendToDevice({ kind: 'drill', hazard: playbook.kind, severity: 'drill', text: `DRILL: ${event}. Not a real alert.` }).catch(e => setError(e.message))}>Sound the in-home device</Button>}
      <Button busy={busy} disabled={practicedCount < practiceSteps.length || !practiceSteps.length} onPress={finish}>{t(me.done.drill ? 'dr.close' : 'dr.finish')}</Button>
    </Card>}
  </>;
}

export function Alerts({ me, onChange, sub, setSub }) {
  const { t } = useI18n();
  const [feed, setFeed] = useState(null), [error, setError] = useState('');
  const { lang } = useI18n();
  const load = () => { setError(''); setFeed(null); api('GET', `/api/me/alerts?lang=${lang}`).then(setFeed).catch(e => setError(e.message)); };
  useEffect(load, [me.address?.lat, lang]);
  async function testNotification() {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Notifications off', 'Enable notifications in device settings to try the local test.');
      await Notifications.scheduleNotificationAsync({ content: { title: 'FirePath test', body: 'This is a local test, not an emergency alert.', data: { demo: true } }, trigger: null });
    } catch (e) { Alert.alert('Notification unavailable', String(e?.message || e)); }
  }
  const time = iso => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  return <>
    <Title>{t('al.title')}</Title>
    <SubTabs value={sub || 'live'} options={[['live', t('al.live')], ['drill', t('al.drill')], ['devices', t('al.devices')]]} onChange={setSub} />
    {(sub || 'live') === 'live' && <>
      {!me.address ? <Muted style={{ marginTop: 12 }}>{t('al.noAddress')}</Muted>
        : error ? <ErrorText>{error}</ErrorText>
        : !feed ? <Muted style={{ marginTop: 12 }}>{t('al.checking')}</Muted>
        : feed.unavailable ? <Card><Muted>{t('mx.nwsDown')}</Muted><Link onPress={load}>{t('mx.retry')}</Link></Card>
        : feed.alerts.length === 0 ? <Card><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>{t('al.none')}</Text><Caption>{t('al.checked', { time: time(feed.checkedAt) })}</Caption><Link onPress={load}>{t('al.refresh')}</Link></Card>
        : feed.alerts.map(a => <Card key={a.id} style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}>
            <Tag tone="warm">{a.severity} · {a.sender}</Tag>
            <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{t(`ev.${a.event}`) === `ev.${a.event}` ? a.event : t(`ev.${a.event}`)}</Text>
            <Muted style={{ marginTop: 4 }}>{a.headline}</Muted>
            {a.instruction ? <Text style={{ color: color.ink, marginTop: 8, lineHeight: 20 }}>{a.instruction}</Text> : null}
            <Caption>Until {time(a.expires)}</Caption>
            {a.playbook && <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: color.warmLine }}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>{t('mx.alertPlan')}</Text><Playbook playbook={a.playbook} /></View>}
          </Card>)}
      <Card><Tag>{t('al.official')}</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>{t('al.cityOrders')}</Text><Muted>{t('al.cityOrdersSub')}</Muted><Link onPress={() => Linking.openURL(EVERBRIDGE)}>{t('al.signup')}</Link><Link onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>{t('al.zone')}</Link></Card>
      <Collapsible icon="🧩" title={t('mx.cityAdds')} summary={t('mx.liveOrders')}><CityDataCallout id="alertFeed" /><CityDataCallout id="evacuationZones" /></Collapsible>
      <Caption>{t('al.call911')}</Caption>
    </>}
    {sub === 'drill' && <Drill me={me} onChange={onChange} />}
    {sub === 'devices' && <>
      <DeviceCard initiallyOpen />
      <Card><Tag>{t('nt.tag')}</Tag><Muted>{t('nt.sub')}</Muted><Button kind="outline" onPress={testNotification}>{t('nt.btn')}</Button></Card>
    </>}
  </>;
}

const CITY_FEE_SCHEDULE = 'https://www.glendaleca.gov/government/departments/finance/revenue/citywide-fee-schedule';
const withPermitPricing = (summary, outside = false) => `${summary}\n\nPermit pricing: City fees depend on project scope; request a quote before budgeting. Check the current Citywide Fee Schedule: ${CITY_FEE_SCHEDULE}${outside ? '\nOther-agency fees: confirm directly with each issuing agency.' : ''}`;

// The public catalog has permit names and work classes, not a final fee for every project.
function PermitPrice({ otherAgency = false }) {
  const { t } = useI18n();
  return <Text style={{ color: color.gold, fontSize: 12, fontWeight: '700', marginTop: 5 }}>
    {t(otherAgency ? 'pz.priceAgency' : 'pz.priceCity')}
  </Text>;
}
function FeeGuide() {
  const { t } = useI18n();
  return <Collapsible icon="💲" title={t('pm.cost')} summary={t('pm.costSub')}>
    <Muted style={{ marginTop: 8 }}>{t('pz.feeText')}</Muted>
    <Link onPress={() => Linking.openURL(CITY_FEE_SCHEDULE)}>{t('pz.feeLink')}</Link>
  </Collapsible>;
}

// Plain-language search across the City of Glendale's full permit catalog (crawled from Glendale Permits).
function PermitSearch({ me }) {
  const { t } = useI18n();
  const [q, setQ] = useState(''), [result, setResult] = useState(null);
  const audience = me.user.type === 'business' ? 'business' : 'resident';
  useEffect(() => {
    if (q.trim().length < 3) { setResult(null); return; }
    const timer = setTimeout(() => api('GET', `/api/permits/search?q=${encodeURIComponent(q)}&audience=${audience}`).then(setResult).catch(() => setResult(null)), 250);
    return () => clearTimeout(timer);
  }, [q]);
  return <>
    <Field label={t('pm.planning')} hint={t('pz.searchHint')} value={q} onChangeText={setQ} placeholder={audience === 'business' ? 'e.g., outdoor dining, block party, sign, propane' : 'e.g., new roof, ADU, solar, remove an oak tree'} autoCapitalize="none" />
    {result && <View>
      <FeeGuide />
      {result.permits.length === 0 ? <Caption>{t('mx.noPermit')}</Caption> : result.permits.slice(0, 5).map(p => <Card key={p.name} style={{ marginTop: 8, padding: 14 }}>
        <Text style={{ color: color.ink, fontSize: 15, fontWeight: '800' }}>{p.name}</Text><PermitPrice />
        {p.matched.length > 0 && <Text style={{ color: color.muted, fontSize: 13, marginTop: 4 }}>{t('pz.workClass', { list: p.matched.slice(0, 3).join(' · ') })}</Text>}
        {p.hazards.includes('wildfire') && me.hazards && describeHazard('wildfire', me.hazards.wildfire).tone === 'mapped' && <Text style={{ color: color.warm, fontSize: 12, marginTop: 4 }}>{t('pz.fireZone')}</Text>}
      </Card>)}
      {result.licenses.length > 0 && <><Caption>{t('pz.licenses', { list: result.licenses.join(', ') })}</Caption><PermitPrice /></>}
      <Caption>{t('pz.official', { date: result.crawledAt?.slice(0, 10) })}</Caption>
      <Link onPress={() => Linking.openURL(PERMIT_PORTAL)}>{t('pz.openPortal')}</Link>
    </View>}
  </>;
}

// Event planner: a few yes/no questions -> the City permits an event likely needs, with fire-zone notes.
function EventPlanner({ me }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [attendees, setAttendees] = useState(''), [answers, setAnswers] = useState({});
  const [plan, setPlan] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const [where, setWhere] = useState('mine'), [location, setLocation] = useState(''), [locationKey, setLocationKey] = useState(null);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setPlan(await api('POST', '/api/me/permits/event', { name, attendees: Number(attendees) || 0, answers, ...(where === 'other' ? { location, magicKey: locationKey } : {}) })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!open) return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Tag>{t('pz.new')}</Tag><Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>{t('pz.planEvent')}</Text>
    <Muted style={{ marginTop: 4 }}>{t(me.user.type === 'business' ? 'pz.introBiz' : 'pz.introHome')}</Muted>
    <Button kind="outline" onPress={() => setOpen(true)}>{t('pz.start')}</Button>
  </Card>;
  return <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
    <Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>{t('pz.planEvent')}</Text>
    <Field label={t('pz.eventName')} value={name} onChangeText={setName} placeholder={t('pz.eventNamePh')} maxLength={100} />
    <Select label={t('pz.where')} value={where} options={[['mine', t(me.user.type === 'business' ? 'pz.atBiz' : 'pz.atHome')], ['other', t('pz.other')]]} onChange={v => { setPlan(null); setWhere(v); }} />
    {where === 'other' && <AddressSearch label={t('pz.eventAddr')} value={location} onChangeText={t => { setLocation(t); setLocationKey(null); setPlan(null); }} onPick={(t, key) => { setLocation(t); setLocationKey(key); }} onSubmit={() => {}} suggestPath="/api/public/suggest" />}
    <Field label={t('pz.attendance')} value={attendees} onChangeText={t => setAttendees(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="250" maxLength={7} />
    {eventQuestions.map(([key, label]) => <Toggle key={key} label={t(`eq.${key}`)} value={Boolean(answers[key])} onChange={v => { setPlan(null); setAnswers(current => ({ ...current, [key]: v })); }} />)}
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={build}>{t('pz.getList')}</Button>
    {plan && <View style={{ marginTop: 14 }}>
      <Caption style={{ marginTop: 0 }}>{t('pz.location', { place: plan.location })}</Caption>
      <Tag>{t('pz.likely', { n: plan.items.length })}</Tag><FeeGuide />
      {plan.items.map(i => <View key={`${i.type}-${i.workClass}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{i.type}{i.workClass && !i.type.includes(i.workClass) ? ` · ${i.workClass}` : ''}</Text><PermitPrice />
        <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{i.why}</Text>
      </View>)}
      {plan.notes.map(n => <Text key={n} style={{ color: /CAL FIRE/.test(n) ? color.warm : color.ink, lineHeight: 20, marginTop: 8 }}>• {n}</Text>)}
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(plan.summary)); setCopied(true); }}>{copied ? t('pz.copied') : t('pz.copy')}</Button>
      <Button onPress={() => Linking.openURL(plan.portal)}>{t('pz.apply')}</Button>
    </View>}
    <Link onPress={() => { setOpen(false); setPlan(null); }}>{t('pz.close')}</Link>
  </Card>;
}

// City event venues with pre-set permit packages (example configuration; see src/venues.js).
const VENUE_QUESTIONS = [['commercial', 'Ticketed or run by a business'], ['tents', 'Tents, booths or a stage'], ['food', 'Food vendors'], ['flame', 'Cooking or open flame'], ['alcohol', 'Alcohol served'], ['sound', 'Amplified sound or music'], ['filming', 'Commercial filming']];
const HOURS = Array.from({ length: 36 }, (_, i) => { const h = 6 + Math.floor(i / 2), m = i % 2 ? '30' : '00'; const v = `${String(h).padStart(2, '0')}:${m}`; return [v, `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`]; });

function VenuePlanner({ me }) {
  const { t: tr } = useI18n();
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
    <Tag>{tr('pz.venueTag')}</Tag>
    <Text style={{ color: color.ink, fontSize: 17, fontWeight: '800' }}>{tr('pz.venueTitle')}</Text>
    <Muted style={{ marginTop: 4 }}>{tr('pz.venueIntro')}</Muted>
    <Select label={tr('pz.venue')} value={venueId} placeholder={tr('pz.chooseVenue')} options={venues.map(v => [v.id, v.name])} onChange={id => { setVenueId(id); setPkg(null); }} />
    {venue && <Caption>{venue.where}. {venue.about}</Caption>}
    {venue && <>
      <Select label={tr('pz.eventType')} value={templateId} placeholder={tr('pz.chooseStart')} options={eventTemplates.map(t => [t.id, t.name])} onChange={useTemplate} />
      <Field label={tr('pz.eventName')} value={form.name} onChangeText={name => set({ name })} placeholder={tr('pz.venueNamePh')} maxLength={100} />
      <Field label={tr('pz.date')} hint="YYYY-MM-DD" value={form.date} onChangeText={date => set({ date: date.replace(/[^\d-]/g, '') })} placeholder="2026-10-17" maxLength={10} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Select label={tr('pz.starts')} value={form.start} options={HOURS} onChange={start => set({ start })} /></View>
        <View style={{ flex: 1 }}><Select label={tr('pz.ends')} value={form.end} options={HOURS} onChange={end => set({ end })} /></View>
      </View>
      <Field label={tr('pz.attendance')} value={form.attendees} onChangeText={t => set({ attendees: t.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="800" maxLength={7} />
      {VENUE_QUESTIONS.map(([key]) => <Toggle key={key} label={tr(`vq.${key}`)} value={Boolean(form.answers[key])} onChange={v => set({ answers: { ...form.answers, [key]: v } })} />)}
      <ErrorText>{error}</ErrorText>
      <Button busy={busy} onPress={build}>{tr('pz.buildPkg')}</Button>
    </>}
    {pkg && <View style={{ marginTop: 16 }}>
      <Text style={{ color: color.ink, fontSize: 18, fontWeight: '800' }}>{form.name || tr('pz.yourEvent')} · {pkg.venue.name}</Text>
      <Tag>{tr('pz.cityPermits', { n: pkg.items.length })}</Tag><FeeGuide />
      {pkg.items.map(i => <View key={`${i.type}-${i.workClass}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{i.type}{i.workClass && !i.type.includes(i.workClass) ? ` · ${i.workClass}` : ''}</Text><PermitPrice />
        <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{i.why}</Text>
      </View>)}
      {pkg.outside.length > 0 && <><Text style={[s.tag, { marginTop: 14 }]}>{tr('pz.otherAgencies')}</Text>
        {pkg.outside.map(o => <Pressable key={o.name} accessibilityRole="link" onPress={() => Linking.openURL(o.url)} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: color.line }}>
          <Text style={{ color: '#086B56', fontWeight: '700' }}>{o.name} ↗</Text><PermitPrice otherAgency /><Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{o.who}. {o.why}</Text>
        </Pressable>)}</>}
      <Text style={[s.tag, { marginTop: 14 }]}>{tr('pz.timeline')}</Text>
      {pkg.timeline.map(t => <View key={t.when + t.what} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}><Text style={{ width: 110, color: color.green, fontWeight: '800', fontSize: 12 }}>{t.when}</Text><Text style={{ flex: 1, color: color.ink }}>{t.what}</Text></View>)}
      {pkg.notes.map(n => <Text key={n} style={{ color: /CAL FIRE/.test(n) ? color.warm : color.ink, lineHeight: 20, marginTop: 8 }}>• {n}</Text>)}
      <View style={s.callout}><Text style={s.calloutTag}>{tr('pz.examplePkg')}</Text><Text style={s.calloutText}>{tr('pz.venueNote')}</Text></View>
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(pkg.summary, pkg.outside.length > 0)); setCopied(true); }}>{copied ? tr('pz.copied') : tr('pz.copyPkg')}</Button>
      <Button onPress={() => Linking.openURL(pkg.portal)}>{tr('pz.apply')}</Button>
    </View>}
  </Card>;
}

export function Permits({ me, top, sub, setSub }) {
  const { t } = useI18n();
  const [type, setType] = useState(null), [description, setDescription] = useState('');
  const projectTitle = (id, fallback) => { const k = `${me.user.type === 'business' ? 'ptb' : 'ptr'}.${id}`; return t(k) === k ? fallback : t(k); };
  const [guide, setGuide] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  async function build() {
    setBusy(true); setError(''); setCopied(false);
    try { setGuide(await api('POST', '/api/me/permits/guide', { type, description })); top?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (guide) return <>
    <Link style={{ marginTop: 0 }} onPress={() => { setGuide(null); top?.(); }}>{t('pz.allProjects')}</Link>
    <Title style={{ marginTop: 10 }}>{projectTitle(type, guide.title)}</Title>
    <Card><Tag>{t('pz.likelyPermit')}</Tag><Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{guide.permit}</Text><PermitPrice /></Card>
    <FeeGuide />
    {guide.notes.length > 0 && <Card style={{ borderColor: color.warmLine, backgroundColor: color.warmBg }}><Tag tone="warm">{t('pz.forAddress')}</Tag>{guide.notes.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 20, marginTop: 6 }}>• {n}</Text>)}</Card>}
    <Card><Tag>{t('pz.needs')}</Tag>{guide.needs.map(n => <Text key={n} style={{ color: color.ink, lineHeight: 22 }}>☐ {n}</Text>)}</Card>
    <Card><Tag>{t('pz.summary')}</Tag>{t('pz.summaryNote') ? <Caption style={{ marginTop: 0 }}>{t('pz.summaryNote')}</Caption> : null}<Text selectable style={{ color: color.ink, fontFamily: 'Courier', fontSize: 12, lineHeight: 18 }}>{withPermitPricing(guide.summary)}</Text>
      <Button kind="outline" onPress={async () => { await Clipboard.setStringAsync(withPermitPricing(guide.summary)); setCopied(true); }}>{copied ? t('pz.copied') : t('pz.copy')}</Button></Card>
    <Button onPress={() => Linking.openURL(PERMIT_PORTAL)}>{t('pz.openPortal2')}</Button>
    {guide.url !== PERMIT_PORTAL && <Link onPress={() => Linking.openURL(guide.url)}>{t('pz.guidance')}</Link>}
    <CityDataCallout id="permitZones" />
    <Caption>{t('pz.disclaimer')}</Caption>
  </>;
  return <>
    <Title>{t('pm.title')}</Title>
    <SubTabs value={sub || 'search'} options={[['search', t('pm.search')], ['events', t('pm.events')], ['projects', t('pm.projects')]]} onChange={setSub} />
    {(sub || 'search') === 'search' && <PermitSearch me={me} />}
    {sub === 'events' && <><VenuePlanner me={me} /><EventPlanner me={me} /></>}
    {sub === 'projects' && <>
    <Muted style={{ marginTop: 12 }}>{t('pm.pick')}</Muted>
    <Select label={t('pm.project')} value={type} placeholder={t('pm.choose')} options={(me.user.type === 'business' ? businessPermitTypes : permitTypes).map(p => [p.id, projectTitle(p.id, p.title)])} onChange={v => { setType(v); setGuide(null); }} />
    {type && <>
      <Card><Text style={{ color: color.ink, fontWeight: '700' }}>{(me.user.type === 'business' ? businessPermitTypes : permitTypes).find(t => t.id === type)?.permit}</Text><PermitPrice /></Card>
      <Field label={t('pz.describe')} value={description} onChangeText={setDescription} placeholder={t('pz.describePh')} multiline maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button busy={busy} onPress={build}>{t('pm.checklist')}</Button>
    </>}
    </>}
    <FeeGuide />
  </>;
}

// The responder brief as label/value rows for reading. The brief text itself is unchanged.
const BRIEF_LABELS = [[/^Address status/, 'Address'], [/^Location/, 'Location'], [/^Parcel/, 'Parcel'], [/^Usual occupants/, 'People'], [/^Animals/, 'Animals'], [/^Assistance/, 'Needs help'], [/^Access/, 'Access'], [/^Utility/, 'Shutoffs'], [/wildfire zone/i, 'Wildfire map'], [/permit fire zone/i, 'Fire-code zone'], [/updated/i, 'Updated']];
function briefRows(text) {
  return String(text || '').split(/\n+/).filter(line => line.includes(': ')).map(line => {
    const [raw, ...rest] = line.split(': ');
    let value = rest.join(': ');
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) value = new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return [(BRIEF_LABELS.find(([re]) => re.test(raw)) || [null, raw.replace(/\s*\(.*?\)\s*/g, '')])[1], value];
  });
}

export function Profile({ me, onChange, onSignOut, sub, setSub }) {
  const { t } = useI18n();
  const [brief, setBrief] = useState(null);
  useEffect(() => { api('GET', '/api/me/responder').then(setBrief).catch(() => setBrief(null)); }, [me]);
  const tab = sub || 'household';
  return <>
    <Title>{me.user.name}</Title>
    <Muted>{me.user.demo ? t('pr.demo') : me.user.email}</Muted>
    <SubTabs value={tab} options={[['household', t(me.user.type === 'business' ? 'pr.business' : 'pr.household')], ['address', t('pr.address')], ['responders', t('pr.responders')], ['settings', t('pr.settings')]]} onChange={setSub} />
    {tab === 'settings' && <><LanguageSettings /><Caption>{t('pr.langNote')}</Caption></>}
    {tab === 'household' && (me.user.type === 'business' ? <><BusinessProfile me={me} onSaved={onChange} /><BusinessDetails me={me} onSaved={onChange} /></> : <HouseholdForm me={me} onSaved={onChange} />)}
    {tab === 'address' && <View style={{ marginTop: 8 }}><AddressPanel me={me} onChange={onChange} /></View>}
    {tab === 'responders' && <>
      <Muted style={{ marginTop: 12 }}>{t(brief?.shareWithResponders ? 'pr.shareOn' : 'pr.shareOff')}</Muted>
      {brief && <Card><Tag>{t('pr.preview')}</Tag><Caption style={{ marginTop: 0 }}>{t('pz.briefDraft')}</Caption>{briefRows(brief.brief).map(([label, value], i) => <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: color.line }}>
        <Text style={{ width: 104, color: color.muted, fontSize: 13, fontWeight: '700' }}>{t(`br.${label}`) === `br.${label}` ? label : t(`br.${label}`)}</Text><Text selectable style={{ flex: 1, color: color.ink, fontSize: 14, lineHeight: 20 }}>{value}</Text>
      </View>)}</Card>}
      <CityDataCallout id="cad" />
    </>}
    <Button kind="outline" onPress={onSignOut} style={{ marginTop: 28 }}>{t('pr.signout')}</Button>
    <Caption>{t(me.user.demo ? 'pr.demoAcct' : 'pr.protoAcct')}</Caption>
  </>;
}


export function MapTab({ me, layers, setLayers, top }) {
  const { t } = useI18n();
  const lvl = l => (t(`lvl.${l}`) === `lvl.${l}` ? l : t(`lvl.${l}`));
  const lat = me.address?.lat, lon = me.address?.lon;
  const [view3d, setView3d] = useState(false);
  const { lang } = useI18n();
  const src = `${apiBase()}/${view3d ? 'map3d' : 'map'}.html?lang=${lang}&layers=${layers.join(',')}${lat ? `&lat=${lat}&lon=${lon}` : ''}`;
  const order = me.hazards ? Object.keys(hazardNames).sort((a, b) => {
    const rank = k => { const l = hazardSeverity(k, me.hazards[k]).level; return typeof l === 'number' ? -l : l === 'zone' ? -1.5 : 1; };
    return rank(a) - rank(b);
  }) : [];
  const [other, setOther] = useState(false);
  const mode = <Select label={t('map.address')} value={other ? 'other' : 'mine'} options={[['mine', t(me.user.type === 'business' ? 'map.mineBiz' : 'map.mine')], ['other', t('map.other')]]} onChange={v => setOther(v === 'other')} />;
  if (other) return <>
    <Title>{t('map.otherTitle')}</Title>
    {mode}
    <Muted style={{ marginTop: 10 }}>{t('map.otherSub')}</Muted>
    <AddressCheck showPreview={false} />
  </>;
  return <>
    <Title>{t('map.title')}</Title>
    {mode}
    <MapFrame key={src} src={src} style={{ height: 560, borderRadius: 17, marginTop: 12, borderWidth: 1, borderColor: color.line }} />
    <Select label={t('map.view')} value={view3d ? '3d' : '2d'} options={[['2d', t('map.flat')], ['3d', t('map.3d')]]} onChange={v => setView3d(v === '3d')} />
    <Caption>{t('map.caption')}</Caption>
    {me.hazards ? <>
      <Collapsible icon="🗺" title={t('map.atAddress')} summary={t('map.count', { n: order.filter(k => describeHazard(k, me.hazards[k]).tone === 'mapped').length, total: order.length })}>
      {order.map(key => { const sev = hazardSeverity(key, me.hazards[key]); const meta = me.hazards[key]?._meta || {}; const on = layers.includes(key); return (
        <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setLayers([key]); top?.(); }} style={[s.card, on && { borderColor: color.green, borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: color.ink, fontSize: 15, fontWeight: '800' }}>{t(`hz.${key}`)}</Text><Text style={{ color: describeHazard(key, me.hazards[key]).tone === 'mapped' ? color.warm : color.muted, fontWeight: '800', fontSize: 12 }}>{describeHazard(key, me.hazards[key]).tone === 'mapped' ? `⚠ ${typeof sev.level === 'number' ? lvl(sev.label) : t('map.inZone')}` : describeHazard(key, me.hazards[key]).tone === 'unknown' ? `? ${t('map.unavailable')}` : `○ ${t('map.outside')}`}</Text></View>
          {hazardViewers[key] && <Link style={{ marginTop: 6 }} onPress={() => Linking.openURL(hazardViewers[key].url)}>{t('map.official', { name: hazardViewers[key].name })}</Link>}
        </Pressable>); })}
      </Collapsible>
    </> : <Card><Muted>{t('map.noAddress')}</Muted></Card>}
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
  const { t, lang } = useI18n();
  const [error, setError] = useState('');
  const business = me.user.type === 'business';
  const run = async html => { setError(''); try { await printHtml(html); } catch (e) { setError(e.message); } };
  const custom = () => business
    ? businessPosterPrintout({ business: me.business, address: me.address?.text, hazards: me.hazards, name: me.user.name }, { lang, t })
    : householdPlanPrintout({ name: me.user.name, address: me.address?.text, hazards: me.hazards, household: me.household }, { lang, t });
  return <>
    <Muted style={{ marginTop: 12 }}>{t('plan.printIntro')}</Muted>
    <Card style={{ borderColor: color.green, borderWidth: 1.5 }}>
      <Tag>{t('plan.madeForYou')}</Tag>
      <Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>{business ? businessPosterTitle(me.business?.name, lang) : t('plan.ours')}</Text>
      <Button onPress={() => run(custom())}>{t('plan.printBtn')}</Button>
    </Card>
    {standardPrintouts.map(d => <View key={d.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
      <Text style={{ color: color.ink, fontWeight: '700', flex: 1 }}>{printoutTitle(d.id, lang)}</Text>
      <Pressable accessibilityRole="button" onPress={() => run(standardPrintout(d.id, { lang }))} style={{ borderWidth: 1.5, borderColor: color.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: color.green, fontWeight: '800' }}>{t('plan.printBtn')}</Text></Pressable>
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
  const { t } = useI18n();
  const device = useDevice();
  const [error, setError] = useState('');
  const run = async fn => { setError(''); try { await fn(); } catch (e) { if (e?.name !== 'NotFoundError') setError(e.message); } };
  const last = device.events[0];
  return <Collapsible icon="📟" initiallyOpen={initiallyOpen} title={t('dv.title')} summary={device.connected ? `${t('dv.connected')}${last ? ` · last: ${last.type}${last.kind ? ` (${last.kind})` : ''}` : ''}` : t(device.supported ? 'dv.notConnected' : 'dv.unsupported')}>
    <Muted style={{ marginTop: 10 }}>{t('dv.intro')}</Muted>
    {!device.connected ? <Button kind="outline" disabled={!device.supported} onPress={() => run(connectDevice)}>{t('dv.connect')}</Button>
      : <Button kind="outline" onPress={() => run(() => sendToDevice({ kind: 'test', text: 'FirePath test. Not an emergency.' }))}>{t('dv.test')}</Button>}
    {device.events.length > 0 && <View style={{ marginTop: 10 }}>{device.events.map((e, i) => <Text key={i} style={{ color: color.muted, fontSize: 12 }}>{e.at} · {e.type === 'ack' ? t('dv.ack') : e.type === 'ready' ? t('dv.ready') : e.type === 'sensor' ? t(e.active ? 'dv.smokeOn' : 'dv.smokeOff', { value: e.value }) : e.type === 'sent' ? t('dv.sent', { kind: e.kind }) : e.type}</Text>)}</View>}
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


