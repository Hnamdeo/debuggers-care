// Demo data. Everything is fictional and generated relative to today's date,
// so the demo always looks current. Each tenant's data is kept separately,
// exactly how the real backend will scope every row by tenant_id.
import { addDays, today, iso, payslip } from './utils'

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const FIRST_M = ['Aarav', 'Rohan', 'Vikram', 'Sanjay', 'Amit', 'Rahul', 'Karan', 'Nikhil', 'Suresh', 'Arjun', 'Manish', 'Deepak', 'Yash', 'Pranav', 'Omkar', 'Siddharth', 'Rajesh', 'Tushar', 'Harsh', 'Ganesh']
const FIRST_F = ['Priya', 'Sneha', 'Anjali', 'Pooja', 'Neha', 'Kavya', 'Meera', 'Riya', 'Shruti', 'Aditi', 'Swati', 'Nisha', 'Pallavi', 'Tanvi', 'Ishita', 'Rutuja', 'Sakshi', 'Divya', 'Komal', 'Asha']
const LAST = ['Sharma', 'Patil', 'Kulkarni', 'Deshmukh', 'Joshi', 'Verma', 'Gupta', 'Jadhav', 'Shinde', 'Pawar', 'Iyer', 'Nair', 'Reddy', 'Mehta', 'Shah', 'Bhosale', 'Kale', 'Chavan', 'Singh', 'Agarwal']
const AREAS = ['Baner', 'Aundh', 'Wakad', 'Hinjawadi', 'Kothrud', 'Pimple Saudagar', 'Balewadi', 'Viman Nagar', 'Kharadi', 'Shivajinagar']
const BLOOD = ['O+', 'O+', 'B+', 'B+', 'A+', 'A+', 'AB+', 'O-', 'B-', 'A-']

const MEDICINES = [
  ['Paracetamol 650 mg', 'Paracetamol', 'Tablet', 2.1],
  ['Amoxicillin 500 mg', 'Amoxicillin', 'Capsule', 6.5],
  ['Azithromycin 500 mg', 'Azithromycin', 'Tablet', 22],
  ['Pantoprazole 40 mg', 'Pantoprazole', 'Tablet', 7.8],
  ['Cetirizine 10 mg', 'Cetirizine', 'Tablet', 1.8],
  ['Metformin 500 mg', 'Metformin', 'Tablet', 2.4],
  ['Amlodipine 5 mg', 'Amlodipine', 'Tablet', 3.2],
  ['Atorvastatin 10 mg', 'Atorvastatin', 'Tablet', 8.5],
  ['Ibuprofen 400 mg', 'Ibuprofen', 'Tablet', 2.6],
  ['Diclofenac 50 mg', 'Diclofenac', 'Tablet', 2.2],
  ['Ondansetron 4 mg', 'Ondansetron', 'Tablet', 5.4],
  ['Vitamin D3 60K', 'Cholecalciferol', 'Capsule', 32],
  ['ORS sachet', 'Oral rehydration salts', 'Sachet', 21],
  ['Cough syrup 100 ml', 'Dextromethorphan', 'Syrup', 98],
  ['Chlorhexidine mouthwash', 'Chlorhexidine 0.2%', 'Liquid', 115],
  ['Metronidazole 400 mg', 'Metronidazole', 'Tablet', 2.9],
  ['Ketorolac 10 mg', 'Ketorolac', 'Tablet', 4.6],
  ['Sensitivity toothpaste', 'Potassium nitrate', 'Paste', 165],
  ['Insulin glargine pen', 'Insulin glargine', 'Injection', 690],
  ['Ceftriaxone 1 g inj', 'Ceftriaxone', 'Injection', 58],
  ['Normal saline 500 ml', 'Sodium chloride 0.9%', 'IV fluid', 34],
  ['Salbutamol inhaler', 'Salbutamol', 'Inhaler', 145],
  ['Clopidogrel 75 mg', 'Clopidogrel', 'Tablet', 6.1],
  ['Telmisartan 40 mg', 'Telmisartan', 'Tablet', 5.3],
]

