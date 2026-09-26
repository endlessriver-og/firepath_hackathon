import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api, loadSession, saveSession } from './src/api';
import { AboutYou, AddressPanel, Auth, HouseholdForm } from './src/onboarding';
import { Actions, Alerts, Home, Permits, Profile } from './src/tabs';
import { Button, ErrorText, color } from './src/ui';

const ONBOARDING = 'firepath-onboarding-step';
const TABS = ['Home', 'Actions', 'Alerts', 'Permits', 'Profile'];
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [step, setStep] = useState(0);     // onboarding step 1-3, 0 = done
  const [tab, setTab] = useState('Home');
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
  if (me === null) return <Shell><Auth onSignedIn={(result, isNew) => { setMe(result); if (isNew) goStep(1); }} /></Shell>;
  if (step === 1) return <Shell><AboutYou me={me} onSaved={next => { setMe(next); goStep(2); }} /></Shell>;
  if (step === 2) return <Shell><AddressPanel me={me} onChange={setMe} onDone={() => goStep(3)} onboarding /></Shell>;
  if (step === 3) return <Shell><HouseholdForm me={me} onSaved={next => { setMe(next); finish(); }} onboarding /></Shell>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.brand}>FIREPATH</Text><Text style={styles.pill}>GLENDALE PILOT · PROTOTYPE</Text></View>
    <ScrollView key={tab} ref={scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {tab === 'Home' && <Home me={me} onChange={setMe} go={setTab} />}
      {tab === 'Actions' && <Actions me={me} onChange={setMe} />}
      {tab === 'Alerts' && <Alerts me={me} />}
      {tab === 'Permits' && <Permits me={me} top={top} />}
      {tab === 'Profile' && <Profile me={me} onChange={setMe} onSignOut={signOut} />}
    </ScrollView>
    <View style={styles.nav}>{TABS.map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.active]}><Text style={[styles.navText, tab === item && { color: color.green }]}>{item}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

function Shell({ children }) {
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.onboard} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#DCE1D9' },
  brand: { fontSize: 15, fontWeight: '900', letterSpacing: 2, color: color.green },
  pill: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#7A4A12', backgroundColor: color.goldBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 40 },
  onboard: { padding: 24, paddingTop: 36, paddingBottom: 48 },
  nav: { flexDirection: 'row', padding: 6, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: color.line },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10 },
  active: { backgroundColor: color.soft },
  navText: { color: '#60706B', fontWeight: '700', fontSize: 13 },
});
