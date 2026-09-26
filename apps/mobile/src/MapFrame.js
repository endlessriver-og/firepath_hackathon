import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// Native: the server's Leaflet hazard map (map.html) inside a WebView.
export default function MapFrame({ src, style }) {
  return <View style={[style, { overflow: 'hidden' }]}><WebView source={{ uri: src }} originWhitelist={['*']} /></View>;
}
