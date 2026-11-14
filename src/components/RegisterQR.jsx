import { useNavigate } from 'react-router-dom'
import { useTenant } from './ui'
import { PatientForm } from './forms'

export { registerLink } from './qrpanel'

// "Patient QR" and "Register patient" open the same popup: the form on the left, the QR on the right.
export default function RegisterQR({ onClose }) {
  const { base } = useTenant()
  const nav = useNavigate()
  return <PatientForm onClose={onClose} onSaved={(row) => { onClose(); nav(`${base}/patients/${row.id}`) }} />
}
