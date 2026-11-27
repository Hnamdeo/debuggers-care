// Hindi lines for the prescription, so the patient can read how to take each medicine.
// Only fixed phrases are translated (timings, doses, common advice); medicine names stay as written.

const FREQ = [
  [/twice a day after food/i, 'दिन में 2 बार, खाने के बाद'],
  [/three times|1-1-1|\btds\b|\btid\b/i, 'दिन में 3 बार (सुबह, दोपहर, रात)'],
  [/twice|1-0-1|\bbd\b|\bbid\b/i, 'दिन में 2 बार (सुबह और रात)'],
  [/before breakfast/i, 'सुबह नाश्ते से पहले'],
  [/once a week/i, 'हफ्ते में 1 बार'],
  [/at night|0-0-1|\bhs\b|bedtime/i, 'रात को सोते समय'],
  [/once a day|1-0-0|\bod\b|daily/i, 'दिन में 1 बार (सुबह)'],
  [/when needed|\bsos\b|\bprn\b/i, 'ज़रूरत होने पर (दर्द हो तब)'],
  [/four times|1-1-1-1|\bqid\b/i, 'दिन में 4 बार'],
]

export function hiFreq(f) {
  const hit = FREQ.find(([re]) => re.test(f || ''))
  return hit ? hit[1] : ''
}

export function hiDose(d) {
  const s = String(d || '').trim()
  let m = s.match(/^(\d+(?:\.\d+)?|½|1\/2)\s*(tab|tablet)s?$/i)
  if (m) return `${m[1] === '1/2' || m[1] === '0.5' ? 'आधी' : m[1]} गोली`
  m = s.match(/^(\d+)\s*(cap|capsule)s?$/i)
  if (m) return `${m[1]} कैप्सूल`
  m = s.match(/^(\d+(?:\.\d+)?)\s*ml$/i)
  if (m) return `${m[1]} ml`
  m = s.match(/^(\d+)\s*drops?$/i)
  if (m) return `${m[1]} बूँद`
  if (/^apply/i.test(s)) return 'लगाएँ'
  if (/^(\d+)\s*puffs?$/i.test(s)) return `${s.match(/\d+/)[0]} पफ़`
  return ''
}

export const hiDays = (n) => (+n > 0 ? `${n} दिन तक` : '')

// One Hindi line for a medicine: "1 गोली · दिन में 2 बार (सुबह और रात) · 5 दिन तक"
export function hiMed(it) {
  return [hiDose(it.dose), hiFreq(it.freq), hiDays(it.days)].filter(Boolean).join(' · ')
}

const ADVICE = {
  'take medicines after food': 'दवाइयाँ खाना खाने के बाद लें',
  'avoid hard and sticky food': 'सख्त और चिपचिपा खाना न खाएँ',
  'warm salt water rinse 3 times a day': 'दिन में 3 बार गुनगुने नमक के पानी से कुल्ला करें',
  'do not spit or rinse for 24 hours': '24 घंटे तक थूकें या कुल्ला न करें',
  'soft, cold diet today': 'आज नरम और ठंडा खाना लें',
  'brush twice a day with a soft brush': 'नरम ब्रश से दिन में 2 बार ब्रश करें',
  'drink plenty of water': 'खूब पानी पिएँ',
  'drink plenty of fluids': 'खूब पानी और तरल चीज़ें लें',
  'take rest': 'आराम करें',
  'review after 3 days': '3 दिन बाद दोबारा दिखाएँ',
  'review after 1 week': '1 हफ्ते बाद दोबारा दिखाएँ',
  'rest for 2 days': '2 दिन आराम करें',
  'come back if fever or pain increases': 'बुखार या दर्द बढ़े तो तुरंत दोबारा दिखाएँ',
  'avoid oily and spicy food': 'तला और मसालेदार खाना न खाएँ',
  'take medicines on time': 'दवाइयाँ समय पर लें',
  'avoid cold drinks': 'ठंडी चीज़ें न लें',
  'steam inhalation twice a day': 'दिन में 2 बार भाप लें',
  'check sugar daily': 'रोज़ शुगर जाँचें',
  'walk 30 minutes daily': 'रोज़ 30 मिनट टहलें',
  'reduce salt in food': 'खाने में नमक कम करें',
}

// Advice is saved as lines or sentences; known ones get a Hindi line, others stay as written.
export function hiAdvice(text) {
  return String(text || '').split(/\n|\.\s+|;\s*/).map((l) => ADVICE[l.trim().replace(/\.$/, '').toLowerCase()]).filter(Boolean).join('। ')
}
