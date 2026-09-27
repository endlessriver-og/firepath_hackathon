// Alert playbooks: turn an official alert (or a labelled practice drill) into steps for THIS household
// or business. Uses only what the account saved and the mapped layers at its address; never invents
// an evacuation order. Shared by the API and the Expo app.
import { describeHazard, hazardNames } from './preparedness.js';

const KINDS = [
  { kind: 'fire', match: /red flag|fire weather|extreme fire/i, title: 'Fire weather' },
  { kind: 'wind', match: /wind/i, title: 'Strong wind' },
  { kind: 'flood', match: /flood|debris flow|rain/i, title: 'Flooding' },
  { kind: 'heat', match: /heat/i, title: 'Extreme heat' },
  { kind: 'smoke', match: /smoke|air quality/i, title: 'Smoke and air quality' },
];

export const drillEvents = ['Red Flag Warning', 'High Wind Warning', 'Flash Flood Warning', 'Excessive Heat Warning', 'Air Quality Alert'];

export function alertKind(event = '') {
  return KINDS.find(k => k.match.test(event)) || { kind: 'general', title: 'Weather alert' };
}

const list = items => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// Household playbook phrases. English is the source; es, hy and ko are drafts not yet reviewed by
// native speakers.
const RESIDENT = {
  en: {
    and: ' and ', level: {},
    groups: { 'Do now': 'Do now', 'Before you leave': 'Before you leave', 'Check on': 'Check on' },
    fireZone: z => `Your home is in a CAL FIRE ${z} zone. Park facing out and keep the car fuelled so you can leave at the first order.`,
    bagReady: 'Put your go bag by the door and charge phones and battery packs.',
    bagPack: 'Pack a go bag now: water, medications, documents, chargers, a flashlight.',
    petsReady: p => `Get carriers, leashes and food ready for the ${p}.`,
    clear: 'Move doormats, cushions, firewood and anything that burns away from the house.',
    windPower: 'Expect possible power outages: charge devices and have flashlights ready.',
    floodValuables: 'Move valuables and documents off the floor and know how to shut off power.',
    debris: 'You are near a post-fire debris-flow area: be ready to leave before heavy rain.',
    water: 'Never walk or drive through moving water. Turn around.',
    petsInside: p => `Bring the ${p} inside.`,
    heat: 'Plan the hottest hours: cool room, water, and the nearest place with air conditioning.',
    heatPets: p => `Keep the ${p} inside with water; pavement burns paws.`,
    smoke: 'Keep windows closed, run a HEPA filter or AC on recirculate, and limit time outside.',
    helpersLeave: h => `${h} may need help leaving. Arrange the ride now and plan to go early.`,
    helpersCheck: h => `${h} may need help in this weather. Check on them today.`,
    kidsPickup: k => `Confirm the school pickup plan for ${k}.`,
    kidsIndoors: k => `Keep ${k} indoors during the worst hours.`,
    meet: (near, far) => `If you are separated: meet at ${[near, far].filter(Boolean).join(', or farther away at ')}.`,
    meetAgree: 'Agree now where your household meets if you are separated.',
    contact: c => `Tell ${c} your plan; out-of-area lines often work when local ones are busy.`,
    official: 'If officials order you to leave, go right away and follow their routes. FirePath does not choose evacuation routes.',
  },
  es: {
    and: ' y ', level: { 'Very High': 'Muy alto', High: 'Alto', Moderate: 'Moderado' },
    groups: { 'Do now': 'Haga ahora', 'Before you leave': 'Antes de salir', 'Check on': 'Revise a' },
    fireZone: z => `Su hogar está en una zona de CAL FIRE de riesgo ${z}. Estacione de frente a la salida y mantenga el tanque lleno para salir con la primera orden.`,
    bagReady: 'Ponga su mochila de emergencia junto a la puerta y cargue teléfonos y baterías.',
    bagPack: 'Prepare ya una mochila de emergencia: agua, medicinas, documentos, cargadores y una linterna.',
    petsReady: p => `Tenga listos transportadoras, correas y comida para: ${p}.`,
    clear: 'Aleje de la casa tapetes, cojines, leña y todo lo que pueda arder.',
    windPower: 'Espere posibles apagones: cargue sus aparatos y tenga linternas a mano.',
    floodValuables: 'Suba del piso objetos de valor y documentos, y sepa cómo cortar la electricidad.',
    debris: 'Está cerca de una zona de flujo de escombros tras un incendio: esté listo para salir antes de lluvias fuertes.',
    water: 'Nunca camine ni maneje por agua en movimiento. Dé la vuelta.',
    petsInside: p => `Meta a ${p} dentro de la casa.`,
    heat: 'Planee las horas de más calor: un cuarto fresco, agua y el lugar con aire acondicionado más cercano.',
    heatPets: p => `Mantenga a ${p} dentro con agua; el pavimento quema las patas.`,
    smoke: 'Mantenga las ventanas cerradas, use un filtro HEPA o el aire en recirculación y salga lo menos posible.',
    helpersLeave: h => `${h} puede necesitar ayuda para salir. Organice ya el transporte y planee salir temprano.`,
    helpersCheck: h => `Con este clima, pase hoy a ver a ${h}, por si hace falta ayuda.`,
    kidsPickup: k => `Confirme el plan para recoger de la escuela a ${k}.`,
    kidsIndoors: k => `Mantenga a ${k} adentro durante las peores horas.`,
    meet: (near, far) => `Si se separan: reúnanse en ${[near, far].filter(Boolean).join(', o más lejos en ')}.`,
    meetAgree: 'Acuerden ya dónde se reunirá su hogar si se separan.',
    contact: c => `Avise su plan a ${c}; las líneas fuera del área suelen funcionar cuando las locales están saturadas.`,
    official: 'Si las autoridades ordenan salir, váyase de inmediato y siga sus rutas. FirePath no elige rutas de evacuación.',
  },
  hy: {
    and: ' և ', level: { 'Very High': 'Շատ բարձր', High: 'Բարձր', Moderate: 'Միջին' },
    groups: { 'Do now': 'Արեք հիմա', 'Before you leave': 'Մինչ հեռանալը', 'Check on': 'Ստուգեք' },
    fireZone: z => `Ձեր տունը գտնվում է CAL FIRE-ի «${z}» վտանգի գոտում։ Կայանեք մեքենան դեպի ելքը և պահեք բաքը լիքը, որպեսզի հեռանաք առաջին հրամանով։`,
    bagReady: 'Դրեք արտակարգ պայուսակը դռան մոտ և լիցքավորեք հեռախոսներն ու մարտկոցները։',
    bagPack: 'Հիմա պատրաստեք արտակարգ պայուսակ՝ ջուր, դեղեր, փաստաթղթեր, լիցքավորիչներ, լապտեր։',
    petsReady: p => `Պատրաստ պահեք փոխադրման տուփեր, կապեր և կեր՝ ${p}։`,
    clear: 'Տնից հեռացրեք գորգերը, բարձերը, վառելափայտը և այն ամենը, ինչ կարող է այրվել։',
    windPower: 'Հնարավոր են հոսանքազրկումներ. լիցքավորեք սարքերը և լապտերներ պատրաստ պահեք։',
    floodValuables: 'Թանկարժեք իրերն ու փաստաթղթերը բարձրացրեք հատակից և իմացեք, ինչպես անջատել հոսանքը։',
    debris: 'Դուք հրդեհից հետո սելավային գոտու մոտ եք. պատրաստ եղեք հեռանալ մինչ ուժեղ անձրևը։',
    water: 'Երբեք մի քայլեք և մի վարեք հոսող ջրի միջով։ Հետ դարձեք։',
    petsInside: p => `Տուն բերեք՝ ${p}։`,
    heat: 'Պլանավորեք ամենաշոգ ժամերը՝ զով սենյակ, ջուր և օդորակիչով մոտակա վայր։',
    heatPets: p => `Պահեք ներսում ջրով՝ ${p}. մայթը այրում է թաթերը։`,
    smoke: 'Փակ պահեք պատուհանները, միացրեք HEPA ֆիլտր կամ օդորակիչը վերաշրջանառության ռեժիմով և քիչ դուրս եկեք։',
    helpersLeave: h => `${h}-ին կարող է օգնություն պետք լինել դուրս գալու համար։ Հիմա կազմակերպեք փոխադրումը և պլանավորեք շուտ գնալ։`,
    helpersCheck: h => `${h}-ին այս եղանակին կարող է օգնություն պետք լինել։ Այսօր անպայման կապվեք։`,
    kidsPickup: k => `Հաստատեք դպրոցից վերցնելու ծրագիրը՝ ${k}։`,
    kidsIndoors: k => `Ամենավատ ժամերին ներսում պահեք՝ ${k}։`,
    meet: (near, far) => `Եթե բաժանվեք՝ հանդիպեք ${[near, far].filter(Boolean).map(place => `${place}-ում`).join(' կամ ավելի հեռու՝ ')}։`,
    meetAgree: 'Հիմա պայմանավորվեք, թե որտեղ կհանդիպի ձեր ընտանիքը, եթե բաժանվեք։',
    contact: c => `Ձեր ծրագիրը հայտնեք ${c}-ին. տարածքից դուրս գծերը հաճախ աշխատում են, երբ տեղականները զբաղված են։`,
    official: 'Եթե իշխանությունները հրամայեն հեռանալ, անմիջապես գնացեք և հետևեք նրանց երթուղիներին։ FirePath-ը չի ընտրում տարհանման երթուղիներ։',
  },
  ko: {
    and: ', ', level: { 'Very High': '매우 높음', High: '높음', Moderate: '보통' },
    groups: { 'Do now': '지금 할 일', 'Before you leave': '떠나기 전에', 'Check on': '확인할 사람' },
    fireZone: z => `우리 집은 CAL FIRE 위험도 '${z}' 구역에 있습니다. 차를 출구 방향으로 세우고 연료를 채워 첫 명령에 바로 떠날 수 있게 하세요.`,
    bagReady: '비상 가방을 문 옆에 두고 휴대폰과 보조 배터리를 충전하세요.',
    bagPack: '지금 비상 가방을 싸세요: 물, 약, 서류, 충전기, 손전등.',
    petsReady: p => `${p}을(를) 위한 이동장, 목줄, 사료를 준비하세요.`,
    clear: '현관 매트, 쿠션, 장작 등 탈 수 있는 것을 집에서 멀리 치우세요.',
    windPower: '정전이 있을 수 있습니다. 기기를 충전하고 손전등을 준비하세요.',
    floodValuables: '귀중품과 서류를 바닥에서 올리고 전기 차단 방법을 알아두세요.',
    debris: '산불 후 토석류 위험 지역 근처입니다. 큰비가 오기 전에 떠날 준비를 하세요.',
    water: '흐르는 물을 절대 걷거나 차로 건너지 마세요. 돌아가세요.',
    petsInside: p => `${p}을(를) 실내로 데려오세요.`,
    heat: '가장 더운 시간을 대비하세요: 시원한 방, 물, 가장 가까운 에어컨 있는 장소.',
    heatPets: p => `${p}을(를) 물과 함께 실내에 두세요. 포장도로는 발바닥을 데게 합니다.`,
    smoke: '창문을 닫고 HEPA 필터나 에어컨을 내부 순환으로 켜고 외출을 줄이세요.',
    helpersLeave: h => `${h} 님은 대피할 때 도움이 필요할 수 있습니다. 지금 이동 수단을 마련하고 일찍 떠나세요.`,
    helpersCheck: h => `${h} 님은 이런 날씨에 도움이 필요할 수 있습니다. 오늘 안부를 확인하세요.`,
    kidsPickup: k => `${k}의 하교 픽업 계획을 확인하세요.`,
    kidsIndoors: k => `가장 심한 시간에는 ${k}을(를) 실내에 있게 하세요.`,
    meet: (near, far) => `흩어지면: ${[near, far].filter(Boolean).join(', 더 멀리는 ')}에서 만나세요.`,
    meetAgree: '흩어질 경우 가족이 만날 장소를 지금 정하세요.',
    contact: c => `${c}에게 계획을 알리세요. 지역 회선이 붐빌 때도 외부 지역 회선은 연결되는 경우가 많습니다.`,
    official: '당국이 대피를 명령하면 즉시 떠나고 안내 경로를 따르세요. FirePath는 대피 경로를 정하지 않습니다.',
  },
};

