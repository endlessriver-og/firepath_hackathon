// Search the crawled City of Glendale permit catalog in plain language, and assemble the likely set
// of City permits for an event. Names are the City's own permit types and work classes; FirePath only
// matches and explains them. Requirements are confirmed by the City, not by FirePath.
import { describeHazard } from './preparedness.js';

// Everyday words -> the City's vocabulary. Each entry adds search terms that appear in the catalog.
const SYNONYMS = [
  [/party|festival|fair|concert|market|gathering|celebration|event|block party|parade|run|walk/, ['special event', 'street use', 'tent/canopy', 'temporary structure']],
  [/tent|canopy|stage|booth|bleacher|structure/, ['tent/canopy', 'temporary structure']],
  [/food|truck|bbq|grill|cook|propane|fryer|candle|flame/, ['open flame/candle', 'commercial kitchen cooking oil']],
  [/film|movie|shoot|video|photo/, ['filming']],
  [/firework|pyro|special effect/, ['fireworks', 'pyrotechnics']],
  [/street|road|closure|block|sidewalk|curb/, ['street use', 'sidewalk']],
  [/patio|outdoor dining|tables|restaurant seating/, ['sidewalk and dining', 'back to business']],
  [/roof/, ['re-roof']],
  [/adu|granny|backyard home|accessory/, ['adu', 'combination (single family)']],
  [/addition|remodel|renovat|bedroom|garage/, ['combination (single family)', 'addition', 'commercial and mixed use']],
  [/kitchen|bath/, ['kitchen and bath']],
  [/solar|panel|battery/, ['solar', 'battery system']],
  [/quake|earthquake|retrofit|bolt|brace|foundation/, ['seismic bolt and brace']],
  [/tree|oak|sycamore|bay/, ['indigenous tree', 'street tree']],
  [/brush|weed|clearance|defensible|fuel|vegetation|wildfire/, ['landscape/fuel modification', 'fire clearance']],
  [/water heater|plumb|pipe|sewer/, ['plumbing', 'sewer connection']],
  [/hvac|air condition|furnace|heat pump|mechanical/, ['mechanical']],
  [/electric|outlet|ev charger|charger|breaker/, ['electrical']],
  [/sign|banner|mural|paint/, ['sign permit', 'mural', 'pedestrian sign']],
  [/fence|wall/, ['fence/wall', 'retaining wall']],
  [/pool|spa/, ['pool']],
  [/demolish|demolition|tear down/, ['demolition']],
  [/window|door/, ['window and door']],
  [/chemical|hazmat|storage|tank|gas|oil/, ['hazmat storage', 'storage tank', 'medical gas', 'carbon dioxide']],
  [/sprinkler|alarm|extinguish/, ['sprinkler', 'fire alarm', 'extinguishing']],
];

// Phrases that point clearly at one City permit type.
const BOOSTS = [[/block party|street (party|fair|closure)|parade/, 'PW - ROW - Street Use'], [/wedding|private party/, 'Building Temporary Structure Permit']];
const norm = s => s.toLowerCase();
const STOP = new Set(['new', 'add', 'the', 'and', 'for', 'our', 'my', 'around', 'house', 'home', 'want', 'need', 'build', 'put', 'install', 'get', 'with', 'have', 'host', 'hold', 'run', 'at', 'on', 'in', 'a']);

// Returns [{ name, workClasses (matching first), audience, hazards, score }], best first.
export function searchPermits(catalog, query, { audience = null, limit = 8 } = {}) {
  const q = norm(query || '').trim();
  if (!q) return [];
  const terms = new Set(q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s)$/, '')));
  for (const [re, extra] of SYNONYMS) if (re.test(q)) extra.forEach(t => terms.add(t));
  return catalog.permitTypes.map(type => {
    const name = norm(type.name);
    const hits = type.workClasses.filter(w => [...terms].some(t => norm(w).includes(t)));
    let score = [...terms].filter(t => name.includes(t)).length * 3 + hits.length * 2;
    if (audience && type.audience.includes(audience)) score += 1;
    if (BOOSTS.some(([re, target]) => re.test(q) && target === type.name)) score += 4;
    return { ...type, workClasses: [...hits, ...type.workClasses.filter(w => !hits.includes(w))], matched: hits, score };
  }).filter(t => t.score > (audience && t.audience.includes(audience) ? 1 : 0)).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function searchLicenses(catalog, query, limit = 6) {
  const words = norm(query || '').split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(es|s)$/, ''));
  if (!words.length) return [];
  return catalog.businessLicenseTypes.filter(name => words.every(w => norm(name).includes(w))).slice(0, limit);
}

