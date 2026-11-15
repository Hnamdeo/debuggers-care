// Our own patient-education videos from the Debuggers Space Health YouTube channel.
// Every clinic gets them in its Education library; a dental clinic sees only the dental ones.
// checked: true once the reviewing doctor has approved the video.
// Procedure-first videos (animation from second 0) replace the older what/why explainers as they arrive.
export const HEALTH_CHANNEL = 'https://www.youtube.com/@DebuggersSpaceHealth'

export const HEALTH_VIDEOS = [
  { id: 'DSH-XVVuat6kkdM', title: 'How a Root Canal Is Done, Step by Step', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 1, url: 'https://youtu.be/XVVuat6kkdM', checked: false },
  { id: 'DSH-RHjrXL4woGY', title: 'रूट कैनाल कैसे होता है? स्टेप बाय स्टेप', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'Hindi', minutes: 1.3, url: 'https://youtu.be/RHjrXL4woGY', checked: false },
  { id: 'DSH-C1gCOQsxxSI', title: 'Scaling (Teeth Cleaning) Explained', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'English', minutes: 1.6, url: 'https://youtu.be/C1gCOQsxxSI', checked: false },
  { id: 'DSH-XMz4CIed-2A', title: 'स्केलिंग (दाँतों की सफ़ाई) क्या है?', procedure: 'Scaling & polishing', speciality: 'Dental', topic: 'Periodontics', lang: 'Hindi', minutes: 2.4, url: 'https://youtu.be/XMz4CIed-2A', checked: false },
  { id: 'DSH-C4d8p0anLKU', title: 'Tooth Extraction Explained', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'English', minutes: 1.5, url: 'https://youtu.be/C4d8p0anLKU', checked: false },
  { id: 'DSH-GsiOZP4YRv8', title: 'दाँत निकलवाना: क्या होता है और बाद में क्या करें?', procedure: 'Tooth extraction', speciality: 'Dental', topic: 'Oral surgery', lang: 'Hindi', minutes: 2.0, url: 'https://youtu.be/GsiOZP4YRv8', checked: false },
  { id: 'DSH-ENhAaTxOtTo', title: 'Dental Filling Explained', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'English', minutes: 1.4, url: 'https://youtu.be/ENhAaTxOtTo', checked: false },
  { id: 'DSH-mTSZkdI6ubQ', title: 'दाँत की फ़िलिंग: कैविटी क्या है?', procedure: 'Composite filling', speciality: 'Dental', topic: 'Restorative', lang: 'Hindi', minutes: 1.9, url: 'https://youtu.be/mTSZkdI6ubQ', checked: false },
].map((v) => ({ ...v, source: 'Debuggers Space Health', builtIn: true }))

// Older what/why explainers, replaced above. Kept so videos already shared with patients still open.
export const OLD_HEALTH_VIDEOS = [
  { id: 'DSH-qal7LN-3D_A', title: 'Root Canal Treatment Explained Simply', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 2.2, url: 'https://youtu.be/qal7LN-3D_A' },
  { id: 'DSH-jvYENb63wXI', title: 'रूट कैनाल ट्रीटमेंट क्या है?', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'Hindi', minutes: 2.9, url: 'https://youtu.be/jvYENb63wXI' },
].map((v) => ({ ...v, source: 'Debuggers Space Health', builtIn: true }))
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
    const key = v.builtIn && v.procedure ? `${v.speciality}|${v.procedure}` : v.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(v)
  }
  return [...groups.values()].map((items) => {
    items.sort((a, b) => (LANG_ORDER[a.lang] ?? 9) - (LANG_ORDER[b.lang] ?? 9))
    return { main: items[0], items }
  })
}
