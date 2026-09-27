import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, { Circle } from 'react-native-svg';
import { cityData } from './city-data';
import { LANGS, translateError, useI18n } from './i18n';

export const color = { bg: '#F5F6F1', ink: '#17372E', green: '#1D5B4D', muted: '#53655E', line: '#E2E8E1', soft: '#E6EFE9', warm: '#B4502B', warmBg: '#FFF9F5', warmLine: '#E9C2AE', gold: '#8A5A12', goldBg: '#F6E6C8', blue: '#2E5A88', blueBg: '#EAF1F8' };

export const Title = ({ children, style }) => <Text role="heading" aria-level={1} style={[s.title, style]}>{children}</Text>;
export const Section = ({ children }) => <Text style={s.section}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Caption = ({ children, style }) => <Text style={[s.caption, style]}>{children}</Text>;
// Alert.alert is a no-op in react-native-web, so the browser gets window.alert instead.
export const showAlert = (title, message) => Platform.OS === 'web' ? window.alert(message ? `${title}\n\n${message}` : title) : Alert.alert(title, message);
export const Tag = ({ children, tone }) => <Text style={[s.tag, tone === 'warm' && { color: color.warm }, tone === 'gold' && { color: color.gold }]}>{[].concat(children).join('').toUpperCase()}</Text>;
export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export function Step({ n, of, label }) {
  const { t } = useI18n();
  return <Text style={s.step}>{t('ui.step', { n, of }).toUpperCase()} · {label.toUpperCase()}</Text>;
}
export const Link = ({ children, onPress, style }) => <Text accessibilityRole="link" style={[s.link, style]} onPress={onPress}>{children}</Text>;
export function ErrorText({ children }) {
  const { lang } = useI18n();
  return children ? <Text accessibilityRole="alert" style={s.error}>{translateError(lang, children)}</Text> : null;
}

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

// "If we had City data" callout, fed by src/city-data.js: one headline, details on tap.
export function CityDataCallout({ id }) {
  const item = cityData[id];
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const title = t(`cd.${id}`) === `cd.${id}` ? item.title : t(`cd.${id}`); // English titles live in city-data.js
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={s.callout}>
    <Text style={s.calloutTag}>{t('cd.tag')} {open ? '−' : '+'}</Text>
    <Text style={[s.calloutText, { fontWeight: '800' }]}>{title}</Text>
    {open && (t(`cdx.${id}`) !== `cdx.${id}` ? <Text style={[s.calloutText, { marginTop: 4 }]}>{t(`cdx.${id}`)}</Text> : <Text style={[s.calloutText, { marginTop: 4 }]}>With the City's {item.dataset} (for example, <Text style={{ fontStyle: 'italic' }}>{item.example}</Text>), FirePath could {item.unlocks}.</Text>)}
  </Pressable>;
}

// Severity dots: filled up to the level on sources with a 3-step scale; binary layers get a pill instead.
export function SeverityBadge({ severity }) {
  const { t } = useI18n();
  if (severity.level === 'zone') return <Text style={{ alignSelf: 'flex-start', backgroundColor: '#F3E3EF', color: '#7B2D8B', fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>{t('mx.inZone')}</Text>;
  if (typeof severity.level !== 'number') return <Text style={{ color: color.muted, fontWeight: '700', fontSize: 12 }}>{severity.label}</Text>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`Severity ${severity.label}`}>
    {[1, 2, 3].map(n => <View key={n} style={{ width: 16, height: 8, borderRadius: 4, backgroundColor: n <= severity.level ? ['#F5CF4A', '#E8641E', '#B3261A'][severity.level - 1] : '#E0E5DE' }} />)}
    <Text style={{ marginLeft: 6, color: color.ink, fontWeight: '800', fontSize: 12 }}>{severity.label}</Text>
  </View>;
}

// Collapsible container: a tappable header row with a summary; content only when open. Keeps pages short.
// What the prototype keeps and sends, in plain words (Settings and sign-up). Keep in step with server/api.mjs.
export function PrivacyNote() {
  const { t } = useI18n();
  return <Collapsible icon="🔒" title={t('pv.title')} summary={t('pv.sub')}>
    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <Text key={n} style={{ color: color.ink, fontSize: 15, lineHeight: 22, marginTop: 8 }}>• {t(`pv.${n}`)}</Text>)}
  </Collapsible>;
}

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
  const { t } = useI18n();
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.min(Math.max(percent, 0), 100);
  return <View accessibilityRole="progressbar" accessibilityLabel={t('mx.complete', { p })} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
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
  // Tabs size to their labels (long single words, e.g. in Armenian, cannot wrap); long rows step down a size.
  const chars = options.reduce((n, [, label]) => n + label.length, 0), size = chars > 30 ? 12 : chars > 24 ? 13 : 14;
  // If they still do not fit (four tabs on a 320px phone), the row scrolls sideways instead of overlapping.
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 6, marginBottom: 4 }} contentContainerStyle={{ flexGrow: 1 }}><View accessibilityRole="tablist" style={{ flexDirection: 'row', flexGrow: 1, borderBottomWidth: 1, borderColor: '#D5DDD5' }}>
    {options.map(([key, label]) => { const on = value === key; return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(key)} style={{ flexGrow: 1, flexShrink: 0, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 3, borderColor: on ? color.green : 'transparent', marginBottom: -1 }}>
      <Text style={{ fontWeight: '800', fontSize: size, textAlign: 'center', color: on ? color.green : color.muted }}>{label}</Text>
    </Pressable>; })}
  </View></ScrollView>;
}

