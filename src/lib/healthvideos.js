// Our own patient-education videos, on the Debuggers Space YouTube channel (playlist "Patient Education: Dental").
// Every clinic gets them in its Education library; a dental clinic sees only the dental ones.
// checked: true once the reviewing doctor has approved the video.
// Procedure-first videos (animation from second 0) replace the older what/why explainers.
// Ids stay stable when a video moves, because patients' shared links and visit records store them.
export const HEALTH_CHANNEL = 'https://www.youtube.com/playlist?list=PLIGFikRElL20'
const SOURCE = 'Debuggers Space'

// Sections on the Education page, in this order.
export const SECTIONS = ['Root canal', 'Implants', 'Extraction & wisdom teeth', 'Fillings', 'Crowns & bridges', 'Braces & aligners', 'Dentures', 'Cleaning & gum care', 'Smile & cosmetic', 'Children', 'Brushing & prevention']
const SECTION_OF = { 'Root canal treatment': 'Root canal', 'Scaling & polishing': 'Cleaning & gum care', 'Tooth extraction': 'Extraction & wisdom teeth', 'Composite filling': 'Fillings' }

export const HEALTH_VIDEOS = [
  { id: 'DSH-XVVuat6kkdM', title: 'How a Root Canal Is Done, Step by Step', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 1, url: 'https://youtu.be/_oknDnN66a8', checked: false },
  { id: 'DSH-RHjrXL4woGY', title: 'रूट कैनाल कैसे होता है? स्टेप बाय स्टेप', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'Hindi', minutes: 1.3, url: 'https://youtu.be/olduM7xm9Lw', checked: false },
  { id: 'DSH-xA2V6YRWF9E', title: 'How Teeth Cleaning (Scaling) Is Done, Step by Step', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'English', minutes: 0.7, url: 'https://youtu.be/xA2V6YRWF9E', checked: false },
  { id: 'DSH-BPlO7M2Y4jQ', title: 'दाँतों की सफ़ाई (स्केलिंग) कैसे होती है?', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'Hindi', minutes: 0.9, url: 'https://youtu.be/BPlO7M2Y4jQ', checked: false },
  { id: 'DSH-qw_hDU2mUQo', title: 'How a Tooth Is Removed, Step by Step', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'English', minutes: 0.8, url: 'https://youtu.be/qw_hDU2mUQo', checked: false },
  { id: 'DSH-w48i7IReCzQ', title: 'दाँत कैसे निकाला जाता है? स्टेप बाय स्टेप', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'Hindi', minutes: 1.1, url: 'https://youtu.be/w48i7IReCzQ', checked: false },
  { id: 'DSH-kT8ptNI9_eQ', title: 'How a Dental Filling Is Done, Step by Step', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'English', minutes: 0.6, url: 'https://youtu.be/kT8ptNI9_eQ', checked: false },
  { id: 'DSH-eaUZaY3hPkk', title: 'दाँत की फ़िलिंग कैसे होती है? स्टेप बाय स्टेप', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'Hindi', minutes: 0.8, url: 'https://youtu.be/eaUZaY3hPkk', checked: false },
].map((v) => ({ ...v, source: SOURCE, builtIn: true, section: SECTION_OF[v.procedure] }))

