// Dates in the viewer's language. Chrome ships without Armenian date data and silently formats Armenian
// as English, so Armenian falls back to its own month names (the same forms Node's full ICU produces).
const LOCALE = { en: 'en-US', es: 'es-US', hy: 'hy-AM', ko: 'ko-KR' };
const HY_LONG = ['հունվարի', 'փետրվարի', 'մարտի', 'ապրիլի', 'մայիսի', 'հունիսի', 'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի'];
const HY_SHORT = ['հնվ', 'փտվ', 'մրտ', 'ապր', 'մյս', 'հնս', 'հլս', 'օգս', 'սեպ', 'հոկ', 'նոյ', 'դեկ'];
const pad = n => String(n).padStart(2, '0');

export function hyDate(d, { time = false, long = false } = {}) {
  const day = long ? `${d.getDate()} ${HY_LONG[d.getMonth()]}, ${d.getFullYear()} թ.` : `${d.getDate()} ${HY_SHORT[d.getMonth()]}`;
  return time ? `${day}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
}

// long: "September 28, 2026"; otherwise "Sep 28", with the time when time is true.
export function formatDate(value, lang = 'en', { time = false, long = false } = {}) {
  const d = new Date(value);
  if (lang === 'hy' && !Intl.DateTimeFormat.supportedLocalesOf(['hy']).length) return hyDate(d, { time, long });
  return d.toLocaleString(LOCALE[lang] || 'en-US', long ? { month: 'long', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) });
}
