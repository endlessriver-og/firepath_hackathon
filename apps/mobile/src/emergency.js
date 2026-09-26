import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { emergencyGuide, emergencySituations } from './playbooks';
import { Caption, Link, Muted, color } from './ui';

// "Emergency now": pick what is happening, get a short list for this household or business.
// Calm, large targets, 911 first. Works signed out with general guidance.
export function EmergencyNow({ me, onClose }) {
  const [id, setId] = useState(null);
  const ctx = me ? { type: me.user.type, household: me.household, business: me.business, hazards: me.hazards, done: me.done } : {};
  const guide = id ? emergencyGuide(id, ctx) : null;
  const call911 = <Pressable accessibilityRole="button" accessibilityLabel="Call 911" onPress={() => Linking.openURL('tel:911')} style={{ backgroundColor: '#B3261A', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 14 }}>
    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>Call 911</Text>
    <Text style={{ color: '#FFE3DE', fontSize: 12, marginTop: 2 }}>If anyone is hurt or in danger</Text>
  </Pressable>;

  if (!guide) return <>
    <Link style={{ marginTop: 0 }} onPress={onClose}>← Back</Link>
    <Text style={{ fontSize: 28, fontWeight: '800', color: color.ink, marginTop: 10 }}>What's happening?</Text>
    <Muted>Pick one. You'll get a short list{me ? ' for your ' + (me.user.type === 'business' ? 'business' : 'household') : ''}.</Muted>
    {call911}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
      {emergencySituations.map(s => <Pressable key={s.id} accessibilityRole="button" onPress={() => setId(s.id)} style={{ width: '47%', flexGrow: 1, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: color.line, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 26, color: color.warm }}>{s.icon}</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: color.ink, marginTop: 4 }}>{s.label}</Text>
      </Pressable>)}
    </View>
    <Caption>Official instructions always come first. FirePath does not know about live incidents or choose routes.</Caption>
  </>;

  return <>
    <Link style={{ marginTop: 0 }} onPress={() => setId(null)}>← Something else</Link>
    <Text style={{ fontSize: 28, fontWeight: '800', color: color.ink, marginTop: 10 }}>{guide.title}</Text>
    {call911}
    <View style={{ marginTop: 10 }}>
      {guide.steps.map((step, i) => <View key={step.text} style={{ flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: color.line }}>
        <Text style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.green, color: '#FFF', textAlign: 'center', lineHeight: 28, fontWeight: '900', overflow: 'hidden' }}>{i + 1}</Text>
        <View style={{ flex: 1 }}><Text style={{ color: color.ink, fontSize: 16, lineHeight: 22 }}>{step.text}</Text>{me && <Text style={{ color: '#7A8A83', fontSize: 11, marginTop: 2 }}>{step.why}</Text>}</View>
      </View>)}
    </View>
    {guide.links.map(([name, url]) => <Link key={url} onPress={() => Linking.openURL(url)}>{name} ↗</Link>)}
    <Caption>Official instructions always come first. FirePath does not know about live incidents or choose routes.</Caption>
    <Link onPress={onClose}>Close</Link>
  </>;
}
