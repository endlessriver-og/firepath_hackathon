import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, saveSession } from './api';
import { summarizePlace } from './preparedness';
import { businessKinds, hazmatKinds } from './readiness';
import MapPanel from './MapPanel';
import { useI18n } from './i18n';
import { Button, Caption, Card, CityDataCallout, Collapsible, ErrorText, Field, Link, Muted, Section, Segment, Select, Step, Tag, Title, Toggle, color, s } from './ui';

export function Auth({ onSignedIn, initialMode = 'signup', initialType = 'resident' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', type: initialType, businessName: '', businessKind: null });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = patch => setForm(current => ({ ...current, ...patch }));
  async function submit() {
    if (mode === 'signup' && form.type === 'business' && (!form.businessName.trim() || !form.businessKind)) return setError('Enter the business name and choose its type.');
    setBusy(true); setError('');
    try {
      const result = await api('POST', mode === 'signup' ? '/api/account/signup' : '/api/account/login', mode === 'signup' ? form : { email: form.email, password: form.password });
      await saveSession(result.token);
      onSignedIn(result, mode === 'signup');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green }}>FIREPATH</Text>
    <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: color.ink, marginTop: 16, marginBottom: 6 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
    <Muted>{mode === 'signup' ? 'Save your plan, alerts and permits in one place.' : 'Sign in to see your plan.'}</Muted>
    {mode === 'signup' && <Select label="I'm setting up" value={form.type} options={[['resident', 'My home'], ['business', 'A business']]} onChange={type => set({ type })} />}
    {mode === 'signup' && form.type === 'business' && <>
      <Field label="Business name" value={form.businessName} onChangeText={businessName => set({ businessName })} placeholder="e.g., Glencoe Bakery" maxLength={100} />
      <Select label="Type of business" value={form.businessKind} options={businessKinds} placeholder="Choose one" onChange={businessKind => set({ businessKind })} />
    </>}
    {mode === 'signup' && <Field label={form.type === 'business' ? 'Your name (key contact)' : 'Your name'} value={form.name} onChangeText={name => set({ name })} placeholder="First and last name" autoComplete="name" maxLength={80} />}
    <Field label="Email" value={form.email} onChangeText={email => set({ email })} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={200} />
    <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : null} value={form.password} onChangeText={password => set({ password })} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onSubmitEditing={submit} maxLength={200} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={submit}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
    <Link onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Link>
    <Caption>Prototype: accounts live on this demo server, not with the City.</Caption>
  </>;
}

