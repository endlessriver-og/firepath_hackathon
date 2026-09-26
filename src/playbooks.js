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

export function buildPlaybook(event, { type = 'resident', household = {}, business = {}, hazards = null, done = {} } = {}) {
  const { kind, title } = alertKind(event);
  const inZone = key => hazards?.[key] && describeHazard(key, hazards[key]).tone === 'mapped';
  const fireZone = inZone('wildfire') ? hazards.wildfire.matches?.[0]?.attributes?.FHSZ_Description : null;
  const floodZone = hazards?.flood?.matches?.some(m => m.attributes?.SFHA_TF === 'T') || hazards?.dam_inundation?.status === 'in_zone';
  const now = [], leave = [], checkOn = [];
  const add = (group, text, why) => group.push({ text, why });

  if (type === 'business') {
    const b = business;
    const staff = b.employees ? `${b.employees} staff` : 'staff';
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, `Your site is in a CAL FIRE ${fireZone} zone. Decide now who can close the business and when.`, 'Mapped wildfire zone at your address');
      add(now, `Brief ${staff} on the assembly point${b.assembly ? `: ${b.assembly}` : ''} and who takes the headcount.`, b.assembly ? 'Your saved assembly point' : 'No assembly point saved yet');
      if ((b.hazmat || []).length) add(now, `Secure hazardous materials${b.hazmatNote ? ` (${b.hazmatNote})` : ''} and keep the storage area clear of anything that burns.`, 'You reported hazardous materials on site');
      if (!done.zone0 && fireZone) add(now, 'Move pallets, dumpsters and anything that burns away from walls and vents.', 'Open step: clear the first 5 feet');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, 'Move stock, records and equipment off the floor; know where the utility shutoffs are.', 'Mapped flood or dam inundation area');
      add(now, 'Tell staff not to drive through flooded streets on the way in or out.', 'Most flood deaths happen in vehicles');
    }
    if (kind === 'heat') add(now, `Plan water, shade and breaks for ${staff}, especially anyone working outdoors or in kitchens.`, 'Heat illness risk at work');
    if (kind === 'smoke') add(now, 'Keep doors and windows closed, set HVAC to recirculate, and limit outdoor work.', 'Smoke exposure');
    if (b.needsHelp) add(checkOn, `Assign a staff member to each of the ${b.needsHelp} people who may need help leaving.`, 'From your business profile');
    add(leave, `Keep the key contact${b.contactName ? ` (${b.contactName})` : ''} reachable and confirm how you will reach every employee.`, done.contacts ? 'Your staff contact tree' : 'Open step: build a staff contact tree');
  } else {
    const h = household;
    const pets = (h.pets || []).map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`);
    const helpers = (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
    const kids = (h.members || []).filter(m => m.ageGroup === 'child').map(m => m.name);
    if (['fire', 'wind'].includes(kind)) {
      if (fireZone) add(now, `Your home is in a CAL FIRE ${fireZone} zone. Park facing out and keep the car fuelled so you can leave at the first order.`, 'Mapped wildfire zone at your address');
      add(now, done.kit ? 'Put your go bag by the door and charge phones and battery packs.' : 'Pack a go bag now: water, medications, documents, chargers, a flashlight.', done.kit ? 'You packed a go bag' : 'Open step: go bag');
      if (pets.length) add(now, `Get carriers, leashes and food ready for the ${list(pets)}.`, 'Pets you saved');
      if (fireZone && !done.zone0) add(now, 'Move doormats, cushions, firewood and anything that burns away from the house.', 'Open step: clear the first 5 feet');
      if (kind === 'wind') add(now, 'Expect possible power outages: charge devices and have flashlights ready.', 'High winds can bring down lines');
    }
    if (kind === 'flood') {
      if (floodZone) add(now, 'Move valuables and documents off the floor and know how to shut off power.', 'Mapped flood or dam inundation area');
      if (inZone('debris_flow')) add(now, 'You are near a post-fire debris-flow area: be ready to leave before heavy rain.', 'Mapped debris-flow assessment');
      add(now, 'Never walk or drive through moving water. Turn around.', 'Most flood deaths happen in vehicles');
      if (pets.length) add(now, `Bring the ${list(pets)} inside.`, 'Pets you saved');
    }
    if (kind === 'heat') {
      add(now, 'Plan the hottest hours: cool room, water, and the nearest place with air conditioning.', 'Heat illness risk');
      if (pets.length) add(now, `Keep the ${list(pets)} inside with water; pavement burns paws.`, 'Pets you saved');
    }
    if (kind === 'smoke') add(now, 'Keep windows closed, run a HEPA filter or AC on recirculate, and limit time outside.', 'Smoke exposure');
    if (helpers.length) add(checkOn, `${list(helpers)} may need help${['fire', 'wind', 'flood'].includes(kind) ? ' leaving. Arrange the ride now and plan to go early' : ' in this weather. Check on them today'}.`, 'People you said may need help');
    if (kids.length && ['fire', 'wind', 'flood'].includes(kind)) add(checkOn, `Confirm the school pickup plan for ${list(kids)}.`, 'Children in your household');
    if (kids.length && ['heat', 'smoke'].includes(kind)) add(checkOn, `Keep ${list(kids)} indoors during the worst hours.`, 'Children are more sensitive');
    if (h.meetNear || h.meetFar) add(leave, `If you are separated: meet at ${[h.meetNear, h.meetFar].filter(Boolean).join(', or farther away at ')}.`, 'Your saved meeting places');
    else add(leave, 'Agree now where your household meets if you are separated.', 'No meeting places saved yet');
    if (h.contact) add(leave, `Tell ${h.contact} your plan; out-of-area lines often work when local ones are busy.`, 'Your out-of-area contact');
  }
  add(leave, 'If officials order you to leave, go right away and follow their routes. FirePath does not choose evacuation routes.', 'Official instructions come first');
  return {
    event, kind, title,
    mappedHere: Object.keys(hazardNames).filter(inZone).map(k => hazardNames[k]),
    groups: [['Do now', now], ['Before you leave', leave], ['Check on', checkOn]].filter(([, steps]) => steps.length).map(([label, steps]) => ({ label, steps })),
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
    and: ' y ', dogsNote: p => `Lleve las bolsas de emergencia, medicinas, cargadores${p ? ` y a ${p}` : ''}.`,
    earthquake: [
      'Agáchese, cúbrase y agárrese hasta que pare el temblor. Espere réplicas y repita cada vez.',
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
    and: ' և ', dogsNote: p => `Վերցրեք արտակարգ պայուսակները, դեղերը, լիցքավորիչները${p ? ` և ${p}` : ''}։`,
    earthquake: [
      'Իջեք, ծածկվեք և ամուր բռնեք, մինչև ցնցումը դադարի։ Սպասեք կրկնվող ցնցումների և ամեն անգամ նույնն արեք։',
      'Ստուգեք վիրավորների առկայությունը։ Հագեք կոշիկներ՝ նախքան ապակու կամ բեկորների վրայով քայլելը։',
      'Եթե գազի հոտ եք զգում կամ սուլոց եք լսում, բոլորին դուրս հանեք և դրսից զանգահարեք գազի ընկերությանը։',
      who => `Ստուգեք ${who}, հետո՝ միայնակ ապրող հարևաններին։`,
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
  const base = emergencyGuide(id, ctx);
  const tx = TX[lang];
  if (!base || !tx || !tx[id]) return { ...base, translated: lang === 'en' };
  const h = ctx.household || {}, business = ctx.type === 'business';
  const helpers = business ? [] : (h.members || []).filter(m => m.needsHelp || m.ageGroup === 'senior').map(m => m.name);
  const pets = (h.pets || []).map(p => `${p.count > 1 ? `${p.count} ` : ''}${p.kind}`).join(', ');
  const T = tx[id];
  const why = base.steps.map(s => s.why);
  let steps;
  if (id === 'earthquake') steps = [T[0], T[1], T[2], T[3](helpers.length ? helpers.join(tx.and) : tx.everyone), T[4]];
  if (id === 'evacuate') steps = [T[0], tx.dogsNote(pets), ...helpers.map(n => T[1](n)), (h.meetNear || h.meetFar) ? T[2](h.meetFar || h.meetNear) : null, h.contact ? T[3](h.contact) : null, T[4]].filter(Boolean);
  if (id === 'power') steps = [T[0], T[1], ...helpers.map(n => T[2](n)), T[3], T[4]];
  if (business) return { ...base, translated: false }; // business wording stays English for now
  return { ...base, translated: true, steps: steps.map((text, i) => ({ text, why: why[i] || '' })) };
}