export const eventQuestions = [
  ['commercial', 'Is it run by a business or charges admission?'],
  ['publicWay', 'Will it use a street, sidewalk or public parking?'],
  ['tents', 'Tents, canopies, stages or other temporary structures?'],
  ['flame', 'Cooking, grills, propane or open flame?'],
  ['fireworks', 'Fireworks, pyrotechnics or special effects?'],
  ['filming', 'Will it be filmed or photographed commercially?'],
];

// Assemble the City permits an event would likely need, from yes/no answers. Every item names the
// official permit type (and work class) so it can be found in the Glendale Permits portal.
// Event-planner explanations in the viewer's language (drafts, unreviewed). Official City permit type names
// stay English; English is the source and the fallback.
const EVENT_TX = {
  es: { why: {"Business-run or ticketed events": "Eventos organizados por un negocio o con boletos", "Fire Prevention reviews event safety: exits, occupancy and fire lanes": "Prevención de Incendios revisa la seguridad: salidas, aforo y carriles de bomberos", "Using a street, sidewalk or public parking": "Uso de una calle, banqueta o estacionamiento público", "Tents, stages and other temporary structures": "Carpas, escenarios y otras estructuras temporales", "Fire review of tents and canopies": "Revisión de bomberos de carpas y toldos", "Cooking, propane and open flame at events": "Cocina, propano y fuego abierto en eventos", "Fireworks": "Fuegos artificiales", "Pyrotechnics or special effects": "Pirotecnia o efectos especiales", "Commercial filming or photography": "Filmación o fotografía comercial"}, level: {"Very High": "muy alto", "High": "alto", "Moderate": "moderado"}, notes: { fireZone: zone => `La dirección del evento está en una zona de riesgo de incendio ${zone} de CAL FIRE. El fuego abierto y los fuegos artificiales pueden estar restringidos, sobre todo en días de Alerta de Bandera Roja; consulte pronto a Prevención de Incendios de Glendale.`,
    crowd: 'Las multitudes grandes suelen requerir un plan de seguridad, atención médica y tráfico; empiece al menos 60 días antes.',
    exits: 'Todo evento necesita un plan de salidas, un punto de reunión y un plan para el clima. FirePath puede preparar un plan de alertas para ese día.',
    bestMatch: 'Esta lista es la mejor coincidencia de FirePath con el catálogo de permisos de la Ciudad. La Ciudad de Glendale decide lo que requiere su evento.' } },
  hy: { why: {"Business-run or ticketed events": "Բիզնեսի կազմակերպած կամ տոմսերով միջոցառումներ", "Fire Prevention reviews event safety: exits, occupancy and fire lanes": "Հրդեհային կանխարգելումը ստուգում է անվտանգությունը՝ ելքերը, տարողությունը և հրշեջ ուղիները", "Using a street, sidewalk or public parking": "Փողոցի, մայթի կամ հանրային կայանատեղիի օգտագործում", "Tents, stages and other temporary structures": "Վրաններ, բեմեր և այլ ժամանակավոր կառույցներ", "Fire review of tents and canopies": "Վրանների և ծածկերի հրդեհային ստուգում", "Cooking, propane and open flame at events": "Եփում, պրոպան և բաց կրակ միջոցառումներում", "Fireworks": "Հրավառություն", "Pyrotechnics or special effects": "Պիրոտեխնիկա կամ հատուկ էֆեկտներ", "Commercial filming or photography": "Առևտրային նկարահանում կամ լուսանկարահանում"}, level: {"Very High": "շատ բարձր", "High": "բարձր", "Moderate": "միջին"}, notes: { fireZone: zone => `Միջոցառման հասցեն գտնվում է CAL FIRE-ի «${zone}» հրդեհային վտանգի գոտում։ Բաց կրակը և հրավառությունը կարող են սահմանափակված լինել, հատկապես «Կարմիր դրոշ» նախազգուշացման օրերին․ վաղ դիմեք Գլենդեյլի հրդեհային կանխարգելման ծառայությանը։`,
    crowd: 'Մեծ բազմությունների համար սովորաբար անհրաժեշտ է անվտանգության, բժշկական և երթևեկության պլան․ սկսեք առնվազն 60 օր առաջ։',
    exits: 'Յուրաքանչյուր միջոցառման համար անհրաժեշտ է ելքերի, հավաքման վայրի և եղանակի պլան։ FirePath-ը կարող է այդ օրվա համար ծանուցումների ծրագիր կազմել։',
    bestMatch: 'Այս ցուցակը FirePath-ի լավագույն համապատասխանությունն է Քաղաքի թույլտվությունների ցուցակին։ Թե ինչ է պահանջվում ձեր միջոցառման համար, որոշում է Գլենդեյլ քաղաքը։' } },
  ko: { why: {"Business-run or ticketed events": "사업체가 운영하거나 유료 입장인 행사", "Fire Prevention reviews event safety: exits, occupancy and fire lanes": "소방 예방과가 출구, 수용 인원, 소방 차로 등 행사 안전을 검토합니다", "Using a street, sidewalk or public parking": "도로, 보도, 공영 주차장 사용", "Tents, stages and other temporary structures": "텐트, 무대 등 임시 구조물", "Fire review of tents and canopies": "텐트와 차양에 대한 소방 검토", "Cooking, propane and open flame at events": "행사장 조리, 프로판, 불꽃 사용", "Fireworks": "불꽃놀이", "Pyrotechnics or special effects": "폭죽 또는 특수 효과", "Commercial filming or photography": "상업 촬영 또는 사진 촬영"}, level: {"Very High": "매우 높음", "High": "높음", "Moderate": "보통"}, notes: { fireZone: zone => `행사 주소가 CAL FIRE 산불 위험도 '${zone}' 구역에 있습니다. 특히 적색 깃발 경보가 내려진 날에는 불꽃과 불꽃놀이가 제한될 수 있으니 글렌데일 소방 예방과에 미리 문의하세요.`,
    crowd: '대규모 인파에는 보통 보안, 의료, 교통 계획이 필요합니다. 최소 60일 전에 준비를 시작하세요.',
    exits: '모든 행사에는 출구, 만날 장소, 날씨에 대비한 계획이 필요합니다. FirePath가 당일 경보 대응 계획을 만들어 드릴 수 있습니다.',
    bestMatch: '이 목록은 시 허가 목록과 FirePath가 가장 잘 맞춘 결과입니다. 행사에 무엇이 필요한지는 글렌데일 시가 정합니다.' } },
};

