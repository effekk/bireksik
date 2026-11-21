import { useState } from 'react'
import { sendFeedback } from '../lib/api.js'
import { trError } from '../lib/supabase.js'

const KINDS = [['oneri', 'Öneri'], ['istek', 'İstek'], ['sikayet', 'Şikayet'], ['iletisim', 'İletişim']]

export default function Feedback() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('oneri')
  const [msg, setMsg] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !msg.trim()) return
    setBusy(true); setErr('')
    try {
      await sendFeedback({ kind, message: msg, contact })
      setDone(true); setMsg(''); setContact('')
    } catch (x) { setErr(trError(x)) } finally { setBusy(false) }
  }

  return (
    <div className="fb">
      <button type="button" className="fb-toggle" onClick={() => { setOpen((o) => !o); setDone(false) }}>
        İletişim · İstek · Şikayet · Öneri {open ? '▴' : '▾'}
      </button>
      {open && (
        done ? (
          <p className="fb-done">Teşekkürler! Mesajın bize ulaştı. 🙌</p>
        ) : (
          <form className="fb-form" onSubmit={submit}>
            <div className="fb-kinds">
              {KINDS.map(([k, l]) => (
                <button type="button" key={k} className={'fb-kind' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>
              ))}
            </div>
            <textarea rows={3} maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Yazmak istediğin her şey: fikrin, sorunun, isteğin…" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Dönüş için e-posta/Instagram (isteğe bağlı)" autoCapitalize="none" />
            {err && <p className="err">{err}</p>}
            <button className="btn primary" disabled={busy || !msg.trim()}>{busy ? 'Gönderiliyor…' : 'Gönder'}</button>
          </form>
        )
      )}
    </div>
  )
}