export function AboutYou({ me, onSaved }) {
  const h = me.household || {};
  const [form, setForm] = useState({ housing: h.housing || 'own', homeType: h.homeType || 'house', members: h.members || [] });
  const [member, setMember] = useState({ name: '', ageGroup: 'adult', needsHelp: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const addMember = () => { if (!member.name.trim()) return; setForm({ ...form, members: [...form.members, { ...member, name: member.name.trim() }] }); setMember({ name: '', ageGroup: 'adult', needsHelp: false }); };
  async function save() {
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/household', { ...h, ...form })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const ages = { child: 'Child', adult: 'Adult', senior: 'Older adult' };
  return <>
    <Step n={1} of={3} label="Your household" />
    <Title>Hi {me.user.name.split(' ')[0]}. Who lives with you?</Title>
    <Muted>This shapes your plan. First names are only for your own plan; responders would see counts, not names.</Muted>
    <Text style={[s.fieldLabel, { marginTop: 20 }]}>People who live here</Text>
    <View style={[s.toggleRow, { marginTop: 4 }]}><Text style={{ flex: 1, color: color.ink }}>{me.user.name} (you)</Text></View>
    {form.members.map((m, i) => <View key={`${m.name}-${i}`} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ flex: 1, color: color.ink }}>{m.name} · {ages[m.ageGroup]}{m.needsHelp ? ' · may need help leaving' : ''}</Text>
      <Link style={{ marginTop: 0 }} onPress={() => setForm({ ...form, members: form.members.filter((_, j) => j !== i) })}>Remove</Link>
    </View>)}
    <Card>
      <Field style={{ marginTop: 0 }} label="Add someone" value={member.name} onChangeText={name => setMember({ ...member, name })} placeholder="First name" maxLength={40} onSubmitEditing={addMember} />
      <Select label="Age group" value={member.ageGroup} options={[['child', 'Child'], ['adult', 'Adult'], ['senior', 'Older adult']]} onChange={ageGroup => setMember({ ...member, ageGroup })} />
      <Toggle label="May need help leaving" value={member.needsHelp} onChange={needsHelp => setMember({ ...member, needsHelp })} />
      <Button kind="outline" disabled={!member.name.trim()} onPress={addMember}>+ Add to household</Button>
    </Card>
    <Select label="Housing" value={form.housing} options={[['own', 'I own'], ['rent', 'I rent']]} onChange={housing => setForm({ ...form, housing })} />
    <Select label="Home type" value={form.homeType} options={[['house', 'House'], ['apartment', 'Apartment / condo']]} onChange={homeType => setForm({ ...form, homeType })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>Continue</Button>
  </>;
}

// Address registration + mailed-code verification. Used in onboarding and on the Profile tab.
export function AddressPanel({ me, onChange, onDone, onboarding, initialAddress }) {
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
    {onboarding && <Step n={2} of={3} label="Your address" />}
    {onboarding && <Title>{me.user.type === 'business' ? 'Where is the business?' : 'Where is home?'}</Title>}
    {editing ? <>
      <Muted>We check your address against seven state and federal hazard maps.</Muted>
      <AddressSearch value={address} onChangeText={setAddress} onPick={(text, magicKey) => lookup(text, magicKey)} onSubmit={() => lookup()} suggestPath="/api/address/suggest" hint="Sent to the City of Glendale's address lookup (geocoder) to find the map point." />
      <ErrorText>{error}</ErrorText>
      {candidates.length > 0 && <View style={{ marginTop: 6 }}>{candidates.map(c => <Button key={c} kind="outline" style={{ marginTop: 8 }} onPress={() => { setAddress(c); lookup(c); }}>{c}</Button>)}</View>}
      <Button busy={busy === 'lookup'} disabled={address.trim().length < 5} onPress={() => lookup()}>Find my address</Button>
      {busy === 'lookup' && <Caption>Checking seven hazard maps. This can take up to 20 seconds.</Caption>}
      {a && <Link onPress={() => setEditing(false)}>Cancel</Link>}
    </> : <>
      <Card>
        <Tag>{a.verified === 'mail' ? 'VERIFIED BY MAIL' : 'MATCHED · NOT YET VERIFIED'}</Tag>
        <Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>{a.text}</Text>
        {place && <Muted style={{ marginTop: 6 }}>{place.mapped.length ? place.mapped.map(i => `⚠ ${i.name}`).join('   ') : 'No hazard map flags this point. That does not mean no risk.'}</Muted>}
        <Link onPress={() => setEditing(true)}>Use a different address</Link>
      </Card>
      <MapPanel style={{ height: 180, borderRadius: 17, marginTop: 12 }} point={{ latitude: a.lat, longitude: a.lon }} title="Your registered address" />
      {a.verified !== 'mail' && <Card>
        <Tag tone="gold">{me.user.type === 'business' ? 'Verify this is your business' : 'Verify you live here'}</Tag>
        <Muted>{me.user.type === 'business' ? 'We mail a 6-digit code to the business. It confirms the location, not ownership.' : 'We mail a 6-digit code to this address. It confirms you live here, not ownership.'}</Muted>
        {!a.codePending && !mailbox && <Button kind="outline" busy={busy === 'mail'} onPress={mail}>Mail me a code</Button>}
        {mailbox && <View style={{ backgroundColor: color.goldBg, borderRadius: 12, padding: 12, marginTop: 14 }}><Text style={{ color: color.gold, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>DEMO MAILBOX</Text><Text style={{ color: color.ink, fontSize: 24, fontWeight: '800', letterSpacing: 4, marginVertical: 4 }}>{mailbox.code}</Text><Text style={{ color: color.gold, fontSize: 12 }}>{mailbox.note}</Text></View>}
        {(a.codePending || mailbox) && <>
          <Field label="Code from your postcard" value={code} onChangeText={t => setCode(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} placeholder="6 digits" />
          <Button busy={busy === 'verify'} disabled={code.length !== 6} onPress={verify}>Verify address</Button>
          {!mailbox && <Link onPress={mail}>Send a new code</Link>}
        </>}
        <ErrorText>{error}</ErrorText>
      </Card>}
      <CityDataCallout id="parcels" />
      {onboarding && <Button onPress={onDone}>{a.verified === 'mail' ? 'Continue' : 'Continue, verify later'}</Button>}
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
  const b = me.business || {};
  const [form, setForm] = useState({ name: b.name || '', kind: b.kind || 'retail', employees: String(b.employees || ''), visitors: String(b.visitors || ''), floors: String(b.floors || ''), hours: b.hours || '', needsHelp: String(b.needsHelp || ''), sprinklers: b.sprinklers || 'unknown' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = patch => setForm(current => ({ ...current, ...patch }));
  const digits = key => value => set({ [key]: value.replace(/\D/g, '') });
  async function save() {
    if (!form.name.trim()) return setError('Enter the business name.');
    setBusy(true); setError('');
    try { onSaved(await api('PUT', '/api/me/business', { ...b, ...form })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    {onboarding && <Step n={1} of={3} label="Your business" />}
    {onboarding ? <Title>Tell us about the business</Title> : <Section>Business profile</Section>}
    <Muted>Occupancy and building facts shape your plan and what responders would see first.</Muted>
    <Field label="Business name" value={form.name} onChangeText={name => set({ name })} placeholder="e.g., Glencoe Bakery" maxLength={100} />
    <Select label="Type of business" value={form.kind} options={businessKinds} onChange={kind => set({ kind })} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 1 }} label="Staff on a typical day" value={form.employees} onChangeText={digits('employees')} keyboardType="number-pad" placeholder="12" maxLength={4} />
      <Field style={{ flex: 1 }} label="Peak visitors" value={form.visitors} onChangeText={digits('visitors')} keyboardType="number-pad" placeholder="40" maxLength={5} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 1 }} label="Floors" value={form.floors} onChangeText={digits('floors')} keyboardType="number-pad" placeholder="1" maxLength={3} />
      <Field style={{ flex: 1 }} label="May need help leaving" value={form.needsHelp} onChangeText={digits('needsHelp')} keyboardType="number-pad" placeholder="0" maxLength={4} />
    </View>
    <Field label="Hours" value={form.hours} onChangeText={hours => set({ hours })} placeholder="e.g., 6am-6pm daily" maxLength={80} />
    <Select label="Fire sprinklers" value={form.sprinklers} options={[['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']]} onChange={sprinklers => set({ sprinklers })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{onboarding ? 'Continue' : 'Save profile'}</Button>
  </>;
}

export function BusinessDetails({ me, onSaved, onboarding }) {
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
    {onboarding && <Step n={3} of={3} label="Details for emergencies" />}
    {onboarding ? <Title>What should responders know?</Title> : <Section>Emergency details</Section>}
    <Muted>Short, factual notes. Never alarm or lock codes.</Muted>
    <Text style={[s.fieldLabel, { marginTop: 20 }]}>Hazardous materials on site</Text>
    <Caption style={{ marginTop: 0 }}>Select any you store or use. This drives your hazardous-materials steps.</Caption>
    {hazmatKinds.map(([key, label]) => <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: form.hazmat.includes(key) }} onPress={() => toggleHazmat(key)} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ width: 24, fontWeight: '900', color: color.green }}>{form.hazmat.includes(key) ? '☑' : '☐'}</Text><Text style={{ flex: 1, color: color.ink }}>{label}</Text>
    </Pressable>)}
    {form.hazmat.length > 0 && <Field label="Where they are stored" value={form.hazmatNote} onChangeText={hazmatNote => set({ hazmatNote })} placeholder="e.g., propane cage behind the kitchen" maxLength={140} />}
    <Field label="Key emergency contact" value={form.contactName} onChangeText={contactName => set({ contactName })} placeholder="Name" maxLength={80} />
    <Field label="Contact phone" value={form.contactPhone} onChangeText={contactPhone => set({ contactPhone })} placeholder="818-555-0100" keyboardType="phone-pad" maxLength={30} />
    <Field label="Staff assembly point" value={form.assembly} onChangeText={assembly => set({ assembly })} placeholder="e.g., parking lot, northeast corner" maxLength={100} />
    <Field label="Access note" hint="General access only. Never lock or alarm codes." value={form.access} onChangeText={access => set({ access })} placeholder="e.g., rear door off the alley" maxLength={140} />
    <Field label="Utility shutoffs" value={form.utilities} onChangeText={utilities => set({ utilities })} placeholder="e.g., gas meter at rear wall" maxLength={120} />
    <Toggle label="Share with responders when the City connects" detail="Not connected to 911 or the City yet. You can turn this off any time." value={form.shareWithResponders} onChange={shareWithResponders => set({ shareWithResponders })} />
    <CityDataCallout id="fireInspections" />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{onboarding ? 'Finish setup' : 'Save details'}</Button>
    {saved && !onboarding && <Caption>Saved.</Caption>}
  </>;
}


// Address field with City of Glendale suggestions (debounced). Used by the public check and registration.
// `settled` is text the parent already looked up (e.g. via its own button); no suggestions for it.
export function AddressSearch({ value, onChangeText, onPick, onSubmit, suggestPath, hint, label = 'Glendale street address', settled, placeholder = 'Start typing, e.g., 1613 Glencoe' }) {
  const [suggestions, setSuggestions] = useState([]), [picked, setPicked] = useState('');
  useEffect(() => {
    if (value.trim().length < 4 || value === picked || value === settled) { setSuggestions([]); return; }
    const timer = setTimeout(() => api('GET', `${suggestPath}?q=${encodeURIComponent(value)}`).then(r => setSuggestions(r.suggestions || [])).catch(() => setSuggestions([])), 250);
    return () => clearTimeout(timer);
  }, [value, settled]);
  const pick = item => { setPicked(item.text); onChangeText(item.text); setSuggestions([]); onPick(item.text, item.magicKey); };
  return <>
     <Field label={label} hint={hint} value={value} onChangeText={onChangeText} placeholder={placeholder} autoComplete="off" onSubmitEditing={onSubmit} maxLength={200} />
    {suggestions.length > 0 && <View accessibilityRole="list" style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, marginTop: 4, overflow: 'hidden' }}>
      {suggestions.map((item, i) => <Pressable key={item.text} accessibilityRole="button" accessibilityLabel={`Use ${item.text}`} onPress={() => pick(item)} style={{ padding: 13, borderTopWidth: i ? 1 : 0, borderColor: color.line }}><Text style={{ color: color.ink }}>{item.text}</Text></Pressable>)}
      <Caption style={{ marginTop: 0, padding: 8, paddingTop: 4 }}>Suggestions from the City of Glendale address list</Caption>
    </View>}
  </>;
}

