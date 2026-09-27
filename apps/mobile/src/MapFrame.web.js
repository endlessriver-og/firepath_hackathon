import React from 'react';
import { View } from 'react-native';
import { useI18n } from './i18n';

// Embeds the server's Leaflet hazard map (map.html). Same page as the native WebView version.
export default function MapFrame({ src, style }) {
  const { t } = useI18n();
  return <View style={[style, { overflow: 'hidden' }]}>{React.createElement('iframe', { src, title: t('map.title'), style: { border: 0, width: '100%', height: '100%' } })}</View>;
}
