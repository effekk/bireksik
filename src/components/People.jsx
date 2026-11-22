import { useEffect, useMemo, useState } from 'react'
import { loadPeople } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import Avatar from './Avatar.jsx'
import TrustBadge from './TrustBadge.jsx'
import { topKudos } from '../lib/kudos.js'
import { SPORTS } from '../data/mock.js'

const SPORT_LABEL = Object.fromEntries(SPORTS.map((s) => [s.key, s.label]))

// Kişinin oynadığı sporları ve seviyelerini tek satırda göster
function sportSummary(u) {
  const lvl = {
    padel: u.levelPadel, halisaha: u.levelHalisaha, tenis: u.levelTenis,
    voleybol: u.levelVoleybol, basket: u.levelBasket,
  }
  return (u.sports || []).map((s) => {
    const label = SPORT_LABEL[s] || s
    if (s === 'kosu') return label
    return `${label} · ${lvl[s] || 'Orta'}`
  }).join('   ·   ')
}

const lower = (s) => (s || '').toLocaleLowerCase('tr')

export default function People({ onOpen }) {
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    loadPeople().then(setPeople).catch((e) => setErr(trError(e)))
  }, [])

  const list = useMemo(() => {
    if (!people) return []
    const s = lower(q.trim())
    if (!s) return people
    return people.filter((u) => lower(u.name).includes(s))
  }, [people, q])

  return (
    <div className="people">
      <h1>Kişiler</h1>
      <p className="meta">Oyuncu ara; profiline bak, maç teklif et ya da ilanına davet et.</p>
      <input className="search" placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" />

      {err && <p className="err">{err}</p>}
      {!people && !err && <p className="meta">Yükleniyor…</p>}
      {people && list.length === 0 && <p className="meta">{q ? 'Eşleşen kişi bulunamadı.' : 'Henüz başka oyuncu yok.'}</p>}

      <div className="people-grid">
        {list.map((u) => {
          const top = topKudos(u.kudos)
          return (
            <button key={u.id} className="person-card" onClick={() => onOpen(u.id)}>
              <Avatar user={u} className="lg" />
              <div className="pc-main">
                <b>{u.name}</b>
                <span className="pc-sport">{sportSummary(u)}</span>
              </div>
              <div className="pc-side">
                <TrustBadge score={u.trust} compact />
                {top && <span className="pc-kudos" title={top.label}>{top.icon} {top.count}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
