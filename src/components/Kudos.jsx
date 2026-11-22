import { useState } from 'react'
import { ME, USERS } from '../data/mock.js'
import { KUDOS, KUDOS_WINDOW_HOURS, NOTE_MAX, REPORT_REASONS } from '../lib/kudos.js'
import Avatar from './Avatar.jsx'

// Maç sonrası "Takdir et" ekranı.
// Sadece o maçta birlikte oynadığın kişiler, maç başına kişi başı bir kez, maçtan sonra 48 saat.
// Takdirler Güven Puanını etkilemez. Olumsuz durumlar sadece gizli "Bildir" ile yöneticiye gider.

function ReportBox({ user, onCancel, onSend }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  return (
    <div className="report">
      <p>
        <b>{user.name}</b> hakkında bildirim. Bunu sadece BirEksik yöneticileri görür,{' '}
        {user.name.split(' ')[0]} görmez.
      </p>
      <div className="kchips">
        {REPORT_REASONS.map((r) => (
          <button type="button" key={r} className={'kchip' + (reason === r ? ' on' : '')} onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <textarea rows={2} maxLength={300} placeholder="Ne oldu? (isteğe bağlı)" value={detail} onChange={(e) => setDetail(e.target.value)} />
      <div className="report-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Vazgeç</button>
        <button type="button" className="btn danger" disabled={!reason} onClick={() => onSend(reason, detail)}>Bildir</button>
      </div>
    </div>
  )
}

function PlayerCard({ user, value, onChange, reported, onReport }) {
  const [reporting, setReporting] = useState(false)
  const tags = value.tags
  const toggle = (k) =>
    onChange({ ...value, tags: tags.includes(k) ? tags.filter((x) => x !== k) : [...tags, k] })

  return (
    <li className="kcard">
      <div className="kcard-head">
        <Avatar user={user} />
        <b>{user.name}</b>
        {!reported && !reporting && (
          <button type="button" className="link muted report-link" onClick={() => setReporting(true)}>Bildir</button>
        )}
      </div>

      {reported ? (
        <p className="reported">Bildirimin bize ulaştı. Teşekkürler.</p>
      ) : reporting ? (
        <ReportBox user={user} onCancel={() => setReporting(false)} onSend={(r, d) => { setReporting(false); onReport(r, d) }} />
      ) : (
        <>
          <div className="kchips">
            {KUDOS.map((k) => (
              <button
                type="button"
                key={k.key}
                className={'kchip' + (tags.includes(k.key) ? ' on' : '')}
                aria-pressed={tags.includes(k.key)}
                onClick={() => toggle(k.key)}
              >
                <span aria-hidden="true">{k.icon}</span>{k.label}
              </button>
            ))}
          </div>
          {tags.length > 0 && (
            <label className="knote">
              Kısa bir not (isteğe bağlı, sadece {user.name.split(' ')[0]} görür)
              <input maxLength={NOTE_MAX} placeholder="Örn: Yine oynayalım!" value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
              <small>{value.note.length}/{NOTE_MAX}</small>
            </label>
          )}
        </>
      )}
    </li>
  )
}

export default function Kudos({ match, done, reports, onSubmit, onReport }) {
  const others = match.players.filter((id) => id !== ME.id)
  const [vals, setVals] = useState(() => Object.fromEntries(others.map((id) => [id, { tags: [], note: '' }])))
  const closed = match.hoursAgo > KUDOS_WINDOW_HOURS
  const left = Math.max(1, Math.ceil(KUDOS_WINDOW_HOURS - match.hoursAgo))
  const chosen = others.filter((id) => vals[id].tags.length > 0).length

  if (done) {
    return (
      <div className="kudos kdone">
        <span className="kdone-icon" aria-hidden="true">🤝</span>
        <h1>Takdirlerin gönderildi</h1>
        <p className="meta">Rozetler arkadaşlarının profillerinde görünecek.</p>
        <a href="#maclar" className="btn primary">Maçlara dön</a>
      </div>
    )
  }

  return (
    <div className="kudos">
      <a href="#maclar" className="back">← Maçlar</a>
      <h1>Kimi takdir etmek istersin?</h1>
      <p className="meta">{match.title} · {match.when}</p>

      {closed ? (
        <p className="kclosed">Bu maçın takdir süresi doldu. Takdirler maçtan sonraki {KUDOS_WINDOW_HOURS} saat içinde verilebiliyor.</p>
      ) : (
        <>
          <p className="kinfo">
            Rozetler profillerde herkese görünür, notları sadece alan kişi görür. Takdirler Güven Puanını etkilemez.
            Takdir için {left} saatin kaldı.
          </p>
          <ul className="klist">
            {others.map((id) => (
              <PlayerCard
                key={id}
                user={USERS[id]}
                value={vals[id]}
                onChange={(v) => setVals((s) => ({ ...s, [id]: v }))}
                reported={reports.includes(id)}
                onReport={(r, d) => onReport(match.id, id, r, d)}
              />
            ))}
          </ul>
          <div className="ksubmit">
            <button type="button" className="btn primary big" disabled={chosen === 0} onClick={() => onSubmit(match.id, vals)}>
              Takdirleri gönder
            </button>
            <span className="meta">{chosen > 0 ? `${chosen} kişiye rozet seçtin` : 'En az bir kişiye rozet seç'}</span>
          </div>
        </>
      )}
    </div>
  )
}
