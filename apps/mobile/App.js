import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import MapPanel from './src/MapPanel';
import { formatDate, samples, sampleById, snapshotDate } from './src/samples';
import { buildTasks, describeHazard, hazardNames, nextSteps, summarizePlace } from './src/preparedness';

const STORE = 'firepath-mobile-v1';
const EVERBRIDGE = 'https://www.glendaleca.gov/Everbridge';
const KNOW_YOUR_ZONE = 'https://www.glendaleca.gov/government/departments/fire-department/other-links/emergency-preparedness-response/know-your-zone';
const initial = { stage: 'place', sampleId: 'sparr', profile: { housing: 'own', homeType: 'house', pets: false, assistance: false }, done: {}, plan: { near: '', far: '', contact: '' } };
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('Home');
  useEffect(() => { AsyncStorage.getItem(STORE).then(raw => setState({ ...initial, ...JSON.parse(raw || '{}') })).catch(() => setState(initial)); }, []);
  function update(patch) {
    setState(current => { const next = { ...current, ...patch }; AsyncStorage.setItem(STORE, JSON.stringify(next)).catch(() => {}); return next; });
  }
  if (!state) return <SafeAreaView style={styles.safe} />;

  const sample = sampleById(state.sampleId);
  const hazards = sample.data.hazards;
  const tasks = buildTasks(state.profile, hazards);
  const toggle = id => update({ done: { ...state.done, [id]: !state.done[id] } });
  const restart = () => { setTab('Home'); update({ stage: 'place' }); };
  const startOver = () => { setTab('Home'); AsyncStorage.removeItem(STORE).catch(() => {}); setState(initial); };

  if (state.stage === 'place') return <Screen><PlacePicker selected={state.sampleId} onPick={sampleId => update({ sampleId, stage: 'household' })} /></Screen>;
  if (state.stage === 'household') return <Screen><Household profile={state.profile} onChange={profile => update({ profile })} onBack={() => update({ stage: 'place' })} onDone={() => { setTab('Home'); update({ stage: 'app' }); }} /></Screen>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.brand}>FIREPATH</Text><Text style={styles.pill}>DEMO</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      {tab === 'Home' && <Home sample={sample} tasks={tasks} done={state.done} onToggle={toggle} onChange={restart} onStartOver={startOver} go={setTab} />}
      {tab === 'Plan' && <Plan tasks={tasks} done={state.done} onToggle={toggle} plan={state.plan} onPlan={plan => update({ plan })} />}
      {tab === 'Map' && <MapTab sample={sample} />}
      {tab === 'Alerts' && <Alerts />}
    </ScrollView>
    <View style={styles.nav}>{['Home', 'Plan', 'Map', 'Alerts'].map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.active]}><Text style={[styles.navText, tab === item && styles.activeText]}>{item}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

function Screen({ children }) {
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.onboard}>{children}</ScrollView></SafeAreaView>;
}

function PlacePicker({ selected, onPick }) {
  return <>
    <Text style={styles.brand}>FIREPATH</Text>
    <Text style={styles.hero}>Know what's mapped where you live, and what to do about it.</Text>
    <View style={styles.notice}><Text style={styles.noticeTitle}>This demo does not use your address or GPS.</Text><Text style={styles.muted}>Choose a public sample place in Glendale. Results are a dated snapshot of state and federal planning maps, not live incidents.</Text></View>
    <Text style={styles.step}>STEP 1 OF 2 · CHOOSE A SAMPLE PLACE</Text>
    {samples.map(sample => { const mapped = summarizePlace(sample.data.hazards).mapped; return (
      <Pressable key={sample.id} accessibilityRole="button" onPress={() => onPick(sample.id)} style={[styles.card, selected === sample.id && styles.cardSelected]}>
        <Text style={styles.tag}>{sample.area.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{sample.name}</Text>
        <Text style={styles.muted}>{mapped.length ? `${mapped.length} of 7 map layers flag this point: ${mapped.map(item => item.name.toLowerCase()).join(', ')}.` : 'None of the 7 map layers flag this point. That is not the same as no risk.'}</Text>
        <Text style={styles.link}>Use this place →</Text>
      </Pressable>); })}
  </>;
}

function Household({ profile, onChange, onBack, onDone }) {
  const set = patch => onChange({ ...profile, ...patch });
  return <>
    <Text style={styles.step}>STEP 2 OF 2 · YOUR HOUSEHOLD</Text>
    <Text style={styles.title}>Who is this plan for?</Text>
    <Text style={styles.muted}>Answers change which steps you see. They are saved only on this device.</Text>
    <Segment label="Housing" value={profile.housing} options={[['own', 'I own'], ['rent', 'I rent']]} onChange={housing => set({ housing })} />
    <Segment label="Home type" value={profile.homeType} options={[['house', 'House'], ['apartment', 'Apartment / condo']]} onChange={homeType => set({ homeType })} />
    <Toggle label="Pets at home" value={profile.pets} onChange={pets => set({ pets })} />
    <Toggle label="Someone needs extra help to leave" value={profile.assistance} onChange={assistance => set({ assistance })} />
    <Pressable accessibilityRole="button" style={styles.button} onPress={onDone}><Text style={styles.buttonText}>Build my plan</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onBack}><Text style={[styles.link, styles.center]}>← Choose a different place</Text></Pressable>
  </>;
}

