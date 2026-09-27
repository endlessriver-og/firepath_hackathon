// Search the crawled City of Glendale permit catalog in plain language, and assemble the likely set
// of City permits for an event. Names are the City's own permit types and work classes; FirePath only
// matches and explains them. Requirements are confirmed by the City, not by FirePath.
import { describeHazard } from './preparedness.js';

// Everyday words -> the City's vocabulary. Each entry adds search terms that appear in the catalog.
// English first, then Spanish, Armenian and Korean words (drafts), so a resident can search in their own
// language and still land on the City's English permit names.
const SYNONYMS = [
  [/party|festival|fair|concert|market|gathering|celebration|event|block party|parade|run|walk|fiesta|feria|concierto|mercado|reunión|celebración|evento|desfile|carrera|միջոցառում|փառատոն|տոնավաճառ|համերգ|շուկա|տոն|շքերթ|파티|축제|행사|콘서트|시장|장터|퍼레이드|모임/, ['special event', 'street use', 'tent/canopy', 'temporary structure']],
  [/tent|canopy|stage|booth|bleacher|structure|carpa|toldo|escenario|puesto|gradas|estructura|վրան|բեմ|տաղավար|կառույց|텐트|천막|무대|부스|구조물/, ['tent/canopy', 'temporary structure']],
  [/food|truck|bbq|grill|cook|propane|fryer|candle|flame|comida|camión de comida|parrilla|asador|cocinar|propano|freidora|vela|llama|fogata|սնունդ|ուտելիք|խորոված|մանղալ|եփ|պրոպան|մոմ|կրակ|음식|푸드트럭|바비큐|그릴|요리|프로판|튀김|촛불|불꽃/, ['open flame/candle', 'commercial kitchen cooking oil']],
  [/film|movie|shoot|video|photo|filmar|filmación|película|rodaje|foto|նկարահան|ֆիլմ|տեսանկար|լուսանկար|촬영|영화|비디오|영상|사진/, ['filming']],
  [/firework|pyro|special effect|fuegos artificiales|pirotecnia|efectos especiales|հրավառություն|պիրոտեխնիկա|불꽃놀이|폭죽|특수 효과/, ['fireworks', 'pyrotechnics']],
  [/street|road|closure|block|sidewalk|curb|calles?\b|cierre|cuadra|banqueta|acera|bordillo|փողոց|ճանապարհ|փակում|մայթ|거리|도로|통제|보도|인도/, ['street use', 'sidewalk']],
  [/patio|outdoor dining|tables|restaurant seating|comedor al aire libre|mesas afuera|terraza|բացօթյա|ամառային սրահ|테라스|야외 식사|야외 좌석/, ['sidewalk and dining', 'back to business']],
  [/roof|techo|tejado|azotea|տանիք|지붕/, ['re-roof']],
  [/adu|granny|backyard home|accessory|casita|unidad adicional|vivienda accesoria|լրացուցիչ բնակարան|별채|부속 주택/, ['adu', 'combination (single family)']],
  [/addition|remodel|renovat|bedroom|garage|ampliación|remodel|renovar|recámara|habitación|cochera|garaje|վերանորոգ|ընդլայն|ննջասենյակ|ավտոտնակ|증축|리모델링|개조|침실|차고/, ['combination (single family)', 'addition', 'commercial and mixed use']],
  [/kitchen|bath|cocina|baño|խոհանոց|լոգարան|սանհանգույց|주방|부엌|욕실|화장실/, ['kitchen and bath']],
  [/solar|panel|battery|batería|արևային|մարտկոց|태양광|태양|패널|배터리/, ['solar', 'battery system']],
  [/quake|earthquake|retrofit|bolt|brace|foundation|sismo|terremoto|temblor|refuerzo|cimentación|cimientos|երկրաշարժ|սեյսմիկ|ամրացում|հիմք|지진|내진|보강|기초/, ['seismic bolt and brace']],
  [/tree|oak|sycamore|bay|árbol|roble|sicomoro|ծառ(?!այ)|կաղնի|나무|참나무/, ['indigenous tree', 'street tree']],
  [/brush|weed|clearance|defensible|fuel|vegetation|wildfire|maleza|hierba|desmonte|espacio defendible|vegetación|incendio forestal|թփուտ|մոլախոտ|բուսականություն|անտառային հրդեհ|잡목|잡초|방어 공간|초목|산불/, ['landscape/fuel modification', 'fire clearance']],
  [/water heater|plumb|pipe|sewer|calentador|boiler|plomería|tubería|drenaje|alcantarillado|ջրատաքացուցիչ|ջրմուղ|խողովակ|կոյուղի|온수기|배관|파이프|하수/, ['plumbing', 'sewer connection']],
  [/hvac|air condition|furnace|heat pump|mechanical|aire acondicionado|calefacción|calentón|bomba de calor|minisplit|օդորակիչ|ջեռուցում|ջերմային պոմպ|에어컨|냉난방|보일러|히트펌프/, ['mechanical']],
  [/electric|outlet|ev charger|charger|breaker|eléctric|electricidad|enchufe|cargador|pastilla|էլեկտր|վարդակ|լիցքավորիչ|전기|콘센트|충전기|차단기/, ['electrical']],
  [/sign|banner|mural|paint|letrero|anuncio|pancarta|manta|pintura|pintar|ցուցանակ|պաստառ|որմնանկար|ներկ|간판|현수막|벽화|페인트/, ['sign permit', 'mural', 'pedestrian sign']],
  [/fence|wall|cerca|barda|muro|ցանկապատ|պարիսպ|울타리|담장|옹벽/, ['fence/wall', 'retaining wall']],
  [/pool|spa|alberca|piscina|jacuzzi|լողավազան|수영장|스파/, ['pool']],
  [/demolish|demolition|tear down|demoler|demolición|derribar|tumbar|քանդ|철거/, ['demolition']],
  [/window|door|ventana|puerta|պատուհան|դուռ|창문|현관문|출입문/, ['window and door']],
  [/chemical|hazmat|storage|tank|gas|oil|químico|materiales peligrosos|almacenamiento|tanque|aceite|քիմիական|վտանգավոր նյութ|պահեստ|բաք|գազ|յուղ|화학|위험물|저장|탱크|가스|오일/, ['hazmat storage', 'storage tank', 'medical gas', 'carbon dioxide']],
  [/sprinkler|alarm|extinguish|rociador|alarma|extintor|սփրինքլեր|ազդանշան|կրակմարիչ|스프링클러|경보기|소화기/, ['sprinkler', 'fire alarm', 'extinguishing']],
];

