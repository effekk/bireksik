import { dayLabel, timeLabel } from '../lib/api.js'
import { USERS } from '../data/mock.js'
import Avatar from './Avatar.jsx'

const SPORT = { padel: 'Padel', halisaha: 'Halı saha' }
const STATUS = { accepted: 'Kabul edildi', declined: 'Reddedildi', cancelled: 'Geri çekildi' }

function whenText(o) {
  const m = o.kind === 'invite' ? o.match : o
  const d = m?.startsAt || o.startsAt
  if (!d) return ''
  return `${dayLabel(d)} ${timeLabel(d)}`
}

function detailLine(o) {
  if (o.kind === 'invite') {
    const m = o.match
    return m ? `${SPORT[m.sport]} · ${m.place} · ${whenText(o)}` : 'İlan'
  }
  return `${SPORT[o.sport]} · ${o.place} · ${whenText(o)}`
}

const kindTag = (o) => (o.kind === 'invite' ? 'Davet' : 'Teklif')

function Row({ o, who, children }) {
  const user = USERS[who]
  return (
    <li className="offer-row">
      <Avatar user={user || { name: '?' }} className="sm" />
      <div className="or-main">
        <div className="or-top">
          <b>{user?.name || 'Bir oyuncu'}</b>
          <span className={'or-kind ' + o.kind}>{kindTag(o)}</span>
        </div>
        <span className="or-detail">{detailLine(o)}</span>
        {o.note && <p className="or-note">“{o.note}”</p>}
      </div>
      <div className="or-side">{children}</div>
    </li>
  )
}

export default function Offers({ incoming, outgoing, onRespond, onCancel, busy }) {
  const pending = incoming.filter((o) => o.status === 'pending')
  const answered = incoming.filter((o) => o.status !== 'pending')

  return (
    <div className="offers">
      <h1>Teklifler</h1>

      <section className="panel">
        <h2>Sana gelenler {pending.length > 0 && <span className="kcount">{pending.length}</span>}</h2>
        {pending.length === 0 && <p className="meta small">Bekleyen teklif ya da davet yok.</p>}
        <ul className="offer-list">
          {pending.map((o) => (
            <Row key={o.id} o={o} who={o.from}>
              <button className="btn primary sm" disabled={busy} onClick={() => onRespond(o.id, true)}>Kabul et</button>
              <button className="btn ghost sm" disabled={busy} onClick={() => onRespond(o.id, false)}>Reddet</button>
            </Row>
          ))}
        </ul>

        {answered.length > 0 && (
          <>
            <h3 className="ksub">Geçmiş</h3>
            <ul className="offer-list">
              {answered.map((o) => (
                <Row key={o.id} o={o} who={o.from}>
                  <span className={'or-status ' + o.status}>{STATUS[o.status]}</span>
                  {o.status === 'accepted' && o.match && <a className="link" href={'#mac-' + o.match.id}>Maça git</a>}
                </Row>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Senin gönderdiklerin</h2>
        {outgoing.length === 0 && <p className="meta small">Henüz teklif ya da davet göndermedin. Bir oyuncunun profilinden gönderebilirsin.</p>}
        <ul className="offer-list">
          {outgoing.map((o) => (
            <Row key={o.id} o={o} who={o.to}>
              {o.status === 'pending'
                ? <button className="btn ghost sm" disabled={busy} onClick={() => onCancel(o.id)}>Geri çek</button>
                : <span className={'or-status ' + o.status}>{STATUS[o.status]}</span>}
              {o.status === 'accepted' && o.match && <a className="link" href={'#mac-' + o.match.id}>Maça git</a>}
            </Row>
          ))}
        </ul>
      </section>
    </div>
  )
}