function Segment({ label, value, options, onChange }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.segment}>{options.map(([key, text]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={[styles.segmentItem, value === key && styles.segmentOn]}><Text style={[styles.segmentText, value === key && styles.segmentTextOn]}>{text}</Text></Pressable>)}</View></View>;
}

function Toggle({ label, value, onChange }) {
  return <View style={[styles.field, styles.toggleRow]}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onChange} accessibilityLabel={label} /></View>;
}

function PlaceCard({ sample, onChange }) {
  return <View style={styles.notice}>
    <Text style={styles.tag}>SAMPLE PLACE · NOT YOUR HOME</Text>
    <Text style={styles.cardTitle}>{sample.name}</Text>
    <Text style={styles.muted}>Map snapshot {snapshotDate(sample.data.hazards)} · planning data, not live incidents</Text>
    {onChange && <Pressable accessibilityRole="button" onPress={onChange}><Text style={styles.link}>Change place or household</Text></Pressable>}
  </View>;
}

function Home({ sample, tasks, done, onToggle, onChange, onStartOver, go }) {
  const place = summarizePlace(sample.data.hazards);
  const complete = tasks.filter(task => done[task.id]).length;
  const next = nextSteps(tasks, done);
  return <>
    <PlaceCard sample={sample} onChange={onChange} />
    <Text style={styles.section}>What the maps show here</Text>
    {place.mapped.length ? place.mapped.map(item => <View key={item.key} style={styles.mappedRow}><Text style={styles.mappedDot}>●</Text><View style={styles.flex}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.muted}>{item.label}</Text></View></View>)
      : <Text style={styles.muted}>No mapped hazard zone includes this point.</Text>}
    {place.outside.length > 0 && <Text style={styles.caption}>Not mapped at this point: {place.outside.map(item => item.name.toLowerCase()).join(', ')}. Outside a mapped zone does not mean no risk.</Text>}
    {place.unknown.length > 0 && <Text style={styles.caption}>Could not check: {place.unknown.map(item => item.name.toLowerCase()).join(', ')}.</Text>}
    <Pressable onPress={() => go('Map')}><Text style={styles.link}>Sources and details →</Text></Pressable>

    <Text style={styles.section}>Your next steps</Text>
    <Progress complete={complete} total={tasks.length} />
    {next.length ? next.map(task => <TaskRow key={task.id} task={task} done={false} onToggle={onToggle} />) : <View style={styles.card}><Text style={styles.cardTitle}>Every step is done.</Text><Text style={styles.muted}>Review your plan every few months and after anything in your household changes.</Text></View>}
    <Pressable onPress={() => go('Plan')}><Text style={styles.link}>See your full plan →</Text></Pressable>

    <View style={[styles.card, styles.official]}>
      <Text style={styles.tag}>REAL EMERGENCY ALERTS</Text>
      <Text style={styles.cardTitle}>Get alerts from the City of Glendale</Text>
      <Text style={styles.muted}>FirePath does not receive or send live alerts. The City's Everbridge system does.</Text>
      <Text style={styles.link} onPress={() => Linking.openURL(EVERBRIDGE)}>Sign up with the City ↗</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={onStartOver}><Text style={[styles.caption, styles.center]}>Start over · clears the demo data saved on this device</Text></Pressable>
  </>;
}

