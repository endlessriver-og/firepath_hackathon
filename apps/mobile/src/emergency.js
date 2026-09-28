import React, { useState } from 'react';
import { Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { emergencyGuideIn, emergencySituations } from './playbooks';
import { SPEECH_LANG, useI18n } from './i18n';
import { Caption, LanguageSettings, Link, Muted, color } from './ui';

// "Emergency now": pick what is happening, get a short list for this household or business.
// Calm, large targets, 911 first. Works signed out with general guidance.
const LINK_KEYS = [['genasys', 'lnk.zone'], ['211la', 'lnk.211'], ['fire.ca.gov', 'lnk.calfire'], ['weather.gov', 'lnk.nws'], ['glendale-water', 'lnk.gwp'], ['airnow', 'lnk.airnow'], ['myshake', 'lnk.myshake']];

export function EmergencyNow({ me, onClose }) {
  const [id, setId] = useState(null), [speaking, setSpeaking] = useState(false);
  const { t, lang, scale } = useI18n();
  // With large text on a narrow phone two tiles per row leave no room for a long word: use one.
  const oneColumn = useWindowDimensions().width / (scale || 1) < 300;
  const ctx = me ? { type: me.user.type, household: me.household, business: me.business, hazards: me.hazards, done: me.done } : {};
  const guide = id ? emergencyGuideIn(lang, id, ctx) : null;
  // Read the steps aloud in the chosen language (device voices vary; Armenian may fall back to the default voice).
  const readAloud = () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    const words = [t(`sit.${guide.id}`), t('em.call') + '.', ...guide.steps.map((step, i) => `${i + 1}. ${step.text}`)].join(' ');
    setSpeaking(true);
    Speech.speak(words, { language: guide.translated ? SPEECH_LANG[lang] : 'en-US', rate: 0.9, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };
  const call911 = <Pressable accessibilityRole="button" accessibilityLabel={`${t('em.call')}. ${t('em.callSub')}`} onPress={() => Linking.openURL('tel:911')} style={{ backgroundColor: '#B3261A', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 14 }}>
    <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{t('em.call')}</Text>
    <Text style={{ color: '#FFE3DE', fontSize: 14, marginTop: 2 }}>{t('em.callSub')}</Text>
  </Pressable>;

  if (!guide) return <>
    <Link style={{ marginTop: 0 }} onPress={onClose}>{t('em.back')}</Link>
    <Text style={{ fontSize: oneColumn ? 24 : 30, fontWeight: '800', color: color.ink, marginTop: 10 }}>{t('em.what')}</Text>
    <Muted style={{ fontSize: 16 }}>{t('em.pick')}</Muted>
    {call911}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
      {emergencySituations.map(s => <Pressable key={s.id} accessibilityRole="button" onPress={() => setId(s.id)} style={{ width: oneColumn ? '100%' : '47%', flexGrow: 1, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: color.line, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 26, color: color.warm }}>{s.icon}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: color.ink, marginTop: 4, textAlign: 'center' }}>{t(`sit.${s.id}`)}</Text>
      </Pressable>)}
    </View>
    <Caption>{t('em.official')}</Caption>
    <LanguageSettings compact />
    {lang !== 'en' && <Caption>{t('set.unreviewed')}</Caption>}
  </>;

  return <>
    <Link style={{ marginTop: 0 }} onPress={() => { Speech.stop(); setId(null); }}>{t('em.else')}</Link>
    <Text style={{ fontSize: oneColumn ? 24 : 30, fontWeight: '800', color: color.ink, marginTop: 10 }}>{t(`sit.${guide.id}`)}</Text>
    {call911}
    <Pressable accessibilityRole="button" onPress={readAloud} style={{ marginTop: 10, borderWidth: 2, borderColor: color.green, borderRadius: 14, padding: 13, alignItems: 'center' }}><Text style={{ color: color.green, fontWeight: '900', fontSize: 16 }}>{speaking ? t('em.stop') : t('em.read')}</Text></Pressable>
    {!guide.translated && lang !== 'en' && <Caption>{t('em.englishOnly')}</Caption>}
    {guide.translated && lang !== 'en' && <Caption>{t('set.unreviewed')}</Caption>}
    <View style={{ marginTop: 10 }}>
      {guide.steps.map((step, i) => <View key={step.text} style={{ flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.green, color: '#FFF', textAlign: 'center', lineHeight: 28, fontWeight: '900', overflow: 'hidden' }}>{i + 1}</Text>
        <View style={{ flex: 1 }}><Text style={{ color: color.ink, fontSize: 18, lineHeight: 26 }}>{step.text}</Text></View>
      </View>)}
    </View>
    {guide.links.map(([name, url]) => <Link key={url} onPress={() => Linking.openURL(url)}>{t(LINK_KEYS.find(([k]) => url.includes(k))?.[1] || '') || name} ↗</Link>)}
    <Caption>{t('em.official')}</Caption>
    <Link onPress={() => { Speech.stop(); onClose(); }}>{t('em.close')}</Link>
  </>;
}