// Older what/why explainers, replaced above. Kept so videos already shared with patients still open.
// The ones not yet moved still play from the old channel (moving the rest on 17 Nov 2026).
export const OLD_HEALTH_VIDEOS = [
  { id: 'DSH-qal7LN-3D_A', title: 'Root Canal Treatment Explained Simply', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 2.2, url: 'https://youtu.be/_5-dmXKOpPE' },
  { id: 'DSH-jvYENb63wXI', title: 'रूट कैनाल ट्रीटमेंट क्या है?', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'Hindi', minutes: 2.9, url: 'https://youtu.be/fhSLL8hKezU' },
  { id: 'DSH-C1gCOQsxxSI', title: 'Scaling (Teeth Cleaning) Explained', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'English', minutes: 1.6, url: 'https://youtu.be/II9uWbVSYbo' },
  { id: 'DSH-XMz4CIed-2A', title: 'स्केलिंग (दाँतों की सफ़ाई) क्या है?', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'Hindi', minutes: 2.4, url: 'https://youtu.be/3y8XKIV1s2w' },
  { id: 'DSH-C4d8p0anLKU', title: 'Tooth Extraction Explained', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'English', minutes: 1.5, url: 'https://youtu.be/MukJMFNL5oc' },
  { id: 'DSH-GsiOZP4YRv8', title: 'दाँत निकलवाना: क्या होता है और बाद में क्या करें?', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'Hindi', minutes: 2.0, url: 'https://youtu.be/Y9ZuXB1MS8k' },
  { id: 'DSH-ENhAaTxOtTo', title: 'Dental Filling Explained', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'English', minutes: 1.4, url: 'https://youtu.be/CtNpg38gnpc' },
  { id: 'DSH-mTSZkdI6ubQ', title: 'दाँत की फ़िलिंग: कैविटी क्या है?', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'Hindi', minutes: 1.9, url: 'https://youtu.be/5oQlHkBthMU' },
].map((v) => ({ ...v, source: SOURCE, builtIn: true }))
// Hand-picked videos from other YouTube channels (dental animation studios, hospitals and dentists),
// so every section has something to show. Each "card" pairs an English and a Hindi video.
// minutes left out where we have not timed the video.
const C = (card, section, procedure, topic, lang, id, title, source, minutes) => ({ id: `YT-${id}`, card, section, procedure, speciality: 'Dental', topic, lang, url: `https://youtu.be/${id}`, title, source, minutes, builtIn: true, curated: true })
export const CURATED_VIDEOS = [
  C('rct-2', 'Root canal', 'Root canal treatment', 'Endodontics', 'English', '0s35QCFg7p0', 'Root Canal Treatment, Step by Step Animation', 'Dr Jignesh Mehta', 1.8),
  C('rct-2', 'Root canal', 'Root canal treatment', 'Endodontics', 'Hindi', 'sjvLy9vCS9k', 'RCT in Hindi: what is root canal treatment?', 'Easy Dentistry', 3.4),
  C('rct-3', 'Root canal', 'Root canal treatment', 'Endodontics', 'English', 'wZ1MtdkkZXg', 'Root Canal Treatment (3D animation)', 'Scientific Animations', 1.6),
  C('implant-1', 'Implants', 'Dental implant', 'Implantology', 'English', 'gMycqoQrlBs', 'Dental Implant Procedure, Two Stage', 'Consult-PRO', 1.5),
  C('implant-1', 'Implants', 'Dental implant', 'Implantology', 'Hindi', 'N_8htjuGeC4', 'डेंटल इम्प्लांट | Dental Implant in Hindi', 'Dr Amit Patil', 1.6),
  C('implant-2', 'Implants', 'Dental implant', 'Implantology', 'English', 'g-i3P-D6p7M', 'Dental Implant Procedure, Medical Animation', 'Gebrüder Betz Medical Animation', 5.7),
  C('implant-2', 'Implants', 'Dental implant', 'Implantology', 'Hindi', 'Wq85QQEayow', 'Dental Implant Procedure Step by Step in Hindi', 'Eledent Dental Hospitals'),
  C('implant-3', 'Implants', 'Implant or bridge', 'Implantology', 'English', 'kT68nibzonY', 'Dental Implants vs Bridges for Missing Teeth', 'Gebrüder Betz Medical Animation', 5.7),
  C('ext-1', 'Extraction & wisdom teeth', 'Tooth extraction', 'Oral surgery', 'English', 'RIhr32Ko-uY', 'Tooth Extraction (3D Animation)', 'Riverside Oral Surgery', 0.3),
  C('wisdom-1', 'Extraction & wisdom teeth', 'Impacted tooth extraction', 'Oral surgery', 'English', 'fqoD3l_yvos', 'Impacted Wisdom Teeth Removal Animation', 'Smash-Hit Solutions', 4.1),
  C('wisdom-1', 'Extraction & wisdom teeth', 'Impacted tooth extraction', 'Oral surgery', 'Hindi', 'xEoC24RzFx0', 'अक्कल दाढ़ निकलवाएँ या नहीं? Wisdom teeth', 'Dr. Bhadage’s Shree Dental Clinic', 2.1),
  C('wisdom-2', 'Extraction & wisdom teeth', 'Impacted tooth extraction', 'Oral surgery', 'English', 'MmRGCqqCt6s', 'Wisdom Teeth Removal Explained (3D)', 'Health Decide'),
  C('crown-1', 'Crowns & bridges', 'Crown (ceramic)', 'Prosthodontics', 'English', 'VXTJPFRzkvk', 'Dental Crown Procedure', 'Dental Health Society', 2.1),
  C('crown-1', 'Crowns & bridges', 'Crown (ceramic)', 'Prosthodontics', 'Hindi', 'EhSVT3SIU0A', 'क्या आपको Dental Crown लगवाना चाहिए?', 'Dr. Navita Sharma', 4.6),
  C('bridge-1', 'Crowns & bridges', 'Dental bridge', 'Prosthodontics', 'English', 'V5sOfs_R0AA', 'How Does a Dental Bridge Work? 3D Animation', 'Dentalk!', 1.3),
  C('braces-1', 'Braces & aligners', 'Braces adjustment', 'Orthodontics', 'English', 'TagMnBFU4UY', 'How Do Braces Move Your Teeth?', 'DentalVision3D', 2),
  C('braces-1', 'Braces & aligners', 'Braces adjustment', 'Orthodontics', 'Hindi', 'OXs-Dogx2jQ', 'How Do Braces Work (Hindi)', 'Orthodontic animation'),
  C('braces-2', 'Braces & aligners', 'Braces', 'Orthodontics', 'Hindi', 'pYup0XEfmzM', 'ब्रेसेस लगवाने से पहले जानने योग्य 10 बातें', 'Family Dental Clinic'),
  C('aligner-1', 'Braces & aligners', 'Clear aligners', 'Orthodontics', 'English', '_qoimCQ7O7k', 'How Clear Aligners Work, Step by Step', 'Curveia Dental Animation'),
  C('denture-1', 'Dentures', 'Complete denture', 'Prosthodontics', 'Hindi', 'M0jySLUHZ-U', 'नकली दांत (denture) कैसे बनते हैं', 'SmileWithDrNeetu', 8.3),
  C('denture-2', 'Dentures', 'Implant-supported denture', 'Prosthodontics', 'English', 'uiSVd2kx9ag', 'Implant Supported Denture Procedure', 'Apollo Medical Travel'),
  C('denture-3', 'Dentures', 'Denture care', 'Prosthodontics', 'Hindi', '_MGSBHeDl0Y', 'नकली दाँतों की सफ़ाई कैसे करें', 'SmileWithDrNeetu'),
  C('gum-1', 'Cleaning & gum care', 'Gum disease', 'Periodontics', 'English', '22KTcqBEXtc', 'Periodontitis: Gum Disease', 'Triangle Dental', 1),
  C('gum-1', 'Cleaning & gum care', 'Gum disease', 'Periodontics', 'Hindi', 'gOnOFnHvWIw', 'पायरिया: लक्षण और इलाज', 'Swasthya Plus Hindi'),
  C('flap-1', 'Cleaning & gum care', 'Flap surgery', 'Periodontics', 'English', 'MY6EVADIBcE', 'Periodontal Flap Surgery', 'Lapointe Dental Centres', 2.4),
  C('white-1', 'Smile & cosmetic', 'Teeth whitening', 'Cosmetic', 'English', '9iCUMh7gRRQ', 'How Teeth Whitening Works', 'Ultradent Products', 5),
  C('veneer-1', 'Smile & cosmetic', 'Veneers', 'Cosmetic', 'English', 'mAQ95sC2m_o', 'Veneers Process Animation', 'Reigate Dental Centre', 0.8),
  C('kids-1', 'Children', 'Pulpectomy (milk tooth)', 'Paediatric dentistry', 'English', 's8QKc8QNY2A', 'Why Your Child’s Tooth Needs a Pulpectomy', 'Sparkle Dental', 1.1),
  C('kids-2', 'Children', 'Pit and fissure sealant', 'Paediatric dentistry', 'English', 'qGpSejMuhQg', 'Seal It Before Decay Starts', 'Surgery in Seconds', 0.6),
  C('brush-1', 'Brushing & prevention', 'Brushing', 'Prevention', 'English', 'BapR9J86ZZw', 'How to Brush Your Teeth', 'NHS England', 2.2),
  C('brush-1', 'Brushing & prevention', 'Brushing', 'Prevention', 'Hindi', 'z4QHVVgtfDk', 'दांतों की सफाई करने का सही तरीका', 'Dr. Maithili Deshpande', 5.9),
  C('brush-2', 'Brushing & prevention', 'Brushing', 'Prevention', 'Hindi', 'nPtuHlJCmAI', 'दांत साफ़ करने के लिए क्या करें (World Oral Health Day)', 'BBC News Hindi', 4.6),
]

