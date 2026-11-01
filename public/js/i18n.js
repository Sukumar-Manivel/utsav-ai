// Words the helper app shows in English and Tamil, red flags per category,
// and a one-line hint for each kind of step.
import { fmtLong } from './util.js';

export const CAT_TA = { venue: 'மண்டபம்', food: 'உணவு', decor: 'அலங்காரம்', guests: 'விருந்தினர்', transport: 'போக்குவரத்து', entertainment: 'கேளிக்கை', photos: 'புகைப்படம்', music: 'இசை' };
export const FLAGS = {
  venue: { en: ['Extra charge for overtime after the event', 'Generator and cleaning billed separately', 'Deposit refund rules not written'], ta: ['நிகழ்ச்சிக்குப் பின் கூடுதல் நேரக் கட்டணம்', 'ஜெனரேட்டர், சுத்தம் தனியாக வசூல்', 'முன்பணத் திருப்பி விதிகள் எழுத்தில் இல்லை'] },
  food: { en: ['Hidden travel or gas charge', 'More than 30% advance', 'No written per-plate quote'], ta: ['மறைமுக பயண அல்லது எரிவாயு கட்டணம்', '30%-க்கு மேல் முன்பணம்', 'எழுத்துப்பூர்வ தட்டு விலை இல்லை'] },
  decor: { en: ['Fresh flowers not in the quote', 'Setup may start late', 'Power backup for lights unclear'], ta: ['புதிய பூக்கள் விலையில் இல்லை', 'அமைப்பு தாமதமாகத் தொடங்கலாம்', 'விளக்குகளுக்கு மின் காப்பு தெளிவில்லை'] },
  guests: { en: ['Printer delivery date not written', 'Some guests have no address', 'Return gift count not confirmed'], ta: ['அச்சக டெலிவரி தேதி எழுத்தில் இல்லை', 'சில விருந்தினர்களின் முகவரி இல்லை', 'திருப்பி பரிசு எண்ணிக்கை உறுதியாகவில்லை'] },
  transport: { en: ['Waiting charge after free time', 'Late-night surcharge', 'Driver names and numbers missing'], ta: ['இலவச நேரத்திற்குப் பின் காத்திருப்புக் கட்டணம்', 'இரவு நேரக் கூடுதல் கட்டணம்', 'ஓட்டுநர் பெயர், எண் இல்லை'] },
  entertainment: { en: ['Overtime billed per hour', 'Sound system not included', 'Song list not agreed in advance'], ta: ['கூடுதல் நேரத்திற்கு மணிக்குக் கட்டணம்', 'ஒலி அமைப்பு சேர்க்கப்படவில்லை', 'பாடல் பட்டியல் முன்பே முடிவாகவில்லை'] },
  photos: { en: ['Album delivery date not written', 'Raw photos cost extra', 'Drone permission not included'], ta: ['ஆல்பம் தேதி எழுத்தில் இல்லை', 'மூல புகைப்படங்களுக்கு கூடுதல் கட்டணம்', 'ட்ரோன் அனுமதி சேர்க்கப்படவில்லை'] },
  music: { en: ['Travel charge for the troupe', 'Overtime billed per hour', 'Power for the sound system not included'], ta: ['குழுவின் பயணக் கட்டணம்', 'கூடுதல் நேரத்திற்கு மணிக்குக் கட்டணம்', 'ஒலி அமைப்பு மின்சாரம் சேர்க்கப்படவில்லை'] },
};
export const T = {
  en: {
    greet: 'Vanakkam', tag: 'Big days happen with small steps', cap: 'Budget cap', left: 'days left', status: 'Status',
    now: 'Do this now', start: 'Start calling', mark: 'Mark as done', steps: 'Your steps', near: (c) => `Top ${c.toLowerCase()} options near you`,
    flags: 'Watch out for these', ask: (c) => `Ask Utsav about ${c.toLowerCase()}`, type: 'Type or speak your question',
    family: 'Family progress', view: 'View only. You can change only your own task.', alldone: 'Your part is complete',
    alldoneP: 'The host can see it on the family orbit. Thank you!', quote: 'Best quote so far (₹)', notes: 'Notes for the host', save: 'Save',
    myTask: 'My task', vendors: 'Vendors', askShort: 'Ask', call: 'Call', viewBtn: 'View', mine: 'Quotes and notes',
    chips: ['What is a fair price?', 'How much advance is okay?', 'How do I compare quotes?'],
    hint: 'Use the call script so every vendor gets the same questions, and ask for the price in writing.',
    words: { ok: 'On track', done: 'Done', soon: 'Due soon', late: 'Overdue' }, aiNote: 'Answers only about your task.',
    qs: (d) => [`Are you free on ${d}?`, 'What exactly is included in the price?', 'Any extra charges: travel, overtime, staff?', 'How much advance do you take?', 'Can you send the full quote on WhatsApp?'],
    script: (e, c) => `Vanakkam, I'm calling about ${e.title} on ${fmtLong(e.date)} in ${e.city}, for about ${e.guests} guests. I'm looking after the ${c.toLowerCase()} arrangements. Are you free on that date? What is included in your price, and are there any extra charges? How much advance do you take? Could you send the full quote on WhatsApp?`,
  },
  ta: {
    greet: 'வணக்கம்', tag: 'சிறிய படிகள், பெரிய நாள்', cap: 'பட்ஜெட் வரம்பு', left: 'நாட்கள் உள்ளன', status: 'நிலை',
    now: 'இப்போது செய்யுங்கள்', start: 'அழைக்கத் தொடங்கு', mark: 'முடிந்தது', steps: 'உங்கள் படிகள்', near: () => 'அருகிலுள்ள சிறந்த விருப்பங்கள்',
    flags: 'இவற்றைக் கவனியுங்கள்', ask: () => 'உத்சவிடம் கேளுங்கள்', type: 'கேள்வியை எழுதுங்கள் அல்லது பேசுங்கள்',
    family: 'குடும்ப முன்னேற்றம்', view: 'பார்வை மட்டும். உங்கள் பணியை மட்டுமே மாற்றலாம்.', alldone: 'உங்கள் பணி முடிந்தது',
    alldoneP: 'குடும்பத்தினர் இதைப் பார்க்கலாம். நன்றி!', quote: 'இதுவரை சிறந்த விலை (₹)', notes: 'உரிமையாளருக்கான குறிப்புகள்', save: 'சேமி',
    myTask: 'என் பணி', vendors: 'விற்பனையாளர்', askShort: 'கேள்', call: 'அழை', viewBtn: 'பார்', mine: 'விலை மற்றும் குறிப்புகள்',
    chips: ['நியாயமான விலை என்ன?', 'எவ்வளவு முன்பணம் சரி?', 'விலைகளை ஒப்பிடுவது எப்படி?'],
    hint: 'ஒவ்வொருவரிடமும் ஒரே கேள்விகளைக் கேட்க அழைப்பு உரையைப் பயன்படுத்துங்கள். விலையை எழுத்தில் வாங்குங்கள்.',
    words: { ok: 'சரியான பாதை', done: 'முடிந்தது', soon: 'விரைவில்', late: 'தாமதம்' }, aiNote: 'உங்கள் பணி பற்றி மட்டும் பதில்.',
    qs: (d) => [`${d} அன்று நீங்கள் கிடைப்பீர்களா?`, 'விலையில் என்னென்ன அடங்கும்?', 'பயணம், கூடுதல் நேரம், பணியாளர் கட்டணம் உண்டா?', 'முன்பணம் எவ்வளவு?', 'முழு விலையை வாட்ஸ்அப்பில் அனுப்ப முடியுமா?'],
    script: (e, c, id) => `வணக்கம், ${fmtLong(e.date)} அன்று ${e.city}-இல் நடக்கும் ${e.title} நிகழ்ச்சிக்காக அழைக்கிறேன். சுமார் ${e.guests} பேர் வருவார்கள். ${CAT_TA[id] || c} ஏற்பாடுகளை நான் பார்த்துக்கொள்கிறேன். அன்று நீங்கள் கிடைப்பீர்களா? விலையில் என்னென்ன அடங்கும், கூடுதல் கட்டணம் ஏதேனும் உண்டா? முன்பணம் எவ்வளவு? முழு விலையை வாட்ஸ்அப்பில் அனுப்ப முடியுமா?`,
  },
};
export function stepHint(t) {
  t = t.toLowerCase();
  if (/review|compare|shortlist/.test(t)) return 'Compare menus, reviews and pricing to choose your top 2.';
  if (/book|confirm|pay|advance/.test(t)) return 'Get the full quote on WhatsApp first, then pay a 20–30% advance.';
  if (/send|invite/.test(t)) return 'Send the WhatsApp invite to everyone still on the list.';
  if (/call|quote/.test(t)) return 'Use the call script so every vendor gets the same questions.';
  return 'Tick it off once it is done so the family sees progress.';
}
