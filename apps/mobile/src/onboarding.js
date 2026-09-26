import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, saveSession } from './api';
import { summarizePlace } from './preparedness';
import MapPanel from './MapPanel';
import { Button, Caption, Card, CityDataCallout, ErrorText, Field, Link, Muted, Section, Segment, Step, Tag, Title, Toggle, color, s } from './ui';

export function Auth({ onSignedIn }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = patch => setForm(current => ({ ...current, ...patch }));
  async function submit() {
    setBusy(true); setError('');
    try {
      const result = await api('POST', mode === 'signup' ? '/api/account/signup' : '/api/account/login', mode === 'signup' ? form : { email: form.email, password: form.password });
      await saveSession(result.token);
      onSignedIn(result, mode === 'signup');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green }}>FIREPATH</Text>
    <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: color.ink, marginTop: 16, marginBottom: 10 }}>Know what's mapped where you live, and what to do about it.</Text>
    <Muted>Register your Glendale home to get a readiness plan, live weather alerts and help with permits.</Muted>
    <View style={[s.segment, { marginTop: 22 }]}>{[['signup', 'Create account'], ['login', 'Sign in']].map(([key, label]) =>
      <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: mode === key }} onPress={() => { setMode(key); setError(''); }} style={[s.segmentItem, mode === key && s.segmentOn]}><Text style={[s.segmentText, mode === key && { color: color.ink }]}>{label}</Text></Pressable>)}</View>
    {mode === 'signup' && <Field label="Your name" value={form.name} onChangeText={name => set({ name })} placeholder="First and last name" autoComplete="name" maxLength={80} />}
    <Field label="Email" value={form.email} onChangeText={email => set({ email })} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={200} />
    <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : null} value={form.password} onChangeText={password => set({ password })} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onSubmitEditing={submit} maxLength={200} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={submit}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
    <Caption>Prototype accounts are stored only on this demo server. It is not a City of Glendale service.</Caption>
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
      <Segment label="Age group" value={member.ageGroup} options={[['child', 'Child'], ['adult', 'Adult'], ['senior', 'Older adult']]} onChange={ageGroup => setMember({ ...member, ageGroup })} />
      <Toggle label="May need help leaving" value={member.needsHelp} onChange={needsHelp => setMember({ ...member, needsHelp })} />
      <Button kind="outline" disabled={!member.name.trim()} onPress={addMember}>+ Add to household</Button>
    </Card>
    <Segment label="Housing" value={form.housing} options={[['own', 'I own'], ['rent', 'I rent']]} onChange={housing => setForm({ ...form, housing })} />
    <Segment label="Home type" value={form.homeType} options={[['house', 'House'], ['apartment', 'Apartment / condo']]} onChange={homeType => setForm({ ...form, homeType })} />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>Continue</Button>
  </>;
}