const LAB_TESTS = {
  'Complete blood count': { category: 'Pathology', price: 350, params: [['Haemoglobin', 'g/dL', 12, 16, 1], ['WBC count', '/µL', 4000, 11000, 0], ['Platelets', 'lakh/µL', 1.5, 4.5, 1]] },
  'Blood sugar (fasting)': { category: 'Pathology', price: 120, params: [['Glucose (fasting)', 'mg/dL', 70, 100, 0]] },
  'HbA1c': { category: 'Pathology', price: 550, params: [['HbA1c', '%', 4, 5.6, 1]] },
  'Lipid profile': { category: 'Pathology', price: 650, params: [['Total cholesterol', 'mg/dL', 125, 200, 0], ['LDL', 'mg/dL', 0, 100, 0], ['HDL', 'mg/dL', 40, 60, 0], ['Triglycerides', 'mg/dL', 0, 150, 0]] },
  'Thyroid profile (T3 T4 TSH)': { category: 'Pathology', price: 600, params: [['TSH', 'µIU/mL', 0.4, 4.0, 2]] },
  'Liver function test': { category: 'Pathology', price: 700, params: [['SGPT (ALT)', 'U/L', 7, 56, 0], ['Bilirubin total', 'mg/dL', 0.1, 1.2, 1]] },
  'Chest X-ray': { category: 'Radiology', price: 450, params: [] },
  'ECG': { category: 'Cardiology', price: 300, params: [] },
  'OPG (dental panoramic X-ray)': { category: 'Radiology', price: 600, params: [] },
  'IOPA X-ray': { category: 'Radiology', price: 250, params: [] },
}

const IMAGING_FINDINGS = {
  'Chest X-ray': 'Lung fields clear. No consolidation or effusion. Cardiac size normal.',
  'ECG': 'Normal sinus rhythm, rate 78/min. No ST-T changes.',
  'OPG (dental panoramic X-ray)': 'Deep caries in 36 approaching pulp. Impacted 48, mesioangular. Bone levels normal.',
  'IOPA X-ray': 'Periapical radiolucency at 46. Suggestive of chronic apical periodontitis.',
}