// Business playbook phrases (same rules as RESIDENT: English is the source, other languages are drafts).
const BUSINESS = {
  en: {
    staff: 'staff', staffN: n => `${n} staff`,
    fireZone: z => `Your site is in a CAL FIRE ${z} zone. Decide now who can close the business and when.`,
    assembly: (staff, point) => `Brief ${staff} on the assembly point${point ? `: ${point}` : ''} and who takes the headcount.`,
    hazmat: note => `Secure hazardous materials${note ? ` (${note})` : ''} and keep the storage area clear of anything that burns.`,
    clear: 'Move pallets, dumpsters and anything that burns away from walls and vents.',
    floodStock: 'Move stock, records and equipment off the floor; know where the utility shutoffs are.',
    floodDrive: 'Tell staff not to drive through flooded streets on the way in or out.',
    heat: staff => `Plan water, shade and breaks for ${staff}, especially anyone working outdoors or in kitchens.`,
    smoke: 'Keep doors and windows closed, set HVAC to recirculate, and limit outdoor work.',
    needsHelp: n => `Assign a staff member to each of the ${n} people who may need help leaving.`,
    contact: name => `Keep the key contact${name ? ` (${name})` : ''} reachable and confirm how you will reach every employee.`,
  },
  es: {
    staff: 'el personal', staffN: n => `sus ${n} empleados`,
    fireZone: z => `Su local está en una zona de CAL FIRE de riesgo ${z}. Decida ya quién puede cerrar el negocio y cuándo.`,
    assembly: (staff, point) => `Informe a ${staff} sobre el punto de reunión${point ? `: ${point}` : ''} y quién cuenta a las personas.`,
    hazmat: note => `Asegure los materiales peligrosos${note ? ` (${note})` : ''} y mantenga el área de almacenamiento libre de todo lo que pueda arder.`,
    clear: 'Aleje de paredes y ventilas tarimas, contenedores de basura y todo lo que pueda arder.',
    floodStock: 'Suba del piso mercancía, archivos y equipo; sepa dónde están los cierres de servicios.',
    floodDrive: 'Pida al personal no manejar por calles inundadas al llegar ni al salir.',
    heat: staff => `Planee agua, sombra y descansos para ${staff}, sobre todo para quien trabaja al aire libre o en cocinas.`,
    smoke: 'Mantenga puertas y ventanas cerradas, ponga el aire en recirculación y limite el trabajo al aire libre.',
    needsHelp: n => `Asigne a un empleado a cada una de las ${n} personas que pueden necesitar ayuda para salir.`,
    contact: name => `Mantenga localizable al contacto principal${name ? ` (${name})` : ''} y confirme cómo se comunicará con cada empleado.`,
  },
  hy: {
    staff: 'աշխատակիցներին', staffN: n => `ձեր ${n} աշխատակիցներին`,
    fireZone: z => `Ձեր վայրը գտնվում է CAL FIRE-ի «${z}» վտանգի գոտում։ Հիմա որոշեք, թե ով և երբ կարող է փակել բիզնեսը։`,
    assembly: (staff, point) => `Տեղեկացրեք ${staff} հավաքման վայրի մասին${point ? `՝ ${point}` : ''} և թե ով է հաշվելու մարդկանց։`,
    hazmat: note => `Ամրացրեք վտանգավոր նյութերը${note ? ` (${note})` : ''} և պահեստը մաքուր պահեք այն ամենից, ինչ կարող է այրվել։`,
    clear: 'Պատերից և օդանցքներից հեռացրեք ծղոտե հարթակները, աղբամանները և այն ամենը, ինչ կարող է այրվել։',
    floodStock: 'Ապրանքը, փաստաթղթերը և սարքավորումները բարձրացրեք հատակից, իմացեք, որտեղ են կոմունալ անջատիչները։',
    floodDrive: 'Ասեք աշխատակիցներին չվարել ողողված փողոցներով գալիս կամ գնալիս։',
    heat: staff => `Պլանավորեք ջուր, ստվեր և ընդմիջումներ ${staff} համար, հատկապես նրանց, ովքեր աշխատում են դրսում կամ խոհանոցում։`,
    smoke: 'Փակ պահեք դռներն ու պատուհանները, օդափոխությունը դրեք վերաշրջանառության և սահմանափակեք դրսի աշխատանքը։',
    needsHelp: n => `Օգնության կարիք ունեցող ${n} մարդկանցից յուրաքանչյուրին կցեք մեկ աշխատակցի։`,
    contact: name => `Հասանելի պահեք հիմնական կոնտակտին${name ? ` (${name})` : ''} և հաստատեք, թե ինչպես կկապվեք յուրաքանչյուր աշխատակցի հետ։`,
  },
  ko: {
    staff: '직원', staffN: n => `직원 ${n}명`,
    fireZone: z => `사업장이 CAL FIRE 위험도 '${z}' 구역에 있습니다. 누가 언제 영업을 중단할지 지금 정하세요.`,
    assembly: (staff, point) => `${staff}에게 집결 장소${point ? `(${point})` : ''}와 인원 확인 담당자를 알려 주세요.`,
    hazmat: note => `위험물${note ? `(${note})` : ''}을 고정하고 보관 구역에 탈 수 있는 물건이 없게 하세요.`,
    clear: '팔레트, 쓰레기통 등 탈 수 있는 것을 벽과 환기구에서 멀리 치우세요.',
    floodStock: '재고, 서류, 장비를 바닥에서 올리고 가스·전기 차단 위치를 알아두세요.',
    floodDrive: '출퇴근길에 침수된 도로를 운전하지 않도록 직원에게 알리세요.',
    heat: staff => `${staff}을 위해 물, 그늘, 휴식을 계획하세요. 특히 야외나 주방에서 일하는 사람을 챙기세요.`,
    smoke: '문과 창문을 닫고 냉난방을 내부 순환으로 설정하고 야외 작업을 줄이세요.',
    needsHelp: n => `대피에 도움이 필요할 수 있는 ${n}명에게 각각 담당 직원을 정하세요.`,
    contact: name => `담당자${name ? `(${name})` : ''}와 연락이 닿게 하고 모든 직원에게 연락할 방법을 확인하세요.`,
  },
};

