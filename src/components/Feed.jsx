import { useState } from 'react'
import MatchCard from './MatchCard.jsx'
import Reminder from './Reminder.jsx'
import { isFull } from '../lib/match.js'
import { ME } from '../data/mock.js'

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'padel', label: 'Padel' },
  { key: 'halisaha', label: 'Halı saha' },
]

export default function Feed({ matches, onToggle, pending = [], reminders = [], onConfirm, onShare, mySports = ['padel', 'halisaha'] }) {
  // Tek spor oynayan biri listeyi direkt o sporla görür (istersen filtreden değiştirebilir)
  const [filter, setFilter] = useState(mySports.length === 1 ? mySports[0] : 'all')
  const list = matches.filter((m) => filter === 'all' || m.sport === filter)
  const open = matches.filter((m) => !isFull(m)).length
  const days = [...new Set(list.map((m) => m.day))]

  return (
    <>
      <section className="hero">
        <div>
          {(ME.name || '').trim() && <p className="greet">Merhaba {ME.name.split(' ')[0]} 👋</p>}
          <h1>Bir kişi mi eksik? BirEksik'te bulursun.</h1>
          <p>Padele partner, rakip ya da halı sahaya eksik oyuncu. Hepsi okuldan.</p>
        </div>
        <div className="hero-stat">
          <span>Bu hafta</span>
          <span className="big">{open}</span>
          <span>açık maç var</span>
        </div>
      </section>

      {reminders.map((m) => (
        <Reminder key={m.id} match={m} onConfirm={onConfirm} onCancel={onToggle} />
      ))}

      {pending.map((p) => (
        <a key={p.id} href={'#takdir-' + p.id} className="kbanner">
          <span className="kbanner-icon" aria-hidden="true">🤝</span>
          <span><b>{p.title}</b> maçın bitti. Birlikte oynadıklarını takdir etmek ister misin?</span>
          <span className="kbanner-go">Takdir et →</span>
        </a>
      ))}

      <div className="toolbar">
        <div className="chips" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} className={'chip' + (filter === f.key ? ' on' : '')} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <a href="#olustur" className="btn primary">+ Maç aç</a>
      </div>

      {days.length === 0 && (
        <div className="empty-state">
          <p>Şu an açık maç yok.</p>
          <a href="#olustur" className="btn primary">Sen bir maç aç</a>
        </div>
      )}

      {days.map((d) => (
        <section key={d} className="day">
          <h2>{d}</h2>
          <div className="cards">
            {list.filter((m) => m.day === d).sort((a, b) => a.time.localeCompare(b.time)).map((m) => (
              <MatchCard key={m.id} match={m} onToggle={onToggle} onShare={onShare} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
