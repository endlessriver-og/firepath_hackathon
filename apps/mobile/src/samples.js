import civic from './sample-location.json';
import sparr from './sample-sparr-heights.json';

// Public places only. Each result is a dated snapshot from the Glendale GIS lookup, never a resident's home.
export const samples = [
  { id: 'sparr', name: 'Sparr Heights Community Center', area: 'Foothills · 1613 Glencoe Way (City facility)', data: sparr },
  { id: 'civic', name: 'Map point near Glendale Civic Center', area: 'Downtown · public coordinates', data: civic },
];

export const sampleById = id => samples.find(sample => sample.id === id) || samples[0];

// Formats the UTC date of an ISO timestamp without Intl time zones, so every screen shows the same day on any device.
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = iso => iso ? `${months[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}` : 'unknown date';

export function snapshotDate(hazards) {
  return formatDate(Object.values(hazards || {}).map(value => value?._meta?.as_of).filter(Boolean).sort()[0]);
}