// "2 dogs" in most languages; Korean counts after the noun with a counter (강아지 2마리).
export const petLabel = (p, lang = 'en') => lang === 'ko' ? `${p.kind}${p.count > 1 ? ` ${p.count}마리` : ''}` : `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`;

export function buildPlaybook(event, { type = 'resident', household = {}, business = {}, hazards = null, done = {}, lang = 'en' } = {}) {
  const { kind, title } = alertKind(event);
  const inZone = key => hazards?.[key] && describeHazard(key, hazards[key]).tone === 'mapped';
  const fireZone = inZone('wildfire') ? hazards.wildfire.matches?.[0]?.attributes?.FHSZ_Description : null;
  const floodZone = hazards?.flood?.matches?.some(m => m.attributes?.SFHA_TF === 'T') || hazards?.dam_inundation?.status === 'in_zone';
  const now = [], leave = [], checkOn = [];
  const add = (group, text, why) => group.push({ text, why });

  if (type === 'business') {
    const b = business, B = BUSINESS[lang] || BUSINESS.en;
    const staff = b.employees ? B.staffN(b.employees) : B.staff;
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, B.fireZone((RESIDENT[lang] || RESIDENT.en).level[fireZone] || fireZone), 'Mapped wildfire zone at your address');
      add(now, B.assembly(staff, b.assembly), b.assembly ? 'Your saved assembly point' : 'No assembly point saved yet');
      if ((b.hazmat || []).length) add(now, B.hazmat(b.hazmatNote), 'You reported hazardous materials on site');
      if (!done.zone0 && fireZone) add(now, B.clear, 'Open step: clear the first 5 feet');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, B.floodStock, 'Mapped flood or dam inundation area');
      add(now, B.floodDrive, 'Most flood deaths happen in vehicles');
    }
    if (kind === 'heat') add(now, B.heat(staff), 'Heat illness risk at work');
    if (kind === 'smoke') add(now, B.smoke, 'Smoke exposure');
    if (b.needsHelp) add(checkOn, B.needsHelp(b.needsHelp), 'From your business profile');
    add(leave, B.contact(b.contactName), done.contacts ? 'Your staff contact tree' : 'Open step: build a staff contact tree');
  } else {
    const h = household, P = RESIDENT[lang] || RESIDENT.en;
    const join = items => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')}${P.and}${items.at(-1)}`;
    const pets = (h.pets || []).map(p => petLabel(p, lang));
    const helpers = (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
    const kids = (h.members || []).filter(m => m.ageGroup === 'child').map(m => m.name);
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, P.fireZone(P.level[fireZone] || fireZone), 'Mapped wildfire zone at your address');
      add(now, done.kit ? P.bagReady : P.bagPack, done.kit ? 'You packed a go bag' : 'Open step: go bag');
      if (pets.length) add(now, P.petsReady(join(pets)), 'Pets you saved');
      if (fireZone && !done.zone0) add(now, P.clear, 'Open step: clear the first 5 feet');
      if (kind === 'wind') add(now, P.windPower, 'High winds can bring down lines');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, P.floodValuables, 'Mapped flood or dam inundation area');
      if (inZone('debris_flow')) add(now, P.debris, 'Mapped debris-flow assessment');
      add(now, P.water, 'Most flood deaths happen in vehicles');
      if (pets.length) add(now, P.petsInside(join(pets)), 'Pets you saved');
    }
    if (kind === 'heat') {
      add(now, P.heat, 'Heat illness risk');
      if (pets.length) add(now, P.heatPets(join(pets)), 'Pets you saved');
    }
    if (kind === 'smoke') add(now, P.smoke, 'Smoke exposure');
    if (helpers.length) add(checkOn, ['fire', 'wind', 'flood'].includes(kind) ? P.helpersLeave(join(helpers)) : P.helpersCheck(join(helpers)), 'People you said may need help');
    if (kids.length && ['fire', 'wind', 'flood'].includes(kind)) add(checkOn, P.kidsPickup(join(kids)), 'Children in your household');
    if (kids.length && ['heat', 'smoke'].includes(kind)) add(checkOn, P.kidsIndoors(join(kids)), 'Children are more sensitive');
    if (h.meetNear || h.meetFar) add(leave, P.meet(h.meetNear, h.meetFar), 'Your saved meeting places');
    else add(leave, P.meetAgree, 'No meeting places saved yet');
    if (h.contact) add(leave, P.contact(h.contact), 'Your out-of-area contact');
  }
  const P = RESIDENT[lang] || RESIDENT.en;
  add(leave, P.official, 'Official instructions come first');
  return {
    event, kind, title,
    mappedHere: Object.keys(hazardNames).filter(inZone).map(k => hazardNames[k]),
    // `label` stays English (the app keys on it); `title` is the display text in the account's language.
    groups: [['Do now', now], ['Before you leave', leave], ['Check on', checkOn]].filter(([, steps]) => steps.length).map(([label, steps]) => ({ label, title: P.groups[label], steps })),
  };
}

