import { useState } from 'react'
import { ME } from '../data/mock.js'
import { penaltyFor } from '../lib/trust.js'

// Maçtan ~3 saat önce çıkan "Hâlâ geliyor musun?" kartı
export default function Reminder({ match, onConfirm, onCancel }) {
  const [asking, setAsking] = useState(false)
  const pts = penaltyFor(match.hoursLeft)
  const hasBackup = (match.waitlist || []).length > 0
  const confirmed = match.confirmed?.[ME.id]
  const emoji = match.sport === 'padel' ? '🎾' : '⚽'

  if (confirmed) {
    return (
      <div className="remind ok-state">
        <span className="r-icon" aria-hidden="true">✅</span>
        <span><b>{match.time}</b> maçına geleceğini onayladın. İyi maçlar!</span>
        <a href={'#mac-' + match.id} className="r-link">Maça git →</a>
      </div>
    )
  }

  return (
    <div className="remind">
      <span className="r-icon" aria-hidden="true">{emoji}</span>
      <div className="r-body">
        <p><b>Bugün {match.time}</b> · {match.place}. Maça {Math.max(1, Math.round(match.hoursLeft))} saat kaldı. Hâlâ geliyor musun?</p>
        {asking ? (
          <div className="r-warn">
            <p>
              Şimdi iptal edersen Güven Puanından <b>{pts}</b> düşecek.
              {hasBackup ? ' Yedek listesinde biri var, yerine o alınacağı için ceza yarıya inecek: ' : ' '}
              {hasBackup && <b>{Math.round(pts / 2)}</b>}
            </p>
            <div className="r-actions">
              <button type="button" className="btn ghost" onClick={() => setAsking(false)}>Vazgeç</button>
              <button type="button" className="btn danger" onClick={() => onCancel(match.id)}>Yine de iptal et</button>
            </div>
          </div>
        ) : (
          <div className="r-actions">
            <button type="button" className="btn primary" onClick={() => onConfirm(match.id)}>✅ Geliyorum</button>
            <button type="button" className="btn ghost" onClick={() => setAsking(true)}>Gelemiyorum</button>
          </div>
        )}
      </div>
    </div>
  )
}
