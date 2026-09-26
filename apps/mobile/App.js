import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api, loadSession, saveSession } from './src/api';
import { AboutYou, AddressPanel, BusinessDetails, BusinessProfile, HouseholdForm } from './src/onboarding';
import { Actions, Alerts, Home, MapTab, Permits, Profile, Systems } from './src/tabs';
import { Landing } from './src/landing';
import { EmergencyNow } from './src/emergency';
import { TourOverlay, WalkthroughHub } from './src/tour';
import { TOUR_STEPS } from './src/walkthrough';
import { Button, ErrorText, color } from './src/ui';

const ONBOARDING = 'firepath-onboarding-step';
// Bottom bar: four icon tabs around a raised Home button. Profile lives in the top bar.
const TABS = [['Map', 'map'], ['Plan', 'checkbox'], ['Home', 'home'], ['Alerts', 'notifications'], ['Permits', 'document-text']];
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [step, setStep] = useState(0);     // onboarding step 1-3, 0 = done
  const [tab, setTab] = useState('Home');
  const [layers, setLayers] = useState(['combined']);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [tour, setTour] = useState(null);          // walkthrough step index, null when not touring
  const [hub, setHub] = useState(false);           // signed-out walkthrough hub
  const [demoBusy, setDemoBusy] = useState(false), [demoError, setDemoError] = useState('');
  const goTour = i => { const stepDef = TOUR_STEPS[i]; setTour(i); setEmergency(Boolean(stepDef.emergency)); setTab(stepDef.tab); };
  async function startTour() {
    setDemoError('');
    if (!me) {
      setDemoBusy(true);
      try { const result = await api('POST', '/api/demo/start'); await saveSession(result.token); setMe(result); setStep(0); setHub(false); }
      catch (e) { setDemoError(e.message); setDemoBusy(false); return; }
      setDemoBusy(false);
    }
    goTour(0);
  } // checked on the public page before sign-up
  const go = (next, withLayers) => { if (withLayers) setLayers(withLayers); setTab(next); };
  const [error, setError] = useState('');
  const scroller = useRef(null);
  const top = () => scroller.current?.scrollTo({ y: 0, animated: false });

  async function load() {
    setError('');
    const token = await loadSession();
    if (!token) return setMe(null);
    try {
      setMe(await api('GET', '/api/me'));
      setStep(Number(await AsyncStorage.getItem(ONBOARDING).catch(() => 0)) || 0);
    } catch (e) {
      if (e.status === 401) { await saveSession(null); setMe(null); } else setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);
  const goStep = async n => { setStep(n); await AsyncStorage.setItem(ONBOARDING, String(n)).catch(() => {}); };
  const finish = async () => { setStep(0); setTab('Home'); await AsyncStorage.removeItem(ONBOARDING).catch(() => {}); };
  async function signOut() {
    await api('POST', '/api/account/logout').catch(() => {});
    await saveSession(null); await AsyncStorage.removeItem(ONBOARDING).catch(() => {});
    setMe(null); setTab('Home');
  }

  if (error) return <Shell><ErrorText>{error}</ErrorText><Button onPress={load}>Try again</Button></Shell>;
  if (me === undefined) return <Shell><ActivityIndicator color={color.green} style={{ marginTop: 80 }} /></Shell>;
  if (emergency && (me === null || step)) return <Shell><EmergencyNow me={me} onClose={() => setEmergency(false)} /></Shell>;
  if (me === null && hub) return <Shell><WalkthroughHub onStart={startTour} onClose={() => setHub(false)} busy={demoBusy} error={demoError} /></Shell>;
  if (me === null) return <Shell><Landing onEmergency={() => setEmergency(true)} onWalkthrough={() => setHub(true)} onSignedIn={(result, isNew, checked) => { setMe(result); setPendingAddress(isNew ? checked : null); if (isNew) goStep(1); }} /></Shell>;
  const business = me.user.type === 'business';
  if (step === 1) return <Shell>{business ? <BusinessProfile me={me} onSaved={next => { setMe(next); goStep(2); }} onboarding /> : <AboutYou me={me} onSaved={next => { setMe(next); goStep(2); }} />}</Shell>;
  if (step === 2) return <Shell><AddressPanel me={me} onChange={setMe} onDone={() => goStep(3)} onboarding initialAddress={pendingAddress} /></Shell>;
  if (step === 3) return <Shell>{business ? <BusinessDetails me={me} onSaved={next => { setMe(next); finish(); }} onboarding /> : <HouseholdForm me={me} onSaved={next => { setMe(next); finish(); }} onboarding />}</Shell>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}>
      <Text style={styles.brand}>FIREPATH</Text><Text style={styles.pill}>{business ? 'BUSINESS' : 'PILOT'}</Text>
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Emergency now" onPress={() => setEmergency(!emergency)} style={styles.sos}><Text style={styles.sosText}>{emergency ? 'Close' : 'Emergency'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile and settings" accessibilityState={{ selected: tab === 'Profile' }} onPress={() => { setEmergency(false); setTab('Profile'); }} style={[styles.avatar, tab === 'Profile' && !emergency && styles.avatarOn]}>
        <Text style={[styles.avatarText, tab === 'Profile' && !emergency && { color: '#FFF' }]}>{me.user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
      </Pressable>
    </View>
    <ScrollView key={emergency ? 'sos' : tab} ref={scroller} contentContainerStyle={[styles.content, tour !== null && { paddingBottom: 280 }]} keyboardShouldPersistTaps="handled">
      {emergency && <EmergencyNow me={me} onClose={() => setEmergency(false)} />}
      {!emergency && tab === 'Home' && <Home me={me} onChange={setMe} go={go} />}
      {!emergency && tab === 'Systems' && <Systems go={go} />}
      {!emergency && tab === 'Walkthrough' && <WalkthroughHub onStart={startTour} onClose={() => { setTour(null); setTab('Home'); }} closing={tour !== null} />}
      {!emergency && tab === 'Map' && <MapTab me={me} layers={layers} setLayers={setLayers} top={top} />}
      {!emergency && tab === 'Plan' && <Actions me={me} onChange={setMe} />}
      {!emergency && tab === 'Alerts' && <Alerts me={me} onChange={setMe} />}
      {!emergency && tab === 'Permits' && <Permits me={me} top={top} />}
      {!emergency && tab === 'Profile' && <Profile me={me} onChange={setMe} onSignOut={signOut} />}
    </ScrollView>
    {tour !== null && <TourOverlay index={tour} onBack={() => goTour(Math.max(tour - 1, 0))} onNext={() => goTour(Math.min(tour + 1, TOUR_STEPS.length - 1))} onExit={() => { setTour(null); setEmergency(false); setTab('Home'); }} />}
    <View style={styles.nav}>{TABS.map(([item, icon]) => {
      const on = tab === item && !emergency;
      const go = () => { setEmergency(false); setTab(item); };
      if (item === 'Home') return <Pressable key={item} accessibilityRole="tab" accessibilityLabel="Home" accessibilityState={{ selected: on }} onPress={go} style={styles.homeWrap}>
        <View style={[styles.home, on && styles.homeOn]}><Ionicons name={on ? 'home' : 'home-outline'} size={26} color="#FFF" /></View>
      </Pressable>;
      return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: on }} onPress={go} style={styles.navItem}>
        <Ionicons name={on ? icon : `${icon}-outline`} size={23} color={on ? color.green : '#7A8A83'} />
        <Text style={[styles.navText, on && { color: color.green }]}>{item}</Text>
      </Pressable>;
    })}</View>
  </SafeAreaView>;
}

function Shell({ children }) {
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.onboard} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
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
  navText: { color: '#7A8A83', fontWeight: '700', fontSize: 10 },
  homeWrap: { flex: 1, maxWidth: 110, alignItems: 'center' },
  home: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#3F7A6A', alignItems: 'center', justifyContent: 'center', marginTop: -24, borderWidth: 4, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  homeOn: { backgroundColor: color.green },
  sos: { backgroundColor: '#B3261A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  sosText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: color.green, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  avatarOn: { backgroundColor: color.green },
  avatarText: { color: color.green, fontWeight: '900', fontSize: 12 },
});
