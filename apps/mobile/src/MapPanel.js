import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export default function MapPanel({ point, title, style }) {
  return <MapView style={style} region={{ ...point, latitudeDelta: 0.03, longitudeDelta: 0.03 }}><Marker coordinate={point} title={title} description="Public sample point" /></MapView>;
}
