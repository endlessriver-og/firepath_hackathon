import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { api, apiBase } from './api';
import MapFrame from './MapFrame';
import { Auth, AddressSearch } from './onboarding';
import { Button, Caption, Card, ErrorText, Link, Muted, Section, SeverityBadge, Tag, color } from './ui';

// Public front door: anyone can check a Glendale address without an account. Results end in a
// call to register for alerts, a household plan and permit help for that address.
export function Landing({ onSignedIn }) {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [candidates, setCandidates] = useState([]);
  const [signup, setSignup] = useState(null); // null | { type, mode }

  async function check(text = address, magicKey) {
    setBusy(true); setError(''); setCandidates([]); setResult(null);
    try { setResult(await api('POST', '/api/public/check', { address: text, magicKey })); }
    catch (e) { setError(e.message); setCandidates(e.data?.candidates || []); }
    finally { setBusy(false); }
  }

  if (signup) return <>
    <Link style={{ marginTop: 0 }} onPress={() => setSignup(null)}>← Back to the address check</Link>
    {result && <Caption>Signing up for {result.address}. We'll set it up as your address in step 2.</Caption>}
    <Auth initialMode={signup.mode} initialType={signup.type} onSignedIn={(me, isNew) => onSignedIn(me, isNew, result?.address)} />
  </>;

  const mapped = result?.layers.filter(l => l.level === 'zone' || (typeof l.level === 'number' && l.level > 0)) || [];
  return <>
    <Text style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green }}>FIREPATH</Text>
    <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: color.ink, marginTop: 14 }}>What's mapped at your Glendale address?</Text>
    <Muted style={{ marginTop: 8 }}>Check any address against seven state and federal hazard maps. No account needed.</Muted>
    <AddressSearch value={address} onChangeText={setAddress} onPick={check} onSubmit={() => check()} suggestPath="/api/public/suggest" hint="Sent to the City of Glendale's address lookup. FirePath does not store public checks." />
    <ErrorText>{error}</ErrorText>
    {candidates.map(c => <Button key={c} kind="outline" style={{ marginTop: 8 }} onPress={() => { setAddress(c); check(c); }}>{c}</Button>)}
    <Button busy={busy} disabled={address.trim().length < 5} onPress={() => check()}>Check this address</Button>
    {busy && <Caption>Checking the City's address points and seven hazard maps…</Caption>}

    {result && <>
      <Card style={{ backgroundColor: color.green, borderColor: color.green }}>
        <Text style={{ color: '#CFE3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{result.address}</Text>
        <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 6 }}>{mapped.length ? `${mapped.length} of 7 hazard maps include this address` : 'None of the 7 hazard maps include this address'}</Text>
        {result.combined && <Text style={{ color: '#CFE3DA', marginTop: 6 }}>Combined planning index: <Text style={{ color: '#FFF', fontWeight: '800' }}>{result.combined.score} of {result.combined.max}</Text>{result.combined.parts.length ? ` (${result.combined.parts.map(p => `${p.label} +${p.points}`).join(', ')})` : ''}</Text>}
        {!mapped.length && <Text style={{ color: '#CFE3DA', marginTop: 6 }}>Not being in a mapped zone is not the same as no risk. Earthquakes affect all of Glendale.</Text>}
      </Card>
      <MapFrame src={`${apiBase()}/map.html?layers=combined&label=This%20address&lat=${result.lat}&lon=${result.lon}`} style={{ height: 320, borderRadius: 17, marginTop: 12, borderWidth: 1, borderColor: color.line }} />
      <Section>Layer by layer</Section>
      {result.layers.map(l => <View key={l.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ color: color.ink, fontWeight: '700' }}>{l.name}</Text><SeverityBadge severity={l} />
      </View>)}
      <Caption>Planning maps from CAL FIRE, FEMA, the California Geological Survey, California DWR and USGS, checked {result.checkedAt.slice(0, 10)}. Not live incidents or evacuation orders.</Caption>

      {result.preview.length > 0 && <><Section>Where to start</Section>
        {result.preview.map(p => <Card key={p.id}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{p.title}</Text><Muted style={{ marginTop: 4 }}>{p.description}</Muted></Card>)}</>}

      <Card style={{ borderColor: color.green, borderWidth: 2, marginTop: 22 }}>
        <Tag>Free for Glendale residents and businesses</Tag>
        <Text style={{ color: color.ink, fontSize: 20, fontWeight: '800' }}>Get a plan for this address</Text>
        <Muted style={{ marginTop: 6 }}>Register to get a household plan and readiness score, live weather alerts with steps for your household, practice drills, and help with permits.</Muted>
        <Button onPress={() => setSignup({ type: 'resident', mode: 'signup' })}>I live here: create my plan</Button>
        <Button kind="outline" onPress={() => setSignup({ type: 'business', mode: 'signup' })}>I run a business here</Button>
      </Card>
    </>}
    <Link onPress={() => setSignup({ type: 'resident', mode: 'login' })} style={{ marginTop: 22 }}>Already registered? Sign in</Link>
    {!result && <Link onPress={() => setSignup({ type: 'resident', mode: 'signup' })}>Create an account</Link>}
    <Caption style={{ marginTop: 18 }}>FirePath is a Glendale pilot prototype, not a City of Glendale service. For emergencies, follow official instructions and call 911.</Caption>
  </>;
}
