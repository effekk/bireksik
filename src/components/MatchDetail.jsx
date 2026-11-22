import { useEffect, useState } from 'react'
import { ME, USERS } from '../data/mock.js'
import TrustBadge from './TrustBadge.jsx'
import { SPORT, ShareIcon } from './MatchCard.jsx'
import Avatar, { usePhotos } from './Avatar.jsx'
import { useGuest } from '../lib/guest.js'
import { loadPeople } from '../lib/api.js'
import { topKudos } from '../lib/kudos.js'
import { instaUrl } from '../lib/util.js'
import { allSeats, freeSlots, isFull, left, myJoin, need, needText, openPositions, title } from '../lib/match.js'
import { POSITIONS } from '../data/mock.js'

// Oyuncunun instagram'ı varsa küçük bir bağlantı
function Ig({ user }) {
  if (!user?.instagram) return null
  return (
    <a className="ig-chip" href={instaUrl(user.instagram)} target="_blank" rel="noopener noreferrer" title={'@' + user.instagram} onClick={(e) => e.stopPropagation()}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
    </a>
  )
}

// Padel: 2'ye 2 kort çizimi. Üst yarı maçı açanın tarafı, alt yarı ilandan gelenler.
function PadelCourt({ match, onPick, canPick }) {
  const { photos } = usePhotos()
  const spots = [
    { x: 80, y: 70, side: 'Üst' }, { x: 220, y: 70, side: 'Üst' },
    { x: 80, y: 190, side: 'Alt' }, { x: 220, y: 190, side: 'Alt' },
  ]
  // Oyuncuları seçtikleri tarafa yerleştir (Üst = maçı açanın tarafı)
  const top = [{ u: match.host }]
  for (let i = 1; i < match.ready; i++) top.push({ u: match.host, guest: true })
  const bot = []
  for (const j of (match.joins || [])) {
    const party = [{ u: j.u }, ...Array.from({ length: j.plus || 0 }, () => ({ u: j.u, guest: true }))]
    const dest = j.pos === 'Alt' ? bot : j.pos === 'Üst' ? top : (top.length <= bot.length ? top : bot)
    dest.push(...party)
  }
  const occ = [top[0], top[1], bot[0], bot[1]]
  return (
    <svg viewBox="0 0 300 260" className="court" role="img" aria-label="Padel kortu oyuncu yerleri">
      <rect x="10" y="10" width="280" height="240" rx="14" fill="var(--court)" />
      <rect x="30" y="30" width="240" height="200" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.5" />
      <line x1="30" y1="130" x2="270" y2="130" stroke="#fff" strokeWidth="4" />
      <line x1="150" y1="65" x2="150" y2="195" stroke="#fff" strokeOpacity=".8" strokeWidth="2" />
      <line x1="30" y1="65" x2="270" y2="65" stroke="#fff" strokeOpacity=".8" strokeWidth="2" />
      <line x1="30" y1="195" x2="270" y2="195" stroke="#fff" strokeOpacity=".8" strokeWidth="2" />
      {spots.map((s, i) => {
        const o = occ[i]
        const p = o && USERS[o.u]
        if (!p) {
          const clickable = Boolean(canPick && onPick)
          return (
            <g key={i} onClick={clickable ? () => onPick(s.side) : undefined} style={clickable ? { cursor: 'pointer' } : undefined}>
              {clickable && <circle cx={s.x} cy={s.y} r="30" fill="var(--ball)" fillOpacity=".16" />}
              <circle cx={s.x} cy={s.y} r="23" fill="none" stroke="var(--ball)" strokeWidth="3" strokeDasharray="6 5" pointerEvents="none" />
              <text x={s.x} y={s.y + 8} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--ball)" pointerEvents="none">+</text>
              {clickable && <circle cx={s.x} cy={s.y} r="48" fill="transparent" pointerEvents="all" />}
            </g>
          )
        }
        if (o.guest) {
          return (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r="24" fill="#fff" fillOpacity=".55" />
              <text x={s.x} y={s.y + 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--court)">{p.name[0]}+1</text>
            </g>
          )
        }
        const photo = photos[p.id] || p.photo
        return (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="24" fill="#fff" />
            {photo ? (
              <>
                <clipPath id={'cp' + i}><circle cx={s.x} cy={s.y} r="21" /></clipPath>
                <image href={photo} x={s.x - 21} y={s.y - 21} width="42" height="42" clipPath={`url(#cp${i})`} preserveAspectRatio="xMidYMid slice" />
              </>
            ) : <text x={s.x} y={s.y + 7} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--court)">{p.name[0]}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// İlan sayfasından oyuncu davet etme paneli
function InvitePanel({ match, onInvite, onClose }) {
  const [people, setPeople] = useState(null)
  const [q, setQ] = useState('')
  const [sent, setSent] = useState({})
  useEffect(() => { loadPeople().then(setPeople).catch(() => setPeople([])) }, [])
  const taken = new Set([match.host, ...(match.joins || []).map((j) => j.u), ...(match.waitlist || []).map((w) => w.u)])
  const s = q.trim().toLowerCase()
  const list = (people || []).filter((u) => !taken.has(u.id) && (u.name || '').toLowerCase().includes(s))
  return (
    <section className="panel invite-panel">
      <div className="ip-head"><h3>Oyuncu davet et</h3><button type="button" className="link" onClick={onClose}>Kapat</button></div>
      <input className="search" placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" />
      {people === null && <p className="meta small">Yükleniyor…</p>}
      {people && list.length === 0 && <p className="meta small">Davet edilebilecek kişi bulunamadı.</p>}
      <ul className="ip-list">
        {list.slice(0, 25).map((u) => (
          <li key={u.id}>
            <Avatar user={u} />
            <span className="who"><a className="plink" href={'#kisi-' + u.id}>{u.name}</a></span>
            <TrustBadge score={u.trust} compact />
            <button type="button" className="btn sm ghost" disabled={sent[u.id]} onClick={() => { onInvite(u.id, match.id); setSent((x) => ({ ...x, [u.id]: true })) }}>
              {sent[u.id] ? 'Davet edildi ✓' : 'Davet et'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Takım modunda kaptanın tek hesaptan bütün takımı eklemesi
function TeamJoin({ match, onJoin }) {
  const [name, setName] = useState('')
  const [ok, setOk] = useState(false)
  const n = need(match)
  return (
    <form className="team-join" onSubmit={(e) => { e.preventDefault(); if (name.trim() && ok) onJoin(match.id, { plus: n - 1, team: name.trim() }) }}>
      <h3>Takımınla katıl</h3>
      <p className="meta small">Takımındaki herkesin üye olmasına gerek yok. {n} kişilik takımını sen tek başına eklersin.</p>
      <label>Takım adı
        <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Örn: Yurt FC" required />
      </label>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{n} kişilik takımımın gelmesinden ben sorumluyum. İptal ya da gelmeme cezası benim Güven Puanıma yansır.</span>
      </label>
      <button className="btn primary big" disabled={!name.trim() || !ok}>Takımımı ekle</button>
    </form>
  )
}

// Halı saha: katılırken hangi pozisyonda oynayacağını seç
function PositionPicker({ match, value, onChange, preferred }) {
  const open = openPositions(match)
  const canFree = freeSlots(match) > 0
  const options = [...POSITIONS.filter((p) => open[p]), ...(canFree ? ['Fark etmez'] : [])]
  return (
    <div className="pos-pick">
      <span>Hangi pozisyonda oynarsın?</span>
      <div className="pos-row">
        {options.map((p) => (
          <button type="button" key={p} className={'pos-tag btn-like' + (value === p ? ' on' : '') + (open[p] ? ' want' : '')} onClick={() => onChange(p)}>
            {p}{open[p] ? ' · aranıyor' : ''}{preferred.includes(p) ? ' ★' : ''}
          </button>
        ))}
      </div>
      {!canFree && <small className="meta">Kalan yerler sadece aranan pozisyonlar için.</small>}
    </div>
  )
}

// Oyuncu modunda "yanımda arkadaşım da var" seçeneği
function PlusPicker({ max, value, onChange }) {
  if (max < 1) return null
  return (
    <div className="plus">
      <span>Yanında gelecek arkadaşın var mı?</span>
      <div className="stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label="Azalt">−</button>
        <b>{value === 0 ? 'Sadece ben' : `Ben + ${value}`}</b>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value === max} aria-label="Arttır">+</button>
      </div>
    </div>
  )
}

// İlk seçili pozisyon: tercih ettiklerinden aranan biri, yoksa fark etmez, o da yoksa ilk aranan
function defaultPos(match, preferred) {
  const open = openPositions(match)
  const hit = preferred.find((p) => open[p])
  if (hit) return hit
  if (freeSlots(match) > 0) return 'Fark etmez'
  return Object.keys(open)[0] || 'Fark etmez'
}

export default function MatchDetail({ match, onToggle, onShare, onCancel, onRemove = () => {}, onInvite = () => {}, onSwitchSide = () => {}, myPositions = [] }) {
  const guest = useGuest()
  const [showInvite, setShowInvite] = useState(false)
  // Katılımcı adı: misafirde bulanık, kendinde düz, başkalarında profiline link
  const who = (uid, name) => {
    if (guest) return <span className="blurred-text">Bir üye</span>
    if (uid === ME.id) return name
    return <a className="plink" href={'#kisi-' + uid}>{name}</a>
  }
  const [plus, setPlus] = useState(0)
  const [confirming, setConfirming] = useState(null) // çıkarılmak istenen kullanıcı id
  const [askCancel, setAskCancel] = useState(false)
  const usesPos = match.sport === 'halisaha' && match.mode !== 'team'
  const [pos, setPos] = useState(() => defaultPos(match, myPositions))
  const mine = myJoin(match, ME.id)
  const full = isFull(match)
  const empty = left(match)
  const wait = match.waitlist || []
  const waiting = wait.includes(ME.id)
  const confirmed = match.confirmed || {}
  const team = match.mode === 'team'
  const host = USERS[match.host]
  const isHost = match.host === ME.id

  // Getirilen arkadaşlar "fark etmez" yerlere sayılır
  const plusMax = usesPos ? Math.max(0, Math.min(empty - 1, freeSlots(match) - (pos === 'Fark etmez' ? 1 : 0))) : empty - 1
  const joinOpts = { plus: Math.min(plus, plusMax), ...(usesPos && pos !== 'Fark etmez' ? { pos } : {}) }
  const openPos = openPositions(match)

  // Padel: boş korta tıklayınca o tarafa katıl; katıldıysan taraf değiştir
  const padelPlayers = match.sport === 'padel' && match.mode !== 'team'
  const canSwitchCourt = padelPlayers && !guest && Boolean(mine) && !mine.team && !full
  const canJoinCourt = padelPlayers && !guest && !isHost && !mine && !full
  const canPickSide = canJoinCourt || canSwitchCourt
  const pickSide = (side) => {
    if (mine) onSwitchSide(match.id, side)
    else onToggle(match.id, { pos: side, plus: Math.min(plus, Math.max(0, empty - 1)) })
  }

  let mainBtn = null
  if (isHost) mainBtn = <span className="hint">Bu maçı sen açtın. Linki paylaşarak eksikleri daha hızlı bulabilirsin.</span>
  else if (mine) mainBtn = <button className="btn big ghost" onClick={() => onToggle(match.id)}>{mine.team ? 'Takımımı çıkar' : 'Maçtan ayrıl'}</button>
  else if (waiting) mainBtn = <button className="btn big ghost" onClick={() => onToggle(match.id)}>Yedektesin ({wait.indexOf(ME.id) + 1}. sıra) · Çık</button>
  else if (full && !team) mainBtn = <button className="btn big accent" onClick={() => onToggle(match.id)}>Yedeğe yazıl</button>
  else if (!full && !team) mainBtn = <button className="btn big primary" onClick={() => onToggle(match.id, joinOpts)}>{joinOpts.plus ? `${joinOpts.plus + 1} kişi katıl` : usesPos && pos !== 'Fark etmez' ? `${pos} olarak katıl` : 'Katıl'}</button>

  return (
    <div className={'detail ' + match.sport}>
      <a href="#maclar" className="back">← Maçlar</a>
      <div className="detail-grid">
        <section className="detail-info">
          <span className={'sport-tag ' + match.sport}>{SPORT[match.sport].label}</span>
          <h1>{title(match)}</h1>
          <p className="when"><b>{match.day}</b> · {match.time}</p>
          <dl className="facts">
            <div><dt>Yer</dt><dd>{match.place}</dd></div>
            <div><dt>Seviye</dt><dd>{match.level}</dd></div>
            <div><dt>Maç</dt><dd>{match.size} kişilik · {match.ready} kişi hazır</dd></div>
            <div><dt>Puan şartı</dt><dd>{match.minTrust ? `En az ${match.minTrust}` : 'Yok'}</dd></div>
            {Object.keys(openPos).length > 0 && (
              <div className="wide"><dt>Aranan pozisyon</dt><dd>{Object.entries(openPos).map(([p, n]) => (n > 1 ? `${n} ${p}` : p)).join(', ')}</dd></div>
            )}
          </dl>
          {match.note && <p className="note">“{match.note}”</p>}

          <p className="safety-note">🛡️ Güvenliğin için tanımadığın kişilerle umumi ve kalabalık sahalarda buluş. Rahatsız edici bir durumda maçtan ayrıl ve bize bildir.</p>

          {!isHost && !mine && !waiting && !full && usesPos && <PositionPicker match={match} value={pos} onChange={(p) => { setPos(p); setPlus(0) }} preferred={myPositions} />}
          {!isHost && !mine && !waiting && !full && !team && <PlusPicker max={plusMax} value={Math.min(plus, plusMax)} onChange={setPlus} />}
          {!isHost && !mine && !full && team && <TeamJoin match={match} onJoin={onToggle} />}

          <div className="actions">
            {mainBtn}
            <button className="btn ghost big" onClick={() => onShare(match.id)}><ShareIcon /> Paylaş</button>
            {!guest && !full && <button type="button" className="btn ghost big" onClick={() => setShowInvite((v) => !v)}>👋 Oyuncu davet et</button>}
          </div>
          {showInvite && !guest && !full && <InvitePanel match={match} onInvite={onInvite} onClose={() => setShowInvite(false)} />}
          {isHost && (
            askCancel ? (
              <div className="cancel-box">
                <p>Bu maçı iptal etmek istediğine emin misin? Listeden kalkacak ve katılanlar maçta görünmeyecek.</p>
                <div className="r-actions">
                  <button type="button" className="btn ghost" onClick={() => setAskCancel(false)}>Vazgeç</button>
                  <button type="button" className="btn danger" onClick={() => onCancel(match.id)}>Evet, iptal et</button>
                </div>
              </div>
            ) : (
              <button type="button" className="link danger-link" onClick={() => setAskCancel(true)}>Maçı iptal et</button>
            )
          )}
          <div className="actions">
            {(mine || isHost) && match.wa && (
              <a className="btn wa big" href={match.wa} target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>
                WhatsApp grubuna katıl
              </a>
            )}
            {mine && !match.wa && <span className="hint">Maçı açan kişi henüz WhatsApp grubu eklemedi.</span>}
            {isHost && !match.wa && <span className="hint">WhatsApp grubu eklemedin. Katılanlarla iletişim için eklemen iyi olur.</span>}
            {!isHost && !mine && match.wa && <span className="hint">Katılınca maçın WhatsApp grubunu görebileceksin.</span>}
          </div>
        </section>

        <section className="detail-board">
          {match.sport === 'padel' && <PadelCourt match={match} onPick={pickSide} canPick={canPickSide} />}
          {canPickSide && <p className="court-hint">{mine ? 'Taraf değiştirmek için boş yere dokun.' : 'Tarafını seçmek için korttaki boş yere dokun.'}</p>}
          <h2>{needText(match)}</h2>
          <ul className="roster">
            <li className="hostrow">
              <Avatar user={host} />
              <span className="who">
                {who(match.host, host.name)}{match.ready > 1 && <small> ve {match.ready - 1} arkadaşı</small>}
                <em>Maçı açan · hazır</em>
              </span>
              <Ig user={host} />
              <TrustBadge score={host.trust} compact />
            </li>
            {(match.joins || []).map((j) => {
              const u = USERS[j.u]
              const top = topKudos(u.kudos)
              return (
                <li key={j.u}>
                  <Avatar user={u} />
                  <span className="who">
                    {j.team ? <>{j.team}<small> · {who(j.u, u.name)} (kaptan) · {j.plus + 1} kişi</small></> : <>{who(j.u, u.name)}{j.plus > 0 && <small> + {j.plus} arkadaşı</small>}</>}
                    {j.pos && <span className="pos-tag">{j.pos}</span>}
                    {j.u === ME.id && <em>Sen</em>}
                    {confirmed[j.u] && <em className="conf" title="Geleceğini onayladı">✓ Geliyor</em>}
                  </span>
                  {top && <span className="ktop" title={`${top.count} kişi "${top.label}" dedi`}><span aria-hidden="true">{top.icon}</span>{top.count}</span>}
                  <Ig user={u} />
                  <TrustBadge score={u.trust} compact />
                  {isHost && j.u !== ME.id && (
                    confirming === j.u ? (
                      <span className="rm-confirm">
                        <button type="button" className="link danger-link" onClick={() => { onRemove(match.id, j.u); setConfirming(null) }}>Çıkar</button>
                        <button type="button" className="link muted" onClick={() => setConfirming(null)}>Vazgeç</button>
                      </span>
                    ) : (
                      <button type="button" className="rm-btn" title="Maçtan çıkar" aria-label="Oyuncuyu çıkar" onClick={() => setConfirming(j.u)}>✕</button>
                    )
                  )}
                </li>
              )
            })}
            {empty > 0 && (team ? (
              <li className="open"><span className="avatar empty" /><span className="who">{empty} kişilik rakip takım bekleniyor</span></li>
            ) : [
              ...Object.entries(openPos).flatMap(([p, n]) => Array.from({ length: n }, () => p)),
              ...Array.from({ length: Math.max(0, empty - Object.values(openPos).reduce((a, b) => a + b, 0)) }, () => null),
            ].slice(0, 6).map((p, i) => (
              <li key={'e' + i} className="open"><span className="avatar empty" /><span className="who">Boş yer{p && <span className="pos-tag want">{p} aranıyor</span>}</span></li>
            )))}
            {!team && empty > 6 && <li className="open"><span className="who">+{empty - 6} boş yer daha</span></li>}
          </ul>

          {!team && (full || wait.length > 0) && (
            <div className="waitlist">
              <h3>Yedekler {wait.length > 0 && <span>({wait.length})</span>}</h3>
              {wait.length === 0 ? (
                <p className="meta small">Henüz yedek yok. Biri gelemezse ilk yedek otomatik olarak kadroya alınır.</p>
              ) : (
                <ol>
                  {wait.map((id) => (
                    <li key={id}>
                      <Avatar user={USERS[id]} className="sm2" />
                      <span className="who">{who(id, USERS[id].name)}{id === ME.id && <em>Sen</em>}</span>
                      <TrustBadge score={USERS[id].trust} compact />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