// Latin-script words must start a word (an optional "re" in front is fine: reroof, repaint), so "door" does not
// fire inside "outdoor", "sign" inside "design" or "oil" inside "boiler"; endings stay free ("running"). JavaScript's
// \b ignores Armenian letters, so an Armenian word must not follow another Armenian letter ("ծառ" not inside
// "ծառայություն"). Korean matches as written.
const WORD_SYNONYMS = SYNONYMS.map(([re, extra]) => [new RegExp(re.source.split('|').map(w => /^[a-z]/.test(w) ? `\\b(?:re)?${w}` : /^[\u0531-\u0587]/.test(w) ? `(?<![\u0531-\u0587])${w}` : w).join('|')), extra]);

// Phrases that point clearly at one City permit type.
const BOOSTS = [[/block party|street (party|fair|closure)|parade|fiesta de (la )?cuadra|fiesta en la calle|cierre de calle|desfile|փողոցային տոն|շքերթ|동네 파티|골목 파티|도로 통제|퍼레이드/, 'PW - ROW - Street Use'], [/wedding|private party|boda|fiesta privada|հարսանիք|결혼식|웨딩/, 'Building Temporary Structure Permit']];
const norm = s => s.toLowerCase();
const STOP = new Set(['new', 'add', 'the', 'and', 'for', 'our', 'my', 'around', 'house', 'home', 'want', 'need', 'build', 'put', 'install', 'get', 'with', 'have', 'host', 'hold', 'run', 'at', 'on', 'in', 'a']);

// Returns [{ name, workClasses (matching first), audience, hazards, score }], best first.
export function searchPermits(catalog, query, { audience = null, limit = 8 } = {}) {
  const q = norm(query || '').trim();
  if (!q) return [];
  const terms = new Set(q.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s)$/, '')));
  for (const [re, extra] of WORD_SYNONYMS) if (re.test(q)) extra.forEach(t => terms.add(t));
  return catalog.permitTypes.map(type => {
    const name = norm(type.name);
    const hits = type.workClasses.filter(w => [...terms].some(t => norm(w).includes(t)));
    let score = [...terms].filter(t => name.includes(t)).length * 3 + hits.length * 2;
    if (audience && type.audience.includes(audience)) score += 1;
    if (BOOSTS.some(([re, target]) => re.test(q) && target === type.name)) score += 4;
    return { ...type, workClasses: [...hits, ...type.workClasses.filter(w => !hits.includes(w))], matched: hits, score };
  }).filter(t => t.score > (audience && t.audience.includes(audience) ? 1 : 0)).sort((a, b) => b.score - a.score).slice(0, limit);
}

