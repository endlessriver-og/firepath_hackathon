// Printable one-page sheets for fridges, doors and break rooms. Standard sheets carry widely published
// guidance (Drop, Cover, Hold On; Ready, Set, Go!); custom sheets are filled from the account's saved
// data, with blank lines where nothing is saved so they can be completed by hand.
// English is the source; es, hy and ko are drafts not yet reviewed by native speakers, and every
// translated sheet says so in its footer.
import { describeHazard, hazardNames } from './preparedness.js';
import { hazardSeverity, hazmatKinds } from './readiness.js';
import { formatDate } from './dates.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const blank = (value, width = '100%') => value ? esc(value) : `<span class="line" style="width:${width}"></span>`;
const list = items => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const today = lang => formatDate(new Date(), lang, { long: true });

const P = {
  en: {
    footer: date => `Prepared with FirePath (Glendale pilot prototype) on ${date}. Not a City of Glendale document. In an emergency call 911 and follow official instructions. City alerts: glendaleca.gov/Everbridge · Your evacuation zone: protect.genasys.com`,
    draft: '',
    mapped: 'Mapped at this address:', planning: 'Planning maps, not live alerts.',
    titles: { earthquake: 'Earthquake: Drop, Cover, Hold On', wildfire: 'Wildfire: Ready, Set, Go!', gobag: 'Go-bag checklist', shutoffs: 'Utility shutoffs' },
    eq: {
      start: 'When the shaking starts',
      steps: [['DROP', 'to your hands and knees before the shaking drops you.'], ['COVER', 'your head and neck. Get under a sturdy table or desk if one is close; otherwise crawl to an interior wall away from windows.'], ['HOLD ON', 'to your shelter, or to your head and neck, until the shaking stops.']],
      doNot: 'Do not', doNotList: ['Run outside while the ground is shaking', 'Stand in a doorway', 'Use elevators'],
      where: 'In bed · in a car · outside', whereList: ['In bed: stay there and cover your head with a pillow', 'Driving: pull over away from bridges and wires, set the brake', 'Outside: move away from buildings, trees and power lines, then drop'],
      after: 'After the shaking stops', afterList: ['Expect aftershocks. Drop, Cover and Hold On again each time.', 'Check people for injuries; put on shoes before walking through debris.', 'If you smell gas or hear hissing, leave and call the gas company from outside.', 'Text rather than call so lines stay open for emergencies.', 'Get the MyShake app for early warning: myshake.berkeley.edu'],
      sub: 'Practice it so your body knows what to do.',
    },
    wf: {
      ready: 'Ready: before fire season', readyList: ['Clear the first 5 feet around your home of anything that burns', 'Pack a go bag for every person and pet', 'Sign up for City alerts and look up your evacuation zone', 'Plan two ways out of your neighborhood and a meeting place'],
      set: 'Set: when a fire is nearby or a Red Flag Warning is issued', setList: ['Put go bags, pets and carriers by the door', 'Park facing out with at least half a tank', 'Close windows, vents and doors; move furniture away from windows', 'Wear long sleeves, long pants and sturdy shoes', 'Stay tuned to official alerts'],
      go: 'Go: when officials say go, or you feel unsafe', goBox: 'Leave early. Do not wait for an order if you feel unsafe.', goList: ['Follow the routes officials give; roads may close', 'Take your go bags, pets, medications and phone charger', 'Tell your out-of-area contact where you are going'],
      sub: 'CAL FIRE\'s three-step wildfire plan. More: readyforwildfire.org',
    },
    gb: {
      person: 'For each person', personList: ['Water (1 gallon per person per day)', 'Non-perishable food for 3 days', 'Medications and copies of prescriptions', 'Glasses, hearing aids, mobility aids', 'Change of clothes and sturdy shoes', 'N95 masks (smoke and dust)', 'Flashlight and extra batteries', 'Phone charger and battery pack'],
      house: 'For the household', houseList: ['Copies of IDs, insurance and deeds (or on a USB drive)', 'Cash in small bills', 'First aid kit', 'Printed contact list and map', 'Pet food, water, leash or carrier, vet records', 'Baby supplies if needed', 'Whistle', 'Sanitation supplies'],
      box: 'Check this bag every 6 months: replace water, food and batteries, and update medications.', sub: 'Keep it by the door or in the car.',
    },
    sh: {
      gas: 'Gas', gasList: ['Only turn off the gas if you smell gas, hear a hiss, or see damage.', 'Use a wrench to turn the valve a quarter turn so it runs across the pipe.', 'Once it is off, only the gas company should turn it back on.'],
      meter: 'Gas meter is at:', wrench: 'Wrench is kept at:',
      elec: 'Electricity', elecList: ['Turn off individual breakers first, then the main breaker.', 'Never touch the panel if you are standing in water.'], breaker: 'Main breaker is at:',
      water: 'Water', waterList: ['Shut the main valve if pipes break, to save the water in your heater and pipes.'], valve: 'Main water valve is at:',
      warn: 'Power out? Glendale Water &amp; Power outage map and alerts: glendaleca.gov (Power Outages).', sub: 'Know where they are before you need them.',
    },
    home: {
      title: 'Our emergency plan', holder: '(account holder)', ages: { senior: 'older adult' }, mayNeedHelp: 'may need help leaving', usually: where => `usually ${where}`,
      label: 'Home:', who: 'Who lives here', pets: 'Pets:', separated: 'If we are separated', meetNear: 'Meet near home:', meetFar: 'Meet outside the area:', contact: 'Out-of-area contact:',
      important: 'Important information', zone: 'Our evacuation zone:', utilities: 'Utility shutoffs:', help: 'Help someone may need:', doctor: 'Doctor / pharmacy:',
      leave: 'If we have to leave', leave1: pets => `Grab go bags, medications, phone chargers${pets ? ' and the pets' : ''}.`, leave2: 'Follow official instructions and routes. Leave early if you feel unsafe.', leave3: 'Text the out-of-area contact where you are going.',
      sub: 'Post this where everyone in the household can see it.',
    },
    biz: {
      title: name => `${name || 'Business'}: in an emergency`, hazmat: 'Hazardous materials on site:', tell: 'Tell firefighters on arrival.', address: 'Address:',
      evac: 'If you need to evacuate', ev1: 'Leave by the nearest safe exit. <b>Do not use elevators.</b>', ev2: 'Help visitors and anyone who needs assistance to get out.', ev3: 'Go to the assembly point:', ev4: 'Report to the key contact so everyone is counted. Do not go back inside.',
      contact: 'Key contact', name: 'Name:', phone: 'Phone:', know: 'Know where they are', extinguishers: 'Fire extinguishers:', firstAid: 'First aid kit:', utilities: 'Utility shutoffs:',
      box: '<b>Earthquake:</b> Drop, Cover, Hold On. <b>Fire:</b> pull the alarm, get out, call 911. <b>Smoke outside:</b> close doors and windows, set HVAC to recirculate.',
      sub: 'Post near exits and in the break room.',
    },
  },
  es: {
    footer: date => `Preparado con FirePath (prototipo piloto de Glendale) el ${date}. No es un documento de la Ciudad de Glendale. En una emergencia llame al 911 y siga las instrucciones oficiales. Alertas de la Ciudad: glendaleca.gov/Everbridge · Su zona de evacuación: protect.genasys.com`,
    draft: 'Traducción preliminar, aún no revisada por un hablante nativo.',
    mapped: 'Mapeado en esta dirección:', planning: 'Mapas de planificación, no alertas en curso.',
    titles: { earthquake: 'Terremoto: Agáchese, Cúbrase y Sujétese', wildfire: 'Incendio forestal: ¡Listo, Prepárese, Váyase!', gobag: 'Lista de la mochila de emergencia', shutoffs: 'Cierres de servicios' },
    eq: {
      start: 'Cuando empiece a temblar',
      steps: [['AGÁCHESE', 'sobre manos y rodillas antes de que el temblor lo tire.'], ['CÚBRASE', 'la cabeza y el cuello. Métase debajo de una mesa o escritorio firme si hay uno cerca; si no, gatee hasta una pared interior lejos de las ventanas.'], ['SUJÉTESE', 'de su refugio, o sujete su cabeza y cuello, hasta que deje de temblar.']],
      doNot: 'No haga esto', doNotList: ['Salir corriendo mientras tiembla', 'Pararse en el marco de una puerta', 'Usar elevadores'],
      where: 'En la cama · en el auto · afuera', whereList: ['En la cama: quédese ahí y cúbrase la cabeza con una almohada', 'Manejando: oríllese lejos de puentes y cables y ponga el freno', 'Afuera: aléjese de edificios, árboles y cables eléctricos, y luego agáchese'],
      after: 'Cuando deje de temblar', afterList: ['Espere réplicas. Agáchese, cúbrase y sujétese otra vez cada vez.', 'Revise si hay heridos; póngase zapatos antes de caminar entre escombros.', 'Si huele a gas o escucha un silbido, salga y llame a la compañía de gas desde afuera.', 'Mande mensajes en vez de llamar para dejar libres las líneas de emergencia.', 'Instale la app MyShake para recibir alertas tempranas: myshake.berkeley.edu'],
      sub: 'Practíquelo para que su cuerpo sepa qué hacer.',
    },
    wf: {
      ready: 'Listo: antes de la temporada de incendios', readyList: ['Despeje de todo lo que arda los primeros 5 pies alrededor de su casa', 'Prepare una mochila de emergencia para cada persona y mascota', 'Inscríbase en las alertas de la Ciudad y averigüe su zona de evacuación', 'Planee dos salidas de su vecindario y un punto de reunión'],
      set: 'Prepárese: cuando haya un incendio cerca o una Alerta de Bandera Roja', setList: ['Ponga junto a la puerta las mochilas, las mascotas y sus jaulas', 'Estacione de frente a la salida con al menos medio tanque', 'Cierre ventanas, ventilas y puertas; aleje los muebles de las ventanas', 'Use manga larga, pantalón largo y zapatos resistentes', 'Esté atento a las alertas oficiales'],
      go: 'Váyase: cuando las autoridades lo indiquen o no se sienta seguro', goBox: 'Salga temprano. No espere una orden si no se siente seguro.', goList: ['Siga las rutas que indiquen las autoridades; las calles pueden cerrarse', 'Lleve sus mochilas, mascotas, medicinas y cargador del teléfono', 'Avise a su contacto fuera del área a dónde va'],
      sub: 'El plan de tres pasos de CAL FIRE. Más: readyforwildfire.org',
    },
    gb: {
      person: 'Para cada persona', personList: ['Agua (1 galón por persona por día)', 'Comida no perecedera para 3 días', 'Medicinas y copias de las recetas', 'Lentes, audífonos, apoyos para caminar', 'Muda de ropa y zapatos resistentes', 'Mascarillas N95 (humo y polvo)', 'Linterna y baterías de repuesto', 'Cargador del teléfono y batería portátil'],
      house: 'Para el hogar', houseList: ['Copias de identificaciones, seguros y escrituras (o en una memoria USB)', 'Efectivo en billetes pequeños', 'Botiquín de primeros auxilios', 'Lista de contactos y mapa impresos', 'Comida, agua, correa o jaula y registros veterinarios de las mascotas', 'Artículos para bebé si hace falta', 'Silbato', 'Artículos de higiene'],
      box: 'Revise esta mochila cada 6 meses: cambie el agua, la comida y las baterías, y actualice las medicinas.', sub: 'Téngala junto a la puerta o en el auto.',
    },
    sh: {
      gas: 'Gas', gasList: ['Cierre el gas solo si huele a gas, escucha un silbido o ve daños.', 'Con una llave, gire la válvula un cuarto de vuelta para que quede atravesada al tubo.', 'Una vez cerrado, solo la compañía de gas debe volver a abrirlo.'],
      meter: 'El medidor de gas está en:', wrench: 'La llave se guarda en:',
      elec: 'Electricidad', elecList: ['Apague primero los interruptores individuales y luego el principal.', 'Nunca toque el panel si está parado en agua.'], breaker: 'El interruptor principal está en:',
      water: 'Agua', waterList: ['Cierre la válvula principal si se rompen tubos, para conservar el agua del calentador y las tuberías.'], valve: 'La válvula principal de agua está en:',
      warn: '¿Sin luz? Mapa de apagones y alertas de Glendale Water &amp; Power: glendaleca.gov (Power Outages).', sub: 'Sepa dónde están antes de necesitarlos.',
    },
    home: {
      title: 'Nuestro plan de emergencia', holder: '(titular de la cuenta)', ages: { senior: 'adulto mayor', adult: 'adulto', child: 'niño' }, mayNeedHelp: 'puede necesitar ayuda para salir', usually: where => `normalmente en ${where}`,
      label: 'Casa:', who: 'Quiénes viven aquí', pets: 'Mascotas:', separated: 'Si nos separamos', meetNear: 'Punto de reunión cerca de casa:', meetFar: 'Punto de reunión fuera del área:', contact: 'Contacto fuera del área:',
      important: 'Información importante', zone: 'Nuestra zona de evacuación:', utilities: 'Cierres de servicios:', help: 'Ayuda que alguien puede necesitar:', doctor: 'Médico / farmacia:',
      leave: 'Si tenemos que salir', leave1: pets => `Tomen las mochilas, medicinas, cargadores${pets ? ' y las mascotas' : ''}.`, leave2: 'Sigan las instrucciones y rutas oficiales. Salgan temprano si no se sienten seguros.', leave3: 'Avisen por mensaje al contacto fuera del área a dónde van.',
      sub: 'Péguelo donde todos en casa puedan verlo.',
    },
    biz: {
      title: name => `${name || 'Negocio'}: en una emergencia`, hazmat: 'Materiales peligrosos en el lugar:', tell: 'Avise a los bomberos al llegar.', address: 'Dirección:',
      evac: 'Si hay que evacuar', ev1: 'Salga por la salida segura más cercana. <b>No use elevadores.</b>', ev2: 'Ayude a salir a los visitantes y a quien necesite ayuda.', ev3: 'Vaya al punto de reunión:', ev4: 'Repórtese con el contacto principal para que se cuente a todos. No vuelva a entrar.',
      contact: 'Contacto principal', name: 'Nombre:', phone: 'Teléfono:', know: 'Sepa dónde están', extinguishers: 'Extintores:', firstAid: 'Botiquín:', utilities: 'Cierres de servicios:',
      box: '<b>Terremoto:</b> Agáchese, Cúbrase y Sujétese. <b>Incendio:</b> active la alarma, salga y llame al 911. <b>Humo afuera:</b> cierre puertas y ventanas y ponga el aire en recirculación.',
      sub: 'Péguelo cerca de las salidas y en el cuarto de descanso.',
    },
  },
  hy: {
    footer: date => `Պատրաստված է FirePath-ով (Գլենդեյլի փորձնական նախատիպ)՝ ${date}։ Սա Գլենդեյլ քաղաքի փաստաթուղթ չէ։ Արտակարգ իրավիճակում զանգեք 911 և հետևեք պաշտոնական ցուցումներին։ Քաղաքի ծանուցումներ՝ glendaleca.gov/Everbridge · Ձեր տարհանման գոտին՝ protect.genasys.com`,
    draft: 'Նախնական թարգմանություն, դեռ չի ստուգվել մայրենի խոսողի կողմից։',
    mapped: 'Քարտեզագրված է այս հասցեում՝', planning: 'Պլանավորման քարտեզներ, ոչ թե ընթացիկ ծանուցումներ։',
    titles: { earthquake: 'Երկրաշարժ՝ Կռացե՛ք, ծածկվե՛ք, բռնվե՛ք', wildfire: 'Անտառային հրդեհ՝ Պատրաստ, ուշադիր, գնացե՛ք', gobag: 'Արտակարգ պայուսակի ցուցակ', shutoffs: 'Կոմունալ անջատիչներ' },
    eq: {
      start: 'Երբ ցնցումները սկսվում են',
      steps: [['ԿՌԱՑԵ՛Ք', 'ձեռքերի և ծնկների վրա, նախքան ցնցումը ձեզ կգցի։'], ['ԾԱԾԿՎԵ՛Ք', '՝ պաշտպանեք գլուխն ու պարանոցը։ Մտեք ամուր սեղանի տակ, եթե մոտ է, հակառակ դեպքում սողացեք դեպի ներքին պատ՝ պատուհաններից հեռու։'], ['ԲՌՆՎԵ՛Ք', 'ձեր ապաստանից կամ պահեք գլուխն ու պարանոցը, մինչև ցնցումները դադարեն։']],
      doNot: 'Մի՛ արեք', doNotList: ['Դուրս վազել, երբ գետինը ցնցվում է', 'Կանգնել դռան շրջանակում', 'Օգտվել վերելակից'],
      where: 'Անկողնում · մեքենայում · դրսում', whereList: ['Անկողնում՝ մնացեք այնտեղ և բարձով ծածկեք գլուխը', 'Մեքենա վարելիս՝ կանգնեք կամուրջներից և լարերից հեռու, քաշեք ձեռքի արգելակը', 'Դրսում՝ հեռացեք շենքերից, ծառերից և էլեկտրալարերից, ապա կռացեք'],
      after: 'Երբ ցնցումները դադարում են', afterList: ['Սպասեք հետցնցումների։ Ամեն անգամ կրկին կռացե՛ք, ծածկվե՛ք, բռնվե՛ք։', 'Ստուգեք, արդյոք մարդիկ վնասվածք չունեն, կոշիկ հագեք՝ նախքան բեկորների միջով քայլելը։', 'Եթե գազի հոտ եք զգում կամ սուլոց լսում, դուրս եկեք և դրսից զանգեք գազի ընկերությանը։', 'Զանգելու փոխարեն հաղորդագրություն գրեք, որպեսզի գծերը ազատ մնան արտակարգ իրավիճակների համար։', 'Տեղադրեք MyShake հավելվածը վաղ նախազգուշացման համար՝ myshake.berkeley.edu'],
      sub: 'Վարժվեք, որպեսզի մարմինը իմանա՝ ինչ անել։',
    },
    wf: {
      ready: 'Պատրաստ՝ հրդեհների սեզոնից առաջ', readyList: ['Տան շուրջ առաջին 5 ֆուտը մաքրեք այն ամենից, ինչ կարող է այրվել', 'Յուրաքանչյուր մարդու և կենդանու համար պատրաստեք արտակարգ պայուսակ', 'Գրանցվեք Քաղաքի ծանուցումներին և պարզեք ձեր տարհանման գոտին', 'Պլանավորեք թաղամասից դուրս գալու երկու ճանապարհ և հավաքման վայր'],
      set: 'Ուշադիր՝ երբ հրդեհը մոտ է կամ հայտարարված է «Կարմիր դրոշ» նախազգուշացում', setList: ['Պայուսակները, կենդանիներին և դրանց փոխադրիչները դրեք դռան մոտ', 'Մեքենան կայանեք դեմքով դեպի ելքը, առնվազն կես բաք վառելիքով', 'Փակեք պատուհանները, օդանցքներն ու դռները, կահույքը հեռացրեք պատուհաններից', 'Հագեք երկար թևքեր, երկար տաբատ և ամուր կոշիկներ', 'Հետևեք պաշտոնական ծանուցումներին'],
      go: 'Գնացե՛ք՝ երբ իշխանություններն ասում են, կամ երբ ձեզ անապահով եք զգում', goBox: 'Հեռացեք վաղ։ Մի՛ սպասեք հրամանի, եթե ձեզ անապահով եք զգում։', goList: ['Հետևեք իշխանությունների նշած երթուղիներին, ճանապարհները կարող են փակվել', 'Վերցրեք պայուսակները, կենդանիներին, դեղերը և հեռախոսի լիցքավորիչը', 'Տեղեկացրեք տարածքից դուրս գտնվող ձեր կոնտակտին, թե ուր եք գնում'],
      sub: 'CAL FIRE-ի եռաքայլ ծրագիրը։ Ավելին՝ readyforwildfire.org',
    },
    gb: {
      person: 'Յուրաքանչյուր մարդու համար', personList: ['Ջուր (1 գալոն մեկ մարդու համար օրական)', 'Չփչացող սնունդ 3 օրվա համար', 'Դեղեր և դեղատոմսերի պատճեններ', 'Ակնոցներ, լսողական սարքեր, շարժման օժանդակ միջոցներ', 'Փոխնորդ հագուստ և ամուր կոշիկներ', 'N95 դիմակներ (ծուխ և փոշի)', 'Լապտեր և պահեստային մարտկոցներ', 'Հեռախոսի լիցքավորիչ և արտաքին մարտկոց'],
      house: 'Ընտանիքի համար', houseList: ['Անձնագրերի, ապահովագրության և սեփականության փաստաթղթերի պատճեններ (կամ USB կրիչով)', 'Կանխիկ՝ մանր թղթադրամներով', 'Առաջին օգնության արկղ', 'Տպված կոնտակտների ցուցակ և քարտեզ', 'Կենդանիների սնունդ, ջուր, կապ կամ փոխադրիչ, անասնաբուժական փաստաթղթեր', 'Մանկական պարագաներ, եթե պետք է', 'Սուլիչ', 'Հիգիենայի պարագաներ'],
      box: 'Ստուգեք այս պայուսակը 6 ամիսը մեկ՝ փոխեք ջուրը, սնունդն ու մարտկոցները և թարմացրեք դեղերը։', sub: 'Պահեք դռան մոտ կամ մեքենայում։',
    },
    sh: {
      gas: 'Գազ', gasList: ['Գազն անջատեք միայն եթե գազի հոտ եք զգում, սուլոց եք լսում կամ վնաս եք տեսնում։', 'Բանալիով փականը պտտեք քառորդ պտույտ, որպեսզի այն խողովակին ուղղահայաց լինի։', 'Անջատելուց հետո միայն գազի ընկերությունը պետք է այն նորից միացնի։'],
      meter: 'Գազի հաշվիչը գտնվում է՝', wrench: 'Բանալին պահվում է՝',
      elec: 'Էլեկտրականություն', elecList: ['Նախ անջատեք առանձին ավտոմատները, ապա՝ գլխավորը։', 'Երբեք մի՛ դիպչեք վահանակին, եթե կանգնած եք ջրի մեջ։'], breaker: 'Գլխավոր ավտոմատը գտնվում է՝',
      water: 'Ջուր', waterList: ['Խողովակների վնասման դեպքում փակեք գլխավոր փականը՝ ջրատաքացուցչի և խողովակների ջուրը պահպանելու համար։'], valve: 'Ջրի գլխավոր փականը գտնվում է՝',
      warn: 'Հոսանք չկա՞։ Glendale Water &amp; Power-ի անջատումների քարտեզ և ծանուցումներ՝ glendaleca.gov (Power Outages)։', sub: 'Իմացեք, թե որտեղ են դրանք, նախքան դրանց կարիքը կունենաք։',
    },
    home: {
      title: 'Մեր արտակարգ ծրագիրը', holder: '(հաշվի տերը)', ages: { senior: 'տարեց', adult: 'չափահաս', child: 'երեխա' }, mayNeedHelp: 'կարող է օգնության կարիք ունենալ դուրս գալիս', usually: where => `սովորաբար՝ ${where}`,
      label: 'Տուն՝', who: 'Ովքեր են ապրում այստեղ', pets: 'Կենդանիներ՝', separated: 'Եթե բաժանվենք', meetNear: 'Հանդիպում տան մոտ՝', meetFar: 'Հանդիպում տարածքից դուրս՝', contact: 'Տարածքից դուրս կոնտակտ՝',
      important: 'Կարևոր տեղեկություններ', zone: 'Մեր տարհանման գոտին՝', utilities: 'Կոմունալ անջատիչներ՝', help: 'Ում ինչ օգնություն է պետք՝', doctor: 'Բժիշկ / դեղատուն՝',
      leave: 'Եթե ստիպված լինենք հեռանալ', leave1: pets => `Վերցրեք պայուսակները, դեղերը, լիցքավորիչները${pets ? ' և կենդանիներին' : ''}։`, leave2: 'Հետևեք պաշտոնական ցուցումներին և երթուղիներին։ Հեռացեք վաղ, եթե ձեզ անապահով եք զգում։', leave3: 'Հաղորդագրությամբ տեղեկացրեք տարածքից դուրս կոնտակտին, թե ուր եք գնում։',
      sub: 'Փակցրեք այնտեղ, որտեղ ընտանիքի բոլոր անդամները կտեսնեն։',
    },
    biz: {
      title: name => `${name || 'Բիզնես'}՝ արտակարգ իրավիճակում`, hazmat: 'Վտանգավոր նյութեր տեղում՝', tell: 'Տեղեկացրեք հրշեջներին ժամանելիս։', address: 'Հասցե՝',
      evac: 'Եթե անհրաժեշտ է տարհանվել', ev1: 'Դուրս եկեք մոտակա անվտանգ ելքով։ <b>Մի՛ օգտվեք վերելակից։</b>', ev2: 'Օգնեք այցելուներին և բոլոր նրանց, ովքեր օգնության կարիք ունեն, դուրս գալ։', ev3: 'Գնացեք հավաքման վայր՝', ev4: 'Ներկայացեք հիմնական կոնտակտին, որպեսզի բոլորը հաշվվեն։ Մի՛ վերադարձեք ներս։',
      contact: 'Հիմնական կոնտակտ', name: 'Անուն՝', phone: 'Հեռախոս՝', know: 'Իմացեք, թե որտեղ են', extinguishers: 'Կրակմարիչներ՝', firstAid: 'Առաջին օգնության արկղ՝', utilities: 'Կոմունալ անջատիչներ՝',
      box: '<b>Երկրաշարժ՝</b> Կռացե՛ք, ծածկվե՛ք, բռնվե՛ք։ <b>Հրդեհ՝</b> միացրեք ազդանշանը, դուրս եկեք, զանգեք 911։ <b>Ծուխ դրսում՝</b> փակեք դռներն ու պատուհանները, օդափոխությունը դրեք վերաշրջանառության։',
      sub: 'Փակցրեք ելքերի մոտ և հանգստի սենյակում։',
    },
  },
  ko: {
    footer: date => `FirePath(글렌데일 시범 시제품)로 ${date}에 작성. 글렌데일 시 공식 문서가 아닙니다. 비상시 911에 전화하고 공식 지시를 따르세요. 시 경보: glendaleca.gov/Everbridge · 대피 구역: protect.genasys.com`,
    draft: '초안 번역이며 아직 원어민 검토를 거치지 않았습니다.',
    mapped: '이 주소가 포함된 지도:', planning: '계획용 지도이며 실시간 경보가 아닙니다.',
    titles: { earthquake: '지진: 엎드리고, 가리고, 붙잡기', wildfire: '산불: 준비, 대비, 대피!', gobag: '비상 가방 체크리스트', shutoffs: '가스·전기·수도 차단' },
    eq: {
      start: '흔들림이 시작되면',
      steps: [['엎드리기', '흔들림에 넘어지기 전에 손과 무릎을 바닥에 대세요.'], ['가리기', '머리와 목을 보호하세요. 가까이에 튼튼한 탁자나 책상이 있으면 그 아래로 들어가고, 없으면 창문에서 먼 안쪽 벽으로 기어가세요.'], ['붙잡기', '흔들림이 멈출 때까지 탁자를 붙잡거나 머리와 목을 감싸세요.']],
      doNot: '하지 마세요', doNotList: ['흔들리는 동안 밖으로 뛰어나가기', '문틀 아래 서 있기', '엘리베이터 이용하기'],
      where: '침대에서 · 차 안에서 · 밖에서', whereList: ['침대: 그대로 있으면서 베개로 머리를 가리세요', '운전 중: 다리와 전선에서 떨어진 곳에 차를 세우고 주차 브레이크를 거세요', '밖: 건물, 나무, 전선에서 멀어진 뒤 엎드리세요'],
      after: '흔들림이 멈춘 뒤', afterList: ['여진에 대비하세요. 매번 다시 엎드리고, 가리고, 붙잡으세요.', '다친 사람이 있는지 확인하고, 잔해 위를 걷기 전에 신발을 신으세요.', '가스 냄새가 나거나 새는 소리가 들리면 밖으로 나가서 가스 회사에 전화하세요.', '긴급 통화를 위해 전화보다 문자를 쓰세요.', '조기 경보를 위해 MyShake 앱을 설치하세요: myshake.berkeley.edu'],
      sub: '몸이 기억하도록 연습하세요.',
    },
    wf: {
      ready: '준비: 산불 철이 오기 전에', readyList: ['집 주변 5피트 안에 탈 수 있는 것을 모두 치우세요', '사람과 반려동물마다 비상 가방을 챙기세요', '시 경보를 신청하고 대피 구역을 확인하세요', '동네를 빠져나갈 길 두 곳과 만날 장소를 정하세요'],
      set: '대비: 근처에 불이 났거나 적색 깃발 경보가 발령되면', setList: ['비상 가방, 반려동물, 이동장을 문 옆에 두세요', '연료를 절반 이상 채우고 차를 출구 쪽으로 향하게 주차하세요', '창문, 환기구, 문을 닫고 가구를 창문에서 떨어뜨리세요', '긴소매, 긴바지, 튼튼한 신발을 착용하세요', '공식 경보에 계속 귀 기울이세요'],
      go: '대피: 당국이 대피하라고 하거나 위험하다고 느낄 때', goBox: '일찍 떠나세요. 위험하다고 느끼면 명령을 기다리지 마세요.', goList: ['당국이 안내하는 경로를 따르세요. 도로가 통제될 수 있습니다', '비상 가방, 반려동물, 약, 휴대폰 충전기를 챙기세요', '지역 밖 연락처에 어디로 가는지 알리세요'],
      sub: 'CAL FIRE의 3단계 산불 계획. 자세히: readyforwildfire.org',
    },
    gb: {
      person: '한 사람마다', personList: ['물 (1인당 하루 1갤런)', '3일분의 상하지 않는 음식', '약과 처방전 사본', '안경, 보청기, 보행 보조기구', '갈아입을 옷과 튼튼한 신발', 'N95 마스크 (연기와 먼지)', '손전등과 여분의 배터리', '휴대폰 충전기와 보조 배터리'],
      house: '가족 공용', houseList: ['신분증, 보험, 부동산 서류 사본 (또는 USB 저장)', '소액 지폐 현금', '구급상자', '인쇄한 연락처 목록과 지도', '반려동물 사료, 물, 목줄이나 이동장, 진료 기록', '필요하면 아기 용품', '호루라기', '위생 용품'],
      box: '6개월마다 가방을 점검하세요: 물, 음식, 배터리를 바꾸고 약을 새것으로 챙기세요.', sub: '문 옆이나 차 안에 두세요.',
    },
    sh: {
      gas: '가스', gasList: ['가스 냄새가 나거나, 새는 소리가 들리거나, 손상이 보일 때만 가스를 잠그세요.', '렌치로 밸브를 4분의 1 바퀴 돌려 배관과 직각이 되게 하세요.', '한 번 잠근 뒤에는 가스 회사만 다시 열어야 합니다.'],
      meter: '가스 계량기 위치:', wrench: '렌치 보관 위치:',
      elec: '전기', elecList: ['개별 차단기를 먼저 내리고 그다음 메인 차단기를 내리세요.', '물 위에 서 있을 때는 절대 분전반을 만지지 마세요.'], breaker: '메인 차단기 위치:',
      water: '수도', waterList: ['배관이 터지면 메인 밸브를 잠가 온수기와 배관 속 물을 지키세요.'], valve: '수도 메인 밸브 위치:',
      warn: '정전인가요? Glendale Water &amp; Power 정전 지도와 경보: glendaleca.gov (Power Outages).', sub: '필요해지기 전에 위치를 알아두세요.',
    },
    home: {
      title: '우리 가족 비상 계획', holder: '(계정 소유자)', ages: { senior: '어르신', adult: '성인', child: '어린이' }, mayNeedHelp: '대피에 도움이 필요할 수 있음', usually: where => `평소 ${where}`,
      label: '집:', who: '함께 사는 사람', pets: '반려동물:', separated: '서로 떨어지게 되면', meetNear: '집 근처 만날 장소:', meetFar: '지역 밖 만날 장소:', contact: '지역 밖 연락처:',
      important: '중요 정보', zone: '우리 대피 구역:', utilities: '가스·전기·수도 차단 위치:', help: '누군가 필요할 수 있는 도움:', doctor: '병원 / 약국:',
      leave: '떠나야 한다면', leave1: pets => `비상 가방, 약, 휴대폰 충전기${pets ? ', 반려동물' : ''}을 챙기세요.`, leave2: '공식 지시와 경로를 따르세요. 위험하다고 느끼면 일찍 떠나세요.', leave3: '지역 밖 연락처에 어디로 가는지 문자로 알리세요.',
      sub: '가족 모두가 볼 수 있는 곳에 붙여 두세요.',
    },
    biz: {
      title: name => `${name || '사업장'}: 비상시`, hazmat: '현장의 위험물:', tell: '소방관이 도착하면 알리세요.', address: '주소:',
      evac: '대피해야 한다면', ev1: '가장 가까운 안전한 출구로 나가세요. <b>엘리베이터를 이용하지 마세요.</b>', ev2: '방문객과 도움이 필요한 사람이 나가도록 도우세요.', ev3: '집결 장소로 가세요:', ev4: '모두의 인원을 확인하도록 담당자에게 알리세요. 다시 들어가지 마세요.',
      contact: '비상 연락 담당자', name: '이름:', phone: '전화:', know: '위치를 알아두세요', extinguishers: '소화기:', firstAid: '구급상자:', utilities: '가스·전기·수도 차단:',
      box: '<b>지진:</b> 엎드리고, 가리고, 붙잡기. <b>화재:</b> 경보기를 누르고, 밖으로 나가 911에 전화하세요. <b>밖에 연기:</b> 문과 창문을 닫고 냉난방을 내부 순환으로 설정하세요.',
      sub: '출구 근처와 휴게실에 붙여 두세요.',
    },
  },
};
const pick = lang => (P[lang] ? lang : 'en');

