import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { criteria, partnership, TOUR_STEPS, walkthroughIntro } from './walkthrough';
import { useState } from 'react';
import { Button, Caption, Link, Muted, Section, color } from './ui';
import { HeroIllustration } from './illustration';
import { useI18n } from './i18n';

// Hub: the one-minute version and the door into the guided tour. `closing` shows the final chapter.
export function WalkthroughHub({ onStart, onClose, busy, error, closing }) {
  const { t } = useI18n();
  return <>
    {onClose && <Link style={{ marginTop: 0 }} onPress={onClose}>{t('tour.back')}</Link>}
    <HeroIllustration height={150} dark={closing} />
    <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: color.ink, marginTop: 12 }}>{closing ? t('tour.t.What comes next') : t('tour.hubTitle')}</Text>
    <Muted style={{ marginTop: 10, fontSize: 16, lineHeight: 24 }}>{closing ? 'See what works today and what needs a City partnership.' : t('tour.hubSub')}</Muted>
    {!closing && <>
      {[t('tour.i1'), t('tour.i2'), t('tour.i3'), t('tour.i4'), t('tour.i5')].map(item => <Text key={item} style={{ color: color.ink, marginTop: 9, fontSize: 15 }}>✓  {item}</Text>)}
      <Button busy={busy} onPress={() => onStart('quick')} style={{ marginTop: 22 }}>{t('tour.begin')}</Button>
      <Link onPress={() => onStart('full')} style={{ marginTop: 8 }}>{t('tour.full')}</Link>
      {error ? <Text style={{ color: '#A12D1F', marginTop: 8 }}>{error}</Text> : null}
    </>}

    {closing ? <>
      <Section>How FirePath meets the judging criteria</Section>
      {criteria.map(c => <Criterion key={c.name} c={c} />)}
      <Section>{partnership.heading}</Section>
      {partnership.asks.map(([title, body]) => <Ask key={title} title={title} body={body} />)}
    </> : null}
    <Caption style={{ marginTop: 20 }}>{t('tour.proto')}</Caption>
  </>;
}

// Floating guide card shown above the tab bar while the tour runs.
export function TourOverlay({ steps = TOUR_STEPS, index, onBack, onNext, onExit }) {
  const { t } = useI18n();
  const tr = (prefix, text) => (t(`${prefix}${text}`) === `${prefix}${text}` ? text : t(`${prefix}${text}`));
  const step = steps[index];
  const last = index === steps.length - 1;
  return <View accessibilityRole="dialog" accessibilityLabel={`Walkthrough step ${index + 1} of ${steps.length}`} style={{ position: 'absolute', left: 12, right: 12, bottom: 84, backgroundColor: '#12302A', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, maxWidth: 560, alignSelf: 'center' }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: '#F2C46D', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }}>{tr('tour.ch.', step.chapter).toUpperCase()} · {t('tour.of', { n: index + 1, total: steps.length })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Exit walkthrough" onPress={onExit}><Text style={{ color: '#CFE3DA', fontWeight: '800' }}>{t('tour.exit')}</Text></Pressable>
    </View>
    <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800', marginTop: 6 }}>{tr('tour.t.', step.title)}</Text>
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>{steps.map((_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= index ? '#F2C46D' : '#3E5A52' }} />)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
      <Pressable accessibilityRole="button" disabled={index === 0} onPress={onBack} style={{ paddingVertical: 10, paddingHorizontal: 14, opacity: index === 0 ? 0.4 : 1 }}><Text style={{ color: '#CFE3DA', fontWeight: '800' }}>{t('tour.back')}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={last ? onExit : onNext} style={{ backgroundColor: '#F2C46D', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 }}><Text style={{ color: '#12302A', fontWeight: '900' }}>{t(last ? 'tour.finish' : 'tour.next')}</Text></Pressable>
    </View>
  </View>;
}


// One judging criterion: weight, the judges' question, a direct answer, and expandable evidence.
function Ask({ title, body }) {
  const [open, setOpen] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ backgroundColor: '#EAF1F8', borderLeftWidth: 4, borderLeftColor: '#2E5A88', borderRadius: 12, padding: 14, marginTop: 10 }}>
    <Text style={{ color: '#23405F', fontWeight: '800' }}>{title}  {open ? '−' : '+'}</Text>
    {open && <Text style={{ color: '#23405F', marginTop: 4, lineHeight: 20 }}>{body}</Text>}
  </Pressable>;
}

function Criterion({ c }) {
  const [open, setOpen] = useState(false);
  return <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: color.line, borderRadius: 16, padding: 16, marginTop: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ backgroundColor: color.green, color: '#FFF', fontWeight: '900', fontSize: 13, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' }}>{c.weight}%</Text>
        <Text style={{ flex: 1, color: color.ink, fontSize: 17, fontWeight: '800' }}>{c.name}</Text>
        <Text style={{ color: color.green, fontSize: 18, fontWeight: '900' }}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={{ color: color.muted, fontStyle: 'italic', marginTop: 8 }}>{c.question}</Text>}
      <Text style={{ color: color.ink, fontSize: 15, lineHeight: 22, marginTop: 6, fontWeight: '600' }}>{c.answer}</Text>
    </Pressable>
    {open && c.evidence.map(e => <Text key={e} style={{ color: color.ink, lineHeight: 20, marginTop: 6 }}>✓ {e}</Text>)}
  </View>;
}