function Progress({ complete, total }) {
  return <View style={styles.progressWrap} accessibilityLabel={`${complete} of ${total} steps done`}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${total ? (complete / total) * 100 : 0}%` }]} /></View><Text style={styles.caption}>{complete} of {total} steps done</Text></View>;
}

function TaskRow({ task, done, onToggle }) {
  return <View style={[styles.card, styles.taskRow, done && styles.taskDone]}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={task.title} onPress={() => onToggle(task.id)} style={[styles.check, done && styles.checkOn]}><Text style={styles.checkMark}>{done ? '✓' : ''}</Text></Pressable>
    <View style={styles.flex}>
      <Text style={styles.tag}>{task.tag.toUpperCase()}</Text>
      <Text style={[styles.rowTitle, done && styles.struck]}>{task.title}</Text>
      {!done && <Text style={styles.muted}>{task.description}</Text>}
      {!done && task.url && <Text style={styles.link} onPress={() => Linking.openURL(task.url)}>{task.link || 'Read guidance'} ↗</Text>}
    </View>
  </View>;
}

function Plan({ tasks, done, onToggle, plan, onPlan }) {
  const complete = tasks.filter(task => done[task.id]).length;
  const field = (key, label, placeholder) => <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={plan[key]} placeholder={placeholder} placeholderTextColor="#8A9A93" maxLength={80} onChangeText={text => onPlan({ ...plan, [key]: text })} accessibilityLabel={label} /></View>;
  return <>
    <Text style={styles.title}>Your plan</Text>
    <Progress complete={complete} total={tasks.length} />
    {nextSteps(tasks, done, tasks.length).map(task => <TaskRow key={task.id} task={task} done={false} onToggle={onToggle} />)}
    {tasks.filter(task => done[task.id]).map(task => <TaskRow key={task.id} task={task} done onToggle={onToggle} />)}

    <Text style={styles.section}>Where your household meets</Text>
    <Text style={styles.muted}>Agree on these ahead of time so no one has to decide under pressure. Saved only on this device.</Text>
    {field('near', 'Meeting place near home', 'e.g., the oak tree at the corner')}
    {field('far', 'Meeting place outside the neighborhood', 'e.g., the library on Honolulu Ave')}
    {field('contact', 'Out-of-area contact', 'e.g., Aunt Rosa in Fresno')}
    <Text style={styles.caption}>FirePath does not choose evacuation routes. If you are told to leave, follow official instructions for your zone; roads that are usually fine may be closed.</Text>
    <Text style={styles.link} onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>Know your evacuation zone ↗</Text>
  </>;
}

function MapTab({ sample }) {
  const { location, hazards } = sample.data;
  const place = summarizePlace(hazards);
  const order = [...place.mapped, ...place.unknown, ...place.outside].map(item => item.key);
  return <>
    <PlaceCard sample={sample} />
    <MapPanel style={styles.map} point={{ latitude: location.lat, longitude: location.lon }} title={sample.name} />
    <Text style={styles.caption}>The pin marks the sample lookup point. Hazard boundaries and routes are not drawn; each result below is a point check against one map.</Text>
    {order.map(key => { const hazard = hazards[key]; const result = describeHazard(key, hazard); const meta = hazard?._meta || {}; return (
      <View key={key} style={[styles.card, result.tone === 'mapped' && styles.cardMapped]}>
        <Text style={[styles.tag, result.tone === 'mapped' && styles.tagWarm]}>{hazardNames[key].toUpperCase()} · {result.tone === 'mapped' ? 'ON MAP' : result.tone === 'outside' ? 'NOT MAPPED HERE' : 'UNKNOWN'}</Text>
        <Text style={styles.rowTitle}>{result.label}</Text>
        <Text style={styles.muted}>{result.detail}</Text>
        <Text style={styles.caption}>Source: {meta.source || 'Unknown'} · checked {formatDate(meta.as_of)}</Text>
      </View>); })}
  </>;
}

function Alerts() {
  async function demoNotification() {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Notifications off', 'Enable notifications in device settings to try the local demo.');
      await Notifications.scheduleNotificationAsync({ content: { title: 'FirePath demo reminder', body: 'Review your household plan. This is a test, not an emergency alert.', data: { demo: true } }, trigger: null });
    } catch (error) { Alert.alert('Notification unavailable', String(error?.message || error)); }
  }
  return <>
    <Text style={styles.title}>Stay informed</Text>
    <View style={[styles.card, styles.official]}><Text style={styles.tag}>OFFICIAL</Text><Text style={styles.cardTitle}>City of Glendale alerts</Text><Text style={styles.muted}>Sign up with Glendale for real emergency notifications. FirePath is not connected to the City's alert feed.</Text><Text style={styles.link} onPress={() => Linking.openURL(EVERBRIDGE)}>Open City signup ↗</Text><Text style={styles.link} onPress={() => Linking.openURL(KNOW_YOUR_ZONE)}>Know your evacuation zone ↗</Text></View>
    <View style={styles.card}><Text style={styles.tag}>LOCAL TEST ONLY</Text><Text style={styles.cardTitle}>Try a phone notification</Text><Text style={styles.muted}>Sends a test notification from this device to itself. It is not an emergency alert and proves no connection to any alert system.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={demoNotification}><Text style={styles.buttonText}>Send test notification</Text></Pressable></View>
    <Text style={styles.caption}>For an actual emergency, follow official instructions. Call 911 for immediate danger.</Text>
  </>;
}

const green = '#1D5B4D', ink = '#17372E', warm = '#B4502B';
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6F1' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#DCE1D9' },
  brand: { fontSize: 15, fontWeight: '900', letterSpacing: 2, color: green },
  pill: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#7A4A12', backgroundColor: '#F6E6C8', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 32 },
  onboard: { padding: 24, paddingTop: 36, paddingBottom: 40 },
  hero: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: ink, marginTop: 18, marginBottom: 18 },
  notice: { backgroundColor: '#E6EFE9', borderRadius: 15, padding: 16, marginBottom: 8 },
  noticeTitle: { color: ink, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  step: { color: '#367363', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 4 },
  title: { fontSize: 27, fontWeight: '800', color: ink, marginBottom: 7 },
  section: { fontSize: 20, fontWeight: '800', color: ink, marginTop: 26, marginBottom: 8 },
  muted: { color: '#53655E', lineHeight: 21, fontSize: 14 },
  card: { backgroundColor: '#FFF', borderRadius: 17, padding: 18, marginTop: 12, borderWidth: 1, borderColor: '#E2E8E1' },
  cardSelected: { borderColor: green, borderWidth: 2 },
  cardMapped: { borderColor: '#E9C2AE', backgroundColor: '#FFF9F5' },
  official: { borderColor: '#B9D3C8', marginTop: 26 },
  tag: { color: '#367363', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  tagWarm: { color: warm },
  cardTitle: { color: ink, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  rowTitle: { color: ink, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  link: { color: '#086B56', fontWeight: '700', marginTop: 12 },
  center: { textAlign: 'center', marginTop: 18 },
  map: { height: 240, borderRadius: 17, marginTop: 16 },
  caption: { color: '#64756E', fontSize: 12, lineHeight: 18, marginTop: 10 },
  button: { backgroundColor: green, borderRadius: 12, padding: 15, marginTop: 22, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  field: { marginTop: 16 },
  fieldLabel: { color: ink, fontWeight: '700', marginBottom: 7 },
  segment: { flexDirection: 'row', backgroundColor: '#E4E9E2', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  segmentOn: { backgroundColor: '#FFF' },
  segmentText: { color: '#60706B', fontWeight: '700' },
  segmentTextOn: { color: ink },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8E1' },
  toggleLabel: { color: ink, fontWeight: '600', flex: 1, marginRight: 12 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, padding: 13, fontSize: 15, color: ink },
  mappedRow: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF9F5', borderWidth: 1, borderColor: '#E9C2AE', borderRadius: 14, padding: 14, marginTop: 8 },
  mappedDot: { color: warm, fontSize: 14, marginTop: 2 },
  progressWrap: { marginBottom: 2 },
  progressTrack: { height: 8, backgroundColor: '#DDE4DC', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: green },
  taskRow: { flexDirection: 'row', gap: 14 },
  taskDone: { opacity: 0.6 },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: green, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkOn: { backgroundColor: green },
  checkMark: { color: '#FFF', fontWeight: '900' },
  struck: { textDecorationLine: 'line-through' },
  nav: { flexDirection: 'row', padding: 8, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E2E8E1' },
  navItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 },
  active: { backgroundColor: '#E6EFE9' },
  navText: { color: '#60706B', fontWeight: '700' },
  activeText: { color: green },
});
