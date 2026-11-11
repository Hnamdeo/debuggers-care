# Debuggers Care (HMS demo)

Multi-tenant clinic and hospital management demo by Debuggers Space.

- **Tenants:** each clinic is a tenant with its own address (`<slug>.care.debuggersspace.com`). The app reads the hostname and opens that clinic; on the main address it shows the demo picker.
- **Plans:** Clinic, Clinic Plus (pharmacy, payroll), Hospital (IPD/ICU beds, emergency). Modules outside the plan show as locked; switching plan in *Plan & settings* turns them on with no data moved.
- **Roles:** Admin, Doctor, Pharmacist, Patient (one-click demo logins, password `demo123`).
- **Modules:** patients and full health record, appointments, consultation (prescription + test orders + bill in one step), prescriptions, lab reports, IPD/ICU bed board, emergency triage, pharmacy (dispense queue, stock, counter sales), billing, staff, payroll with payslips, and a patient-education video library (show during consultation, share to the patient's record, send on WhatsApp).

Phase 1 (this folder) stores data in the visitor's browser (`src/lib/store.js`), seeded with sample data relative to today. **Do not enter real patient data.** Phase 2 replaces `store.js` with API calls to a backend where every row carries `tenant_id`.

```bash
npm install
npm run dev      # local
npm run build    # static build in dist/ (upload to /public_html/care)
```

Demo tenants: `drsmile` (dental, Clinic plan), `debuggerscare` (hospital, Hospital plan). Trial tenants for real clinics (`prospect: true`) are hidden from the picker and open only on their own subdomain.
