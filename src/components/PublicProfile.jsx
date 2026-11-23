import { useEffect, useState } from 'react'
import { dayLabel, loadPerson, removeNote, timeLabel } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import { LEVELS, ME, SPORTS, USERS } from '../data/mock.js'
import { VENUES } from '../data/venues.js'
import { SPORT } from './MatchCard.jsx'
import VenueSelect from './VenueSelect.jsx'

// Yeni maç teklifinde spor seçilince kadro için makul varsayılan
const OFFER_SIZE = { halisaha: 14, voleybol: 12, basket: 10, tenis: 2 }
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
  const [place, setPlace] = useState('')
  const [level, setLevel] = useState('Orta')
  const [size, setSize] = useState(14)
  const [note, setNote] = useState('')

  const pickSport = (s) => { setSport(s); setPlace(''); setSize(OFFER_SIZE[s] || 14) }
  const startsAt = new Date(`${day}T${time || '00:00'}`)
  const timeOk = startsAt.getTime() > Date.now() + 5 * 60000
  const ok = timeOk && place.trim()

  const submit = (e) => {
    e.preventDefault()
    if (!ok || busy) return
    onSend({ sport, startsAt, place, level, size: sport === 'padel' ? 4 : Number(size) || 2, note: note.trim() })
  }

  return (
    <form className="offer-form panel" onSubmit={submit}>
      <h3>{name} ile maç · teklif</h3>
      <div className="seg" role="radiogroup" aria-label="Spor">
        {SPORTS.filter((s) => s.key !== 'kosu').map((s) => (
          <button type="button" key={s.key} className={'seg-btn ' + s.key + (sport === s.key ? ' on' : '')} onClick={() => pickSport(s.key)}>{s.label}</button>
        ))}
      </div>
      {sport !== 'padel' && (
        <label>Toplam kaç kişi oynanacak?
          <input type="number" min={2} max={22} value={size} onChange={(e) => setSize(e.target.value)} />
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
          <VenueSelect list={VENUES[sport]} value={place} onChange={setPlace} />
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
      {!timeOk && <p className="err">İleri bir saat seç.</p>}
      {timeOk && !place.trim() && <p className="err">Bir saha seç.</p>}
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
              <b>{SPORT[m.sport]?.label || m.sport} · {m.place}</b>
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
  const [delKey, setDelKey] = useState(null) // silme onayı bekleyen not
  const [working, setWorking] = useState(false)

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
  const delNote = async (n) => {
    setWorking(true)
    try { await removeNote(n.matchId, n.from, u.id); setDelKey(null); const fresh = await loadPerson(id); setU(fresh) }
    catch (e) { setErr(trError(e)) }
    finally { setWorking(false) }
  }

  return (
    <div className="pub-profile">
      <a href="#kisiler" className="back">← Kişiler</a>

      <section className="pp-head panel">
        <Avatar user={u} className="xl" />
        <div className="pp-id">
          <h1>{u.name}{u.dev && <span className="dev-badge" title="BirEksik geliştiricisi">⚙️ Geliştirici</span>}</h1>
          {(u.age || u.gender) && <p className="meta">{[u.age ? `${u.age} yaş` : '', u.gender].filter(Boolean).join(' · ')}</p>}
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
          {SPORTS.filter((s) => (u.sports || []).includes(s.key)).map((s) => {
            if (s.key === 'kosu') return <li key={s.key}><b>{s.label}</b><span>🏃</span></li>
            const lvl = { padel: u.levelPadel, halisaha: u.levelHalisaha, tenis: u.levelTenis, voleybol: u.levelVoleybol, basket: u.levelBasket }[s.key]
            const extra = s.key === 'halisaha' && u.positions?.length ? ` · ${u.positions.join(', ')}` : ''
            return <li key={s.key}><b>{s.label}</b><span>{lvl || 'Orta'}{extra}</span></li>
          })}
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
              {u.notes.map((n, i) => {
                const key = n.matchId + ':' + n.from
                const canDel = ME.id === n.from || ME.dev
                return (
                  <li key={key || i}>
                    <p>“{n.text}”</p>
                    <small>{USERS[n.from]?.name || 'Bir oyuncu'} · {n.tags.map((t) => KUDOS_BY_KEY[t]?.label).filter(Boolean).join(', ')}</small>
                    {canDel && (delKey === key ? (
                      <span className="note-del">
                        <button className="link danger" disabled={working} onClick={() => delNote(n)}>{working ? 'Siliniyor…' : 'Sil, eminim'}</button>
                        <button className="link" onClick={() => setDelKey(null)}>Vazgeç</button>
                      </span>
                    ) : (
                      <button className="note-del-btn" onClick={() => setDelKey(key)}>Notu sil</button>
                    ))}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
