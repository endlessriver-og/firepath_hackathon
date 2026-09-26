import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Languages offered first for Glendale: English, Armenian (Eastern), Spanish, Korean.
// Translations were drafted by FirePath and have NOT been reviewed by native speakers yet; the UI says so.
export const LANGS = [['en', 'English'], ['hy', 'Հայերեն (Armenian)'], ['es', 'Español (Spanish)'], ['ko', '한국어 (Korean)']];
export const SPEECH_LANG = { en: 'en-US', hy: 'hy-AM', es: 'es-US', ko: 'ko-KR' };

const dict = {
  en: {
    'nav.map': 'Map', 'nav.plan': 'Plan', 'nav.home': 'Home', 'nav.alerts': 'Alerts', 'nav.permits': 'Permits',
    'head.emergency': 'Emergency', 'head.close': 'Close', 'head.pilot': 'PILOT', 'head.business': 'BUSINESS',
    'land.title': "What's mapped at your Glendale address?",
    'land.sub': 'Check any address against seven state and federal hazard maps. No account needed.',
    'land.tour': 'See FirePath in 90 seconds', 'land.tourSub': 'Five guided stops with a fictional household. No sign-up.',
    'land.addr': 'Glendale street address', 'land.addrHint': "Sent to the City of Glendale's address lookup. FirePath does not store address checks.",
    'land.placeholder': 'Start typing, e.g., 1613 Glencoe', 'land.check': 'Check this address', 'land.checking': "Checking the City's address points and seven hazard maps…",
    'land.signin': 'Already registered? Sign in', 'land.create': 'Create an account', 'land.resources': 'Public resources',
    'land.disclaimer': 'FirePath is a Glendale pilot prototype, not a City of Glendale service. For emergencies, follow official instructions and call 911.',
    'land.help': 'Need help using this? Call 2-1-1 to talk to a person.',
    'set.language': 'Language', 'set.text': 'Text size', 'set.normal': 'Normal', 'set.large': 'Large', 'set.xl': 'Extra large',
    'set.unreviewed': 'Translation not yet reviewed by a native speaker. For emergencies, follow official instructions.',
    'em.back': '← Back', 'em.what': "What's happening?", 'em.pick': 'Pick one. You will get a short list of what to do.',
    'em.call': 'Call 911', 'em.callSub': 'If anyone is hurt or in danger', 'em.else': '← Something else', 'em.close': 'Close',
    'em.official': 'Official instructions always come first. FirePath does not know about live incidents or choose routes.',
    'em.read': '🔊 Read aloud', 'em.stop': '■ Stop reading', 'em.englishOnly': 'These steps are shown in English for now.',
    'sit.earthquake': 'Earthquake', 'sit.fire': 'Fire nearby', 'sit.evacuate': 'Told to evacuate', 'sit.flood': 'Flooding', 'sit.power': 'Power out', 'sit.smoke': 'Smoke', 'sit.heat': 'Extreme heat',
    'lnk.zone': 'Your evacuation zone (Genasys Protect)', 'lnk.211': '211 LA: shelters and help', 'lnk.calfire': 'CAL FIRE current incidents', 'lnk.nws': 'National Weather Service, Los Angeles', 'lnk.gwp': 'Glendale Water & Power outages', 'lnk.airnow': 'AirNow air quality', 'lnk.myshake': 'MyShake earthquake early warning',
    'home.checklist': 'YOUR CHECKLIST', 'home.done': '{done} of {total} done', 'home.next': 'Next on your list', 'home.seeAll': 'See the full checklist ({total}) →',
  },
  es: {
    'nav.map': 'Mapa', 'nav.plan': 'Plan', 'nav.home': 'Inicio', 'nav.alerts': 'Alertas', 'nav.permits': 'Permisos',
    'head.emergency': 'Emergencia', 'head.close': 'Cerrar', 'head.pilot': 'PILOTO', 'head.business': 'NEGOCIO',
    'land.title': '¿Qué riesgos hay en su dirección de Glendale?',
    'land.sub': 'Revise cualquier dirección en siete mapas de riesgos estatales y federales. No necesita cuenta.',
    'land.tour': 'Vea FirePath en 90 segundos', 'land.tourSub': 'Cinco pasos guiados con un hogar ficticio. Sin registrarse.',
    'land.addr': 'Dirección en Glendale', 'land.addrHint': 'Se envía al buscador de direcciones de la Ciudad de Glendale. FirePath no guarda estas búsquedas.',
    'land.placeholder': 'Empiece a escribir, p. ej., 1613 Glencoe', 'land.check': 'Revisar esta dirección', 'land.checking': 'Revisando las direcciones de la Ciudad y siete mapas de riesgos…',
    'land.signin': '¿Ya tiene cuenta? Inicie sesión', 'land.create': 'Crear una cuenta', 'land.resources': 'Recursos públicos',
    'land.disclaimer': 'FirePath es un prototipo piloto para Glendale, no un servicio de la Ciudad de Glendale. En una emergencia, siga las instrucciones oficiales y llame al 911.',
    'land.help': '¿Necesita ayuda para usar esto? Llame al 2-1-1 para hablar con una persona.',
    'set.language': 'Idioma', 'set.text': 'Tamaño del texto', 'set.normal': 'Normal', 'set.large': 'Grande', 'set.xl': 'Muy grande',
    'set.unreviewed': 'Traducción aún no revisada por un hablante nativo. En una emergencia, siga las instrucciones oficiales.',
    'em.back': '← Volver', 'em.what': '¿Qué está pasando?', 'em.pick': 'Elija una opción. Verá una lista corta de qué hacer.',
    'em.call': 'Llame al 911', 'em.callSub': 'Si alguien está herido o en peligro', 'em.else': '← Otra situación', 'em.close': 'Cerrar',
    'em.official': 'Las instrucciones oficiales siempre van primero. FirePath no sabe de incidentes en vivo ni elige rutas.',
    'em.read': '🔊 Leer en voz alta', 'em.stop': '■ Dejar de leer', 'em.englishOnly': 'Por ahora, estos pasos se muestran en inglés.',
    'sit.earthquake': 'Terremoto', 'sit.fire': 'Incendio cerca', 'sit.evacuate': 'Orden de evacuar', 'sit.flood': 'Inundación', 'sit.power': 'Sin electricidad', 'sit.smoke': 'Humo', 'sit.heat': 'Calor extremo',
    'lnk.zone': 'Su zona de evacuación (Genasys Protect)', 'lnk.211': '211 LA: refugios y ayuda', 'lnk.calfire': 'Incendios activos de CAL FIRE', 'lnk.nws': 'Servicio Meteorológico Nacional, Los Ángeles', 'lnk.gwp': 'Apagones de Glendale Water & Power', 'lnk.airnow': 'Calidad del aire (AirNow)', 'lnk.myshake': 'Alerta temprana de sismos MyShake',
    'home.checklist': 'SU LISTA', 'home.done': '{done} de {total} hechos', 'home.next': 'Lo siguiente en su lista', 'home.seeAll': 'Ver la lista completa ({total}) →',
  },
  hy: {
    'nav.map': 'Քարտեզ', 'nav.plan': 'Ծրագիր', 'nav.home': 'Գլխավոր', 'nav.alerts': 'Ահազանգեր', 'nav.permits': 'Թույլտվություններ',
    'head.emergency': 'Արտակարգ', 'head.close': 'Փակել', 'head.pilot': 'ՓՈՐՁՆԱԿԱՆ', 'head.business': 'ԲԻԶՆԵՍ',
    'land.title': 'Ի՞նչ վտանգներ կան ձեր Գլենդելի հասցեում',
    'land.sub': 'Ստուգեք ցանկացած հասցե նահանգային և դաշնային վտանգների յոթ քարտեզներով։ Հաշիվ պետք չէ։',
    'land.tour': 'Դիտեք FirePath-ը 90 վայրկյանում', 'land.tourSub': 'Հինգ քայլ հորինված ընտանիքի օրինակով։ Առանց գրանցման։',
    'land.addr': 'Գլենդելի հասցե', 'land.addrHint': 'Ուղարկվում է Գլենդել քաղաքի հասցեների որոնման համակարգին։ FirePath-ը չի պահպանում այս ստուգումները։',
    'land.placeholder': 'Սկսեք գրել, օրինակ՝ 1613 Glencoe', 'land.check': 'Ստուգել այս հասցեն', 'land.checking': 'Ստուգվում են քաղաքի հասցեները և վտանգների յոթ քարտեզները…',
    'land.signin': 'Արդեն գրանցվա՞ծ եք։ Մուտք գործեք', 'land.create': 'Ստեղծել հաշիվ', 'land.resources': 'Հանրային ռեսուրսներ',
    'land.disclaimer': 'FirePath-ը Գլենդելի փորձնական նախագիծ է, ոչ թե Գլենդել քաղաքի ծառայություն։ Արտակարգ իրավիճակում հետևեք պաշտոնական ցուցումներին և զանգահարեք 911։',
    'land.help': 'Օգնությա՞ն կարիք ունեք։ Զանգահարեք 2-1-1՝ մարդու հետ խոսելու համար։',
    'set.language': 'Լեզու', 'set.text': 'Տեքստի չափ', 'set.normal': 'Սովորական', 'set.large': 'Մեծ', 'set.xl': 'Շատ մեծ',
    'set.unreviewed': 'Թարգմանությունը դեռ ստուգված չէ մայրենի խոսողի կողմից։ Արտակարգ իրավիճակում հետևեք պաշտոնական ցուցումներին։',
    'em.back': '← Հետ', 'em.what': 'Ի՞նչ է կատարվում', 'em.pick': 'Ընտրեք մեկը։ Կստանաք անելիքների կարճ ցուցակ։',
    'em.call': 'Զանգահարեք 911', 'em.callSub': 'Եթե որևէ մեկը վիրավոր է կամ վտանգի մեջ', 'em.else': '← Այլ իրավիճակ', 'em.close': 'Փակել',
    'em.official': 'Պաշտոնական ցուցումները միշտ առաջնահերթ են։ FirePath-ը չգիտի ընթացիկ դեպքերի մասին և երթուղիներ չի ընտրում։',
    'em.read': '🔊 Կարդալ բարձրաձայն', 'em.stop': '■ Դադարեցնել', 'em.englishOnly': 'Այս քայլերը առայժմ ցուցադրվում են անգլերենով։',
    'sit.earthquake': 'Երկրաշարժ', 'sit.fire': 'Մոտակայքում հրդեհ', 'sit.evacuate': 'Տարհանման կարգադրություն', 'sit.flood': 'Ջրհեղեղ', 'sit.power': 'Էլեկտրականություն չկա', 'sit.smoke': 'Ծուխ', 'sit.heat': 'Ծայրահեղ շոգ',
    'lnk.zone': 'Ձեր տարհանման գոտին (Genasys Protect)', 'lnk.211': '211 LA՝ ապաստարաններ և օգնություն', 'lnk.calfire': 'CAL FIRE-ի ընթացիկ հրդեհները', 'lnk.nws': 'Ազգային եղանակային ծառայություն, Լոս Անջելես', 'lnk.gwp': 'Glendale Water & Power-ի հոսանքազրկումներ', 'lnk.airnow': 'Օդի որակ (AirNow)', 'lnk.myshake': 'MyShake՝ երկրաշարժի վաղ նախազգուշացում',
    'home.checklist': 'ՁԵՐ ՑՈՒՑԱԿԸ', 'home.done': '{done}-ը {total}-ից կատարված է', 'home.next': 'Հաջորդը ձեր ցուցակում', 'home.seeAll': 'Տեսնել ամբողջ ցուցակը ({total}) →',
  },
  ko: {
    'nav.map': '지도', 'nav.plan': '계획', 'nav.home': '홈', 'nav.alerts': '경보', 'nav.permits': '허가',
    'head.emergency': '긴급', 'head.close': '닫기', 'head.pilot': '시범', 'head.business': '사업체',
    'land.title': '글렌데일 주소에는 어떤 위험이 있나요?',
    'land.sub': '주 및 연방 위험 지도 7개로 어떤 주소든 확인하세요. 계정이 필요 없습니다.',
    'land.tour': '90초 만에 FirePath 보기', 'land.tourSub': '가상의 가구로 살펴보는 다섯 단계. 가입 필요 없음.',
    'land.addr': '글렌데일 주소', 'land.addrHint': '글렌데일 시의 주소 검색으로 전송됩니다. FirePath는 주소 조회를 저장하지 않습니다.',
    'land.placeholder': '입력을 시작하세요. 예: 1613 Glencoe', 'land.check': '이 주소 확인', 'land.checking': '시의 주소 정보와 위험 지도 7개를 확인하는 중…',
    'land.signin': '이미 가입하셨나요? 로그인', 'land.create': '계정 만들기', 'land.resources': '공공 자료',
    'land.disclaimer': 'FirePath는 글렌데일 시범 프로젝트이며 글렌데일 시의 서비스가 아닙니다. 긴급 상황에서는 공식 지시를 따르고 911에 전화하세요.',
    'land.help': '사용하는 데 도움이 필요하신가요? 2-1-1에 전화하면 상담원과 통화할 수 있습니다.',
    'set.language': '언어', 'set.text': '글자 크기', 'set.normal': '보통', 'set.large': '크게', 'set.xl': '아주 크게',
    'set.unreviewed': '원어민 검토를 아직 받지 않은 번역입니다. 긴급 상황에서는 공식 지시를 따르세요.',
    'em.back': '← 뒤로', 'em.what': '무슨 일이 일어나고 있나요?', 'em.pick': '하나를 선택하세요. 해야 할 일을 짧게 보여 드립니다.',
    'em.call': '911에 전화', 'em.callSub': '다친 사람이 있거나 위험한 경우', 'em.else': '← 다른 상황', 'em.close': '닫기',
    'em.official': '공식 지시가 항상 우선입니다. FirePath는 실시간 사건을 알지 못하며 대피 경로를 정하지 않습니다.',
    'em.read': '🔊 소리 내어 읽기', 'em.stop': '■ 읽기 중지', 'em.englishOnly': '이 단계들은 지금은 영어로 표시됩니다.',
    'sit.earthquake': '지진', 'sit.fire': '근처 화재', 'sit.evacuate': '대피 명령', 'sit.flood': '홍수', 'sit.power': '정전', 'sit.smoke': '연기', 'sit.heat': '폭염',
    'lnk.zone': '나의 대피 구역 (Genasys Protect)', 'lnk.211': '211 LA: 대피소와 도움', 'lnk.calfire': 'CAL FIRE 현재 화재 현황', 'lnk.nws': '국립기상청 로스앤젤레스', 'lnk.gwp': 'Glendale Water & Power 정전 정보', 'lnk.airnow': '대기질 정보 (AirNow)', 'lnk.myshake': 'MyShake 지진 조기 경보',
    'home.checklist': '나의 체크리스트', 'home.done': '{total}개 중 {done}개 완료', 'home.next': '다음 할 일', 'home.seeAll': '전체 체크리스트 보기 ({total}) →',
  },
};

