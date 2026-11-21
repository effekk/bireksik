import { useEffect, useState } from 'react'
import { dayLabel, loadPerson, timeLabel } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import { LEVELS, PLACES, USERS } from '../data/mock.js'
import { left, needText } from '../lib/match.js'
import { instaUrl } from '../lib/util.js'
import Avatar from './Avatar.jsx'
import TrustBadge from './TrustBadge.jsx'
import { KUDOS, KUDOS_BY_KEY } from '../lib/kudos.js'

const pad = (n) => String(n).padStart(2, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function nextDays(n = 14) {
  const out = []
  const t = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)
    out.push({ value: isoDate(d), label: i < 2 ? dayLabel(d) : `${d.toLocaleDateString('tr-TR', { weekday: 'long' })}, ${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` })
  }
  return out
}

// --- Doğrudan maç teklifi formu ---
function OfferForm({ name, onSend, onClose, busy }) {
  const days = nextDays()
  const [sport, setSport] = useState('padel')
  const [day, setDay] = useState(isoDate(new Date()))
  const [time, setTime] = useState('19:00')
  const [place, setPlace] = useState(PLACES.padel[0])
  const [level, setLevel] = useState('Orta')
  const [size, setSize] = useState(14)
  const [note, setNote] = useState('')

  const pickSport = (s) => { setSport(s); setPlace(PLACES[s][0]) }
  const startsAt = new Date(`${day}T${time || '00:00'}`)
  const ok = startsAt.getTime() > Date.now() + 5 * 60000

  const submit = (e) => {
    e.preventDefault()
    if (!ok || busy) return
    onSend({ sport, startsAt, place, level, size: sport === 'halisaha' ? Number(size) || 14 : 4, note: note.trim() })
  }

  return (
    <form className="offer-form panel" onSubmit={submit}>
      <h3>{name} ile maç · teklif</h3>
      <div className="seg" role="radiogroup" aria-label="Spor">
        {[['padel', 'Padel'], ['halisaha', 'Halı saha']].map(([k, l]) => (
          <button type="button" key={k} className={'seg-btn ' + k + (sport === k ? ' on' : '')} onClick={() => pickSport(k)}>{l}</button>
        ))}
      </div>
      {sport === 'halisaha' && (
        <label>Toplam kaç kişi oynanacak?
          <input type="number" min={4} max={22} value={size} onChange={(e) => setSize(e.target.value)} />
          <span className="field-hint">Teklif kabul edilince ikiniz kadrodasınız, kalan yerler ilan olarak açılır.</span>
        </label>
      )}
      <div className="two">
        <label>Gün
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
        <label>Saat
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <div className="two">
        <label>Yer
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            {PLACES[sport].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Seviye
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
      </div>
      <label>Not (isteğe bağlı)
        <textarea rows={2} maxLength={200} placeholder="Örn: Raketim fazladan var, gelebilirsen süper" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {!ok && <p className="err">İleri bir saat seç.</p>}
      <div className="row-end">
        <button type="button" className="link muted" onClick={onClose}>Vazgeç</button>
        <button className="btn primary" disabled={!ok || busy}>Teklifi gönder</button>
      </div>
    </form>
  )
}

// --- Kendi ilanına davet ---
function InvitePicker({ name, myMatches, onInvite, onClose, busy }) {
  const open = (myMatches || []).filter((m) => left(m) > 0)
  const [pick, setPick] = useState(open[0]?.id || '')
  const [note, setNote] = useState('')

  if (!open.length) {
    return (
      <div className="offer-form panel">
        <h3>{name} · ilana davet</h3>
        <p className="meta">Boş yeri olan açık bir ilanın yok. Önce <a href="#olustur">Maç aç</a> kısmından ilan oluştur, sonra davet edebilirsin.</p>
        <div className="row-end"><button type="button" className="link muted" onClick={onClose}>Kapat</button></div>
      </div>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    if (!pick || busy) return
    onInvite(pick, note.trim())
  }

  return (
    <form className="offer-form panel" onSubmit={submit}>
      <h3>{name} · ilana davet</h3>
      <p className="meta small">Hangi ilanına davet ediyorsun?</p>
      <div className="invite-list">
        {open.map((m) => (
          <label key={m.id} className={'invite-opt' + (pick === m.id ? ' on' : '')}>
            <input type="radio" name="inv" checked={pick === m.id} onChange={() => setPick(m.id)} />
            <span>
              <b>{m.sport === 'padel' ? 'Padel' : 'Halı saha'} · {m.place}</b>
              <small>{m.day} {m.time} · {needText(m)}</small>
            </span>
          </label>
        ))}
      </div>
      <label>Not (isteğe bağlı)
        <textarea rows={2} maxLength={200} placeholder="Örn: Kadroyu tamamlıyoruz, bekleriz" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row-end">
        <button type="button" className="link muted" onClick={onClose}>Vazgeç</button>
        <button className="btn primary" disabled={busy}>Daveti gönder</button>
      </div>
    </form>
  )
}

export default function PublicProfile({ id, myMatches, onOffer, onInvite, busy }) {
  const [u, setU] = useState(null)
  const [err, setErr] = useState('')
  const [panel, setPanel] = useState(null) // 'offer' | 'invite' | null

  useEffect(() => {
    setU(null); setErr(''); setPanel(null)
    loadPerson(id).then(setU).catch((e) => setErr(trError(e)))
  }, [id])

  if (err) return (
    <div className="pub-profile">
      <a href="#kisiler" className="back">← Kişiler</a>
      <p className="err">{err}</p>
    </div>
  )
  if (!u) return <div className="boot">Yükleniyor…</div>

  const totalKudos = Object.values(u.kudos || {}).reduce((a, b) => a + b, 0)

  const sendOffer = async (f) => { await onOffer(u.id, f); setPanel(null) }
  const sendInvite = async (matchId, note) => { await onInvite(u.id, matchId, note); setPanel(null) }

  return (
    <div className="pub-profile">
      <a href="#kisiler" className="back">← Kişiler</a>

      <section className="pp-head panel">
        <Avatar user={u} className="xl" />
        <div className="pp-id">
          <h1>{u.name}</h1>
          {u.dept && <p className="meta">{u.dept}</p>}
          <div className="pp-badges">
            <TrustBadge score={u.trust} />
            <span className="pp-played">{u.played} maç</span>
          </div>
          {u.instagram && <a className="ig-link" href={instaUrl(u.instagram)} target="_blank" rel="noopener noreferrer">@{u.instagram}</a>}
        </div>
      </section>

      <div className="pp-actions">
        <button className={'btn primary' + (panel === 'offer' ? ' on' : '')} onClick={() => setPanel(panel === 'offer' ? null : 'offer')}>Maç teklif et</button>
        <button className={'btn ghost' + (panel === 'invite' ? ' on' : '')} onClick={() => setPanel(panel === 'invite' ? null : 'invite')}>İlanıma davet et</button>
      </div>

      {panel === 'offer' && <OfferForm name={u.name} onSend={sendOffer} onClose={() => setPanel(null)} busy={busy} />}
      {panel === 'invite' && <InvitePicker name={u.name} myMatches={myMatches} onInvite={sendInvite} onClose={() => setPanel(null)} busy={busy} />}

      <section className="panel">
        <h2>Sporlar</h2>
        {(u.sports || []).length === 0 && <p className="meta small">Belirtilmemiş.</p>}
        <ul className="pp-sports">
          {(u.sports || []).includes('padel') && <li><b>Padel</b><span>{u.levelPadel}</span></li>}
          {(u.sports || []).includes('halisaha') && (
            <li><b>Halı saha</b><span>{u.levelHalisaha}{u.positions?.length ? ` · ${u.positions.join(', ')}` : ''}</span></li>
          )}
        </ul>
      </section>

      <section className="panel kpanel">
        <h2>Takdirler <span className="kcount">{totalKudos}</span></h2>
        <div className="kbadges">
          {KUDOS.map((k) => (
            <div key={k.key} className={'kbadge' + (u.kudos[k.key] ? '' : ' zero')}>
              <span className="kb-icon" aria-hidden="true">{k.icon}</span>
              <b>{u.kudos[k.key] || 0}</b>
              <span>{k.label}</span>
            </div>
          ))}
        </div>
        {u.notes?.length > 0 && (
          <>
            <h3 className="ksub">Oyunculardan notlar</h3>
            <ul className="knotes read">
              {u.notes.map((n, i) => (
                <li key={i}>
                  <p>“{n.text}”</p>
                  <small>{USERS[n.from]?.name || 'Bir oyuncu'} · {n.tags.map((t) => KUDOS_BY_KEY[t]?.label).filter(Boolean).join(', ')}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
