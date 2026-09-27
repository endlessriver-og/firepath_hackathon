import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Icon } from './src/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotifications } from './src/notify';
import { api, loadSession, saveSession } from './src/api';
import { AboutYou, AddressPanel, BusinessDetails, BusinessProfile, HouseholdForm } from './src/onboarding';
import { Actions, Alerts, Home, MapTab, Permits, Profile, Systems } from './src/tabs';
import { Landing } from './src/landing';
import { EmergencyNow } from './src/emergency';
import { TourOverlay, WalkthroughHub } from './src/tour';
import { TOUR_STEPS, QUICK_TOUR_STEPS } from './src/walkthrough';
import { I18nProvider, useI18n } from './src/i18n';
import { Button, ErrorText, color } from './src/ui';

// Onboarding progress is remembered per account, so one account's unfinished setup never leaks into another's.
const ONBOARDING = 'firepath-onboarding-step';
const stepKey = user => `${ONBOARDING}:${user?.email || user?.id || 'anon'}`;
// The last account view that loaded, kept on this device so plans and emergency steps still open offline.
const ME_CACHE = 'firepath-me-cache';
// Bottom bar: four icon tabs around a raised Home button. Profile lives in the top bar.
const TABS = [['Map', 'map', 'nav.map'], ['Plan', 'checkbox', 'nav.plan'], ['Home', 'home', 'nav.home'], ['Alerts', 'notifications', 'nav.alerts'], ['Permits', 'document-text', 'nav.permits']];
setupNotifications();

export default function Root() {
  return <I18nProvider><App /></I18nProvider>;
}