// "Emergency now": short, calm steps for what is happening right now. Weather situations reuse the
// alert playbooks; earthquake, evacuation and power outage have their own. Always leads with 911.
export const emergencySituations = [
  { id: 'earthquake', label: 'Earthquake', icon: '≋' },
  { id: 'fire', label: 'Fire nearby', icon: '♨', event: 'Red Flag Warning' },
  { id: 'evacuate', label: 'Told to evacuate', icon: '➜' },
  { id: 'flood', label: 'Flooding', icon: '≈', event: 'Flash Flood Warning' },
  { id: 'power', label: 'Power out', icon: '⚡' },
  { id: 'smoke', label: 'Smoke', icon: '☁', event: 'Air Quality Alert' },
  { id: 'heat', label: 'Extreme heat', icon: '☀', event: 'Excessive Heat Warning' },
];

export const emergencyLinks = {
  earthquake: [['MyShake early warning', 'https://myshake.berkeley.edu/']],
  fire: [['Your evacuation zone (Genasys Protect)', 'https://protect.genasys.com/'], ['CAL FIRE incidents', 'https://www.fire.ca.gov/incidents']],
  evacuate: [['Your evacuation zone (Genasys Protect)', 'https://protect.genasys.com/'], ['211 LA shelters and help', 'https://211la.org/']],
  flood: [['NWS Los Angeles', 'https://www.weather.gov/lox/']],
  power: [['Glendale Water & Power outages', 'https://www.glendaleca.gov/government/departments/glendale-water-and-power/safety-security/power-outages']],
  smoke: [['AirNow air quality', 'https://www.airnow.gov/']],
  heat: [['211 LA (cooling centers and help)', 'https://211la.org/']],
};

