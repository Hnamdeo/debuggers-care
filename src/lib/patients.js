// Is this registration the same person as a saved patient? Families often share one mobile,
// so a match needs the same mobile AND the same first name ("Himanshu" = "Himanshu Namdeo").
const first = (n = '') => n.trim().toLowerCase().split(/\s+/)[0] || ''
export const samePerson = (a, b) => !!a?.phone && a.phone === b?.phone && !a.mergedInto && first(a.name) === first(b.name)
// Keep the fuller name when the patient types a shorter one the second time.
export const longerName = (a = '', b = '') => (b.trim().length > a.trim().length ? b : a)

const LINKED = ['appointments', 'prescriptions', 'reports', 'bills', 'sales', 'admissions', 'emergencies', 'shares', 'visits', 'images']

// Moves everything of a duplicate patient onto the one we keep, then hides the duplicate.
export function mergePatients(db, tid, keep, dup) {
  LINKED.forEach((c) => db.list(tid, c).filter((r) => r.patientId === dup.id).forEach((r) => db.update(tid, c, r.id, { patientId: keep.id })))
  const fill = {}
  Object.entries(dup).forEach(([k, v]) => { if (v && !keep[k] && !['id', 'regDate', 'mergedInto'].includes(k)) fill[k] = v })
  if (Object.keys(fill).length) db.update(tid, 'patients', keep.id, fill)
  db.update(tid, 'patients', dup.id, { mergedInto: keep.id })
}
