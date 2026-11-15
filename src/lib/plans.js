// Plans decide which modules a tenant (clinic / hospital) can use.
// Upgrading a tenant only flips its plan; its data never moves.
export const MODULES = {
  dashboard: { label: 'Dashboard' },
  patients: { label: 'Patients' },
  appointments: { label: 'Appointments' },
  prescriptions: { label: 'Prescriptions' },
  reports: { label: 'Lab & reports' },
  education: { label: 'Patient education' },
  billing: { label: 'Billing' },
  pharmacy: { label: 'Pharmacy' },
  staff: { label: 'Staff' },
  payroll: { label: 'Payroll' },
  ipd: { label: 'IPD & ICU beds' },
  emergency: { label: 'Emergency' },
}

// How a clinic buys or upgrades for now: a call or WhatsApp to Debuggers Space (online payment comes later).
export const SALES_PHONE = '9075013110'
export const salesWhatsApp = (text) => `https://wa.me/91${SALES_PHONE}?text=${encodeURIComponent(text)}`

export const PLANS = {
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    price: 999,
    offer: 499,
    offerLabel: 'Early bird offer',
    bonus: 'Free clinic website with Google SEO',
    blurb: 'For single-doctor and small clinics, like dentists and GPs.',
    maxDoctors: 3,
    modules: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'education', 'billing', 'staff'],
  },
  plus: {
    id: 'plus',
    name: 'Clinic Plus',
    price: 2499,
    bonus: 'Free clinic website with Google SEO',
    blurb: 'Multi-doctor clinics with their own pharmacy and staff payroll.',
    maxDoctors: 10,
    modules: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'education', 'billing', 'staff', 'pharmacy', 'payroll'],
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    price: 7999,
    bonus: 'Free hospital website with Google SEO',
    blurb: 'Full hospitals: IPD and ICU beds, emergency desk, departments.',
    maxDoctors: Infinity,
    modules: Object.keys(MODULES),
  },
}

// Terms for the free website that comes with every plan.
export const WEBSITE_TERMS = 'Free website: we design, build and set up Google SEO for your clinic’s website at no charge. The domain name (for example yourclinic.in) and web hosting are paid by the clinic, at actual cost, every year.'

export const PLAN_ORDER = ['clinic', 'plus', 'hospital']

// Super AI: paid monthly add-on on top of any plan (real AI model, run through our server).
// Cost to us is about ₹0.5–1 per AI action, so each tier has a monthly action allowance.
export const SUPER_AI = {
  name: 'Super AI',
  status: 'Launching soon',
  free: 'Every plan already includes the AI assistant: book, register and write prescriptions by chat.',
  features: [
    'Write the full prescription from voice or typing, in English or Hindi',
    'Medicine, dose and duration suggestions for the diagnosis',
    'Allergy, age and drug interaction warnings',
    'Visit notes and patient summary in one tap',
    'X-ray and report explained in simple words for the patient',
  ],
  safety: 'AI only suggests. The doctor checks and approves every prescription.',
  tiers: [
    { id: 'clinic', name: 'Super AI Clinic', price: 2999, for: 'Clinic and Clinic Plus', doctors: 'Up to 3 doctors', actions: 2000 },
    { id: 'hospital', name: 'Super AI Hospital', price: 9999, for: 'Hospital plan', doctors: 'Up to 15 doctors', actions: 8000 },
  ],
}

export const hasModule = (tenant, mod) => PLANS[tenant.plan].modules.includes(mod)

export const planFor = (mod) => PLAN_ORDER.find((p) => PLANS[p].modules.includes(mod))

// Which modules each role sees (before the plan filter is applied).
export const ROLE_MODULES = {
  admin: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'education', 'ipd', 'emergency', 'pharmacy', 'billing', 'staff', 'payroll'],
  doctor: ['dashboard', 'appointments', 'patients', 'prescriptions', 'reports', 'education', 'ipd', 'emergency'],
  pharmacist: ['pharmacy', 'prescriptions'],
  receptionist: ['dashboard', 'patients', 'appointments', 'billing'],
  patient: [],
}

export const ROLE_LABEL = { admin: 'Admin', doctor: 'Doctor', receptionist: 'Reception', pharmacist: 'Pharmacist', patient: 'Patient' }

// Public address of a clinic. Hostinger shared hosting cannot serve nested
// subdomains (x.care.debuggersspace.com), so clinics use "<slug>-care".
// Real clinics get their own subdomain; the public demo clinics live under the main address.
export const tenantHost = (t) => (t.prospect ? `${t.slug}-care.debuggersspace.com` : `care.debuggersspace.com/${t.slug}`)