// Everyday business words in English, Spanish, Armenian and Korean -> words in the City's license names
// (which follow the federal industry list, e.g. "Snack and Nonalcoholic Beverage Bars" for a coffee shop).
const LICENSE_WORDS = [
  [/\bautos?\b|automóvil|automotive/, ['automotive']],
  [/restaurant|restaurante|ռեստորան|식당|레스토랑|음식점/, ['full-service restaurants', 'limited-service restaurants']],
  [/bakery|panader|pasteler|հացատուն|հրուշակ|빵집|베이커리|제과/, ['retail bakeries']],
  [/coffee|\bcafe|café|cafeter|սրճարան|카페|커피/, ['snack and nonalcoholic beverage bars']],
  [/food truck|catering|caterer|lonchera|banquete|կեյթերինգ|푸드트럭|케이터링|출장 요리/, ['caterers']],
  [/beauty|hair salon|salón de belleza|estética|peluquer|գեղեցկության սրահ|վարսահարդար|미용실|헤어/, ['beauty salons']],
  [/barber|barber[ií]a|վարսավիր|이발소|바버/, ['barber shops']],
  [/nail|uñas|մանիկյուր|네일/, ['nail salons']],
  [/auto repair|mechanic|car repair|taller mec|mecánic|ավտոնորոգ|ավտոսպասարկ|자동차 수리|정비소/, ['automotive repair']],
  [/clothing|clothes|boutique|\bropa\b|հագուստ|옷가게|의류/, ['clothing stores']],
  [/grocery|abarrotes|supermercado|մթերային|식료품|슈퍼마켓/, ['grocery']],
  [/jewel|joyer|ոսկերչ|զարդեր|보석|주얼리/, ['jewelry stores']],
  [/dentist|dental|dentista|ատամնաբույժ|ստոմատոլոգ|치과/, ['offices of dentists']],
  [/daycare|day care|guarder|մանկապարտեզ|어린이집/, ['child day care']],
  [/\bbars?\b|\bpub\b|cantina|술집|주점/, ['drinking places']],
  [/cleaning|janitor|limpieza|մաքրման ծառայ|청소/, ['janitorial']],
  [/tutor|tutor[ií]a|clases particulares|կրկնուսույց|과외|학원/, ['exam preparation']],
  [/pharmac|farmacia|դեղատուն|약국/, ['pharmacies']],
  [/florist|flower shop|florer|florister|ծաղկի խանութ|꽃집/, ['florists']],
  [/laundry|dry clean|lavander|tintorer|լվացքատուն|քիմմաքրում|세탁소/, ['laundry services']],
  [/\bgym\b|fitness|gimnasio|մարզասրահ|헬스|체육관|피트니스/, ['fitness']],
  [/real estate|bienes ra[ií]ces|inmobiliaria|անշարժ գույք|부동산/, ['real estate agents']],
  [/insurance|seguros|ապահովագր|보험/, ['insurance']],
  [/doctor|clinic|médico|clínica|բժշկ|կլինիկա|병원|의원/, ['offices of physicians']],
  [/veterin|pet groom|mascota|անասնաբույժ|동물병원|애견/, ['veterinary', 'pet care']],
  [/accountant|bookkeep|tax prep|contador|contabilidad|impuestos|հաշվապահ|회계|세무/, ['accounting services']],
  [/lawyer|attorney|abogad|փաստաբան|իրավաբան|변호사|법률/, ['legal services']],
];

const ENDING = /^(|s|es|ies|y|ry|ic|ics|ing|er|ers|al|ist|ists|ed|shops?)$/;

export function searchLicenses(catalog, query, limit = 6) {
  const q = norm(query || '');
  const byWords = phrase => {
    const words = phrase.split(/[^a-z0-9]+/).filter(w => w.length > 2).map(w => w.replace(/(es|s)$/, ''));
    // Each word must be a word in the name, give or take an English ending ("pharmacy" finds Pharmacies;
    // "tax" does not find Taxi Service, nor "bar" Barber Shops).
    return words.length ? catalog.businessLicenseTypes.filter(name => { const parts = norm(name).split(/[^a-z0-9]+/); return words.every(w => parts.some(x => x.startsWith(w) && ENDING.test(x.slice(w.length)))); }) : [];
  };
  const mapped = LICENSE_WORDS.filter(([re]) => re.test(q)).flatMap(([, phrases]) => phrases.flatMap(byWords));
  const found = [...new Set([...mapped, ...byWords(q)])];
  if (found.length) return found.slice(0, limit);
  // Nothing by whole words: fall back to plain substrings so a partial word still finds something.
  const loose = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  return loose.length ? catalog.businessLicenseTypes.filter(name => loose.every(w => norm(name).includes(w))).slice(0, limit) : [];
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