function page(title, accent, body, subtitle = '', lang = 'en') {
  const X = P[lang];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #17372E; margin: 0; font-size: 13pt; line-height: 1.35; }
  .band { background: ${accent}; color: #fff; padding: 16px 20px; border-radius: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .band h1 { margin: 0; font-size: 28pt; letter-spacing: .5px; }
  .band p { margin: 4px 0 0; font-size: 12pt; opacity: .92; }
  h2 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1.5px; color: ${accent}; margin: 18px 0 6px; border-bottom: 2px solid ${accent}; padding-bottom: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 26px; }
  .steps { counter-reset: s; list-style: none; padding: 0; margin: 0; }
  .steps li { counter-increment: s; position: relative; padding: 6px 0 6px 44px; }
  .steps li::before { content: counter(s); position: absolute; left: 0; top: 4px; width: 32px; height: 32px; border-radius: 50%; background: ${accent}; color: #fff; font-weight: 800; text-align: center; line-height: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .big { font-size: 20pt; font-weight: 800; }
  ul { margin: 4px 0; padding-left: 20px; } li { margin: 3px 0; }
  .box { border: 2px solid #17372E; border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
  .line { display: inline-block; border-bottom: 1.5px solid #17372E; height: 1.1em; vertical-align: bottom; }
  .field { margin: 7px 0; } .field b { display: inline-block; min-width: 150px; }
  .tick li { list-style: none; margin-left: -20px; } .tick li::before { content: "☐  "; font-size: 14pt; }
  .warn { background: #FFF4E5; border-left: 5px solid #B4502B; padding: 8px 12px; margin-top: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  footer { margin-top: 18px; font-size: 9.5pt; color: #53655E; border-top: 1px solid #C9D3CC; padding-top: 6px; }
  @media screen { body { max-width: 8.5in; margin: 24px auto; padding: 0 16px; } }${lang === 'en' ? '' : `
  body { font-size: 12pt; } .band h1 { font-size: 24pt; } .big { font-size: 17pt; }`}
</style></head><body>
<div class="band"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
${body}
<footer>${X.footer(today(lang))}${X.draft ? ` ${X.draft}` : ''}</footer>
</body></html>`;
}

// Hazard names and levels come from the app's dictionary when a translator `t` is passed.
const mappedLine = (hazards, lang, t) => {
  if (!hazards) return '';
  const name = k => (lang !== 'en' && t ? t(`hz.${k}`) : hazardNames[k]);
  // Translated sheets use the app's severity words (already translated) instead of the English map labels.
  const level = k => {
    if (lang === 'en' || !t) return describeHazard(k, hazards[k]).label;
    const sev = hazardSeverity(k, hazards[k]);
    if (typeof sev.level !== 'number') return t('map.inZone');
    const v = t(`lvl.${sev.label}`); return v === `lvl.${sev.label}` ? sev.label : v;
  };
  const mapped = Object.keys(hazardNames).filter(k => hazards[k] && describeHazard(k, hazards[k]).tone === 'mapped').map(k => `${name(k)} (${level(k)})`);
  return mapped.length ? `<div class="warn"><b>${P[lang].mapped}</b> ${esc(mapped.join('; '))}. ${P[lang].planning}</div>` : '';
};

export const standardPrintouts = [
  { id: 'earthquake', title: 'Earthquake: Drop, Cover, Hold On', for: 'everyone' },
  { id: 'wildfire', title: 'Wildfire: Ready, Set, Go!', for: 'everyone' },
  { id: 'gobag', title: 'Go-bag checklist', for: 'everyone' },
  { id: 'shutoffs', title: 'Utility shutoffs', for: 'everyone' },
];
export const printoutTitle = (id, lang) => P[pick(lang)].titles[id];
export const businessPosterTitle = (name, lang) => P[pick(lang)].biz.title(name);

export function standardPrintout(id, { lang: requested } = {}) {
  const lang = pick(requested), X = P[lang], T = X.titles;
  if (id === 'earthquake') { const E = X.eq; return page(T.earthquake, '#7B2D8B', `
    <h2>${E.start}</h2><ol class="steps">
${E.steps.map(([word, rest], i) => `      <li><span class="big">${word}</span> ${rest}</li>`).join('\n')}</ol>
    <div class="grid"><div><h2>${E.doNot}</h2>${list(E.doNotList)}</div>
    <div><h2>${E.where}</h2>${list(E.whereList)}</div></div>
    <h2>${E.after}</h2>${list(E.afterList)}`, E.sub, lang); }
  if (id === 'wildfire') { const W = X.wf; return page(T.wildfire, '#B4502B', `
    <h2>${W.ready}</h2>${list(W.readyList)}
    <h2>${W.set}</h2>${list(W.setList)}
    <h2>${W.go}</h2><div class="box big">${W.goBox}</div>
    ${list(W.goList)}`, W.sub, lang); }
  if (id === 'gobag') { const G = X.gb; return page(T.gobag, '#1D5B4D', `<div class="grid">
    <div><h2>${G.person}</h2><ul class="tick">${G.personList.map(i => `<li>${i}</li>`).join('')}</ul></div>
    <div><h2>${G.house}</h2><ul class="tick">${G.houseList.map(i => `<li>${i}</li>`).join('')}</ul></div></div>
    <div class="box">${G.box}</div>`, G.sub, lang); }
  if (id === 'shutoffs') { const S = X.sh; return page(T.shutoffs, '#2E5A88', `
    <h2>${S.gas}</h2>${list(S.gasList)}
    <div class="field"><b>${S.meter}</b> ${blank('', '60%')}</div><div class="field"><b>${S.wrench}</b> ${blank('', '60%')}</div>
    <h2>${S.elec}</h2>${list(S.elecList)}
    <div class="field"><b>${S.breaker}</b> ${blank('', '60%')}</div>
    <h2>${S.water}</h2>${list(S.waterList)}
    <div class="field"><b>${S.valve}</b> ${blank('', '60%')}</div>
    <div class="warn">${S.warn}</div>`, S.sub, lang); }
  return null;
}

export function householdPlanPrintout({ name, address, hazards, household: h = {} }, { lang: requested, t } = {}) {
  const lang = pick(requested), H = P[lang].home;
  const members = [`${esc(name)} ${H.holder}`, ...(h.members || []).map(m => `${esc(m.name)} · ${H.ages[m.ageGroup] || esc(m.ageGroup)}${m.needsHelp ? ` · <b>${H.mayNeedHelp}</b>` : ''}`)];
  const pets = (h.pets || []).map(p => `${p.count} ${esc(p.kind)}${p.where ? ` (${H.usually(esc(p.where))})` : ''}`);
  return page(H.title, '#1D5B4D', `
    <div class="field"><b>${H.label}</b> ${blank(address)}</div>${mappedLine(hazards, lang, t)}
    <div class="grid"><div><h2>${H.who}</h2>${list(members)}${pets.length ? `<b>${H.pets}</b> ${pets.join('; ')}` : ''}</div>
    <div><h2>${H.separated}</h2>
      <div class="field"><b>${H.meetNear}</b><br>${blank(h.meetNear)}</div>
      <div class="field"><b>${H.meetFar}</b><br>${blank(h.meetFar)}</div>
      <div class="field"><b>${H.contact}</b><br>${blank(h.contact)}</div></div></div>
    <h2>${H.important}</h2>
    <div class="field"><b>${H.zone}</b> ${blank('', '40%')} <small>(protect.genasys.com)</small></div>
    <div class="field"><b>${H.utilities}</b> ${blank(h.utilities)}</div>
    <div class="field"><b>${H.help}</b> ${blank(h.assistance)}</div>
    <div class="field"><b>${H.doctor}</b> ${blank('')}</div>
    <h2>${H.leave}</h2><ol class="steps"><li>${H.leave1(pets.length > 0)}</li><li>${H.leave2}</li><li>${H.leave3}</li></ol>`, H.sub, lang);
}

export function businessPosterPrintout({ business: b = {}, address, hazards, name }, { lang: requested, t } = {}) {
  const lang = pick(requested), Z = P[lang].biz;
  const hazmatName = k => (lang !== 'en' && t ? t(`hz.${k}`) : (hazmatKinds.find(([key]) => key === k) || [k, k])[1]);
  const hazmat = (b.hazmat || []).length ? `<div class="warn"><b>${Z.hazmat}</b> ${esc(b.hazmat.map(hazmatName).join('; '))}${b.hazmatNote ? ` (${esc(b.hazmatNote)})` : ''}. ${Z.tell}</div>` : '';
  return page(Z.title(b.name), '#B3261A', `
    <div class="field"><b>${Z.address}</b> ${blank(address)}</div>${mappedLine(hazards, lang, t)}
    <h2>${Z.evac}</h2><ol class="steps">
      <li>${Z.ev1}</li>
      <li>${Z.ev2}</li>
      <li>${Z.ev3} <span class="big">${blank(b.assembly, '45%')}</span></li>
      <li>${Z.ev4}</li></ol>
    <div class="grid"><div><h2>${Z.contact}</h2><div class="field"><b>${Z.name}</b> ${blank(b.contactName || name)}</div><div class="field"><b>${Z.phone}</b> ${blank(b.contactPhone)}</div></div>
    <div><h2>${Z.know}</h2><div class="field"><b>${Z.extinguishers}</b> ${blank('')}</div><div class="field"><b>${Z.firstAid}</b> ${blank('')}</div><div class="field"><b>${Z.utilities}</b> ${blank(b.utilities)}</div></div></div>
    ${hazmat}
    <div class="box">${Z.box}</div>`, Z.sub, lang);
}
