import React, { useState } from 'react';
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import * as Notifications from 'expo-notifications';
import snapshot from './src/sample-location.json';
import { buildTasks, describeHazard, hazardNames } from './src/preparedness';

const point = { latitude: snapshot.location.lat, longitude: snapshot.location.lon };
const tasks = buildTasks({}, snapshot.hazards);
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [tab, setTab] = useState('Plan');
  const [done, setDone] = useState({});
  async function demoNotification() {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Notifications off', 'Enable notifications in device settings to try the local demo.');
      await Notifications.scheduleNotificationAsync({ content: { title: 'FirePath demo reminder', body: 'Review your household plan. This is a test, not an emergency alert.', data: { demo: true } }, trigger: null });
    } catch (error) { Alert.alert('Notification unavailable', String(error?.message || error)); }
  }
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.brand}>FIREPATH</Text><Text style={styles.muted}>Prepare for where you live</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.notice}><Text style={styles.tag}>DEMO LOCATION · GLENDALE CIVIC CENTER</Text><Text style={styles.muted}>Sample point and cached public map results. No home address or live emergency status is used.</Text></View>
      {tab === 'Plan' && <><Text style={styles.title}>Your preparedness plan</Text><Text style={styles.muted}>Tap a step to mark it done for this session.</Text>{tasks.map(task => <Pressable accessibilityRole="button" key={task.id} style={styles.card} onPress={() => setDone(current => ({ ...current, [task.id]: !current[task.id] }))}><Text style={styles.tag}>{task.tag.toUpperCase()} · {done[task.id] ? 'DONE' : 'TO DO'}</Text><Text style={styles.cardTitle}>{task.title}</Text><Text style={styles.muted}>{task.description}</Text>{task.url && <Text style={styles.link} onPress={event => { event.stopPropagation(); Linking.openURL(task.url); }}>{task.link || 'Read guidance'} ↗</Text>}</Pressable>)}</>}
      {tab === 'Map' && <><Text style={styles.title}>Location and mapped hazards</Text><MapView style={styles.map} initialRegion={{ ...point, latitudeDelta: 0.035, longitudeDelta: 0.035 }}><Marker coordinate={point} title="Demo location" /></MapView><Text style={styles.caption}>The pin marks the sample lookup point. Separate GIS lookups supply the results below; no hazard boundaries or safe routes are drawn.</Text>{Object.entries(snapshot.hazards).map(([key, hazard]) => { const result = describeHazard(key, hazard); return <View key={key} style={styles.card}><Text style={styles.tag}>{hazardNames[key]?.toUpperCase() || key.toUpperCase()}</Text><Text style={styles.cardTitle}>{result.label}</Text><Text style={styles.muted}>{result.detail}</Text><Text style={styles.caption}>Source: {hazard._meta?.source || 'Unknown'} · checked {hazard._meta?.as_of?.slice(0, 10) || 'unknown'}</Text></View>; })}</>}
      {tab === 'Alerts' && <><Text style={styles.title}>Stay informed</Text><View style={styles.card}><Text style={styles.cardTitle}>Official city alerts</Text><Text style={styles.muted}>Sign up with Glendale for real emergency notifications. FirePath is not connected to the city's alert feed.</Text><Text style={styles.link} onPress={() => Linking.openURL('https://www.glendaleca.gov/Everbridge')}>Open city signup ↗</Text></View><View style={styles.card}><Text style={styles.cardTitle}>Try a phone notification</Text><Text style={styles.muted}>Sends a local test notification on this device. No emergency event is implied.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={demoNotification}><Text style={styles.buttonText}>Send demo notification</Text></Pressable></View><Text style={styles.caption}>For an actual emergency, follow official instructions. Push delivery may be delayed or unavailable.</Text></>}
    </ScrollView><View style={styles.nav}>{['Plan', 'Map', 'Alerts'].map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.active]}><Text style={[styles.navText, tab === item && styles.activeText]}>{item}</Text></Pressable>)}</View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F5F6F1' }, header: { padding: 20, borderBottomWidth: 1, borderColor: '#DCE1D9' }, brand: { fontSize: 15, fontWeight: '900', letterSpacing: 2, color: '#1D5B4D' }, content: { padding: 20, paddingBottom: 32 }, notice: { backgroundColor: '#E6EFE9', borderRadius: 15, padding: 16, marginBottom: 22 }, title: { fontSize: 27, fontWeight: '800', color: '#17372E', marginBottom: 7 }, muted: { color: '#53655E', lineHeight: 21, fontSize: 14 }, card: { backgroundColor: '#FFF', borderRadius: 17, padding: 18, marginTop: 13, borderWidth: 1, borderColor: '#E2E8E1' }, tag: { color: '#367363', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }, cardTitle: { color: '#17372E', fontSize: 18, fontWeight: '700', marginBottom: 6 }, link: { color: '#086B56', fontWeight: '700', marginTop: 12 }, map: { height: 250, borderRadius: 17, marginTop: 18 }, caption: { color: '#64756E', fontSize: 11, lineHeight: 17, marginTop: 12 }, button: { backgroundColor: '#1D5B4D', borderRadius: 12, padding: 14, marginTop: 15, alignItems: 'center' }, buttonText: { color: '#FFF', fontWeight: '800' }, nav: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E2E8E1' }, navItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 }, active: { backgroundColor: '#E6EFE9' }, navText: { color: '#60706B', fontWeight: '700' }, activeText: { color: '#1D5B4D' } });
