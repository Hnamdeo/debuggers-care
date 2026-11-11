export const pad = (n) => String(n).padStart(2, '0')
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => iso(new Date())
export const addDays = (isoDate, n) => {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const daysBetween = (a, b) =>
  Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtDate = (s) => {
  if (!s) return '-'
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${+d} ${MONTHS[+m - 1]} ${y}`
}
export const fmtMonth = (ym) => {
  const [y, m] = ym.split('-')
  return `${MONTHS[+m - 1]} ${y}`
}
export const fmtTime = (t) => {
  if (!t) return ''
  let [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${pad(m)} ${ap}`
}
export const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const money = (n) => '₹' + inr.format(Math.round(n || 0))

export const age = (dob) => {
  const b = new Date(dob + 'T00:00:00')
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}

export const billTotal = (b) => {
  const sub = b.items.reduce((s, i) => s + i.qty * i.rate, 0)
  return Math.max(0, sub - (b.discount || 0))
}
export const billStatus = (b) => {
  const t = billTotal(b)
  if (b.paid >= t) return 'paid'
  if (b.paid > 0) return 'partial'
  return 'unpaid'
}

export const initials = (name) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

// Payroll rule of thumb used in the demo (India): HRA 40% of basic, PF 12% of basic,
// professional tax ₹200, TDS 10% on monthly gross above ₹60,000.
export const payslip = (basic, allowances = 0) => {
  const hra = Math.round(basic * 0.4)
  const gross = basic + hra + allowances
  const pf = Math.round(Math.min(basic, 15000) * 0.12)
  const pt = 200
  const tds = gross > 60000 ? Math.round((gross - 60000) * 0.1) : 0
  return { basic, hra, allowances, gross, pf, pt, tds, net: gross - pf - pt - tds }
}
