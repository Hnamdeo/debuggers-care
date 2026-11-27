// Our own patient-education videos, on the Debuggers Space YouTube channel (playlist "Patient Education: Dental").
// Every clinic gets them in its Education library; a dental clinic sees only the dental ones.
// checked: true once the reviewing doctor has approved the video.
// Procedure-first videos (animation from second 0) replace the older what/why explainers.
// Ids stay stable when a video moves, because patients' shared links and visit records store them.
export const HEALTH_CHANNEL = 'https://www.youtube.com/playlist?list=PLIGFikRElL20'
const SOURCE = 'Debuggers Space'

// Sections on the Education page, in this order.
export const SECTIONS = ['Root canal', 'Implants', 'Extraction & wisdom teeth', 'Fillings', 'Crowns & bridges', 'Braces & aligners', 'Dentures', 'Cleaning & gum care', 'Smile & cosmetic', 'Children', 'Brushing & prevention']
const SECTION_OF = { 'Root canal treatment': 'Root canal', 'Scaling & polishing': 'Cleaning & gum care', 'Tooth extraction': 'Extraction & wisdom teeth', 'Composite filling': 'Fillings', 'Dental implant': 'Implants', 'Crown (ceramic)': 'Crowns & bridges', 'Braces': 'Braces & aligners', 'Wisdom tooth removal': 'Extraction & wisdom teeth' }

export const HEALTH_VIDEOS = [
  { id: 'DSH-XVVuat6kkdM', title: 'How a Root Canal Is Done, Step by Step', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 1, url: 'https://youtu.be/_oknDnN66a8', checked: false },
  { id: 'DSH-RHjrXL4woGY', title: 'रूट कैनाल कैसे होता है? स्टेप बाय स्टेप', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'Hindi', minutes: 1.3, url: 'https://youtu.be/olduM7xm9Lw', checked: false },
  { id: 'DSH-xA2V6YRWF9E', title: 'How Teeth Cleaning (Scaling) Is Done, Step by Step', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'English', minutes: 0.7, url: 'https://youtu.be/xA2V6YRWF9E', checked: false },
  { id: 'DSH-BPlO7M2Y4jQ', title: 'दाँतों की सफ़ाई (स्केलिंग) कैसे होती है?', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'Hindi', minutes: 0.9, url: 'https://youtu.be/BPlO7M2Y4jQ', checked: false },
  { id: 'DSH-qw_hDU2mUQo', title: 'How a Tooth Is Removed, Step by Step', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'English', minutes: 0.8, url: 'https://youtu.be/qw_hDU2mUQo', checked: false },
  { id: 'DSH-w48i7IReCzQ', title: 'दाँत कैसे निकाला जाता है? स्टेप बाय स्टेप', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'Hindi', minutes: 1.1, url: 'https://youtu.be/w48i7IReCzQ', checked: false },
  { id: 'DSH-kT8ptNI9_eQ', title: 'How a Dental Filling Is Done, Step by Step', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'English', minutes: 0.6, url: 'https://youtu.be/kT8ptNI9_eQ', checked: false },
  { id: 'DSH-eaUZaY3hPkk', title: 'दाँत की फ़िलिंग कैसे होती है? स्टेप बाय स्टेप', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'Hindi', minutes: 0.8, url: 'https://youtu.be/eaUZaY3hPkk', checked: false },
  // 27 Nov 2026: our own videos replace the other channels' ones for these treatments.
  { id: 'DSH-vF9qqc0ysMM', title: 'How a Dental Implant Is Placed, Step by Step', procedure: 'Dental implant', speciality: 'Dental', topic: 'Implantology', lang: 'English', minutes: 0.9, url: 'https://youtu.be/vF9qqc0ysMM', checked: false },
  { id: 'DSH-yHxjH-E7rTE', title: 'डेंटल इम्प्लांट कैसे लगता है? स्टेप बाय स्टेप', procedure: 'Dental implant', speciality: 'Dental', topic: 'Implantology', lang: 'Hindi', minutes: 1.2, url: 'https://youtu.be/yHxjH-E7rTE', checked: false },
  { id: 'DSH-0UsdEhgNemo', title: 'How a Dental Crown (Cap) Is Done, Step by Step', procedure: 'Crown (ceramic)', speciality: 'Dental', topic: 'Prosthodontics', lang: 'English', minutes: 0.7, url: 'https://youtu.be/0UsdEhgNemo', checked: false },
  { id: 'DSH-pS3YIiMRlK4', title: 'दाँत पर कैप (क्राउन) कैसे लगती है? स्टेप बाय स्टेप', procedure: 'Crown (ceramic)', speciality: 'Dental', topic: 'Prosthodontics', lang: 'Hindi', minutes: 0.9, url: 'https://youtu.be/pS3YIiMRlK4', checked: false },
  { id: 'DSH-PUv4Cq8wlro', title: 'How Braces Straighten Teeth, Step by Step', procedure: 'Braces', speciality: 'Dental', topic: 'Orthodontics', lang: 'English', minutes: 0.8, url: 'https://youtu.be/PUv4Cq8wlro', checked: false },
  { id: 'DSH-mJTR-GxGJyA', title: 'ब्रेसेस से दाँत सीधे कैसे होते हैं? स्टेप बाय स्टेप', procedure: 'Braces', speciality: 'Dental', topic: 'Orthodontics', lang: 'Hindi', minutes: 1, url: 'https://youtu.be/mJTR-GxGJyA', checked: false },
  { id: 'DSH-4jN2r8RtHPE', title: 'How a Wisdom Tooth Is Removed, Step by Step', procedure: 'Wisdom tooth removal', speciality: 'Dental', topic: 'Oral surgery', lang: 'English', minutes: 0.8, url: 'https://youtu.be/4jN2r8RtHPE', checked: false },
  { id: 'DSH-V-s0mBVVc2k', title: 'अक्कल दाढ़ कैसे निकाली जाती है? स्टेप बाय स्टेप', procedure: 'Wisdom tooth removal', speciality: 'Dental', topic: 'Oral surgery', lang: 'Hindi', minutes: 1, url: 'https://youtu.be/V-s0mBVVc2k', checked: false },
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
export const findOldVideo = (id) => OLD_HEALTH_VIDEOS.find((v) => v.id === id)

const isSearch = (url = '') => url.includes('/results?')

// The clinic's own videos plus ours. A starter "search YouTube" item is hidden once we have a real video for that treatment.
export function withHealthVideos(tenant, own) {
  const dental = /dental/i.test(tenant.kind || '')
  const ours = HEALTH_VIDEOS
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
