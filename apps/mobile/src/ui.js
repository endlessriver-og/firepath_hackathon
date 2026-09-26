import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { cityData } from './city-data';

export const color = { bg: '#F5F6F1', ink: '#17372E', green: '#1D5B4D', muted: '#53655E', line: '#E2E8E1', soft: '#E6EFE9', warm: '#B4502B', warmBg: '#FFF9F5', warmLine: '#E9C2AE', gold: '#8A5A12', goldBg: '#F6E6C8', blue: '#2E5A88', blueBg: '#EAF1F8' };

export const Title = ({ children, style }) => <Text style={[s.title, style]}>{children}</Text>;
export const Section = ({ children }) => <Text style={s.section}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Caption = ({ children, style }) => <Text style={[s.caption, style]}>{children}</Text>;
export const Tag = ({ children, tone }) => <Text style={[s.tag, tone === 'warm' && { color: color.warm }, tone === 'gold' && { color: color.gold }]}>{String(children).toUpperCase()}</Text>;
export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const Step = ({ n, of, label }) => <Text style={s.step}>STEP {n} OF {of} · {label.toUpperCase()}</Text>;
export const Link = ({ children, onPress, style }) => <Text accessibilityRole="link" style={[s.link, style]} onPress={onPress}>{children}</Text>;
export const ErrorText = ({ children }) => children ? <Text accessibilityRole="alert" style={s.error}>{children}</Text> : null;

export function Button({ children, onPress, busy, kind = 'primary', disabled, style }) {
  const off = busy || disabled;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: off, busy }} disabled={off} onPress={onPress} style={[s.button, kind === 'outline' && s.buttonOutline, off && { opacity: 0.55 }, style]}>
    {busy ? <ActivityIndicator color={kind === 'outline' ? color.green : '#FFF'} /> : <Text style={[s.buttonText, kind === 'outline' && { color: color.green }]}>{children}</Text>}
  </Pressable>;
}

export function Field({ label, hint, style, ...input }) {
  return <View style={[s.field, style]}>
    <Text style={s.fieldLabel}>{label}</Text>
    {hint ? <Text style={s.hint}>{hint}</Text> : null}
    <TextInput style={s.input} placeholderTextColor="#8A9A93" accessibilityLabel={label} {...input} />
  </View>;
}

export function Segment({ label, value, options, onChange }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.segment}>{options.map(([key, text]) =>
    <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={[s.segmentItem, value === key && s.segmentOn]}><Text style={[s.segmentText, value === key && { color: color.ink }]}>{text}</Text></Pressable>)}</View></View>;
}

// Dropdown (preferred over pill selectors). options: [[value, label], ...]
export function Select({ label, hint, value, options, onChange, placeholder }) {
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    {hint ? <Text style={s.hint}>{hint}</Text> : null}
    <View style={s.select}>
      <Picker accessibilityLabel={label} selectedValue={value ?? ''} onValueChange={v => onChange(v === '' ? null : v)} style={s.picker} dropdownIconColor={color.green}>
        {placeholder ? <Picker.Item label={placeholder} value="" color="#8A9A93" /> : null}
        {options.map(([key, text]) => <Picker.Item key={key} label={text} value={key} />)}
      </Picker>
    </View>
  </View>;
}

export function Toggle({ label, detail, value, onChange }) {
  return <View style={[s.field, s.toggleRow]}><View style={{ flex: 1, marginRight: 12 }}><Text style={s.toggleLabel}>{label}</Text>{detail ? <Text style={s.hint}>{detail}</Text> : null}</View><Switch value={value} onValueChange={onChange} accessibilityLabel={label} /></View>;
}

export function Chips({ value, options, onChange }) {
  return <View style={s.chips}>{options.map(([key, text]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={[s.chip, value === key && s.chipOn]}><Text style={[s.chipText, value === key && { color: '#FFF' }]}>{text}</Text></Pressable>)}</View>;
}

// "If we had City data" callout, fed by src/city-data.js so every screen says it the same way.
export function CityDataCallout({ id }) {
  const item = cityData[id];
  return <View style={s.callout}>
    <Text style={s.calloutTag}>NEEDS CITY DATA</Text>
    <Text style={s.calloutText}>With the City's <Text style={{ fontWeight: '800' }}>{item.dataset}</Text> (for example, <Text style={{ fontStyle: 'italic' }}>{item.example}</Text>), FirePath could {item.unlocks}.</Text>
  </View>;
}

// Severity dots: filled up to the level on sources with a 3-step scale; binary layers get a pill instead.
export function SeverityBadge({ severity }) {
  if (severity.level === 'zone') return <Text style={{ alignSelf: 'flex-start', backgroundColor: '#F3E3EF', color: '#7B2D8B', fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>IN MAPPED ZONE</Text>;
  if (typeof severity.level !== 'number') return <Text style={{ color: color.muted, fontWeight: '700', fontSize: 12 }}>{severity.label}</Text>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`Severity ${severity.label}`}>
    {[1, 2, 3].map(n => <View key={n} style={{ width: 16, height: 8, borderRadius: 4, backgroundColor: n <= severity.level ? ['#F5CF4A', '#E8641E', '#B3261A'][severity.level - 1] : '#E0E5DE' }} />)}
    <Text style={{ marginLeft: 6, color: color.ink, fontWeight: '800', fontSize: 12 }}>{severity.label}</Text>
  </View>;
}

export function ScoreBar({ value }) {
  return <View style={s.track}><View style={[s.fill, { width: `${Math.min(Math.max(value, 0), 100)}%` }]} /></View>;
}

export const s = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: color.ink, marginBottom: 8 },
  section: { fontSize: 20, fontWeight: '800', color: color.ink, marginTop: 26, marginBottom: 8 },
  muted: { color: color.muted, lineHeight: 21, fontSize: 14 },
  caption: { color: '#64756E', fontSize: 12, lineHeight: 18, marginTop: 10 },
  tag: { color: '#367363', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  step: { color: '#367363', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  card: { backgroundColor: '#FFF', borderRadius: 17, padding: 18, marginTop: 12, borderWidth: 1, borderColor: color.line },
  link: { color: '#086B56', fontWeight: '700', marginTop: 12 },
  error: { color: '#A12D1F', fontWeight: '600', marginTop: 12, lineHeight: 20 },
  button: { backgroundColor: color.green, borderRadius: 12, padding: 15, marginTop: 18, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color.green },
  buttonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  field: { marginTop: 16 },
  fieldLabel: { color: color.ink, fontWeight: '700', marginBottom: 6 },
  hint: { color: '#64756E', fontSize: 12, lineHeight: 17, marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, padding: 13, fontSize: 15, color: color.ink },
  select: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 48, borderWidth: 0, backgroundColor: 'transparent', color: color.ink, fontSize: 15, paddingHorizontal: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#E4E9E2', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  segmentOn: { backgroundColor: '#FFF' },
  segmentText: { color: '#60706B', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color.line },
  toggleLabel: { color: color.ink, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5' },
  chipOn: { backgroundColor: color.green, borderColor: color.green },
  chipText: { color: color.ink, fontWeight: '700', fontSize: 13 },
  callout: { backgroundColor: color.blueBg, borderRadius: 14, padding: 14, marginTop: 14, borderLeftWidth: 4, borderLeftColor: color.blue },
  calloutTag: { color: color.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  calloutText: { color: '#23405F', fontSize: 13, lineHeight: 19 },
  track: { height: 10, backgroundColor: '#DDE4DC', borderRadius: 5, overflow: 'hidden', marginTop: 10 },
  fill: { height: 10, backgroundColor: color.green },
});
