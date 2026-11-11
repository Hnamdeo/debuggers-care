// Plans decide which modules a tenant (clinic / hospital) can use.
// Upgrading a tenant only flips its plan; its data never moves.
export const MODULES = {
  dashboard: { label: 'Dashboard' },
  patients: { label: 'Patients' },
  appointments: { label: 'Appointments' },
  prescriptions: { label: 'Prescriptions' },
  reports: { label: 'Lab & reports' },
  billing: { label: 'Billing' },
  pharmacy: { label: 'Pharmacy' },
  staff: { label: 'Staff' },
  payroll: { label: 'Payroll' },
  ipd: { label: 'IPD & ICU beds' },
  emergency: { label: 'Emergency' },
}

export const PLANS = {
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    price: 999,
    blurb: 'For single-doctor and small clinics, like dentists and GPs.',
    maxDoctors: 3,
    modules: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'billing', 'staff'],
  },
  plus: {
    id: 'plus',
    name: 'Clinic Plus',
    price: 2499,
    blurb: 'Multi-doctor clinics with their own pharmacy and staff payroll.',
    maxDoctors: 10,
    modules: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'billing', 'staff', 'pharmacy', 'payroll'],
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    price: 7999,
    blurb: 'Full hospitals: IPD and ICU beds, emergency desk, departments.',
    maxDoctors: Infinity,
    modules: Object.keys(MODULES),
  },
}

export const PLAN_ORDER = ['clinic', 'plus', 'hospital']

export const hasModule = (tenant, mod) => PLANS[tenant.plan].modules.includes(mod)

export const planFor = (mod) => PLAN_ORDER.find((p) => PLANS[p].modules.includes(mod))

// Which modules each role sees (before the plan filter is applied).
export const ROLE_MODULES = {
  admin: ['dashboard', 'patients', 'appointments', 'prescriptions', 'reports', 'ipd', 'emergency', 'pharmacy', 'billing', 'staff', 'payroll'],
  doctor: ['dashboard', 'appointments', 'patients', 'prescriptions', 'reports', 'ipd', 'emergency'],
  pharmacist: ['pharmacy', 'prescriptions'],
  patient: [],
}

export const ROLE_LABEL = { admin: 'Admin', doctor: 'Doctor', pharmacist: 'Pharmacist', patient: 'Patient' }

// Public address of a clinic. Hostinger shared hosting cannot serve nested
// subdomains (x.care.debuggersspace.com), so clinics use "<slug>-care".
export const tenantHost = (slug) => `${slug}-care.debuggersspace.com`
