// Readiness scoring, queryable recommendations and the resident permit guide.
// Pure functions shared by the Node API and the Expo app (copied by scripts/sync-mobile-demo.mjs).
import { buildTasks, describeHazard, hazardNames } from './preparedness.js';

const CATEGORY = { alerts: 'alerts', kit: 'kit', plan: 'household', quake: 'earthquake', ground: 'earthquake', pets: 'household', assistance: 'household', apartment: 'household', wildfire: 'wildfire', flood: 'water', zone0: 'wildfire', 'responder-notes': 'household', kids: 'household', drill: 'alerts' };
const POINTS = { alerts: 20, kit: 30, plan: 20, quake: 15 };
export const categories = [['all', 'All'], ['wildfire', 'Wildfire'], ['earthquake', 'Earthquake'], ['water', 'Flood'], ['household', 'Household'], ['kit', 'Go bag'], ['alerts', 'Alerts']];

// Recommendations = the shared task engine plus steps driven by saved household facts.
export function buildRecommendations(profile = {}, household = {}, hazards = null) {
  const pets = household.pets || [];
  const members = household.members || [];
  const tasks = buildTasks({ housing: household.housing, homeType: household.homeType, pets: pets.length > 0, assistance: Boolean(household.assistance?.trim()) || members.some(m => m.needsHelp || m.ageGroup === 'senior') }, hazards);
  if (members.some(m => m.ageGroup === 'child')) tasks.push({ id: 'kids', tag: 'Your household', title: 'Plan for your kids during school hours', description: 'Know your school\'s emergency pickup plan, add a backup adult to the release list, and practice the meeting place with each child.', url: 'https://www.ready.gov/kids', link: 'Ready.gov for families' });
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  if (wildfire && household.homeType !== 'apartment') tasks.push({ id: 'zone0', tag: 'Mapped wildfire zone', title: 'Clear the first 5 feet around your home', description: 'Move firewood, mulch and anything that burns away from walls and vents.', url: 'https://www.readyforwildfire.org/prepare-for-wildfire/', link: 'CAL FIRE home hardening' });
  if (pets.length) {
    const pet = tasks.find(task => task.id === 'pets');
    pet.description = `Plan for ${pets.map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`).join(', ')}: food, water, medications, carriers or leashes, and a current photo of each.`;
  }
  tasks.push({ id: 'drill', tag: 'Stay informed', title: 'Run a practice alert drill', description: 'Alerts › Drill. Two minutes, with your household.' });
  if (profile.addressVerified !== 'mail') tasks.push({ id: 'responder-notes', tag: 'Your household', title: 'Verify your address and review your responder notes', description: 'Confirm your address and the short note responders could see.' });
  return tasks.map(task => ({ ...task, category: CATEGORY[task.id] || 'household', points: POINTS[task.id] || (task.tag.startsWith('Mapped') ? 25 : 15) }));
}

// Free-text + category + status filter. Matches title, description, tag and category.
export function queryRecommendations(items, { q = '', category = 'all', status = 'open', done = {} } = {}) {
  // Light stemming so "pets" finds "pet supplies" and "roofs" finds "roof".
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map(word => word.length > 3 ? word.replace(/(es|s)$/, '') : word);
  return items.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    if (status === 'open' && done[item.id]) return false;
    if (status === 'done' && !done[item.id]) return false;
    const text = `${item.title} ${item.description} ${item.tag} ${item.category}`.toLowerCase();
    return words.every(word => text.includes(word));
  });
}

// Milestones count toward the score alongside recommendations, so setup itself is rewarded.
export function milestones(profile = {}, household = {}) {
  return [
    { id: 'account', title: 'Created your account', points: 10, done: true },
    { id: 'address', title: 'Registered a Glendale address', points: 20, done: Boolean(profile.address) },
    { id: 'verified', title: 'Verified your address by mail', points: 20, done: profile.addressVerified === 'mail' },
    { id: 'household', title: 'Described your household', points: 15, done: Boolean(household.housing && household.homeType && household.people) },
    { id: 'meeting', title: 'Set meeting places', points: 15, done: Boolean(household.meetNear?.trim() && household.meetFar?.trim()) },
  ];
}

const LEVELS = [[0, 'Getting started'], [25, 'Aware'], [50, 'Prepared'], [75, 'Ready'], [100, 'Resilient']];
const BADGES = [
  { id: 'mapped', title: 'Mapped my home', when: s => s.milestone.address },
  { id: 'verified', title: 'Verified resident', when: s => s.milestone.verified },
  { id: 'alerts', title: 'Official alerts on', when: s => s.done.alerts },
  { id: 'kit', title: 'Go bag packed', when: s => s.done.kit },
  { id: 'plan', title: 'Household plan', when: s => s.done.plan && s.milestone.meeting },
  { id: 'quake', title: 'Quake ready', when: s => s.done.quake },
  { id: 'drill', title: 'Drilled', when: s => s.done.drill },
  { id: 'pets', title: 'Pets covered', when: s => s.done.pets },
  { id: 'wildfire', title: 'Ember aware', when: s => s.done.wildfire || s.done.zone0 },
];

const BUSINESS_BADGES = [
  { id: 'mapped', title: 'Mapped the site', when: s => s.milestone.address },
  { id: 'verified', title: 'Verified business', when: s => s.milestone.verified },
  { id: 'alerts', title: 'Official alerts on', when: s => s.done.alerts },
  { id: 'team', title: 'Team ready', when: s => s.done.contacts && s.done.assembly },
  { id: 'continuity', title: 'Continuity plan', when: s => s.done.continuity },
  { id: 'fire', title: 'Fire safe', when: s => s.done.extinguishers && (s.done.hood ?? true) },
  { id: 'quake', title: 'Quake ready', when: s => s.done.quake },
  { id: 'hazmat', title: 'Hazmat squared away', when: s => s.done.hmbp },
];

// Business accounts pass the business profile as `household`.
export function recommendationsFor(profile = {}, household = {}, hazards = null) {
  return profile.type === 'business' ? buildBusinessRecommendations(household, hazards) : buildRecommendations(profile, household, hazards);
}

export function readiness(recommendations, done = {}, profile = {}, household = {}) {
  const business = profile.type === 'business';
  const steps = business ? businessMilestones(profile, household) : milestones(profile, household);
  const possible = steps.reduce((sum, m) => sum + m.points, 0) + recommendations.reduce((sum, r) => sum + r.points, 0);
  const earned = steps.filter(m => m.done).reduce((sum, m) => sum + m.points, 0) + recommendations.filter(r => done[r.id]).reduce((sum, r) => sum + r.points, 0);
  // Shown to users as a plain percentage of the visible checklist (no points).
  const score = recommendations.length ? Math.round((recommendations.filter(r => done[r.id]).length / recommendations.length) * 100) : 0;
  const levelIndex = LEVELS.reduce((found, [min], index) => score >= min ? index : found, 0);
  const next = LEVELS[levelIndex + 1];
  const state = { done, milestone: Object.fromEntries(steps.map(m => [m.id, m.done])) };
  return {
    score, earned, possible,
    level: LEVELS[levelIndex][1],
    nextLevel: next ? { name: next[1], at: next[0] } : null,
    milestones: steps,
    badges: (business ? BUSINESS_BADGES.filter(b => b.id !== 'hazmat' || recommendations.some(r => r.id === 'hmbp')) : BADGES).map(b => ({ id: b.id, title: b.title, earned: Boolean(b.when(state)) })),
  };
}

// --- Resident permit guide -------------------------------------------------------------
// FirePath does not submit permits. It explains what a project usually needs, flags hazard-zone
// considerations from the saved address, and links to the City's own portal.
export const PERMIT_PORTAL = 'https://glendaleca-energovweb.tylerhost.net/apps/SelfService#/home';
const GUIDANCE = 'https://www.glendaleca.gov/government/departments/community-development/development-services/permit-guidance';
export const permitTypes = [
  { id: 'addition', title: 'Home addition or major remodel', permit: 'Building permit (plan check); Planning review may apply', needs: ['Site plan and floor plans', 'Scope of work and square footage', 'Property owner information', 'Licensed contractor, or owner-builder acknowledgement'], url: GUIDANCE, fire: true, seismic: true },
  { id: 'adu', title: 'Accessory dwelling unit (ADU)', permit: 'Building permit; City pre-approved ADU plans may speed review', needs: ['Site plan showing setbacks', 'Choice of a pre-approved plan or your own plans', 'Utility connection plan', 'Property owner information'], url: 'https://www.glendaleca.gov/government/departments/community-development/development-services/adu', fire: true, seismic: true },
  { id: 'reroof', title: 'Roof replacement', permit: 'Building permit for re-roofing', needs: ['Roofing material and product listing', 'Roof area', 'Contractor license'], url: PERMIT_PORTAL, fire: true, roof: true },
  { id: 'retrofit', title: 'Seismic retrofit (brace and bolt)', permit: 'Building permit', needs: ['Foundation type (raised or cripple wall)', 'Retrofit plan or standard plan set', 'Contractor license'], url: 'https://www.earthquakebracebolt.com/', seismic: true },
  { id: 'solar', title: 'Solar panels or battery', permit: 'Building and electrical permit', needs: ['System size and equipment specs', 'Roof or site layout', 'Single-line electrical diagram'], url: PERMIT_PORTAL },
  { id: 'mechanical', title: 'Water heater, HVAC or electrical panel', permit: 'Plumbing, mechanical or electrical permit', needs: ['Equipment make and model', 'Location in the home', 'Contractor license'], url: PERMIT_PORTAL, quakeStrap: true },
  { id: 'fence', title: 'Fence or wall', permit: 'Fence/wall permit (available online)', needs: ['Height and length', 'Material', 'Location relative to property lines'], url: PERMIT_PORTAL, fire: true },
  { id: 'tree', title: 'Work on or near an oak, sycamore or bay tree', permit: 'Indigenous tree permit (Public Works)', needs: ['Tree species and location', 'Photos of the tree', 'Arborist report when required'], url: 'https://www.glendaleca.gov/government/departments/public-works/indigenous-tree-program' },
];

// Permit guidance in the viewer's language (drafts, unreviewed). Official permit names and the summary for
// City staff stay English. English is the source: an unknown phrase or language falls back to it.
const GUIDE_TX = {
  es: { needs: {"Site plan and floor plans": "Plano del sitio y planos de planta", "Scope of work and square footage": "Alcance del trabajo y superficie en pies cuadrados", "Property owner information": "Datos del propietario", "Licensed contractor, or owner-builder acknowledgement": "Contratista con licencia, o declaración de propietario-constructor", "Site plan showing setbacks": "Plano del sitio con las distancias a los linderos", "Choice of a pre-approved plan or your own plans": "Un plan preaprobado o sus propios planos", "Utility connection plan": "Plan de conexión de servicios", "Roofing material and product listing": "Material del techo y su ficha de producto", "Roof area": "Superficie del techo", "Contractor license": "Licencia del contratista", "Foundation type (raised or cripple wall)": "Tipo de cimentación (elevada o con muro de cripple)", "Retrofit plan or standard plan set": "Plan de refuerzo o juego de planos estándar", "System size and equipment specs": "Tamaño del sistema y especificaciones del equipo", "Roof or site layout": "Distribución en el techo o el terreno", "Single-line electrical diagram": "Diagrama eléctrico unifilar", "Equipment make and model": "Marca y modelo del equipo", "Location in the home": "Ubicación en la casa", "Height and length": "Altura y longitud", "Material": "Material", "Location relative to property lines": "Ubicación respecto a los linderos", "Tree species and location": "Especie y ubicación del árbol", "Photos of the tree": "Fotos del árbol", "Arborist report when required": "Informe de arbolista cuando se requiera", "Chemical inventory with amounts": "Inventario de químicos con cantidades", "Site map with storage locations": "Plano del sitio con los lugares de almacenamiento", "Emergency response and training plan": "Plan de respuesta a emergencias y capacitación", "Description of the activity or storage": "Descripción de la actividad o del almacenamiento", "Quantities and locations": "Cantidades y ubicaciones", "Floor plan": "Plano de planta", "Floor plans and scope of work": "Planos de planta y alcance del trabajo", "Occupancy and use": "Ocupación y uso", "Property owner authorization": "Autorización del propietario", "Licensed contractor": "Contratista con licencia", "Sign drawings and dimensions": "Dibujos y medidas del letrero", "Location on the building": "Ubicación en el edificio", "Electrical details if illuminated": "Detalles eléctricos si es iluminado", "Equipment specs": "Especificaciones del equipo", "Location": "Ubicación"}, level: {"Very High": "muy alto", "High": "alto", "Moderate": "moderado"}, ground: {"fault": "falla", "liquefaction": "licuefacción", "landslide": "deslizamiento"}, notes: {
    fireZone: (zone, roof) => `Su dirección está en una zona de riesgo de incendio ${zone} de CAL FIRE. Pregunte a Building & Safety si aplican las normas de construcción resistente a incendios forestales (Capítulo 7A del Código de Construcción de California)${roof ? ', incluida la clase de techo requerida' : ''}.`,
    seismic: zones => `Su dirección está en una zona mapeada de ${zones}. Algunos proyectos en zonas de riesgo sísmico del estado requieren un informe geotécnico.`,
    quakeStrap: 'Los calentadores de agua deben estar sujetos contra sismos; inclúyalo en el alcance.',
    owner: 'El portal de la Ciudad pide los datos del propietario. Los inquilinos necesitan la aprobación del propietario y el correo de su cuenta en el portal.',
    zonesLayer: 'Las zonas de incendio roja, amarilla y verde para permisos de la Ciudad son una capa distinta de los mapas de CAL FIRE y no están conectadas a FirePath.',
    and: ' y ', mapped: 'mapeada',
  } },
  hy: { needs: {"Site plan and floor plans": "Տեղանքի հատակագիծ և հարկերի հատակագծեր", "Scope of work and square footage": "Աշխատանքների ծավալը և մակերեսը քառ. ֆուտով", "Property owner information": "Սեփականատիրոջ տվյալները", "Licensed contractor, or owner-builder acknowledgement": "Լիցենզավորված կապալառու կամ սեփականատեր-կառուցապատողի հայտարարություն", "Site plan showing setbacks": "Տեղանքի հատակագիծ՝ սահմաններից հեռավորություններով", "Choice of a pre-approved plan or your own plans": "Նախապես հաստատված նախագիծ կամ ձեր սեփական նախագծերը", "Utility connection plan": "Կոմունալ միացումների պլան", "Roofing material and product listing": "Տանիքի նյութը և արտադրանքի տվյալները", "Roof area": "Տանիքի մակերեսը", "Contractor license": "Կապալառուի լիցենզիա", "Foundation type (raised or cripple wall)": "Հիմքի տեսակը (բարձրացված կամ ցածր պատով)", "Retrofit plan or standard plan set": "Ամրացման նախագիծ կամ ստանդարտ նախագծերի փաթեթ", "System size and equipment specs": "Համակարգի չափը և սարքավորումների բնութագրերը", "Roof or site layout": "Տանիքի կամ տեղանքի դասավորությունը", "Single-line electrical diagram": "Միագիծ էլեկտրական սխեմա", "Equipment make and model": "Սարքավորման արտադրողը և մոդելը", "Location in the home": "Տեղը տանը", "Height and length": "Բարձրությունը և երկարությունը", "Material": "Նյութը", "Location relative to property lines": "Տեղը սեփականության սահմանների նկատմամբ", "Tree species and location": "Ծառի տեսակը և տեղը", "Photos of the tree": "Ծառի լուսանկարներ", "Arborist report when required": "Ծառաբույծի եզրակացություն, երբ պահանջվում է", "Chemical inventory with amounts": "Քիմիական նյութերի ցուցակ՝ քանակներով", "Site map with storage locations": "Տեղանքի քարտեզ՝ պահեստավորման վայրերով", "Emergency response and training plan": "Արտակարգ արձագանքման և ուսուցման պլան", "Description of the activity or storage": "Գործունեության կամ պահեստավորման նկարագրություն", "Quantities and locations": "Քանակներ և վայրեր", "Floor plan": "Հարկի հատակագիծ", "Floor plans and scope of work": "Հարկերի հատակագծեր և աշխատանքների ծավալը", "Occupancy and use": "Զբաղվածությունը և օգտագործումը", "Property owner authorization": "Սեփականատիրոջ թույլտվությունը", "Licensed contractor": "Լիցենզավորված կապալառու", "Sign drawings and dimensions": "Ցուցանակի գծագրերը և չափերը", "Location on the building": "Տեղը շենքի վրա", "Electrical details if illuminated": "Էլեկտրական մանրամասներ, եթե լուսավորված է", "Equipment specs": "Սարքավորման բնութագրերը", "Location": "Տեղը"}, level: {"Very High": "շատ բարձր", "High": "բարձր", "Moderate": "միջին"}, ground: {"fault": "խզվածքի", "liquefaction": "հեղուկացման", "landslide": "սողանքի"}, notes: {
    fireZone: (zone, roof) => `Ձեր հասցեն գտնվում է CAL FIRE-ի «${zone}» հրդեհային վտանգի գոտում։ Հարցրեք Building & Safety-ին, արդյոք կիրառվում են անտառային հրդեհներին դիմացկուն շինարարության կանոնները (Կալիֆոռնիայի շինարարական օրենսգրքի 7A գլուխ)${roof ? ', ներառյալ տանիքի պահանջվող դասը' : ''}։`,
    seismic: zones => `Ձեր հասցեն գտնվում է ${zones} քարտեզագրված գոտում։ Նահանգի սեյսմիկ վտանգի գոտիներում որոշ նախագծերի համար պահանջվում է երկրաբանական եզրակացություն։`,
    quakeStrap: 'Ջրատաքացուցիչները պետք է ամրացված լինեն երկրաշարժի դեպքի համար․ ներառեք դա աշխատանքների ծավալում։',
    owner: 'Քաղաքի պորտալը պահանջում է սեփականատիրոջ տվյալները։ Վարձակալներին անհրաժեշտ է սեփականատիրոջ համաձայնությունը և պորտալի հաշվի էլ. փոստը։',
    zonesLayer: 'Քաղաքի թույլտվությունների կարմիր, դեղին և կանաչ հրդեհային գոտիները CAL FIRE-ի քարտեզներից առանձին շերտ են և միացված չեն FirePath-ին։',
    and: ' և ', mapped: 'քարտեզագրված',
  } },
  ko: { needs: {"Site plan and floor plans": "대지 배치도와 평면도", "Scope of work and square footage": "공사 범위와 면적(제곱피트)", "Property owner information": "소유주 정보", "Licensed contractor, or owner-builder acknowledgement": "면허 있는 시공업체 또는 소유주 직접 시공 확인서", "Site plan showing setbacks": "이격 거리가 표시된 대지 배치도", "Choice of a pre-approved plan or your own plans": "사전 승인 도면 또는 자체 도면", "Utility connection plan": "전기·수도·가스 연결 계획", "Roofing material and product listing": "지붕 자재와 제품 인증 목록", "Roof area": "지붕 면적", "Contractor license": "시공업체 면허", "Foundation type (raised or cripple wall)": "기초 형태(들린 기초 또는 크리플 월)", "Retrofit plan or standard plan set": "보강 도면 또는 표준 도면 세트", "System size and equipment specs": "시스템 용량과 장비 사양", "Roof or site layout": "지붕 또는 대지 배치", "Single-line electrical diagram": "단선 결선도", "Equipment make and model": "장비 제조사와 모델", "Location in the home": "집 안의 설치 위치", "Height and length": "높이와 길이", "Material": "재료", "Location relative to property lines": "대지 경계선 기준 위치", "Tree species and location": "나무 종류와 위치", "Photos of the tree": "나무 사진", "Arborist report when required": "필요 시 수목 전문가 보고서", "Chemical inventory with amounts": "수량이 포함된 화학물질 목록", "Site map with storage locations": "보관 위치가 표시된 현장 지도", "Emergency response and training plan": "비상 대응 및 교육 계획", "Description of the activity or storage": "활동 또는 보관 내용 설명", "Quantities and locations": "수량과 위치", "Floor plan": "평면도", "Floor plans and scope of work": "평면도와 공사 범위", "Occupancy and use": "수용 인원과 용도", "Property owner authorization": "소유주 승인", "Licensed contractor": "면허 있는 시공업체", "Sign drawings and dimensions": "간판 도면과 치수", "Location on the building": "건물 내 위치", "Electrical details if illuminated": "조명 간판이면 전기 세부 사항", "Equipment specs": "장비 사양", "Location": "위치"}, level: {"Very High": "매우 높음", "High": "높음", "Moderate": "보통"}, ground: {"fault": "단층", "liquefaction": "액상화", "landslide": "산사태"}, notes: {
    fireZone: (zone, roof) => `주소가 CAL FIRE 산불 위험도 '${zone}' 구역에 있습니다. 산불 저항 건축 규정(캘리포니아 건축법 7A장)이 적용되는지 Building & Safety에 문의하세요${roof ? '. 필요한 지붕 등급도 확인하세요' : ''}.`,
    seismic: zones => `주소가 지도상 ${zones} 구역에 있습니다. 주 지진 위험 구역의 일부 공사는 지반 조사 보고서가 필요합니다.`,
    quakeStrap: '온수기는 지진에 대비해 고정해야 합니다. 공사 범위에 포함하세요.',
    owner: '시 포털은 소유주 정보를 요구합니다. 세입자는 소유주의 승인과 포털 계정 이메일이 필요합니다.',
    zonesLayer: '시의 빨강·노랑·초록 허가 화재 구역은 CAL FIRE 지도와 다른 레이어이며 FirePath와 연결되어 있지 않습니다.',
    and: ', ', mapped: '지도상',
  } },
};

export function permitGuide(typeId, { profile = {}, household = {}, hazards = null, description = '', lang = 'en' } = {}) {
  const type = (profile.type === 'business' ? businessPermitTypes : permitTypes).find(t => t.id === typeId);
  if (!type) return null;
  const notes = [];
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  const zone = hazards?.wildfire?.matches?.[0]?.attributes?.FHSZ_Description;
  const G = GUIDE_TX[lang];
  if (wildfire && type.fire) notes.push(G ? G.notes.fireZone(G.level[zone] || zone || G.notes.mapped, type.roof) : `Your address is in a CAL FIRE ${zone || 'mapped'} fire hazard severity zone. Ask Building & Safety whether wildfire-resistant construction rules (California Building Code Chapter 7A) apply${type.roof ? ', including the required roof class' : ''}.`);
  const ground = ['fault', 'liquefaction', 'landslide'].filter(k => hazards?.[k]?.status === 'in_zone');
  if (ground.length && type.seismic) notes.push(G ? G.notes.seismic(ground.map(k => G.ground[k]).join(G.notes.and)) : `Your address is in a mapped ${ground.map(k => hazardNames[k].toLowerCase()).join(' and ')} zone. Some projects in state seismic hazard zones need a geotechnical report.`);
  if (type.quakeStrap) notes.push(G ? G.notes.quakeStrap : 'Water heaters must be strapped for earthquakes; include it in the scope.');
  if (household.housing === 'rent' || (profile.type === 'business' && type.id === 'ti')) notes.push(G ? G.notes.owner : 'The City portal asks for the property owner\'s information. Renters and tenants need the owner\'s approval and portal account email.');
  notes.push(G ? G.notes.zonesLayer : 'The City\'s red/yellow/green permit fire zones are a different layer from CAL FIRE maps and are not connected to FirePath.');
  const summary = [
    `Project: ${type.title}`,
    `Likely permit: ${type.permit}`,
    `Address: ${profile.address || 'not set'}${profile.addressVerified === 'mail' ? ' (verified by mail in FirePath)' : ''}`,
    profile.type === 'business' ? `Business: ${household.name || 'not set'} · contact ${profile.name || 'not set'}` : `Applicant: ${profile.name || 'not set'} (${household.housing === 'rent' ? 'renter' : household.housing === 'own' ? 'owner' : 'relationship not set'})`,
    description.trim() ? `Description: ${description.trim()}` : null,
    wildfire ? `Mapped CAL FIRE zone: ${zone || 'mapped'} (planning layer)` : null,
    ground.length ? `Mapped seismic zones: ${ground.join(', ')}` : null,
    'Prepared with FirePath. Not a City submission; confirm requirements with the City of Glendale.',
  ].filter(Boolean).join('\n');
  return { ...type, needs: G ? type.needs.map(n => G.needs[n] || n) : type.needs, notes, summary };
}

// --- Per-layer severity at an address -------------------------------------------------
// Uses only the classes each source defines (mirrors scripts/build-map-layers.py). Binary layers
// report "zone": inside the mapped zone, with no invented severity.
const SEVERITY_LABELS = { 3: 'Very high', 2: 'High', 1: 'Moderate', 0: 'Not mapped' };
export function hazardSeverity(key, value) {
  if (!value || value.status === 'unavailable') return { level: 'unknown', label: 'Not checked', scale: null };
  const attrs = value.matches?.[0]?.attributes || {};
  if (key === 'wildfire') {
    const level = { 'Very High': 3, High: 2, Moderate: 1 }[attrs.FHSZ_Description] ?? 0;
    return { level, label: SEVERITY_LABELS[level], scale: 'CAL FIRE scale: Moderate, High, Very high' };
  }
  if (key === 'flood') {
    if (attrs.SFHA_TF === 'T') return { level: 3, label: 'High (1% annual chance)', scale: 'FEMA: special flood hazard area' };
    if (attrs.FLD_ZONE === 'X' && String(attrs.ZONE_SUBTY || '').includes('0.2')) return { level: 1, label: 'Moderate (0.2% annual chance)', scale: 'FEMA: Zone X shaded' };
    if (attrs.FLD_ZONE === 'D') return { level: 'unknown', label: 'Undetermined', scale: 'FEMA Zone D: not studied' };
    return { level: 0, label: 'Minimal', scale: 'FEMA: Zone X, minimal flood hazard' };
  }
  return value.status === 'in_zone' ? { level: 'zone', label: 'In mapped zone', scale: 'This map has no severity levels; being inside the zone is the signal.' } : { level: 0, label: 'Not mapped', scale: null };
}

// --- Businesses ------------------------------------------------------------------------
// Same account, address, map and alert plumbing as residents; different profile, steps and permits.
export const businessKinds = [['restaurant', 'Restaurant / food'], ['retail', 'Retail'], ['office', 'Office'], ['warehouse', 'Warehouse / industrial'], ['care', 'Healthcare / childcare'], ['other', 'Other']];
export const hazmatKinds = [['propane', 'Propane or natural gas cylinders'], ['flammable', 'Flammable liquids (fuels, solvents)'], ['chemicals', 'Cleaning or process chemicals in bulk'], ['gas', 'Compressed gases'], ['batteries', 'Large lithium battery storage']];
const HMBP = 'https://www.glendaleca.gov/government/departments/fire-department/fire-prevention/environmental-management-center/hazardous-materials-business-plan';
const FIRE_PERMITS = 'https://www.glendaleca.gov/government/departments/fire-department/fire-prevention/inspections/fire-permits';

export function buildBusinessRecommendations(business = {}, hazards = null) {
  const wildfire = hazards?.wildfire && describeHazard('wildfire', hazards.wildfire).tone === 'mapped';
  const ground = ['fault', 'liquefaction', 'landslide'].some(k => hazards?.[k]?.status === 'in_zone');
  const hazmat = business.hazmat || [];
  const steps = [
    { id: 'alerts', tag: 'Stay informed', category: 'alerts', points: 20, title: 'Enroll the business in Glendale emergency alerts', description: 'Register the business address and at least two managers with the City\'s Everbridge system.', url: 'https://www.glendaleca.gov/Everbridge', link: 'Enroll with the City' },
    { id: 'contacts', tag: 'Your team', category: 'household', points: 20, title: 'Build a staff contact tree', description: `Keep a current call list for ${business.employees || 'all'} staff and name who calls whom when phones or the building are unavailable.` },
    { id: 'assembly', tag: 'Your team', category: 'household', points: 20, title: 'Set an assembly point and practice an evacuation', description: 'Pick a spot away from the building and traffic, assign someone to take a headcount of staff and visitors, and run a drill.' },
    { id: 'continuity', tag: 'First steps', category: 'kit', points: 25, title: 'Write a one-page continuity plan', description: 'Critical records, backups, key suppliers, insurance contacts, and how you would operate if the building were closed for a week.', url: 'https://www.ready.gov/business', link: 'Ready.gov for business' },
    { id: 'extinguishers', tag: 'Fire safety', category: 'wildfire', points: 15, title: 'Check extinguishers and exit paths', description: 'Confirm extinguishers are serviced and exits, exit signs and emergency lighting are clear and working.' },
    { id: 'quake', tag: 'Earthquake', category: 'earthquake', points: 15, title: 'Secure shelving, inventory and equipment', description: 'Anchor tall shelving and heavy equipment, and keep heavy stock on low shelves.', url: 'https://www.ready.gov/earthquakes', link: 'Earthquake guidance' },
  ];
  steps.push({ id: 'drill', tag: 'Stay informed', category: 'alerts', points: 15, title: 'Run a practice alert drill with your managers', description: 'Open Alerts, pick a drill and walk through the plan FirePath builds for your business.' });
  if (business.kind === 'restaurant') steps.push({ id: 'hood', tag: 'Fire safety', category: 'wildfire', points: 15, title: 'Keep kitchen hood suppression serviced', description: 'Kitchen fire suppression systems need regular professional service; keep the latest service tag visible.' });
  if (business.kind === 'care' || Number(business.needsHelp) > 0) steps.push({ id: 'assist', tag: 'Your team', category: 'household', points: 20, title: 'Plan how to move people who need help', description: 'Assign staff to each person who cannot evacuate alone, and keep that plan where the next shift can find it.' });
  if (hazmat.length) steps.push({ id: 'hmbp', tag: 'Hazardous materials', category: 'household', points: 30, title: 'Check whether you must file a Hazardous Materials Business Plan', description: 'Businesses at or above state reporting amounts (generally 55 gallons, 500 pounds or 200 cubic feet) file with Glendale Fire, the local agency, through the state CERS system. Keep an inventory and site map current.', url: HMBP, link: 'Glendale Fire HMBP page' });
  if (wildfire) steps.push({ id: 'zone0', tag: 'Mapped wildfire zone', category: 'wildfire', points: 25, title: 'Clear the first 5 feet around the building', description: 'Move pallets, dumpsters, mulch and anything that burns away from walls and vents.', url: 'https://www.readyforwildfire.org/prepare-for-wildfire/', link: 'CAL FIRE home hardening' });
  if (ground) steps.push({ id: 'ground', tag: 'Mapped ground hazard', category: 'earthquake', points: 25, title: 'Ask whether the building has had a seismic evaluation', description: 'Inside a state seismic hazard zone. Ask the owner about retrofit status.', url: 'https://www.conservation.ca.gov/cgs/sh/seismic-hazard-zones', link: 'State seismic hazard zones' });
  return steps;
}

export function businessMilestones(profile = {}, business = {}) {
  return [
    { id: 'account', title: 'Created your account', points: 10, done: true },
    { id: 'address', title: 'Registered the business address', points: 20, done: Boolean(profile.address) },
    { id: 'verified', title: 'Verified the address by mail', points: 20, done: profile.addressVerified === 'mail' },
    { id: 'household', title: 'Described the business', points: 15, done: Boolean(business.name && business.kind && business.employees) },
    { id: 'meeting', title: 'Named a key emergency contact', points: 15, done: Boolean(business.contactName?.trim() && business.contactPhone?.trim()) },
  ];
}

export const businessPermitTypes = [
  { id: 'hmbp', title: 'Hazardous Materials Business Plan', permit: 'Filed with Glendale Fire (local CUPA) through CERS', needs: ['Chemical inventory with amounts', 'Site map with storage locations', 'Emergency response and training plan'], url: HMBP, fire: false },
  { id: 'firepermit', title: 'Fire code operational permit', permit: 'Glendale Fire Prevention permit for certain uses and storage', needs: ['Description of the activity or storage', 'Quantities and locations', 'Floor plan'], url: FIRE_PERMITS },
  { id: 'ti', title: 'Tenant improvement or remodel', permit: 'Building permit (plan check); fire plan review may apply', needs: ['Floor plans and scope of work', 'Occupancy and use', 'Property owner authorization', 'Licensed contractor'], url: PERMIT_PORTAL, fire: true, seismic: true },
  { id: 'sign', title: 'New or changed sign', permit: 'Sign permit', needs: ['Sign drawings and dimensions', 'Location on the building', 'Electrical details if illuminated'], url: PERMIT_PORTAL },
  { id: 'mechanical', title: 'HVAC, electrical or plumbing work', permit: 'Mechanical, electrical or plumbing permit', needs: ['Equipment specs', 'Location', 'Contractor license'], url: PERMIT_PORTAL, quakeStrap: true },
];
