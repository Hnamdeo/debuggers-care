import { useState } from 'react'
import { Download, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Modal, toast } from './ui'
import { useInstall } from '../lib/install'

function IosHelp({ onClose }) {
  return (
    <Modal title="Add the app to your iPhone" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>OK</button>}>
      <ol className="install-steps">
        <li><Share /> Tap the <b>Share</b> button at the bottom of Safari.</li>
        <li><PlusSquare /> Scroll and tap <b>Add to Home Screen</b>.</li>
        <li><Smartphone /> Tap <b>Add</b>. The app now opens from your home screen like any other app.</li>
      </ol>
    </Modal>
  )
}

// "Install app" button: shown only where the browser can install it (Android, Chrome, Edge) or on iPhone.
export function InstallButton({ className = 'btn', role, label = 'Install app' }) {
  const { canInstall, iosHint, install } = useInstall()
  const [help, setHelp] = useState(false)
  if (!canInstall && !iosHint) return null
  const go = async () => {
    if (iosHint) return setHelp(true)
    if (await install()) toast('Installed. Open it from your home screen or desktop.')
  }
  return (
    <>
      <button type="button" className={className} role={role} onClick={go}><Download /> {label}</button>
      {help && <IosHelp onClose={() => setHelp(false)} />}
    </>
  )
}

// A slim strip for the sign-in page and the patient's home.
export function InstallStrip({ who = 'this phone' }) {
  const { canInstall, iosHint } = useInstall()
  if (!canInstall && !iosHint) return null
  return (
    <div className="install-strip">
      <Smartphone />
      <span><b>Get the app on {who}.</b> Opens in one tap, full screen, like any other app.</span>
      <InstallButton className="btn sm primary" label="Install" />
    </div>
  )
}
