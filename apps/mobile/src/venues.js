// City event venues with pre-set permit packages. EXAMPLE CONFIGURATION: the City of Glendale has not
// set these up. The venues and their locations are real City facilities; the packages show how the City
// could pre-configure a site so an organizer only answers a few questions. Permit names come from the
// crawled City catalog (planEvent); outside agencies are named with links checked 2026-09-26.
import { planEvent } from './permit-catalog.js';

export const VENUE_NOTE = 'Example of a City-configured venue package. The City of Glendale has not set this up; confirm every requirement with the City.';
const FACILITY_PERMIT = 'https://www.glendaleca.gov/government/departments/community-services-parks/parks-facilities-historic-sites/parks-facilities-reservations/facility-permit-application';

export const venues = [
  { id: 'artsakh', name: 'Artsakh Avenue Paseo', where: 'N Artsakh Ave between Wilson Ave and Broadway', lat: 34.1472, lon: -118.2538, kind: 'paseo', publicWay: true,
    about: 'Pedestrian paseo in the Downtown Arts & Entertainment District, next to the Downtown Central Library.', url: 'https://www.glendaleca.gov/Home/Components/FacilityDirectory/FacilityDirectory/1192/34' },
  { id: 'central-park', name: 'Central Park', where: '201 E Colorado St', lat: 34.143507, lon: -118.253529, kind: 'park', publicWay: false,
    about: 'Downtown park beside the Adult Recreation Center.', url: 'https://www.glendaleca.gov/Home/Components/FacilityDirectory/FacilityDirectory/123/59' },
  { id: 'brand-park', name: 'Brand Park (Brand Library & Art Center)', where: '1601 W Mountain St', lat: 34.183494, lon: -118.2763395, kind: 'park', publicWay: false,
    about: 'Foothill park at the edge of the Verdugo Mountains.', url: 'https://www.glendaleca.gov/government/departments/community-services-parks/parks-facilities-historic-sites/parks-facilities-reservations/facility-permit-application' },
];

