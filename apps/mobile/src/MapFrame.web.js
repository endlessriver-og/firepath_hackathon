import React from 'react';
import { View } from 'react-native';

// Embeds the server's Leaflet hazard map (map.html). Same page as the native WebView version.
export default function MapFrame({ src, style }) {
  return <View style={[style, { overflow: 'hidden' }]}>{React.createElement('iframe', { src, title: 'Glendale hazard map', style: { border: 0, width: '100%', height: '100%' } })}</View>;
}