export const findOldVideo = (id) => OLD_HEALTH_VIDEOS.find((v) => v.id === id)

const isSearch = (url = '') => url.includes('/results?')

// The clinic's own videos plus ours. A starter "search YouTube" item is hidden once we have a real video for that treatment.
export function withHealthVideos(tenant, own) {
  const dental = /dental/i.test(tenant.kind || '')
  const ours = [...HEALTH_VIDEOS, ...(dental ? CURATED_VIDEOS : [])]
    .filter((v) => !dental || v.speciality === 'Dental')
  const covered = new Set(ours.map((v) => v.procedure.toLowerCase()))
  const urls = new Set(own.map((v) => v.url))
  return [
    ...ours.filter((v) => !urls.has(v.url)),
    ...own.filter((v) => !(isSearch(v.url) && covered.has(`${v.procedure}`.toLowerCase()))),
  ]
}

// One card per treatment: the Hindi and English versions of our videos share a card and a thumbnail.
const LANG_ORDER = { English: 0, Hindi: 1 }
export function groupByLanguage(rows) {
  const groups = new Map()
  for (const v of rows) {
    const key = v.card || (v.builtIn && v.procedure ? `${v.speciality}|${v.procedure}` : v.id)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(v)
  }
  return [...groups.values()].map((items) => {
    items.sort((a, b) => (LANG_ORDER[a.lang] ?? 9) - (LANG_ORDER[b.lang] ?? 9))
    return { main: items[0], items }
  })
}