// Venue text in the viewer's language (drafts, unreviewed). Venue, agency and permit names and street
// addresses stay English; English is the source and the fallback.
export const VENUE_TX = {
  es: { about: {"artsakh": "Paseo peatonal en el Distrito de Artes y Entretenimiento del centro, junto a la Biblioteca Central.", "central-park": "Parque del centro junto al Centro Recreativo para Adultos.", "brand-park": "Parque al pie de las montañas Verdugo."}, templates: {"night-market": "Mercado nocturno", "concert": "Concierto al aire libre", "festival": "Festival cultural", "fundraiser": "Recaudación de fondos sin fines de lucro"}, why: {"Reserving a City park for an event": "Reservar un parque de la Ciudad para un evento", "Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.": "Servir alcohol. Las licencias diarias se presentan de 10 a 30 días antes del evento; en propiedad pública puede requerirse la aprobación de la policía; debe haber en el lugar un mesero certificado en RBS.", "Selling or giving out food": "Vender o regalar comida"}, timeline: {"60+ days before": "60 días o más antes", "Start City permits (special event, street use or park facility)": "Inicie los permisos de la Ciudad (evento especial, uso de calle o instalación del parque)", "10 to 30 days before": "De 10 a 30 días antes", "File the ABC alcohol application": "Presente la solicitud de alcohol ante ABC", "2 to 4 weeks before": "De 2 a 4 semanas antes", "Food vendor health permits": "Permisos de salud para los vendedores de comida", "Week of the event": "La semana del evento", "Fire inspection of tents, cooking and exits; share your emergency plan with staff": "Inspección de bomberos de carpas, cocina y salidas; comparta su plan de emergencia con el personal", "Day of": "El día del evento", "Check National Weather Service alerts; FirePath can build a playbook for the day": "Revise las alertas del Servicio Meteorológico Nacional; FirePath puede preparar un plan para ese día"}, notes: { publicWay: name => `${name} es una vía pública: el uso de la calle, las barreras y el acceso de vehículos de emergencia forman parte de la revisión.`, soundHours: 'Sonido amplificado: la Ciudad puede fijar horarios y límites de sonido para este lugar.', soundLate: 'El sonido amplificado tarde por la noche puede necesitar una aprobación especial. Pregunte a la Ciudad al presentar la solicitud.' } },
  hy: { about: {"artsakh": "Հետիոտնային զբոսայգի կենտրոնի Արվեստների և ժամանցի թաղամասում՝ Կենտրոնական գրադարանի կողքին։", "central-park": "Կենտրոնի այգի՝ Մեծահասակների հանգստի կենտրոնի կողքին։", "brand-park": "Այգի Վերդուգո լեռների ստորոտին։"}, templates: {"night-market": "Գիշերային շուկա", "concert": "Բացօթյա համերգ", "festival": "Մշակութային փառատոն", "fundraiser": "Բարեգործական հանգանակություն"}, why: {"Reserving a City park for an event": "Քաղաքային այգու ամրագրում միջոցառման համար", "Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.": "Ալկոհոլի մատուցում։ Օրական լիցենզիաները ներկայացվում են միջոցառումից 10-ից 30 օր առաջ, հանրային տարածքում կարող է պահանջվել ոստիկանության համաձայնությունը, տեղում պետք է լինի RBS հավաստագրված մատուցող։", "Selling or giving out food": "Սննդի վաճառք կամ բաժանում"}, timeline: {"60+ days before": "60 և ավելի օր առաջ", "Start City permits (special event, street use or park facility)": "Սկսեք Քաղաքի թույլտվությունները (հատուկ միջոցառում, փողոցի օգտագործում կամ այգու տարածք)", "10 to 30 days before": "10-ից 30 օր առաջ", "File the ABC alcohol application": "Ներկայացրեք ABC-ի ալկոհոլի հայտը", "2 to 4 weeks before": "2-ից 4 շաբաթ առաջ", "Food vendor health permits": "Սննդի վաճառողների սանիտարական թույլտվություններ", "Week of the event": "Միջոցառման շաբաթը", "Fire inspection of tents, cooking and exits; share your emergency plan with staff": "Վրանների, եփման և ելքերի հրդեհային ստուգում, կիսվեք արտակարգ ծրագրով աշխատակիցների հետ", "Day of": "Միջոցառման օրը", "Check National Weather Service alerts; FirePath can build a playbook for the day": "Ստուգեք Ազգային օդերևութաբանական ծառայության ծանուցումները, FirePath-ը կարող է այդ օրվա ծրագիր կազմել"}, notes: { publicWay: name => `${name}-ը հանրային ճանապարհ է․ փողոցի օգտագործումը, արգելապատնեշները և շտապ օգնության մեքենաների մուտքը ստուգման մաս են կազմում։`, soundHours: 'Ուժեղացված ձայն․ Քաղաքը կարող է այս վայրի համար սահմանել ձայնի ժամեր և սահմանափակումներ։', soundLate: 'Ուշ երեկոյան ուժեղացված ձայնի համար կարող է հատուկ թույլտվություն պահանջվել։ Հարցրեք Քաղաքին դիմելիս։' } },
  ko: { about: {"artsakh": "다운타운 예술·엔터테인먼트 지구의 보행자 거리로, 다운타운 중앙도서관 옆에 있습니다.", "central-park": "성인 레크리에이션 센터 옆의 다운타운 공원입니다.", "brand-park": "버두고 산기슭에 있는 공원입니다."}, templates: {"night-market": "야시장", "concert": "야외 콘서트", "festival": "문화 축제", "fundraiser": "비영리 모금 행사"}, why: {"Reserving a City park for an event": "행사를 위한 시립 공원 예약", "Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.": "주류 제공. 일일 면허는 행사 10~30일 전에 신청하며, 공공 부지에서는 경찰 승인이 필요할 수 있고, RBS 인증을 받은 서빙 직원이 현장에 있어야 합니다.", "Selling or giving out food": "음식 판매 또는 제공"}, timeline: {"60+ days before": "60일 이상 전", "Start City permits (special event, street use or park facility)": "시 허가 신청 시작(특별 행사, 도로 사용 또는 공원 시설)", "10 to 30 days before": "10~30일 전", "File the ABC alcohol application": "ABC 주류 신청서 제출", "2 to 4 weeks before": "2~4주 전", "Food vendor health permits": "음식 판매자 보건 허가", "Week of the event": "행사 주간", "Fire inspection of tents, cooking and exits; share your emergency plan with staff": "텐트, 조리, 출구 소방 점검. 직원과 비상 계획 공유", "Day of": "행사 당일", "Check National Weather Service alerts; FirePath can build a playbook for the day": "국립기상청 경보를 확인하세요. FirePath가 당일 대응 계획을 만들어 드릴 수 있습니다"}, notes: { publicWay: name => `${name}은(는) 공공 도로입니다. 도로 사용, 바리케이드, 긴급 차량 진입이 심사에 포함됩니다.`, soundHours: '확성 장치: 시가 이 장소의 소리 허용 시간과 한도를 정할 수 있습니다.', soundLate: '늦은 저녁의 확성 장치 사용은 특별 승인이 필요할 수 있습니다. 신청할 때 시에 문의하세요.' } },
};