export function emergencyGuide(id, ctx = {}) {
  const situation = emergencySituations.find(s => s.id === id);
  if (!situation) return null;
  const links = emergencyLinks[id] || [];
  if (situation.event) {
    const pb = buildPlaybook(situation.event, ctx);
    const steps = pb.groups.flatMap(g => g.steps).slice(0, 7);
    return { id, title: situation.label, steps, links };
  }
  const h = ctx.household || {}, b = ctx.business || {}, business = ctx.type === 'business';
  const pets = (h.pets || []).map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`);
  const helpers = business ? [] : (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
  const s = (text, why) => ({ text, why });
  const steps = {
    earthquake: [
      s('Drop, Cover, Hold On until the shaking stops. Expect aftershocks and do it again each time.', 'Standard earthquake safety'),
      s('Check for injuries. Put on shoes before walking over glass or debris.', 'Most injuries come after the shaking'),
      s('If you smell gas or hear hissing, get everyone out and call the gas company from outside.', h.utilities || b.utilities ? `Your shutoff note: ${h.utilities || b.utilities}` : 'Gas leaks cause fires after quakes'),
      business ? s(`Get everyone to the assembly point${b.assembly ? `: ${b.assembly}` : ''} and count heads.`, 'Your business plan') : s(`Check on ${helpers.length ? helpers.join(' and ') : 'everyone in your household'}, then neighbors who live alone.`, helpers.length ? 'People you said may need help' : 'Household check'),
      s('Text instead of calling so lines stay open for emergencies.', 'Networks jam after big quakes'),
    ],
    evacuate: [
      s('Leave now. Follow the route officials give; roads you usually use may be closed.', 'Official instructions come first'),
      business ? s(`Get staff and visitors to ${b.assembly || 'your assembly point'}, count heads, then leave as directed.`, 'Your business plan') : s(`Take go bags, medications, chargers${pets.length ? ` and the ${pets.join(', ')}` : ''}.`, pets.length ? 'Pets you saved' : 'Your go bag'),
      ...helpers.map(n => s(`Make sure ${n} has a ride and is leaving now.`, 'May need help leaving')),
      !business && (h.meetNear || h.meetFar) ? s(`If separated, meet at ${h.meetFar || h.meetNear}.`, 'Your saved meeting place') : null,
      !business && h.contact ? s(`Text ${h.contact} where you are going.`, 'Your out-of-area contact') : null,
      s('If you have time: close windows and doors, leave lights on, and do not lock gates responders may need.', 'Helps crews working in your area'),
    ].filter(Boolean),
    power: [
      s('Use flashlights, not candles. Unplug sensitive electronics.', 'Fire safety during outages'),
      s('Keep the fridge and freezer closed; food stays cold for about 4 hours (a full freezer about 48).', 'Food safety'),
      ...(business ? [] : helpers.map(n => s(`Check on ${n}, especially if they rely on powered medical equipment.`, 'May need help'))),
      s('Report the outage and check restoration times with Glendale Water & Power.', 'Your utility'),
      s('Treat dark traffic signals as four-way stops.', 'Traffic safety'),
    ],
  }[id];
  return { id, title: situation.label, steps, links };
}

// Emergency-now steps in other languages (earthquake, evacuate, power). Drafted by FirePath and not yet
// reviewed by native speakers; the app labels them. Weather situations stay in English for now.
const TX = {
  es: {
    quakeBiz: point => `Lleve a todos al punto de reunión${point ? `: ${point}` : ''} y cuente a las personas.`,
    evacBiz: point => `Lleve al personal y a los visitantes a ${point || 'su punto de reunión'}, cuente a las personas y salgan según las indicaciones.`,
    and: ' y ', dogsNote: p => `Lleve las bolsas de emergencia, medicinas, cargadores${p ? ` y a ${p}` : ''}.`,
    earthquake: [
      'Agáchese, cúbrase y sujétese hasta que pare el temblor. Espere réplicas y repita cada vez.',
      'Revise si hay heridos. Póngase zapatos antes de caminar sobre vidrios o escombros.',
      'Si huele a gas o escucha un silbido, saque a todos y llame a la compañía de gas desde afuera.',
      who => `Revise a ${who}, y luego a los vecinos que viven solos.`,
      'Mande mensajes de texto en vez de llamar, para dejar libres las líneas de emergencia.',
    ],
    evacuate: ['Salga ahora. Siga la ruta que den las autoridades; las calles de siempre pueden estar cerradas.',
      n => `Asegúrese de que ${n} tenga transporte y salga ahora.`, m => `Si se separan, reúnanse en ${m}.`, c => `Mande un mensaje a ${c} diciendo a dónde va.`,
      'Si tiene tiempo: cierre ventanas y puertas, deje luces encendidas y no cierre con llave los portones que necesiten los bomberos.'],
    power: ['Use linternas, no velas. Desconecte los aparatos electrónicos delicados.',
      'Mantenga cerrados el refrigerador y el congelador; la comida se mantiene fría unas 4 horas (un congelador lleno, unas 48).',
      n => `Revise a ${n}, sobre todo si usa equipo médico eléctrico.`,
      'Reporte el apagón y revise el tiempo de reparación con Glendale Water & Power.', 'Trate los semáforos apagados como un alto en las cuatro direcciones.'],
    everyone: 'todos en su hogar',
  },
  hy: {
    quakeBiz: point => `Բոլորին տարեք հավաքման վայր${point ? `՝ ${point}` : ''} և հաշվեք մարդկանց։`,
    evacBiz: point => `Աշխատակիցներին և այցելուներին տարեք ${point || 'հավաքման վայր'}, հաշվեք մարդկանց, ապա հեռացեք ըստ ցուցումների։`,
    and: ' և ', dogsNote: p => `Վերցրեք արտակարգ պայուսակները, դեղերը, լիցքավորիչները${p ? ` և ${p}` : ''}։`,
    earthquake: [
      'Կռացեք, ծածկվեք և ամուր բռնվեք, մինչև ցնցումը դադարի։ Սպասեք կրկնվող ցնցումների և ամեն անգամ նույնն արեք։',
      'Ստուգեք վիրավորների առկայությունը։ Հագեք կոշիկներ՝ նախքան ապակու կամ բեկորների վրայով քայլելը։',
      'Եթե գազի հոտ եք զգում կամ սուլոց եք լսում, բոլորին դուրս հանեք և դրսից զանգահարեք գազի ընկերությանը։',
      who => `Ստուգեք ${/ին$/.test(who) ? who : `${who}-ին`}, հետո՝ միայնակ ապրող հարևաններին։`, // names take -ին; 'everyone' already has it
      'Զանգերի փոխարեն գրեք հաղորդագրություններ, որպեսզի արտակարգ գծերը ազատ մնան։',
    ],
    evacuate: ['Հեռացեք հիմա։ Հետևեք պաշտոնյաների տված երթուղուն. սովորական ճանապարհները կարող են փակ լինել։',
      n => `Համոզվեք, որ ${n}-ն ունի տրանսպորտ և հեռանում է հիմա։`, m => `Եթե բաժանվեք, հանդիպեք ${m}-ում։`, c => `Հաղորդագրություն ուղարկեք ${c}-ին, թե ուր եք գնում։`,
      'Եթե ժամանակ ունեք՝ փակեք պատուհաններն ու դռները, լույսերը վառ թողեք և մի կողպեք դարպասները, որոնք կարող են պետք լինել հրշեջներին։'],
    power: ['Օգտագործեք լապտերներ, ոչ թե մոմեր։ Անջատեք զգայուն էլեկտրոնիկան։',
      'Սառնարանն ու սառցախցիկը փակ պահեք. սնունդը մնում է սառը մոտ 4 ժամ (լիքը սառցախցիկը՝ մոտ 48)։',
      n => `Ստուգեք ${n}-ին, հատկապես եթե նա օգտագործում է էլեկտրական բժշկական սարքավորում։`,
      'Հայտնեք հոսանքազրկման մասին և ստուգեք վերականգնման ժամկետը Glendale Water & Power-ում։', 'Չաշխատող լուսացույցերը դիտարկեք որպես քառակողմ կանգառ։'],
    everyone: 'ձեր տան բոլոր անդամներին',
  },
  ko: {
    quakeBiz: point => `모두 집결 장소${point ? `(${point})` : ''}로 모이게 하고 인원을 확인하세요.`,
    evacBiz: point => `직원과 방문객을 ${point || '집결 장소'}로 모으고 인원을 확인한 뒤 안내에 따라 떠나세요.`,
    and: ', ', dogsNote: p => `비상 가방, 약, 충전기${p ? `, 그리고 ${p}` : ''}를 챙기세요.`,
    earthquake: [
      '흔들림이 멈출 때까지 엎드리고, 머리를 감싸고, 꼭 붙잡으세요. 여진이 올 때마다 다시 반복하세요.',
      '다친 사람이 있는지 확인하세요. 유리나 잔해 위를 걷기 전에 신발을 신으세요.',
      '가스 냄새가 나거나 새는 소리가 들리면 모두 밖으로 나가서 밖에서 가스 회사에 전화하세요.',
      who => `${who}의 안부를 확인하고, 그다음 혼자 사는 이웃을 확인하세요.`,
      '긴급 회선이 막히지 않도록 전화 대신 문자를 보내세요.',
    ],
    evacuate: ['지금 떠나세요. 당국이 안내하는 경로를 따르세요. 평소 다니던 길이 막혀 있을 수 있습니다.',
      n => `${n} 님이 이동 수단이 있고 지금 떠나는지 확인하세요.`, m => `흩어지면 ${m}에서 만나세요.`, c => `${c}에게 어디로 가는지 문자로 알리세요.`,
      '시간이 있다면: 창문과 문을 닫고, 불을 켜 두고, 소방관이 써야 할 수 있는 대문은 잠그지 마세요.'],
    power: ['촛불 대신 손전등을 쓰세요. 민감한 전자제품의 플러그를 뽑으세요.',
      '냉장고와 냉동고 문을 닫아 두세요. 음식은 약 4시간(가득 찬 냉동고는 약 48시간) 차갑게 유지됩니다.',
      n => `${n} 님을 확인하세요. 특히 전기로 작동하는 의료 기기를 쓴다면 꼭 확인하세요.`,
      '정전을 신고하고 Glendale Water & Power에서 복구 시간을 확인하세요.', '꺼진 신호등은 사방 정지 표지판처럼 생각하세요.'],
    everyone: '가족 모두',
  },
};

export function emergencyGuideIn(lang, id, ctx = {}) {
  // Weather situations reuse the alert playbooks, which are translated.
  const fromPlaybook = emergencySituations.find(s => s.id === id)?.event && RESIDENT[lang];
  const base = emergencyGuide(id, fromPlaybook ? { ...ctx, lang } : ctx);
  if (fromPlaybook) return { ...base, translated: true };
  const tx = TX[lang];
  if (!base || !tx || !tx[id]) return { ...base, translated: lang === 'en' };
  const h = ctx.household || {}, business = ctx.type === 'business';
  const helpers = business ? [] : (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
  const pets = (h.pets || []).map(p => petLabel(p, lang)).join(', ');
  const T = tx[id];
  const why = base.steps.map(s => s.why);
  let steps;
  const point = (ctx.business || {}).assembly;
  if (id === 'earthquake') steps = [T[0], T[1], T[2], business ? tx.quakeBiz(point) : T[3](helpers.length ? helpers.join(tx.and) : tx.everyone), T[4]];
  if (id === 'evacuate') steps = business ? [T[0], tx.evacBiz(point), T[4]] : [T[0], tx.dogsNote(pets), ...helpers.map(n => T[1](n)), (h.meetNear || h.meetFar) ? T[2](h.meetFar || h.meetNear) : null, h.contact ? T[3](h.contact) : null, T[4]].filter(Boolean);
  if (id === 'power') steps = [T[0], T[1], ...helpers.map(n => T[2](n)), T[3], T[4]];
  return { ...base, translated: true, steps: steps.map((text, i) => ({ text, why: why[i] || '' })) };
}
