import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, apiBase } from './api';
import MapFrame from './MapFrame';
import { Auth, AddressSearch } from './onboarding';
import { Resources } from './tabs';
import { hazardViewers } from './resources';
import { Linking } from 'react-native';
import { Button, Caption, Card, Collapsible, ErrorText, LanguageBar, Link, Muted, Section, SeverityBadge, Tag, color } from './ui';
import { useI18n } from './i18n';
import { HeroIllustration } from './illustration';

// Public front door: anyone can check a Glendale address without an account. Results end in a
// call to register for alerts, a household plan and permit help for that address.
// Search + results for any Glendale address (public endpoint; nothing stored). Used on the public
// page and, when signed in, to check places other than your own address.
// Public City records for an address (Glendale Permits public search), in a collapsible container.
export function CityRecords({ records, initiallyOpen }) {
  if (!records) return null;
  const t = records.totals;
  return <Collapsible icon="🗂" initiallyOpen={initiallyOpen} title={`City records · ${t.total}`} summary={`${t.permits} permits · ${t.inspections} inspections${records.parcel ? ` · parcel ${records.parcel}` : ''}`}>
    {records.recent.length === 0 ? <Muted style={{ marginTop: 10 }}>No permits or inspections found for this exact address.</Muted> : records.recent.slice(0, 5).map(r => <View key={`${r.kind}-${r.number}`} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: color.line }}>
      <Text style={{ color: color.ink, fontWeight: '700' }}>{r.type}</Text>
      <Text style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>{r.kind} {r.number} · {r.status || 'status unknown'}{r.date ? ` · ${r.date}` : ''}</Text>
    </View>)}
    <Link onPress={() => Linking.openURL(records.searchUrl)}>See every record in Glendale Permits ↗</Link>
    <Caption>Public records from the City of Glendale's permit portal. Code-enforcement cases are not listed here.</Caption>
  </Collapsible>;
}

export function AddressCheck({ onResult, onRegister, showPreview = false, label }) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [candidates, setCandidates] = useState([]), [checked, setChecked] = useState('');
  async function check(text = address, magicKey) {
    setChecked(text); setBusy(true); setError(''); setCandidates([]); setResult(null); onResult?.(null);
    try { const r = await api('POST', '/api/public/check', { address: text, magicKey }); setResult(r); onResult?.(r); }
    catch (e) { setError(e.message); setCandidates(e.data?.candidates || []); }
    finally { setBusy(false); }
  }
  const mapped = result?.layers.filter(l => l.level === 'zone' || (typeof l.level === 'number' && l.level > 0)) || [];
  const unavailable = result?.layers.filter(l => l.level === 'unknown').length || 0;
  return <>
    <AddressSearch label={label || t('land.addr')} placeholder={t('land.placeholder')} value={address} onChangeText={setAddress} onPick={check} onSubmit={() => check()} suggestPath="/api/public/suggest" settled={checked} hint={t('land.addrHint')} />
    <ErrorText>{error}</ErrorText>
    {candidates.map(c => <Button key={c} kind="outline" style={{ marginTop: 8 }} onPress={() => { setAddress(c); check(c); }}>{c}</Button>)}
    <Button busy={busy} disabled={address.trim().length < 5} onPress={() => check()}>{t('land.check')}</Button>
    {busy && <Caption>{t('land.checking')}</Caption>}
    {result && <>
      <Card style={{ backgroundColor: color.green, borderColor: color.green }}>
        <Text style={{ color: '#CFE3DA', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{result.address}</Text>
        <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 6 }}>{mapped.length ? `${mapped.length} map${mapped.length === 1 ? '' : 's'} show a zone at this address` : 'No checked map shows a zone here'}</Text>
        {unavailable > 0 && <Text style={{ color: '#CFE3DA', marginTop: 4 }}>{unavailable} map{unavailable === 1 ? '' : 's'} could not be checked.</Text>}
        <Text style={{ color: '#CFE3DA', marginTop: 6 }}>Outside a mapped zone does not mean risk-free.</Text>
      </Card>
      {onRegister && <Card style={{ borderColor: color.green, borderWidth: 2 }}>
        <Text style={{ color: color.ink, fontSize: 20, fontWeight: '800' }}>Register this address</Text>
        <Muted style={{ marginTop: 5 }}>Save a plan, get relevant alerts and find City permits.</Muted>
        <Button onPress={() => onRegister('resident')}>Register my home</Button>
        <Button kind="outline" onPress={() => onRegister('business')}>Register my business</Button>
        <Caption>Free plan · City permit fees may apply</Caption>
      </Card>}
      <CityRecords records={result.records} />
      <MapFrame src={`${apiBase()}/map.html?layers=combined&label=This%20address&lat=${result.lat}&lon=${result.lon}`} style={{ height: 320, borderRadius: 17, marginTop: 12, borderWidth: 1, borderColor: color.line }} />
      <Section>Seven hazard maps</Section>
      <Caption style={{ marginTop: 0 }}>✓ In mapped zone · ○ Outside mapped zone · ? Map unavailable. These are planning maps, not live alerts.</Caption>
      {result.layers.map(l => <View key={l.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ flex: 1, color: color.ink, fontWeight: '700' }}>{l.name}</Text><Text style={{ color: l.level === 'zone' || (typeof l.level === 'number' && l.level > 0) ? color.warm : color.green, fontWeight: '800', fontSize: 12 }}>{l.level === 'zone' || (typeof l.level === 'number' && l.level > 0) ? '✓ In zone' : l.level === 'unknown' ? '? Unavailable' : '○ Outside zone'}</Text>
      </View>)}
      <Collapsible title="Map sources" summary="Official maps and dates">{result.layers.map(l => hazardViewers[l.key] && <Link key={l.key} onPress={() => Linking.openURL(hazardViewers[l.key].url)}>{l.name}: official map ↗</Link>)}<Caption>Checked {result.checkedAt.slice(0, 10)}. Planning maps, not live incidents or evacuation orders.</Caption></Collapsible>
      {showPreview && result.preview.length > 0 && <><Section>Where to start</Section>
        {result.preview.map(p => <Card key={p.id}><Text style={{ color: color.ink, fontSize: 16, fontWeight: '700' }}>{p.title}</Text><Muted style={{ marginTop: 4 }}>{p.description}</Muted></Card>)}</>}
    </>}
  </>;
}