// Event templates pre-fill the questions; the organizer can still change every answer.
export const eventTemplates = [
  { id: 'night-market', name: 'Night market', answers: { commercial: true, tents: true, flame: true, food: true, sound: true }, start: '17:00', end: '22:00' },
  { id: 'concert', name: 'Outdoor concert', answers: { commercial: true, tents: true, sound: true }, start: '18:00', end: '21:00' },
  { id: 'festival', name: 'Cultural festival', answers: { commercial: true, tents: true, flame: true, food: true, sound: true }, start: '11:00', end: '19:00' },
  { id: 'fundraiser', name: 'Nonprofit fundraiser', answers: { tents: true, food: true }, start: '12:00', end: '16:00' },
];

const hour = t => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h + (m || 0) / 60 : null; };

// Build a venue package from the organizer's answers. Returns City permits, outside-agency items,
// venue-specific notes and a timeline, all labelled as an example configuration.
export function venuePackage(catalog, venueId, input = {}, hazards = null, lang = 'en') {
  const V = VENUE_TX[lang];
  const venue = venues.find(v => v.id === venueId);
  if (!venue) return null;
  const a = input.answers || {};
  const plan = planEvent(catalog, { commercial: a.commercial, publicWay: venue.publicWay, tents: a.tents, flame: a.flame, fireworks: a.fireworks, filming: a.filming }, { hazards, attendees: input.attendees, lang });
  const outside = [];
  if (venue.kind === 'park') outside.push({ name: 'City park facility permit', who: 'Glendale Community Services & Parks', why: V?.why['Reserving a City park for an event'] || 'Reserving a City park for an event', url: FACILITY_PERMIT });
  if (a.alcohol) outside.push({ name: 'Alcohol: ABC Event Authorization (licensed caterer) or Daily License (nonprofit, ABC-221)', who: 'California Department of Alcoholic Beverage Control', why: V?.why['Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.'] || 'Serving alcohol. Daily Licenses are filed 10 to 30 days before the event; police approval may be needed on public property; a certified RBS server must be on site.', url: 'https://www.abc.ca.gov/licensing/license-forms/event-authorization/' });
  if (a.food) outside.push({ name: 'Temporary food facility permits for each food vendor', who: 'Usually Los Angeles County Public Health, Environmental Health (confirm with the City)', why: V?.why['Selling or giving out food'] || 'Selling or giving out food', url: 'http://publichealth.lacounty.gov/eh/' });
  const notes = [...plan.notes];
  const end = hour(input.end);
  if (a.sound && end !== null && end >= 21) notes.unshift(V ? V.notes.soundLate : 'Amplified sound late in the evening may need special approval. Ask the City when you apply.');
  if (a.sound) notes.unshift(V ? V.notes.soundHours : 'Amplified sound: the City may set sound hours and limits for this site.');
  if (venue.publicWay) notes.unshift(V ? V.notes.publicWay(venue.name) : `${venue.name} is a public way: street use, barricades and emergency vehicle access are part of the review.`);
  const timeline = [
    ['60+ days before', 'Start City permits (special event, street use or park facility)'],
    a.alcohol ? ['10 to 30 days before', 'File the ABC alcohol application'] : null,
    a.food ? ['2 to 4 weeks before', 'Food vendor health permits'] : null,
    ['Week of the event', 'Fire inspection of tents, cooking and exits; share your emergency plan with staff'],
    ['Day of', 'Check National Weather Service alerts; FirePath can build a playbook for the day'],
  ].filter(Boolean).map(([when, what]) => ({ when: V?.timeline[when] || when, what: V?.timeline[what] || what }));
  return { venue, items: plan.items, outside, notes, timeline, note: VENUE_NOTE };
}
