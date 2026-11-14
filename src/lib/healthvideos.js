// Our own patient-education videos from the Debuggers Space Health YouTube channel.
// Every clinic gets them in its Education library; a dental clinic sees only the dental ones.
// checked: false means the reviewing doctor has not approved it yet, so only the reviewing
// clinic and the demo spaces see it.
export const HEALTH_CHANNEL = 'https://www.youtube.com/@DebuggersSpaceHealth'
const REVIEW_CLINICS = ['drmourya']

export const HEALTH_VIDEOS = [
  { id: 'DSH-RCT-EN', title: 'Root canal treatment explained', procedure: 'Root canal treatment', speciality: 'Dental', topic: 'Endodontics', lang: 'English', minutes: 2, url: 'https://youtu.be/qal7LN-3D_A', checked: false },
].map((v) => ({ ...v, source: 'Debuggers Space Health', builtIn: true }))

const isSearch = (url = '') => url.includes('/results?')

// The clinic's own videos plus ours. A starter "search YouTube" item is hidden once we have a real video for that treatment.
export function withHealthVideos(tenant, own) {
  const dental = /dental/i.test(tenant.kind || '')
  const ours = HEALTH_VIDEOS
    .filter((v) => !dental || v.speciality === 'Dental')
    .filter((v) => v.checked || !tenant.server || REVIEW_CLINICS.includes(tenant.slug))
  const covered = new Set(ours.map((v) => v.procedure.toLowerCase()))
  const urls = new Set(own.map((v) => v.url))
  return [
    ...ours.filter((v) => !urls.has(v.url)),
    ...own.filter((v) => !(isSearch(v.url) && covered.has(`${v.procedure}`.toLowerCase()))),
  ]
}
