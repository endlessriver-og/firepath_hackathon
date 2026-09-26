import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { criteria, partnership, TOUR_STEPS, walkthroughIntro } from './walkthrough';
import { useState } from 'react';
import { Button, Caption, Link, Muted, Section, color } from './ui';
import { HeroIllustration } from './illustration';

// Hub: the one-minute version and the door into the guided tour. `closing` shows the final chapter.
export function WalkthroughHub({ onStart, onClose, busy, error, closing }) {
  return <>
    {onClose && <Link style={{ marginTop: 0 }} onPress={onClose}>← Back</Link>}
    <HeroIllustration height={150} dark={closing} />
    <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: color.ink, marginTop: 12 }}>{closing ? 'What comes next' : 'Explore FirePath'}</Text>
    <Muted style={{ marginTop: 10, fontSize: 16, lineHeight: 24 }}>{closing ? 'See what works today and what needs a City partnership.' : 'A guided look at the app using a fictional Glendale household.'}</Muted>
    {!closing && <>
      {['A customized household plan', 'Hazard maps for an address', 'Alerts and practice', 'Emergency steps', 'What the City could connect'].map(item => <Text key={item} style={{ color: color.ink, marginTop: 9, fontSize: 15 }}>✓  {item}</Text>)}
      <Button busy={busy} onPress={() => onStart('quick')} style={{ marginTop: 22 }}>Begin</Button>
      <Link onPress={() => onStart('full')} style={{ marginTop: 8 }}>Full walkthrough</Link>
      {error ? <Text style={{ color: '#A12D1F', marginTop: 8 }}>{error}</Text> : null}
    </>}

    {closing ? <>
      <Section>How FirePath meets the judging criteria</Section>
      {criteria.map(c => <Criterion key={c.name} c={c} />)}
      <Section>{partnership.heading}</Section>
      <Muted>{partnership.lede}</Muted>
      {partnership.asks.map(([title, body]) => <View key={title} style={{ backgroundColor: '#EAF1F8', borderLeftWidth: 4, borderLeftColor: '#2E5A88', borderRadius: 12, padding: 14, marginTop: 10 }}>
        <Text style={{ color: '#23405F', fontWeight: '800' }}>{title}</Text><Text style={{ color: '#23405F', marginTop: 4, lineHeight: 20 }}>{body}</Text>
      </View>)}
    </> : null}
    <Caption style={{ marginTop: 20 }}>FirePath is a Glendale pilot prototype, not a City of Glendale service.</Caption>
  </>;
}

// Floating guide card shown above the tab bar while the tour runs.
export function TourOverlay({ steps = TOUR_STEPS, index, onBack, onNext, onExit }) {
  const step = steps[index];
  const last = index === steps.length - 1;
  return <View accessibilityRole="dialog" accessibilityLabel={`Walkthrough step ${index + 1} of ${steps.length}`} style={{ position: 'absolute', left: 12, right: 12, bottom: 84, backgroundColor: '#12302A', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, maxWidth: 560, alignSelf: 'center' }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: '#F2C46D', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }}>{step.chapter.toUpperCase()} · {index + 1} OF {steps.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Exit walkthrough" onPress={onExit}><Text style={{ color: '#CFE3DA', fontWeight: '800' }}>Exit</Text></Pressable>
    </View>
    <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800', marginTop: 6 }}>{step.title}</Text>
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>{steps.map((_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= index ? '#F2C46D' : '#3E5A52' }} />)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
      <Pressable accessibilityRole="button" disabled={index === 0} onPress={onBack} style={{ paddingVertical: 10, paddingHorizontal: 14, opacity: index === 0 ? 0.4 : 1 }}><Text style={{ color: '#CFE3DA', fontWeight: '800' }}>← Back</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={last ? onExit : onNext} style={{ backgroundColor: '#F2C46D', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 }}><Text style={{ color: '#12302A', fontWeight: '900' }}>{last ? 'Finish' : 'Next →'}</Text></Pressable>
    </View>
  </View>;
}


// One judging criterion: weight, the judges' question, a direct answer, and expandable evidence.
function Criterion({ c }) {
  const [open, setOpen] = useState(c.weight >= 40);
  return <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: color.line, borderRadius: 16, padding: 16, marginTop: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ backgroundColor: color.green, color: '#FFF', fontWeight: '900', fontSize: 13, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' }}>{c.weight}%</Text>
        <Text style={{ flex: 1, color: color.ink, fontSize: 17, fontWeight: '800' }}>{c.name}</Text>
        <Text style={{ color: color.green, fontSize: 18, fontWeight: '900' }}>{open ? '−' : '+'}</Text>
      </View>
      <Text style={{ color: color.muted, fontStyle: 'italic', marginTop: 8 }}>{c.question}</Text>
      <Text style={{ color: color.ink, fontSize: 15, lineHeight: 22, marginTop: 6, fontWeight: '600' }}>{c.answer}</Text>
    </Pressable>
    {open && c.evidence.map(e => <Text key={e} style={{ color: color.ink, lineHeight: 20, marginTop: 6 }}>✓ {e}</Text>)}
  </View>;
}