const TENANT_DEFS = [
  {
    id: 't_smile',
    slug: 'drsmile',
    name: 'Smile Dental Clinic',
    short: 'Smile Dental',
    kind: 'Dental clinic',
    plan: 'clinic',
    address: 'Shop 4, Sai Plaza, Baner Road, Baner, Pune 411045',
    phone: '+91 20 4000 1122',
    email: 'hello@drsmile.example',
    gstin: '27ABCDE1234F1Z5',
    regNo: 'MDC/PUN/2019/0412',
    color: '#0f8f86',
    doctors: [
      ['Dr. Anika Rao', 'F', 'Dental Surgery', 'BDS, MDS (Endodontics)', 500, 120000],
      ['Dr. Kunal Mehta', 'M', 'Orthodontics', 'BDS, MDS (Orthodontics)', 600, 110000],
    ],
    otherStaff: [
      ['Sunita Kale', 'F', 'receptionist', 'Front desk', 22000],
      ['Meena Pawar', 'F', 'nurse', 'Dental assistant', 20000],
      ['Rahul Jadhav', 'M', 'pharmacist', 'Dispensary', 26000],
    ],
    admin: ['Ritika Joshi', 'F', 'Clinic manager', 45000],
    patients: 28,
    reasons: ['Tooth pain', 'Routine check-up', 'Scaling & polishing', 'Root canal follow-up', 'Braces adjustment', 'Bleeding gums', 'Wisdom tooth pain', 'Tooth sensitivity', 'Cavity filling', 'Teeth whitening consult'],
    services: [['Consultation', 500], ['Scaling & polishing', 1500], ['Composite filling', 1800], ['Root canal treatment', 6500], ['Tooth extraction', 1200], ['Braces adjustment', 1000], ['Teeth whitening', 8000], ['Dental crown (ceramic)', 9000]],
    diagnoses: ['Dental caries (36)', 'Chronic gingivitis', 'Irreversible pulpitis (46)', 'Dentine hypersensitivity', 'Impacted 48', 'Malocclusion class II'],
    tests: ['OPG (dental panoramic X-ray)', 'IOPA X-ray', 'Blood sugar (fasting)'],
    rxSets: [
      [['Amoxicillin 500 mg', '1 cap', 'Three times a day', 5], ['Ketorolac 10 mg', '1 tab', 'When needed for pain', 3]],
      [['Chlorhexidine mouthwash', '10 ml', 'Twice a day', 14]],
      [['Metronidazole 400 mg', '1 tab', 'Three times a day', 5], ['Ibuprofen 400 mg', '1 tab', 'Twice a day after food', 3]],
      [['Sensitivity toothpaste', 'Apply', 'Twice a day', 30]],
    ],
    beds: [],
  },
  {
    id: 't_city',
    slug: 'debuggerscare',
    name: 'Debuggers Care Hospital',
    short: 'Debuggers Care',
    kind: 'Multi-speciality hospital',
    plan: 'hospital',
    address: 'Plot 21, Phase 1, Rajiv Gandhi Infotech Park, Hinjawadi, Pune 411057',
    phone: '+91 20 6700 4400',
    email: 'care@debuggerscare.example',
    gstin: '27FGHIJ5678K1Z2',
    regNo: 'BNH/PMC/2021/1187',
    color: '#2459d6',
    doctors: [
      ['Dr. Arvind Kulkarni', 'M', 'General Medicine', 'MBBS, MD (Medicine)', 700, 220000],
      ['Dr. Shalini Iyer', 'F', 'Cardiology', 'MBBS, MD, DM (Cardiology)', 1200, 350000],
      ['Dr. Rajiv Deshmukh', 'M', 'Orthopaedics', 'MBBS, MS (Ortho)', 900, 260000],
      ['Dr. Neha Gupta', 'F', 'Paediatrics', 'MBBS, MD (Paediatrics)', 700, 210000],
      ['Dr. Farhan Shaikh', 'M', 'Emergency Medicine', 'MBBS, MEM', 800, 190000],
      ['Dr. Pooja Nair', 'F', 'Obstetrics & Gynaecology', 'MBBS, MS (OBG)', 900, 240000],
    ],
    otherStaff: [
      ['Kiran Shinde', 'F', 'nurse', 'ICU', 32000],
      ['Joseph D’Souza', 'M', 'nurse', 'Emergency', 30000],
      ['Lata Bhosale', 'F', 'nurse', 'General ward', 28000],
      ['Amol Chavan', 'M', 'lab', 'Pathology', 30000],
      ['Rahul Patil', 'M', 'pharmacist', 'Pharmacy', 34000],
      ['Sana Khan', 'F', 'receptionist', 'Front desk', 24000],
    ],
    admin: ['Vivek Agarwal', 'M', 'Hospital administrator', 90000],
    patients: 44,
    reasons: ['Fever and body ache', 'Chest pain', 'Knee pain', 'Diabetes follow-up', 'High BP review', 'Child vaccination', 'Pregnancy check-up', 'Back pain', 'Cough and cold', 'Breathlessness', 'Thyroid follow-up', 'Fracture follow-up'],
    services: [['Consultation', 700], ['Dressing', 300], ['Nebulisation', 250], ['Plaster cast', 2500], ['Physiotherapy session', 600]],
    diagnoses: ['Viral fever', 'Type 2 diabetes mellitus', 'Essential hypertension', 'Osteoarthritis knee', 'Acute bronchitis', 'Hypothyroidism', 'Stable angina', 'Lumbar strain', 'Iron deficiency anaemia'],
    tests: ['Complete blood count', 'Blood sugar (fasting)', 'HbA1c', 'Lipid profile', 'Thyroid profile (T3 T4 TSH)', 'Liver function test', 'Chest X-ray', 'ECG'],
    rxSets: [
      [['Paracetamol 650 mg', '1 tab', 'Three times a day', 5], ['Cetirizine 10 mg', '1 tab', 'At night', 5]],
      [['Metformin 500 mg', '1 tab', 'Twice a day after food', 30], ['Vitamin D3 60K', '1 cap', 'Once a week', 8]],
      [['Amlodipine 5 mg', '1 tab', 'Once a day', 30], ['Telmisartan 40 mg', '1 tab', 'Once a day', 30]],
      [['Azithromycin 500 mg', '1 tab', 'Once a day', 3], ['Cough syrup 100 ml', '10 ml', 'Three times a day', 5]],
      [['Diclofenac 50 mg', '1 tab', 'Twice a day after food', 5], ['Pantoprazole 40 mg', '1 tab', 'Before breakfast', 5]],
      [['Atorvastatin 10 mg', '1 tab', 'At night', 30], ['Clopidogrel 75 mg', '1 tab', 'Once a day', 30]],
    ],
    beds: [['ICU', 8, 9000], ['HDU', 4, 6000], ['General ward', 16, 1800], ['Private room', 6, 4500]],
  },
  {
    id: 't_mourya',
    slug: 'drmourya',
    name: 'Dr. Mourya’s Dental Care',
    short: 'Mourya Dental',
    kind: 'Dental clinic',
    plan: 'clinic',
    // Prospect demo: public listing details only (name, doctor, locality, services). Patients and numbers are sample data.
    prospect: true,
    address: 'Bazar Chowk, Vidhan Sabha Road, Mowa, Raipur 492001',
    phone: 'Mon to Sat · 10 AM to 2 PM, 5 PM to 9 PM',
    email: 'clinic@drmourya.example',
    gstin: '',
    regNo: '',
    color: '#0e7490',
    doctors: [
      ['Dr. Pawan Kumar Mourya', 'M', 'Dental Surgery', 'BDS', 150, 0],
    ],
    otherStaff: [
      ['Front desk (sample)', 'F', 'receptionist', 'Front desk', 15000],
      ['Dental assistant (sample)', 'F', 'nurse', 'Chairside assistant', 14000],
    ],
    admin: ['Clinic admin (sample)', 'F', 'Clinic manager', 25000],
    patients: 24,
    reasons: ['Tooth pain', 'General dental check-up', 'Scaling & polishing', 'Loose tooth', 'Wisdom tooth pain', 'Denture fitting', 'Broken tooth', 'Bleeding gums', 'Crown follow-up', 'Tooth sensitivity'],
    services: [['Consultation', 150], ['Scaling & polishing', 800], ['Tooth extraction', 500], ['Surgical tooth extraction', 2500], ['Impacted tooth extraction', 3500], ['Complete denture', 12000], ['Partial denture', 4000], ['Crown (ceramic)', 5000], ['Bridge (per unit)', 4500]],
    diagnoses: ['Dental caries', 'Chronic gingivitis', 'Impacted 38', 'Grade II mobility (31, 41)', 'Edentulous maxilla', 'Fractured crown (11)', 'Dentine hypersensitivity'],
    tests: ['IOPA X-ray', 'OPG (dental panoramic X-ray)', 'Blood sugar (fasting)'],
    rxSets: [
      [['Amoxicillin 500 mg', '1 cap', 'Three times a day', 5], ['Ketorolac 10 mg', '1 tab', 'When needed for pain', 3]],
      [['Chlorhexidine mouthwash', '10 ml', 'Twice a day', 14]],
      [['Metronidazole 400 mg', '1 tab', 'Three times a day', 5], ['Ibuprofen 400 mg', '1 tab', 'Twice a day after food', 3]],
      [['Sensitivity toothpaste', 'Apply', 'Twice a day', 30]],
    ],
    beds: [],
  },
]

