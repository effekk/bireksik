import { useEffect, useRef, useState } from 'react'

// Üst çubuktaki bildirim zili + açılır liste
export default function Notifications({ items = [], onMarkRead }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = items.filter((n) => !n.read).length

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread) onMarkRead?.()
  }

  return (
    <div className="notif" ref={ref}>
      <button className="notif-btn" onClick={toggle} aria-label={`Bildirimler${unread ? ` (${unread} yeni)` : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop">
          <div className="notif-head">Bildirimler</div>
          {items.length === 0 ? (
            <p className="notif-empty">Henüz bildirim yok.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id} className={n.read ? '' : 'unread'}>
                  <p>{n.text}</p>
                  <small>{n.when}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