export function planEvent(catalog, answers = {}, { hazards = null, attendees = 0, lang = 'en' } = {}) {
  const E = EVENT_TX[lang];
  const find = (type, workClass) => {
    const t = catalog.permitTypes.find(p => p.name === type);
    return t && (!workClass || t.workClasses.includes(workClass)) ? { type: t.name, workClass: workClass || t.workClasses[0] || null } : null;
  };
  const items = [];
  const add = (why, type, workClass) => { const f = find(type, workClass); if (f && !items.some(i => i.type === f.type && i.workClass === f.workClass)) items.push({ ...f, why: E?.why[why] || why }); };
  if (answers.commercial) add('Business-run or ticketed events', 'Commercial Special Event Permit', 'Special Event');
  add('Fire Prevention reviews event safety: exits, occupancy and fire lanes', 'Fire General', 'Special Event');
  if (answers.publicWay) add('Using a street, sidewalk or public parking', 'PW - ROW - Street Use', 'Street Use');
  if (answers.tents) { add('Tents, stages and other temporary structures', 'Building Temporary Structure Permit'); add('Fire review of tents and canopies', 'Fire General', 'Tent/Canopy'); }
  if (answers.flame) add('Cooking, propane and open flame at events', 'Fire General', 'Open Flame/Candle');
  if (answers.fireworks) { add('Fireworks', 'Fire General', 'Fireworks'); add('Pyrotechnics or special effects', 'Fire General', 'Pyrotechnics or Special Effects'); }
  if (answers.filming) add('Commercial filming or photography', 'Filming Permit', 'Filming');
  const notes = [];
  const fire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped' ? hazards.wildfire.matches?.[0]?.attributes?.FHSZ_Description : null;
  if (fire && (answers.flame || answers.fireworks)) notes.push(E ? E.notes.fireZone(E.level[fire] || fire) : `The event address is in a CAL FIRE ${fire} fire hazard severity zone. Open flame and fireworks may be restricted, especially on Red Flag Warning days; ask Glendale Fire Prevention early.`);
  if (attendees >= 500) notes.push(E ? E.notes.crowd : 'Large crowds usually need a security, medical and traffic plan; start at least 60 days out.');
  notes.push(E ? E.notes.exits : 'Every event needs a plan for exits, a meeting point and weather. FirePath can build an alert playbook for the day.');
  notes.push(E ? E.notes.bestMatch : 'This list is FirePath\'s best match to the City\'s permit catalog. The City of Glendale decides what your event requires.');
  return { items, notes };
}
