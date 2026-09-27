import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, saveSession } from './api';
import { summarizePlace } from './preparedness';
import { businessKinds, hazmatKinds } from './readiness';
import MapPanel from './MapPanel';
import { useI18n } from './i18n';
import { Button, Caption, Card, CityDataCallout, Collapsible, ErrorText, Field, Link, Muted, PrivacyNote, Section, Segment, Select, Step, Tag, Title, Toggle, color, s } from './ui';

export function Auth({ onSignedIn, initialMode = 'signup', initialType = 'resident' }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', type: initialType, businessName: '', businessKind: null });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = patch => setForm(current => ({ ...current, ...patch }));
  async function submit() {
    if (mode === 'signup' && form.type === 'business' && (!form.businessName.trim() || !form.businessKind)) return setError(t('au.bizMissing'));
    setBusy(true); setError('');
    try {
      const result = await api('POST', mode === 'signup' ? '/api/account/signup' : '/api/account/login', mode === 'signup' ? form : { email: form.email, password: form.password });
      await saveSession(result.token);
      onSignedIn(result, mode === 'signup');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green }}>FIREPATH</Text>
    <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: color.ink, marginTop: 16, marginBottom: 6 }}>{t(mode === 'signup' ? 'au.create' : 'au.welcome')}</Text>
    <Muted>{t(mode === 'signup' ? 'au.createSub' : 'au.loginSub')}</Muted>
    {mode === 'signup' && <Select label={t('au.settingUp')} value={form.type} options={[['resident', t('au.myHome')], ['business', t('au.aBusiness')]]} onChange={type => set({ type })} />}
    {mode === 'signup' && form.type === 'business' && <>
      <Field label={t('au.bizName')} value={form.businessName} onChangeText={businessName => set({ businessName })} placeholder={t('bz.namePh')} maxLength={100} />
      <Select label={t('au.bizType')} value={form.businessKind} options={businessKinds.map(([k]) => [k, t(`bk.${k}`)])} placeholder={t('au.chooseOne')} onChange={businessKind => set({ businessKind })} />
    </>}
    {mode === 'signup' && <Field label={t(form.type === 'business' ? 'au.nameKey' : 'au.name')} value={form.name} onChangeText={name => set({ name })} placeholder={t('au.namePh')} autoComplete="name" maxLength={80} />}
    <Field label={t('au.email')} value={form.email} onChangeText={email => set({ email })} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={200} />
    <Field label={t('au.password')} hint={mode === 'signup' ? t('au.pwHint') : null} value={form.password} onChangeText={password => set({ password })} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onSubmitEditing={submit} maxLength={200} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={submit}>{t(mode === 'signup' ? 'au.createBtn' : 'au.signIn')}</Button>
    <Link onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>{t(mode === 'signup' ? 'au.toLogin' : 'au.toSignup')}</Link>
    <Caption>{t('au.proto')}</Caption>
    {mode === 'signup' && <PrivacyNote />}
  </>;
}

