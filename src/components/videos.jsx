import { PlayCircle, Share2, ExternalLink, Check } from 'lucide-react'
import { Modal, useTenant, toast } from './ui'
import { db } from '../lib/store'
import { today } from '../lib/utils'

// Pulls the video id out of youtube.com/watch?v=, youtu.be/ and /shorts/ links.
export function youtubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export function VideoPlayer({ video, onClose, patientId }) {
  const id = youtubeId(video.url)
  return (
    <Modal wide title={video.title} onClose={onClose} footer={<>
      {patientId && <ShareButton video={video} patientId={patientId} />}
      <a className="btn" href={video.url} target="_blank" rel="noreferrer"><ExternalLink /> Open on YouTube</a>
      <button className="btn primary" onClick={onClose}>Done</button>
    </>}>
      {id ? (
        <div className="video-frame">
          <iframe src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <div className="video-frame placeholder">
          <PlayCircle size={42} />
          <p>This item links to a YouTube search for <strong>{video.procedure}</strong>. Paste a specific video link (or your own explainer) in the library and it will play right here.</p>
          <a className="btn primary" href={video.url} target="_blank" rel="noreferrer"><ExternalLink /> Find videos</a>
        </div>
      )}
      <span className="small muted">{video.speciality} · {video.procedure} · about {video.minutes} min</span>
    </Modal>
  )
}

export function ShareButton({ video, patientId, small }) {
  const { tid, list, user, patient } = useTenant()
  const already = list('shares').some((s) => s.patientId === patientId && s.videoId === video.id)
  const share = () => {
    db.add(tid, 'shares', { patientId, videoId: video.id, doctorId: user.refId, date: today() })
    toast(`Shared with ${patient(patientId).name}. It is now in their health record.`)
  }
  return already ? (
    <span className={`btn ${small ? 'sm' : ''}`} aria-disabled="true"><Check /> Shared</span>
  ) : (
    <button className={`btn ${small ? 'sm' : ''}`} onClick={share}><Share2 /> Share with patient</button>
  )
}

// WhatsApp share text for the clinic to send (opens WhatsApp where available).
export const whatsappLink = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