export const translate = (lang, key, vars = {}) => String(dict[lang]?.[key] ?? dict.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const I18n = createContext({ lang: 'en', t: (k, v) => translate('en', k, v), setLang: () => {}, scale: 1, setScale: () => {} });

// Language + text size, remembered on the device. On web, text size scales the whole page (zoom);
// native apps also follow the phone's own text-size setting.
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en'), [scale, setScaleState] = useState(1);
  useEffect(() => {
    AsyncStorage.multiGet(['firepath-lang', 'firepath-scale']).then(([[, l], [, sc]]) => { if (dict[l]) setLangState(l); if (Number(sc)) setScaleState(Number(sc)); }).catch(() => {});
  }, []);
  useEffect(() => {
    // Korean wraps between words (keep-all), not mid-word.
    if (Platform.OS === 'web') { document.documentElement.lang = lang; document.body.style.zoom = String(scale); document.body.style.wordBreak = lang === 'ko' ? 'keep-all' : 'normal'; }
  }, [lang, scale]);
  const setLang = l => { setLangState(l); AsyncStorage.setItem('firepath-lang', l).catch(() => {}); };
  const setScale = sc => { setScaleState(sc); AsyncStorage.setItem('firepath-scale', String(sc)).catch(() => {}); };
  return <I18n.Provider value={{ lang, setLang, scale, setScale, t: (key, vars) => translate(lang, key, vars) }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