function App() {
  const { t, scale, lang } = useI18n();
  // Large text on a small phone leaves under ~275 px: drop the wordmark so Emergency and Profile stay on screen.
  const narrow = useWindowDimensions().width / scale < 275;
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [step, setStep] = useState(0);     // onboarding step 1-3, 0 = done
  const [tab, setTab] = useState('Home');
  const [layers, setLayers] = useState(['combined']);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [subs, setSubs] = useState({});            // selected sub-tab per page
  const sub = subs[tab], setSub = v => setSubs(current => ({ ...current, [tab]: v }));
  const [tour, setTour] = useState(null);          // walkthrough step index, null when not touring
  const [tourMode, setTourMode] = useState('quick');
  const tourSteps = tourMode === 'quick' ? QUICK_TOUR_STEPS : TOUR_STEPS;
  const [hub, setHub] = useState(false);           // signed-out walkthrough hub
  const [demoBusy, setDemoBusy] = useState(false), [demoError, setDemoError] = useState('');
  const goTour = (i, mode = tourMode) => { const stepDef = (mode === 'quick' ? QUICK_TOUR_STEPS : TOUR_STEPS)[i]; setTourMode(mode); setTour(i); setEmergency(Boolean(stepDef.emergency)); setTab(stepDef.tab); if (stepDef.sub) setSubs(current => ({ ...current, [stepDef.tab]: stepDef.sub })); };
  async function startTour(mode = 'quick') {
    setDemoError('');
    if (!me) {
      setDemoBusy(true);
      try { const result = await api('POST', '/api/demo/start', { lang }); await saveSession(result.token); setMe(result); setStep(0); setHub(false); }
      catch (e) { setDemoError(e.message); setDemoBusy(false); return; }
      setDemoBusy(false);
    }
    goTour(0, mode);
  } // checked on the public page before sign-up
  const go = (next, withLayers, sub) => { if (withLayers) setLayers(withLayers); if (sub) setSubs(current => ({ ...current, [next]: sub })); setTab(next); };
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const scroller = useRef(null);
  const top = () => scroller.current?.scrollTo({ y: 0, animated: false });

  async function load() {
    setError('');
    const token = await loadSession();
    if (!token) return setMe(null);
    try {
      const current = await api('GET', '/api/me');
      setMe(current); setOffline(false);
      AsyncStorage.setItem(ME_CACHE, JSON.stringify(current)).catch(() => {});
      setStep(current.user.demo ? 0 : Number(await AsyncStorage.getItem(stepKey(current.user)).catch(() => 0)) || 0);
    } catch (e) {
      if (e.status === 401) { await saveSession(null); await AsyncStorage.removeItem(ME_CACHE).catch(() => {}); setMe(null); return; }
      // No network: fall back to the saved plan rather than a dead end.
      const cached = e.status === 0 ? await AsyncStorage.getItem(ME_CACHE).catch(() => null) : null;
      if (cached) { setMe(JSON.parse(cached)); setOffline(true); } else setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);
  const goStep = async (n, user = me?.user) => { setStep(n); await AsyncStorage.setItem(stepKey(user), String(n)).catch(() => {}); };
  const finish = async () => { setStep(0); setTab('Home'); await AsyncStorage.removeItem(stepKey(me?.user)).catch(() => {}); };
  async function signOut() {
    await api('POST', '/api/account/logout').catch(() => {});
    await saveSession(null); await AsyncStorage.removeItem(stepKey(me?.user)).catch(() => {}); await AsyncStorage.removeItem(ME_CACHE).catch(() => {});
    setMe(null); setTab('Home');
  }

  if (error) return <Shell><ErrorText>{error}</ErrorText><Button onPress={load}>{t('mx.retry')}</Button></Shell>;
  if (me === undefined) return <Shell><ActivityIndicator color={color.green} style={{ marginTop: 80 }} /></Shell>;
  if (emergency && (me === null || step)) return <Shell><EmergencyNow me={me} onClose={() => setEmergency(false)} /></Shell>;
  if (me === null && hub) return <Shell><WalkthroughHub onStart={startTour} onClose={() => setHub(false)} busy={demoBusy} error={demoError} /></Shell>;
  if (me === null) return <Shell><Landing onEmergency={() => setEmergency(true)} onWalkthrough={() => setHub(true)} onSignedIn={(result, isNew, checked) => { setMe(result); setPendingAddress(isNew ? checked : null); if (isNew) goStep(1, result.user); }} /></Shell>;
  const business = me.user.type === 'business';
  if (step === 1) return <Shell>{business ? <BusinessProfile me={me} onSaved={next => { setMe(next); goStep(2); }} onboarding /> : <AboutYou me={me} onSaved={next => { setMe(next); goStep(2); }} />}</Shell>;
  if (step === 2) return <Shell><AddressPanel me={me} onChange={setMe} onDone={() => goStep(3)} onboarding initialAddress={pendingAddress} /></Shell>;
  if (step === 3) return <Shell>{business ? <BusinessDetails me={me} onSaved={next => { setMe(next); finish(); }} onboarding /> : <HouseholdForm me={me} onSaved={next => { setMe(next); finish(); }} onboarding />}</Shell>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View role="banner" style={styles.header}>
      {!narrow && <View style={{ alignItems: 'flex-start', gap: 3 }}><Text style={styles.brand}>FIREPATH</Text><Text numberOfLines={1} style={styles.pill}>{business ? t('head.business') : t('head.pilot')}</Text></View>}
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.emergency')} onPress={() => setEmergency(!emergency)} style={styles.sos}><Text style={styles.sosText}>{emergency ? t('head.close') : t('head.emergency')}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.profile')} accessibilityState={{ selected: tab === 'Profile' }} onPress={() => { setEmergency(false); setTab('Profile'); }} style={[styles.avatar, tab === 'Profile' && !emergency && styles.avatarOn]}>
        <Icon name={tab === 'Profile' && !emergency ? 'person' : 'person-outline'} size={20} color={tab === 'Profile' && !emergency ? '#FFF' : color.green} />
      </Pressable>
    </View>
    {narrow && <Text style={{ backgroundColor: color.goldBg, color: '#7A4A12', fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center', paddingVertical: 3 }}>FIREPATH · {business ? t('head.business') : t('head.pilot')}</Text>}
    {offline && <Pressable accessibilityRole="button" onPress={load} style={{ backgroundColor: '#F6E6C8', paddingVertical: 8, paddingHorizontal: 16 }}><Text style={{ color: '#6B4A0E', fontWeight: '700', fontSize: 13 }}>{t('off.banner')}</Text></Pressable>}
    <ScrollView key={emergency ? 'sos' : tab} ref={scroller} role="main" contentContainerStyle={[styles.content, tour !== null && { paddingBottom: 280 }]} keyboardShouldPersistTaps="handled">
      {emergency && <EmergencyNow me={me} onClose={() => setEmergency(false)} />}
      {!emergency && tab === 'Home' && <Home me={me} onChange={setMe} go={go} />}
      {!emergency && tab === 'Systems' && <Systems go={go} />}
      {!emergency && tab === 'Walkthrough' && <WalkthroughHub onStart={startTour} onClose={() => { setTour(null); setTab('Home'); }} closing={tour !== null} />}
      {!emergency && tab === 'Map' && <MapTab me={me} layers={layers} setLayers={setLayers} top={top} />}
      {!emergency && tab === 'Plan' && <Actions me={me} onChange={setMe} sub={sub} setSub={setSub} />}
      {!emergency && tab === 'Alerts' && <Alerts me={me} onChange={setMe} sub={sub} setSub={setSub} />}
      {!emergency && tab === 'Permits' && <Permits me={me} top={top} sub={sub} setSub={setSub} />}
      {!emergency && tab === 'Profile' && <Profile me={me} onChange={setMe} onSignOut={signOut} sub={sub} setSub={setSub} />}
    </ScrollView>
    {tour !== null && <TourOverlay steps={tourSteps} index={tour} onBack={() => goTour(Math.max(tour - 1, 0))} onNext={() => goTour(Math.min(tour + 1, tourSteps.length - 1))} onExit={() => { setTour(null); setEmergency(false); setTab('Home'); }} />}
    <View role="navigation"><View accessibilityRole="tablist" style={styles.nav}>{TABS.map(([item, icon, key]) => {
      const on = tab === item && !emergency;
      const go = () => { setEmergency(false); setTab(item); };
      if (item === 'Home') return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={t('nav.home')} accessibilityState={{ selected: on }} onPress={go} style={styles.homeWrap}>
        <View style={[styles.home, on && styles.homeOn]}><Icon name={on ? 'home' : 'home-outline'} size={26} color="#FFF" /></View>
      </Pressable>;
      return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={t(key)} accessibilityState={{ selected: on }} onPress={go} style={styles.navItem}>
        <Icon name={on ? icon : `${icon}-outline`} size={24} color={on ? color.green : '#56655F'} />
        <Text numberOfLines={1} style={[styles.navText, on && { color: color.green }]}>{t(key)}</Text>
      </Pressable>;
    })}</View></View>
  </SafeAreaView>;
}

function Shell({ children }) {
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView role="main" contentContainerStyle={styles.onboard} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#DCE1D9' },
  brand: { fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green },
  pill: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#7A4A12', backgroundColor: color.goldBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  onboard: { padding: 24, paddingTop: 36, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: color.line },
  navItem: { flex: 1, maxWidth: 110, alignItems: 'center', paddingTop: 8, gap: 2 },
  navText: { color: '#56655F', fontWeight: '700', fontSize: 12 },
  homeWrap: { flex: 1, maxWidth: 110, alignItems: 'center' },
  home: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#3F7A6A', alignItems: 'center', justifyContent: 'center', marginTop: -24, borderWidth: 4, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  homeOn: { backgroundColor: color.green },
  sos: { backgroundColor: '#B3261A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  sosText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: color.green, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  avatarOn: { backgroundColor: color.green },
  avatarText: { color: color.green, fontWeight: '900', fontSize: 12 },
});
