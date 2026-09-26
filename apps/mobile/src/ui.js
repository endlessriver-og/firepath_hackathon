import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, { Circle } from 'react-native-svg';
import { cityData } from './city-data';
import { LANGS, useI18n } from './i18n';

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

// Collapsible container: a tappable header row with a summary; content only when open. Keeps pages short.
export function Collapsible({ title, summary, icon, initiallyOpen = false, children, tone }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={[s.card, { padding: 0, overflow: 'hidden' }, tone === 'blue' && { borderColor: '#C9D8EA' }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
      {icon ? <Text style={{ fontSize: 20 }}>{icon}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: color.ink, fontSize: 16, fontWeight: '800' }}>{title}</Text>
        {summary ? <Text style={{ color: color.muted, fontSize: 13, marginTop: 2 }}>{summary}</Text> : null}
      </View>
      <Text style={{ color: color.green, fontSize: 18, fontWeight: '900' }}>{open ? '−' : '+'}</Text>
    </Pressable>
    {open && <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderColor: color.line }}>{children}</View>}
  </View>;
}

// Completion ring: percent done, drawn with SVG so it looks the same on web, iOS and Android.
export function ProgressRing({ percent, size = 96, stroke = 10, track = '#DDE4DC', fill = color.green, label, textColor = color.ink }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.min(Math.max(percent, 0), 100);
  return <View accessibilityRole="progressbar" accessibilityLabel={`${p}% complete`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={fill} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p / 100)} />
    </Svg>
    <Text style={{ fontSize: size * 0.24, fontWeight: '900', color: textColor }}>{p}%</Text>
    {label ? <Text style={{ fontSize: 10, color: textColor, opacity: 0.8, marginTop: -2 }}>{label}</Text> : null}
  </View>;
}

// Sub-tabs at the top of a page: keeps long pages short. options: [[value, label], ...]
export function SubTabs({ value, options, onChange }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#D5DDD5', marginTop: 6, marginBottom: 4 }}>
    {options.map(([key, label]) => { const on = value === key; return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 3, borderColor: on ? color.green : 'transparent', marginBottom: -1 }}>
      <Text style={{ fontWeight: '800', fontSize: 14, color: on ? color.green : '#7A8A83' }}>{label}</Text>
    </Pressable>; })}
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

// Language and text-size pickers (dropdowns). Shown on the landing page, in Profile and in Emergency.
// Slim single row for the top of the public page: globe + language, Aa + text size.
export function LanguageBar() {
  const { lang, setLang, scale, setScale } = useI18n();
  const pick = (value, options, onChange, label, width) => <View style={{ flex: width, borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 10, backgroundColor: '#FFF', overflow: 'hidden' }}>
    <Picker accessibilityLabel={label} selectedValue={value} onValueChange={onChange} style={{ height: 38, borderWidth: 0, backgroundColor: 'transparent', color: color.ink, fontSize: 13, paddingHorizontal: 8 }}>{options.map(([k, t]) => <Picker.Item key={k} label={t} value={k} />)}</Picker>
  </View>;
  return <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }}>
    <Text style={{ fontSize: 16 }}>🌐</Text>{pick(lang, LANGS, v => setLang(v || 'en'), 'Language', 1.6)}
    <Text style={{ fontSize: 14, fontWeight: '900', color: color.ink }}>Aa</Text>{pick(String(scale), [['1', 'A'], ['1.2', 'A+'], ['1.4', 'A++']], v => setScale(Number(v) || 1), 'Text size', 0.8)}
  </View>;
}

export function LanguageSettings({ compact }) {
  const { lang, setLang, scale, setScale, t } = useI18n();
  return <View style={compact ? { flexDirection: 'row', gap: 8 } : null}>
    <View style={compact ? { flex: 1.3 } : null}><Select label={t('set.language')} value={lang} options={LANGS} onChange={v => setLang(v || 'en')} /></View>
    <View style={compact ? { flex: 1 } : null}><Select label={t('set.text')} value={String(scale)} options={[['1', t('set.normal')], ['1.2', t('set.large')], ['1.4', t('set.xl')]]} onChange={v => setScale(Number(v) || 1)} /></View>
  </View>;
}