export function AboutYou({ me, onSaved }) {
  const { t } = useI18n();
  const h = me.household || {};
  const [form, setForm] = useState({ housing: h.housing || 'own', homeType: h.homeType || 'house', members: h.members || [] });
  const [member, setMember] = useState({ name: '', ageGroup: 'adult', needsHelp: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const addMember = () => { if (!member.name.trim()) return; setForm({ ...form, members: [...form.members, { ...member, name: member.name.trim() }] }); setMember({ name: '', ageGroup: 'adult', needsHelp: false }); };
  async function save() {
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/household', { ...h, ...form })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const ages = { child: t('ab.child'), adult: t('ab.adult'), senior: t('ab.senior') };
  return <>
    <Step n={1} of={3} label={t('ab.step')} />
    <Title>{t('ab.title', { name: me.user.name.split(' ')[0] })}</Title>
    <Muted>{t('ab.intro')}</Muted>
    <Text style={[s.fieldLabel, { marginTop: 20 }]}>{t('ab.people')}</Text>
    <View style={[s.toggleRow, { marginTop: 4 }]}><Text style={{ flex: 1, color: color.ink }}>{t('ab.you', { name: me.user.name })}</Text></View>
    {form.members.map((m, i) => <View key={`${m.name}-${i}`} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ flex: 1, color: color.ink }}>{m.name} · {ages[m.ageGroup]}{m.needsHelp ? ` · ${t('ab.mayNeedHelp')}` : ''}</Text>
      <Link style={{ marginTop: 0 }} onPress={() => setForm({ ...form, members: form.members.filter((_, j) => j !== i) })}>{t('hh.remove')}</Link>
    </View>)}
    <Card>
      <Field style={{ marginTop: 0 }} label={t('ab.add')} value={member.name} onChangeText={name => setMember({ ...member, name })} placeholder={t('ab.firstName')} maxLength={40} onSubmitEditing={addMember} />
      <Select label={t('ab.age')} value={member.ageGroup} options={[['child', t('ab.child')], ['adult', t('ab.adult')], ['senior', t('ab.senior')]]} onChange={ageGroup => setMember({ ...member, ageGroup })} />
      <Toggle label={t('ab.needsHelp')} value={member.needsHelp} onChange={needsHelp => setMember({ ...member, needsHelp })} />
      <Button kind="outline" disabled={!member.name.trim()} onPress={addMember}>{t('ab.addBtn')}</Button>
    </Card>
    <Select label={t('ab.housing')} value={form.housing} options={[['own', t('ab.own')], ['rent', t('ab.rent')]]} onChange={housing => setForm({ ...form, housing })} />
    <Select label={t('ab.homeType')} value={form.homeType} options={[['house', t('ab.house')], ['apartment', t('ab.apartment')]]} onChange={homeType => setForm({ ...form, homeType })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{t('ab.continue')}</Button>
  </>;
}

// Address registration + mailed-code verification. Used in onboarding and on the Profile tab.
export function AddressPanel({ me, onChange, onDone, onboarding, initialAddress }) {
  const { t } = useI18n();
  const [address, setAddress] = useState(initialAddress || '');
  const [editing, setEditing] = useState(!me.address);
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [mailbox, setMailbox] = useState(null), [code, setCode] = useState('');
  const [candidates, setCandidates] = useState([]);
  const run = async (key, fn) => { setBusy(key); setError(''); try { await fn(); } catch (e) { setError(e.message); setCandidates(e.data?.candidates || []); } finally { setBusy(''); } };
  const lookup = (text = address, magicKey) => run('lookup', async () => { setCandidates([]); onChange(await api('POST', '/api/me/address', { address: text, magicKey })); setEditing(false); setMailbox(null); });
  // An address checked on the public page before sign-up is looked up straight away.
  useEffect(() => { if (initialAddress && !me.address) { setAddress(initialAddress); lookup(initialAddress); } }, []);
  const mail = () => run('mail', async () => { const result = await api('POST', '/api/me/address/mail'); setMailbox(result.demoMailbox); onChange(result); });
  const verify = () => run('verify', async () => { onChange(await api('POST', '/api/me/address/verify', { code })); setMailbox(null); setCode(''); });
  const a = me.address;
  const place = me.hazards ? summarizePlace(me.hazards) : null;

  return <>
    {onboarding && <Step n={2} of={3} label={t('ad.step')} />}
    {onboarding && <Title>{t(me.user.type === 'business' ? 'ad.whereBiz' : 'ad.whereHome')}</Title>}
    {editing ? <>
      <Muted>{t('ad.intro')}</Muted>
      <AddressSearch value={address} onChangeText={setAddress} onPick={(text, magicKey) => lookup(text, magicKey)} onSubmit={() => lookup()} suggestPath="/api/address/suggest" hint={t('ad.hint')} />
      <ErrorText>{error}</ErrorText>
      {candidates.length > 0 && <View style={{ marginTop: 6 }}>{candidates.map(c => <Button key={c} kind="outline" style={{ marginTop: 8 }} onPress={() => { setAddress(c); lookup(c); }}>{c}</Button>)}</View>}
      <Button busy={busy === 'lookup'} disabled={address.trim().length < 5} onPress={() => lookup()}>{t('ad.find')}</Button>
      {busy === 'lookup' && <Caption>{t('ad.checking')}</Caption>}
      {a && <Link onPress={() => setEditing(false)}>{t('ad.cancel')}</Link>}
    </> : <>
      <Card>
        <Tag>{t(a.verified === 'mail' ? 'ad.verified' : 'ad.matched')}</Tag>
        <Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>{a.text}</Text>
        {place && <Muted style={{ marginTop: 6 }}>{place.mapped.length ? place.mapped.map(i => `⚠ ${t(`hz.${i.key}`)}`).join('   ') : t('ad.noZone')}</Muted>}
        <Link onPress={() => setEditing(true)}>{t('ad.different')}</Link>
      </Card>
      <MapPanel style={{ height: 180, borderRadius: 17, marginTop: 12 }} point={{ latitude: a.lat, longitude: a.lon }} title={t('mx.registered')} />
      {a.verified !== 'mail' && <Card>
        <Tag tone="gold">{t(me.user.type === 'business' ? 'ad.verifyBiz' : 'ad.verifyHome')}</Tag>
        <Muted>{t(me.user.type === 'business' ? 'ad.mailBiz' : 'ad.mailHome')}</Muted>
        {!a.codePending && !mailbox && <Button kind="outline" busy={busy === 'mail'} onPress={mail}>{t('ad.mailMe')}</Button>}
        {mailbox && <View style={{ backgroundColor: color.goldBg, borderRadius: 12, padding: 12, marginTop: 14 }}><Text style={{ color: color.gold, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>{t('ad.mailbox')}</Text><Text style={{ color: color.ink, fontSize: 24, fontWeight: '800', letterSpacing: 4, marginVertical: 4 }}>{mailbox.code}</Text><Text style={{ color: color.gold, fontSize: 12 }}>{mailbox.note}</Text></View>}
        {(a.codePending || mailbox) && <>
          <Field label={t('ad.code')} value={code} onChangeText={v => setCode(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} placeholder={t('ad.codePh')} />
          <Button busy={busy === 'verify'} disabled={code.length !== 6} onPress={verify}>{t('ad.verify')}</Button>
          {!mailbox && <Link onPress={mail}>{t('ad.newCode')}</Link>}
        </>}
        <ErrorText>{error}</ErrorText>
      </Card>}
      <CityDataCallout id="parcels" />
      {onboarding && <Button onPress={onDone}>{t(a.verified === 'mail' ? 'ad.continue' : 'ad.continueLater')}</Button>}
    </>}
  </>;
}

// Household facts a future responder connection could use. Nothing here leaves the FirePath server.
export function HouseholdForm({ me, onSaved, onboarding }) {
  const { t } = useI18n();
  const h = me.household || {};
  const [form, setForm] = useState({ pets: h.pets || [], assistance: h.assistance || '', access: h.access || '', utilities: h.utilities || '', meetNear: h.meetNear || '', meetFar: h.meetFar || '', contact: h.contact || '', shareWithResponders: Boolean(h.shareWithResponders) });
  const [pet, setPet] = useState({ kind: '', count: '1', where: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const set = patch => { setSaved(false); setForm(current => ({ ...current, ...patch })); };
  const addPet = () => { if (!pet.kind.trim()) return; set({ pets: [...form.pets, { kind: pet.kind.trim(), count: Number(pet.count) || 1, where: pet.where.trim() }] }); setPet({ kind: '', count: '1', where: '' }); };
  async function save() {
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/household', { ...h, ...form })); setSaved(true); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    {onboarding && <Step n={3} of={3} label={t('hh.step')} />}
    {onboarding ? <Title>{t('hh.titleOnb')}</Title> : <Section>{t('hh.title')}</Section>}
    <Muted>{t('hh.intro')}</Muted>

    <Collapsible icon="🐾" initiallyOpen={onboarding} title={t('hh.pets')} summary={form.pets.length ? form.pets.map(p => `${p.count} ${p.kind}`).join(', ') : t('hh.none')}>
    {form.pets.map((p, i) => <View key={`${p.kind}-${i}`} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ flex: 1, color: color.ink }}>{p.count} {p.kind}{p.where ? ` · ${p.where}` : ''}</Text>
      <Link style={{ marginTop: 0 }} onPress={() => set({ pets: form.pets.filter((_, j) => j !== i) })}>{t('hh.remove')}</Link>
    </View>)}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 2 }} label={t('hh.animal')} value={pet.kind} onChangeText={kind => setPet({ ...pet, kind })} placeholder={t('hh.animalPh')} maxLength={40} />
      <Field style={{ flex: 1 }} label={t('hh.count')} value={pet.count} onChangeText={count => setPet({ ...pet, count: count.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
    </View>
    <Field label={t('hh.where')} value={pet.where} onChangeText={where => setPet({ ...pet, where })} placeholder={t('hh.wherePh')} maxLength={80} />
    <Button kind="outline" disabled={!pet.kind.trim()} onPress={addPet}>{t('hh.addAnimal')}</Button>
    </Collapsible>

    <Collapsible icon="🧑‍🦽" initiallyOpen={onboarding} title={t('hh.help')} summary={[form.assistance && t('hh.helpNoted'), form.access && t('hh.accessNoted'), form.utilities && t('hh.shutoffsNoted')].filter(Boolean).join(' · ') || t('hh.nothing')}>
    <Field label={t('hh.needsHelp')} hint={t('hh.needsHelpHint')} value={form.assistance} onChangeText={assistance => set({ assistance })} placeholder={t('hh.needsHelpPh')} maxLength={120} />
    <Field label={t('hh.access')} hint={t('hh.accessHint')} value={form.access} onChangeText={access => set({ access })} placeholder={t('hh.accessPh')} maxLength={140} />
    <Field label={t('hh.shutoffs')} value={form.utilities} onChangeText={utilities => set({ utilities })} placeholder={t('hh.shutoffsPh')} maxLength={120} />
    </Collapsible>

    <Collapsible icon="📍" initiallyOpen={onboarding} title={t('hh.meet')} summary={[form.meetNear, form.meetFar].filter(Boolean).join(' · ') || t('hh.notSet')}>
    <Field label={t('hh.meetNear')} value={form.meetNear} onChangeText={meetNear => set({ meetNear })} placeholder={t('hh.meetNearPh')} maxLength={80} />
    <Field label={t('hh.meetFar')} value={form.meetFar} onChangeText={meetFar => set({ meetFar })} placeholder={t('hh.meetFarPh')} maxLength={80} />
    <Field label={t('hh.contact')} value={form.contact} onChangeText={contact => set({ contact })} placeholder={t('hh.contactPh')} maxLength={80} />
    </Collapsible>

    <Toggle label={t('hh.share')} detail={t('hh.shareSub')} value={form.shareWithResponders} onChange={shareWithResponders => set({ shareWithResponders })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{t(onboarding ? 'hh.finish' : 'hh.save')}</Button>
    {saved && !onboarding && <Caption>{t('hh.saved')}</Caption>}
  </>;
}


export function BusinessProfile({ me, onSaved, onboarding }) {
  const { t } = useI18n();
  const b = me.business || {};
  const [form, setForm] = useState({ name: b.name || '', kind: b.kind || 'retail', employees: String(b.employees || ''), visitors: String(b.visitors || ''), floors: String(b.floors || ''), hours: b.hours || '', needsHelp: String(b.needsHelp || ''), sprinklers: b.sprinklers || 'unknown' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = patch => setForm(current => ({ ...current, ...patch }));
  const digits = key => value => set({ [key]: value.replace(/\D/g, '') });
  async function save() {
    if (!form.name.trim()) return setError(t('bz.nameErr'));
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/business', { ...b, ...form })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    {onboarding && <Step n={1} of={3} label={t('bz.step1')} />}
    {onboarding ? <Title>{t('bz.title')}</Title> : <Section>{t('bz.section')}</Section>}
    <Muted>{t('bz.intro')}</Muted>
    <Field label={t('bz.name')} value={form.name} onChangeText={name => set({ name })} placeholder={t('bz.namePh')} maxLength={100} />
    <Select label={t('bz.kind')} value={form.kind} options={businessKinds.map(([k]) => [k, t(`bk.${k}`)])} onChange={kind => set({ kind })} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 1 }} label={t('bz.staff')} value={form.employees} onChangeText={digits('employees')} keyboardType="number-pad" placeholder="12" maxLength={4} />
      <Field style={{ flex: 1 }} label={t('bz.visitors')} value={form.visitors} onChangeText={digits('visitors')} keyboardType="number-pad" placeholder="40" maxLength={5} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 1 }} label={t('bz.floors')} value={form.floors} onChangeText={digits('floors')} keyboardType="number-pad" placeholder="1" maxLength={3} />
      <Field style={{ flex: 1 }} label={t('bz.needsHelp')} value={form.needsHelp} onChangeText={digits('needsHelp')} keyboardType="number-pad" placeholder="0" maxLength={4} />
    </View>
    <Field label={t('bz.hours')} value={form.hours} onChangeText={hours => set({ hours })} placeholder={t('bz.hoursPh')} maxLength={80} />
    <Select label={t('bz.sprinklers')} value={form.sprinklers} options={[['yes', t('bz.yes')], ['no', t('bz.no')], ['unknown', t('bz.unsure')]]} onChange={sprinklers => set({ sprinklers })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{onboarding ? t('ab.continue') : t('bz.saveProfile')}</Button>
  </>;
}

export function BusinessDetails({ me, onSaved, onboarding }) {
  const { t } = useI18n();
  const b = me.business || {};
  const [form, setForm] = useState({ hazmat: b.hazmat || [], hazmatNote: b.hazmatNote || '', contactName: b.contactName || me.user.name, contactPhone: b.contactPhone || '', assembly: b.assembly || '', access: b.access || '', utilities: b.utilities || '', shareWithResponders: Boolean(b.shareWithResponders) });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const set = patch => { setSaved(false); setForm(current => ({ ...current, ...patch })); };
  const toggleHazmat = key => set({ hazmat: form.hazmat.includes(key) ? form.hazmat.filter(h => h !== key) : [...form.hazmat, key] });
  async function save() {
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/business', { ...b, ...form })); setSaved(true); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    {onboarding && <Step n={3} of={3} label={t('bz.step3')} />}
    {onboarding ? <Title>{t('bz.dTitle')}</Title> : <Section>{t('bz.dSection')}</Section>}
    <Muted>{t('bz.dIntro')}</Muted>
    <Text style={[s.fieldLabel, { marginTop: 20 }]}>{t('bz.hazmat')}</Text>
    <Caption style={{ marginTop: 0 }}>{t('bz.hazmatHint')}</Caption>
    {hazmatKinds.map(([key, label]) => <Pressable key={key} accessibilityRole="checkbox" aria-checked={Boolean(form.hazmat.includes(key))} accessibilityState={{ checked: form.hazmat.includes(key) }} onPress={() => toggleHazmat(key)} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ width: 24, fontWeight: '900', color: color.green }}>{form.hazmat.includes(key) ? '☑' : '☐'}</Text><Text style={{ flex: 1, color: color.ink }}>{t(`hz.${key}`)}</Text>
    </Pressable>)}
    {form.hazmat.length > 0 && <Field label={t('bz.stored')} value={form.hazmatNote} onChangeText={hazmatNote => set({ hazmatNote })} placeholder={t('bz.storedPh')} maxLength={140} />}
    <Field label={t('bz.contact')} value={form.contactName} onChangeText={contactName => set({ contactName })} placeholder={t('bz.contactPh')} maxLength={80} />
    <Field label={t('bz.phone')} value={form.contactPhone} onChangeText={contactPhone => set({ contactPhone })} placeholder="818-555-0100" keyboardType="phone-pad" maxLength={30} />
    <Field label={t('bz.assembly')} value={form.assembly} onChangeText={assembly => set({ assembly })} placeholder={t('bz.assemblyPh')} maxLength={100} />
    <Field label={t('bz.access')} hint={t('bz.accessHint')} value={form.access} onChangeText={access => set({ access })} placeholder={t('bz.accessPh')} maxLength={140} />
    <Field label={t('bz.utilities')} value={form.utilities} onChangeText={utilities => set({ utilities })} placeholder={t('bz.utilitiesPh')} maxLength={120} />
    <Toggle label={t('bz.share')} detail={t('bz.shareDetail')} value={form.shareWithResponders} onChange={shareWithResponders => set({ shareWithResponders })} />
    <CityDataCallout id="fireInspections" />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{onboarding ? t('bz.finish') : t('hh.save')}</Button>
    {saved && !onboarding && <Caption>{t('hh.saved')}</Caption>}
  </>;
}


// Address field with City of Glendale suggestions (debounced). Used by the public check and registration.
// `settled` is text the parent already looked up (e.g. via its own button); no suggestions for it.
export function AddressSearch({ value, onChangeText, onPick, onSubmit, suggestPath, hint, label, settled, placeholder }) {
  const { t } = useI18n();
  label ??= t('land.addr'); placeholder ??= t('land.placeholder');
  const [suggestions, setSuggestions] = useState([]), [picked, setPicked] = useState('');
  useEffect(() => {
    if (value.trim().length < 4 || value === picked || value === settled) { setSuggestions([]); return; }
    const timer = setTimeout(() => api('POST', suggestPath, { q: value }).then(r => setSuggestions(r.suggestions || [])).catch(() => setSuggestions([])), 250);
    return () => clearTimeout(timer);
  }, [value, settled]);
  const pick = item => { setPicked(item.text); onChangeText(item.text); setSuggestions([]); onPick(item.text, item.magicKey); };
  return <>
     <Field label={label} hint={hint} value={value} onChangeText={onChangeText} placeholder={placeholder} autoComplete="off" onSubmitEditing={onSubmit} maxLength={200} />
    {suggestions.length > 0 && <View accessibilityRole="list" style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, marginTop: 4, overflow: 'hidden' }}>
      {suggestions.map((item, i) => <Pressable key={item.text} accessibilityRole="button" accessibilityLabel={t('mx.useAddr', { text: item.text })} onPress={() => pick(item)} style={{ padding: 13, borderTopWidth: i ? 1 : 0, borderColor: color.line }}><Text style={{ color: color.ink }}>{item.text}</Text></Pressable>)}
      <Caption style={{ marginTop: 0, padding: 8, paddingTop: 4 }}>{t('mx.suggestions')}</Caption>
    </View>}
  </>;
}