const PLATFORM_EXTRA = [
  { id: 't_arogya', slug: 'arogya', name: 'Arogya Family Clinic', kind: 'Family clinic', plan: 'plus', city: 'Wakad, Pune', active: 3 },
]

const HOURS = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']

function buildTenant(def, seedNum) {
  const r = rng(seedNum)
  const pick = (a) => a[Math.floor(r() * a.length)]
  const int = (a, b) => a + Math.floor(r() * (b - a + 1))
  const T = today()
  const counters = {}
  const nextId = (prefix) => {
    counters[prefix] = (counters[prefix] || 1000) + 1
    return `${prefix}-${counters[prefix]}`
  }
  const data = { staff: [], patients: [], appointments: [], prescriptions: [], reports: [], bills: [], medicines: [], sales: [], beds: [], admissions: [], emergencies: [], payroll: [], users: [] }
  const domain = def.email.split('@')[1]

  // Staff and their logins
  const adminId = nextId('S')
  data.staff.push({ id: adminId, name: def.admin[0], gender: def.admin[1], role: 'admin', dept: 'Administration', title: def.admin[2], phone: '98' + int(10000000, 99999999), email: `admin@${domain}`, salary: def.admin[3], joinDate: addDays(T, -int(400, 1400)) })
  data.users.push({ id: 'U-admin', role: 'admin', refId: adminId, email: `admin@${domain}`, password: 'demo123' })
  def.doctors.forEach(([name, g, dept, qual, fee, sal], i) => {
    const id = nextId('S')
    const email = `${name.replace(/^Dr\.\s*/, '').split(' ')[0].toLowerCase()}@${domain}`
    data.staff.push({ id, name, gender: g, role: 'doctor', dept, title: dept, qualification: qual, fee, phone: '98' + int(10000000, 99999999), email, salary: sal, joinDate: addDays(T, -int(200, 1500)), regNo: `MMC-${int(60000, 99999)}` })
    data.users.push({ id: 'U-doc' + i, role: 'doctor', refId: id, email, password: 'demo123' })
  })
  def.otherStaff.forEach(([name, g, role, dept, sal]) => {
    const id = nextId('S')
    const email = `${name.split(' ')[0].toLowerCase()}@${domain}`
    data.staff.push({ id, name, gender: g, role, dept, title: dept, phone: '97' + int(10000000, 99999999), email, salary: sal, joinDate: addDays(T, -int(100, 1200)) })
    if (role === 'pharmacist') data.users.push({ id: 'U-pharm', role: 'pharmacist', refId: id, email, password: 'demo123' })
  })
  const doctors = data.staff.filter((s) => s.role === 'doctor')

  // Medicines
  MEDICINES.forEach(([name, generic, form, mrp]) => {
    const stock = int(0, 10) < 2 ? int(4, 18) : int(60, 600)
    data.medicines.push({ id: nextId('M'), name, generic, form, batch: 'B' + int(10000, 99999), expiry: addDays(T, int(0, 10) < 1 ? int(10, 50) : int(120, 700)), stock, reorder: 30, mrp, cost: +(mrp * 0.72).toFixed(2) })
  })
  const med = (name) => data.medicines.find((m) => m.name === name)

  // Patients
  for (let i = 0; i < def.patients; i++) {
    const g = r() < 0.5 ? 'M' : 'F'
    const first = g === 'M' ? pick(FIRST_M) : pick(FIRST_F)
    const last = pick(LAST)
    const ageY = def.kind === 'Dental clinic' ? int(12, 68) : i % 9 === 0 ? int(1, 12) : int(18, 82)
    const dob = iso(new Date(new Date().getFullYear() - ageY, int(0, 11), int(1, 28)))
    const id = nextId('P')
    data.patients.push({
      id, name: `${first} ${last}`, gender: g, dob, phone: '9' + int(100000000, 999999999),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@mail.example`, blood: pick(BLOOD),
      address: `${int(1, 99)}, ${pick(AREAS)}, Pune`, allergies: r() < 0.2 ? pick(['Penicillin', 'Sulpha drugs', 'Peanuts', 'Dust']) : '',
      conditions: r() < 0.3 ? pick(['Diabetes', 'Hypertension', 'Asthma', 'Thyroid']) : '',
      emergencyContact: `${pick(FIRST_M)} ${last} · 9${int(100000000, 999999999)}`,
      regDate: addDays(T, -int(5, 500)),
    })
  }
  // A known demo patient with a login
  const demoPatient = data.patients[0]
  data.users.push({ id: 'U-pat', role: 'patient', refId: demoPatient.id, email: demoPatient.email, password: 'demo123' })

  const consult = (doc) => doc.fee
  // Past visits (completed) with prescriptions, reports and bills; plus upcoming bookings
  for (let d = -45; d <= 7; d++) {
    const date = addDays(T, d)
    if (new Date(date + 'T00:00:00').getDay() === 0) continue // Sunday closed
    const n = d === 0 ? int(9, 12) : d > 0 ? int(3, 7) : int(3, 8)
    const usedSlots = new Set()
    for (let k = 0; k < n; k++) {
      const doc = pick(doctors)
      let time = pick(HOURS)
      while (usedSlots.has(doc.id + time)) time = pick(HOURS)
      usedSlots.add(doc.id + time)
      const pat = k === 0 && (d === -20 || d === -6 || d === 2) ? demoPatient : pick(data.patients)
      let status = 'scheduled'
      if (d < 0) status = r() < 0.9 ? 'completed' : 'cancelled'
      if (d === 0) status = time < '12:00' ? (r() < 0.8 ? 'completed' : 'checked-in') : 'scheduled'
      const appt = { id: nextId('A'), patientId: pat.id, doctorId: doc.id, date, time, reason: pick(def.reasons), status, type: 'OPD' }
      data.appointments.push(appt)
      if (status !== 'completed') continue

      const items = [{ desc: `Consultation · ${doc.name}`, qty: 1, rate: consult(doc) }]
      if (r() < 0.5 && def.services.length > 1) {
        const [sname, sprice] = def.services[int(1, def.services.length - 1)]
        items.push({ desc: sname, qty: 1, rate: sprice })
      }
      const rxItems = pick(def.rxSets).map(([name, dose, freq, days]) => {
        const m = med(name)
        const per = /day|night|breakfast|food/i.test(freq) ? (/Three/.test(freq) ? 3 : /Twice/.test(freq) ? 2 : 1) : 1
        return { medicineId: m?.id, name, dose, freq, days, qty: m && ['Tablet', 'Capsule'].includes(m.form) ? per * days : 1 }
      })
      const rx = { id: nextId('RX'), patientId: pat.id, doctorId: doc.id, appointmentId: appt.id, date, diagnosis: pick(def.diagnoses), notes: pick(['Review after 1 week.', 'Drink plenty of fluids.', 'Avoid hard and sticky food for 2 days.', 'Come back if symptoms get worse.', 'Continue regular walks, low-salt diet.']), items: rxItems, dispensed: d < 0 ? r() < 0.96 : false }
      data.prescriptions.push(rx)
      appt.prescriptionId = rx.id

      if (r() < 0.45) {
        const test = pick(def.tests)
        const L = LAB_TESTS[test]
        const done = d < 0 || r() < 0.4
        const results = done
          ? L.params.map(([param, unit, lo, hi, dp]) => {
              const abnormal = r() < 0.25
              const v = abnormal ? hi * (1 + r() * 0.35) : lo + (hi - lo) * (0.2 + r() * 0.6)
              return { param, unit, range: `${lo} - ${hi}`, value: +v.toFixed(dp), flag: v > hi ? 'High' : v < lo ? 'Low' : '' }
            })
          : []
        data.reports.push({ id: nextId('LAB'), patientId: pat.id, doctorId: doc.id, date, test, category: L.category, price: L.price, status: done ? 'completed' : 'ordered', results, findings: done ? IMAGING_FINDINGS[test] || '' : '', completedDate: done ? addDays(date, d < 0 ? 1 : 0) : '' })
        items.push({ desc: test, qty: 1, rate: L.price })
      }
      const bill = { id: nextId('INV'), patientId: pat.id, date, source: 'OPD', ref: appt.id, items, discount: r() < 0.15 ? 100 : 0, paid: 0, mode: pick(['UPI', 'UPI', 'Cash', 'Card']) }
      const t = bill.items.reduce((s, i) => s + i.qty * i.rate, 0) - bill.discount
      bill.paid = d < -3 ? t : r() < 0.7 ? t : 0
      data.bills.push(bill)

      if (rx.dispensed) {
        const sItems = rxItems.filter((it) => it.medicineId).map((it) => ({ medicineId: it.medicineId, name: it.name, qty: it.qty, price: med(it.name).mrp }))
        if (sItems.length) {
          const inv = { id: nextId('INV'), patientId: pat.id, date, source: 'Pharmacy', ref: rx.id, items: sItems.map((s) => ({ desc: s.name, qty: s.qty, rate: s.price })), discount: 0, paid: 0, mode: 'UPI' }
          inv.paid = inv.items.reduce((s, i) => s + i.qty * i.rate, 0)
          data.bills.push(inv)
          data.sales.push({ id: nextId('SL'), date, patientId: pat.id, customer: pat.name, prescriptionId: rx.id, billId: inv.id, items: sItems })
        }
      }
    }
  }

  // Make sure every doctor has a live queue today, whatever time the demo is opened
  doctors.forEach((doc) => {
    const used = new Set(data.appointments.filter((a) => a.date === T && a.doctorId === doc.id).map((a) => a.time))
    const free = HOURS.filter((h) => !used.has(h))
    ;['checked-in', 'scheduled', 'scheduled'].forEach((status, i) => {
      const time = free[Math.min(free.length - 1, Math.floor((free.length / 3) * i + r() * 2))]
      if (!time || used.has(time)) return
      used.add(time)
      const pat = doc === doctors[0] && i === 2 ? demoPatient : pick(data.patients)
      data.appointments.push({ id: nextId('A'), patientId: pat.id, doctorId: doc.id, date: T, time, reason: pick(def.reasons), status, type: 'OPD' })
    })
  })

  // Beds, admissions and emergencies (hospital only)
  def.beds.forEach(([ward, count, rate]) => {
    for (let i = 1; i <= count; i++) data.beds.push({ id: nextId('BED'), ward, number: `${ward === 'ICU' ? 'ICU' : ward === 'HDU' ? 'HDU' : ward === 'Private room' ? 'PR' : 'GW'}-${pad2(i)}`, rate })
  })
  if (data.beds.length) {
    const icuReasons = ['Acute MI, post angioplasty', 'Severe pneumonia', 'Diabetic ketoacidosis', 'Head injury (RTA) observation', 'Sepsis', 'COPD exacerbation']
    const wardReasons = ['Dengue fever', 'Fracture neck of femur, post-op', 'Acute gastroenteritis', 'Typhoid fever', 'Elective knee replacement', 'Normal delivery', 'Cellulitis left leg']
    const occupancy = { ICU: 6, HDU: 2, 'General ward': 10, 'Private room': 4 }
    const used = new Set()
    Object.entries(occupancy).forEach(([ward, n]) => {
      const wardBeds = data.beds.filter((b) => b.ward === ward)
      for (let i = 0; i < n; i++) {
        const bed = wardBeds[i]
        let pat = pick(data.patients)
        while (used.has(pat.id)) pat = pick(data.patients)
        used.add(pat.id)
        const doc = ward === 'ICU' || ward === 'HDU' ? pick(doctors.filter((x) => ['Cardiology', 'General Medicine', 'Emergency Medicine'].includes(x.dept))) : pick(doctors)
        data.admissions.push({ id: nextId('IPD'), patientId: pat.id, doctorId: doc.id, bedId: bed.id, admitDate: addDays(T, -int(0, 6)), reason: pick(ward === 'ICU' || ward === 'HDU' ? icuReasons : wardReasons), status: 'admitted', vitals: { bp: `${int(100, 150)}/${int(65, 95)}`, pulse: int(62, 118), spo2: int(ward === 'ICU' ? 88 : 94, 99), temp: (97 + r() * 4).toFixed(1) }, notes: '' })
      }
    })
    // A few past discharges with IPD bills
    for (let i = 0; i < 6; i++) {
      const pat = pick(data.patients)
      const bed = pick(data.beds.filter((b) => b.ward !== 'ICU'))
      const doc = pick(doctors)
      const admit = addDays(T, -int(10, 40))
      const days = int(2, 6)
      const adm = { id: nextId('IPD'), patientId: pat.id, doctorId: doc.id, bedId: bed.id, admitDate: admit, dischargeDate: addDays(admit, days), reason: pick(wardReasons), status: 'discharged', vitals: {}, notes: 'Stable at discharge.' }
      data.admissions.push(adm)
      const b = { id: nextId('INV'), patientId: pat.id, date: adm.dischargeDate, source: 'IPD', ref: adm.id, items: [{ desc: `${bed.ward} bed charges`, qty: days, rate: bed.rate }, { desc: 'Doctor visits', qty: days, rate: 800 }, { desc: 'Nursing care', qty: days, rate: 600 }, { desc: 'Medicines & consumables', qty: 1, rate: int(3000, 12000) }], discount: 0, paid: 0, mode: 'Card' }
      b.paid = b.items.reduce((s, it) => s + it.qty * it.rate, 0)
      data.bills.push(b)
    }
    const er = [
      ['red', 'Road traffic accident, head injury', 'in-treatment'],
      ['red', 'Chest pain, sweating', 'in-treatment'],
      ['yellow', 'High fever with seizures (child)', 'waiting'],
      ['yellow', 'Deep cut on right hand', 'in-treatment'],
      ['green', 'Sprained ankle', 'waiting'],
      ['green', 'Dog bite, minor', 'waiting'],
      ['yellow', 'Severe abdominal pain', 'admitted'],
      ['green', 'Allergic rash', 'discharged'],
    ]
    const erDoc = doctors.find((x) => x.dept === 'Emergency Medicine')
    er.forEach(([triage, complaint, status], i) => {
      const g = r() < 0.5 ? 'M' : 'F'
      const name = `${g === 'M' ? pick(FIRST_M) : pick(FIRST_F)} ${pick(LAST)}`
      const h = Math.max(0, new Date().getHours() - (er.length - i))
      data.emergencies.push({ id: nextId('ER'), name, gender: g, age: int(4, 75), phone: '9' + int(100000000, 999999999), date: T, time: `${String(h).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`, triage, complaint, status, doctorId: status === 'waiting' ? '' : erDoc.id, broughtBy: pick(['Ambulance', 'Family', 'Self', 'Police']) })
    })
  }

  // Payroll: last two months paid
  const now = new Date()
  for (let m = 2; m >= 1; m--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    data.staff.filter((s) => s.salary > 0).forEach((s) => {
      const p = payslip(s.salary, s.role === 'doctor' ? 5000 : 1500)
      data.payroll.push({ id: nextId('PAY'), month, staffId: s.id, ...p, status: 'paid', paidOn: `${month}-28` })
    })
  }

  const { doctors: _d, otherStaff: _o, admin: _a, patients: _p, reasons, services, diagnoses, tests, rxSets: _r, beds: _b, ...tenant } = def
  return { tenant: { ...tenant, services, diagnoses, tests, reasons, createdAt: addDays(T, -380) }, data, counters }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export const LAB_CATALOG = LAB_TESTS

export function buildSeed() {
  const tenants = []
  const data = {}
  const counters = {}
  TENANT_DEFS.forEach((def, i) => {
    const t = buildTenant(def, 7 + i * 31)
    tenants.push(t.tenant)
    data[t.tenant.id] = t.data
    counters[t.tenant.id] = t.counters
  })
  return { version: 1, seededOn: today(), tenants, platformExtra: PLATFORM_EXTRA, data, counters }
}
