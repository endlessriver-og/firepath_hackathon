import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useI18n } from './i18n';

// react-native-maps has no web renderer. The browser preview embeds OpenStreetMap for the public sample point only.
// The label underneath stays visible if a browser or sandbox blocks the embedded frame.
export default function MapPanel({ point, title, style }) {
  const { t } = useI18n();
  const { latitude: lat, longitude: lon } = point;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.015},${lat - 0.011},${lon + 0.015},${lat + 0.011}&layer=mapnik&marker=${lat},${lon}`;
  const open = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
  return <View style={[style, { overflow: 'hidden', backgroundColor: '#E4E9E2', alignItems: 'center', justifyContent: 'center' }]}>
    <Text style={{ color: '#53655E', fontSize: 13, textAlign: 'center' }}>{title}{'\n'}{lat.toFixed(4)}, {lon.toFixed(4)}</Text>
    <Text style={{ color: '#086B56', fontWeight: '700', marginTop: 8 }} onPress={() => Linking.openURL(open)}>{t('mp.open')}</Text>
    {React.createElement('iframe', { src, title, style: { position: 'absolute', inset: 0, border: 0, width: '100%', height: '100%' } })}
  </View>;
}