// Address registration + mailed-code verification. Used in onboarding and on the Profile tab.
export function AddressPanel({ me, onChange, onDone, onboarding }) {
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(!me.address);
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [mailbox, setMailbox] = useState(null), [code, setCode] = useState('');
  const run = async (key, fn) => { setBusy(key); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); } };
  const lookup = () => run('lookup', async () => { onChange(await api('POST', '/api/me/address', { address })); setEditing(false); setMailbox(null); });
  const mail = () => run('mail', async () => { const result = await api('POST', '/api/me/address/mail'); setMailbox(result.demoMailbox); onChange(result); });
  const verify = () => run('verify', async () => { onChange(await api('POST', '/api/me/address/verify', { code })); setMailbox(null); setCode(''); });
  const a = me.address;
  const place = me.hazards ? summarizePlace(me.hazards) : null;

  return <>
    {onboarding && <Step n={2} of={3} label="Your address" />}
    {onboarding && <Title>Where is home?</Title>}
    {editing ? <>
      <Muted>We check your address against seven state and federal hazard maps.</Muted>
      <Field label="Glendale street address" hint="Sent to the City of Glendale's address lookup (geocoder) to find the map point." value={address} onChangeText={setAddress} placeholder="e.g., 1613 Glencoe Way" autoComplete="street-address" onSubmitEditing={lookup} maxLength={200} />
      <ErrorText>{error}</ErrorText>
      <Button busy={busy === 'lookup'} disabled={address.trim().length < 5} onPress={lookup}>Find my address</Button>
      {busy === 'lookup' && <Caption>Checking the City's address points and seven hazard maps. This can take up to 20 seconds.</Caption>}
      {a && <Link onPress={() => setEditing(false)}>Cancel</Link>}
    </> : <>
      <Card>
        <Tag>{a.verified === 'mail' ? 'VERIFIED BY MAIL' : 'MATCHED · NOT YET VERIFIED'}</Tag>
        <Text style={{ color: color.ink, fontSize: 17, fontWeight: '700' }}>{a.text}</Text>
        {place && <Muted style={{ marginTop: 6 }}>{place.mapped.length ? `Mapped here: ${place.mapped.map(i => `${i.name.toLowerCase()} (${i.label})`).join(', ')}.` : 'None of the 7 hazard maps flag this point. That is not the same as no risk.'}</Muted>}
        <Link onPress={() => setEditing(true)}>Use a different address</Link>
      </Card>
      <MapPanel style={{ height: 180, borderRadius: 17, marginTop: 12 }} point={{ latitude: a.lat, longitude: a.lon }} title="Your registered address" />
      {a.verified !== 'mail' && <Card>
        <Tag tone="gold">Verify you live here</Tag>
        <Muted>Matching an address shows it exists, not that you live there. We mail a 6-digit code to the address; entering it verifies your household. Verification does not prove ownership.</Muted>
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
    {onboarding && <Step n={3} of={3} label="Details for emergencies" />}
    {onboarding ? <Title>What should responders know?</Title> : <Section>Household details</Section>}
    <Muted>Short, practical facts only. No medical diagnoses, door codes or anything you would not want shown to a responder.</Muted>

    <Text style={[s.fieldLabel, { marginTop: 20 }]}>Pets and animals</Text>
    {form.pets.map((p, i) => <View key={`${p.kind}-${i}`} style={[s.toggleRow, { marginTop: 8 }]}>
      <Text style={{ flex: 1, color: color.ink }}>{p.count} {p.kind}{p.where ? ` · ${p.where}` : ''}</Text>
      <Link style={{ marginTop: 0 }} onPress={() => set({ pets: form.pets.filter((_, j) => j !== i) })}>Remove</Link>
    </View>)}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Field style={{ flex: 2 }} label="Animal" value={pet.kind} onChangeText={kind => setPet({ ...pet, kind })} placeholder="dog, cat…" maxLength={40} />
      <Field style={{ flex: 1 }} label="How many" value={pet.count} onChangeText={count => setPet({ ...pet, count: count.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
    </View>
    <Field label="Where they usually are" value={pet.where} onChangeText={where => setPet({ ...pet, where })} placeholder="e.g., backyard, upstairs bedroom" maxLength={80} />
    <Button kind="outline" disabled={!pet.kind.trim()} onPress={addPet}>+ Add animal</Button>

    <Field label="Anyone who may need help leaving" hint="Describe the help, not a diagnosis." value={form.assistance} onChangeText={assistance => set({ assistance })} placeholder="e.g., uses a wheelchair; needs a step-free exit" maxLength={120} />
    <Field label="Access note" hint="General access only. Never lock codes." value={form.access} onChangeText={access => set({ access })} placeholder="e.g., side gate on the left, dog in yard" maxLength={140} />
    <Field label="Utility shutoffs" value={form.utilities} onChangeText={utilities => set({ utilities })} placeholder="e.g., gas meter on the east wall" maxLength={120} />
    <Field label="Meeting place near home" value={form.meetNear} onChangeText={meetNear => set({ meetNear })} placeholder="e.g., the corner mailbox" maxLength={80} />
    <Field label="Meeting place outside the neighborhood" value={form.meetFar} onChangeText={meetFar => set({ meetFar })} placeholder="e.g., Montrose library" maxLength={80} />
    <Field label="Out-of-area contact" value={form.contact} onChangeText={contact => set({ contact })} placeholder="e.g., Aunt Rosa in Fresno" maxLength={80} />
    <Toggle label="Share with responders when the City connects" detail="Today FirePath is not connected to 911, dispatch or the City. Turning this on records your consent for a future connection; you can turn it off any time." value={form.shareWithResponders} onChange={shareWithResponders => set({ shareWithResponders })} />
    <CityDataCallout id="cad" />
    <ErrorText>{error}</ErrorText>
    <Button busy={busy} onPress={save}>{onboarding ? 'Finish setup' : 'Save details'}</Button>
    {saved && !onboarding && <Caption>Saved.</Caption>}
  </>;
}