export function ScoreBar({ value }) {
  return <View style={s.track}><View style={[s.fill, { width: `${Math.min(Math.max(value, 0), 100)}%` }]} /></View>;
}

export const s = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: color.ink, marginBottom: 8 },
  section: { fontSize: 20, fontWeight: '800', color: color.ink, marginTop: 26, marginBottom: 8 },
  muted: { color: color.muted, lineHeight: 21, fontSize: 14 },
  caption: { color: color.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
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
  hint: { color: color.muted, fontSize: 12, lineHeight: 17, marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, padding: 13, fontSize: 15, color: color.ink },
  select: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 48, borderWidth: 0, backgroundColor: 'transparent', color: color.ink, fontSize: 15, paddingHorizontal: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#E4E9E2', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  segmentOn: { backgroundColor: '#FFF' },
  segmentText: { color: color.muted, fontWeight: '700' },
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
  const { lang, setLang, scale, setScale, t } = useI18n();
  const pick = (value, options, onChange, label, width) => <View style={{ flex: width, borderWidth: 1, borderColor: '#D5DDD5', borderRadius: 10, backgroundColor: '#FFF', overflow: 'hidden' }}>
    <Picker accessibilityLabel={label} selectedValue={value} onValueChange={onChange} style={{ height: 38, borderWidth: 0, backgroundColor: 'transparent', color: color.ink, fontSize: 13, paddingHorizontal: 8 }}>{options.map(([k, t]) => <Picker.Item key={k} label={t} value={k} />)}</Picker>
  </View>;
  return <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }}>
    <Text style={{ fontSize: 16 }}>🌐</Text>{pick(lang, LANGS, v => setLang(v || 'en'), 'Language', 1.6)}
    <Text style={{ fontSize: 14, fontWeight: '900', color: color.ink }}>Aa</Text>{pick(String(scale), [['1', 'A'], ['1.2', 'A+'], ['1.4', 'A++']], v => setScale(Number(v) || 1), t('set.text'), 0.8)}
  </View>;
}

export function LanguageSettings({ compact }) {
  const { lang, setLang, scale, setScale, t } = useI18n();
  return <View style={compact ? { flexDirection: 'row', gap: 8 } : null}>
    <View style={compact ? { flex: 1.3 } : null}><Select label={t('set.language')} value={lang} options={LANGS} onChange={v => setLang(v || 'en')} /></View>
    <View style={compact ? { flex: 1 } : null}><Select label={t('set.text')} value={String(scale)} options={[['1', t('set.normal')], ['1.2', t('set.large')], ['1.4', t('set.xl')]]} onChange={v => setScale(Number(v) || 1)} /></View>
  </View>;
}