// Public front door: anyone can check a Glendale address without an account. Results end in a
// call to register for alerts, a household plan and permit help for that address.
export function Landing({ onSignedIn, onEmergency, onWalkthrough }) {
  const { t, lang } = useI18n();
  const [result, setResult] = useState(null);
  const [signup, setSignup] = useState(null); // null | { type, mode }
  const [languageOpen, setLanguageOpen] = useState(false);

  if (signup) return <>
    <Link style={{ marginTop: 0 }} onPress={() => setSignup(null)}>← Back to the address check</Link>
    {result && <Caption>Signing up for {result.address}. We'll set it up as your address in step 2.</Caption>}
    <Auth initialMode={signup.mode} initialType={signup.type} onSignedIn={(me, isNew) => onSignedIn(me, isNew, result?.address)} />
  </>;

  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>↗</Text></View><Text style={{ flex: 1, fontSize: 19, fontWeight: '900', letterSpacing: 1, color: color.green }}>FirePath</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Language and text size" onPress={() => setLanguageOpen(!languageOpen)}><Text style={{ color: color.green, fontSize: 20, padding: 5 }}>🌐</Text></Pressable>
      <Text accessibilityRole="button" onPress={onEmergency} style={{ backgroundColor: '#B3261A', color: '#FFF', fontWeight: '800', fontSize: 12, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, overflow: 'hidden' }}>{t('head.emergency')}</Text></View>
    {languageOpen && <LanguageBar />}
    <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: color.ink, marginTop: 22 }}>{t('land.title')}</Text>
    <Muted style={{ marginTop: 8, fontSize: 16 }}>{t('land.sub')}</Muted>
    <HeroIllustration height={112} />
    <AddressCheck onResult={setResult} onRegister={type => setSignup({ type, mode: 'signup' })} />
    <Link onPress={() => setSignup({ type: 'resident', mode: 'login' })} style={{ marginTop: 22 }}>{t('land.signin')}</Link>
    {!result && <Link onPress={() => setSignup({ type: 'resident', mode: 'signup' })}>{t('land.create')}</Link>}
    <View style={{ backgroundColor: '#E6EFE9', borderRadius: 14, padding: 14, marginTop: 18 }}><Text style={{ color: color.ink, fontSize: 15, fontWeight: '700' }}>☎ {t('land.help')}</Text>{lang !== 'en' && <Caption>{t('set.unreviewed')}</Caption>}</View>
    {onWalkthrough && <Pressable accessibilityRole="button" onPress={onWalkthrough} style={{ marginTop: 14, backgroundColor: '#12302A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>▶</Text><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>{t('land.tour')}</Text>
    </Pressable>}
    <Collapsible icon="📚" title={t('land.resources')} summary="Official alerts, zones and help"><Resources compact /></Collapsible>
    <Caption style={{ marginTop: 18 }}>{t('land.disclaimer')}</Caption>
  </>;
}
