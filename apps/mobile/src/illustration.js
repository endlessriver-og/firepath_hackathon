import React from 'react';
import { View } from 'react-native';
import { useI18n } from './i18n';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Hero art: the Verdugo foothills behind a Glendale street, one home pinned with a mapped-zone ring.
// Pure SVG in the app palette, so it renders the same on web, iOS and Android with no image files.
export function HeroIllustration({ height = 170, dark }) {
  const { t } = useI18n();
  const sky = dark ? ['#17372E', '#24584A'] : ['#FBF3E4', '#E6EFE9'];
  return <View accessibilityRole="image" accessibilityLabel={t('mx.heroAlt')} style={{ height, borderRadius: 20, overflow: 'hidden', marginTop: 16 }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={sky[0]} /><Stop offset="1" stopColor={sky[1]} /></LinearGradient>
        <LinearGradient id="ridge" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#3F7A6A" /><Stop offset="1" stopColor="#2A5E50" /></LinearGradient>
      </Defs>
      <Rect width="360" height="170" fill="url(#sky)" />
      <Circle cx="292" cy="44" r="22" fill="#F2C46D" opacity={dark ? 0.9 : 0.85} />
      {/* back ridge: Verdugo Mountains */}
      <Path d="M0 96 L38 70 L70 82 L104 56 L140 74 L176 48 L214 70 L250 58 L290 80 L324 64 L360 78 L360 170 L0 170 Z" fill="#8FB5A6" opacity="0.75" />
      <Path d="M0 112 L44 90 L86 104 L128 84 L170 100 L214 86 L262 104 L306 92 L360 108 L360 170 L0 170 Z" fill="url(#ridge)" />
      {/* hillside warm tint = mapped wildfire zone */}
      <Path d="M0 112 L44 90 L86 104 L128 84 L150 94 L110 120 L0 124 Z" fill="#E8641E" opacity="0.22" />
      {/* street */}
      <Rect x="0" y="146" width="360" height="24" fill="#DCE4DC" />
      <Rect x="0" y="156" width="360" height="2" fill="#FFFFFF" opacity="0.8" />
      {/* homes */}
      <G>
        {[[22, '#F5F6F1'], [74, '#FFF9F5'], [206, '#F5F6F1'], [258, '#FFF9F5'], [310, '#F5F6F1']].map(([x, wall], i) =>
          <G key={i}><Rect x={x} y="120" width="36" height="26" fill={wall} /><Path d={`M${x - 4} 122 L${x + 18} 104 L${x + 40} 122 Z`} fill="#B4502B" opacity="0.85" /><Rect x={x + 14} y="132" width="8" height="14" fill="#53655E" /></G>)}
        {/* the pinned home */}
        <Rect x="134" y="116" width="44" height="30" fill="#FFFFFF" /><Path d="M129 119 L156 97 L183 119 Z" fill="#1D5B4D" /><Rect x="151" y="130" width="10" height="16" fill="#17372E" />
      </G>
      {/* mapped-zone ring + pin */}
      <Circle cx="156" cy="112" r="46" fill="none" stroke="#E8641E" strokeWidth="2" strokeDasharray="5 5" opacity="0.9" />
      <Path d="M156 94 C156 94 138 74 138 62 A18 18 0 0 1 174 62 C174 74 156 94 156 94 Z" fill="#1D5B4D" stroke="#FFFFFF" strokeWidth="2.5" />
      <Circle cx="156" cy="62" r="7" fill="#F2C46D" />
    </Svg>
  </View>;
}
