import { ME, USERS } from '../data/mock.js'
import Slots from './Slots.jsx'
import TrustBadge from './TrustBadge.jsx'
import { useGuest } from '../lib/guest.js'
import { isFull, myJoin, needText, openPositions, title } from '../lib/match.js'

export const SPORT = {
  padel: { label: 'Padel', cls: 'padel' },
  halisaha: { label: 'Halı saha', cls: 'halisaha' },
}

export const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)

export default function MatchCard({ match, onToggle, onShare }) {
  const guest = useGuest()
  const joined = Boolean(myJoin(match, ME.id))
  const host = USERS[match.host]
  const full = isFull(match)
  const wait = match.waitlist || []
  const waiting = wait.includes(ME.id)
  const team = match.mode === 'team'
  const isHost = match.host === ME.id

  let label = 'Katıl'
  if (isHost) label = 'Senin maçın'
  else   if (joined) label = 'Ayrıl'
  else if (waiting) label = 'Yedektesin'
  else if (full) label = team ? 'Dolu' : 'Yedeğe yazıl'
  else if (team) label = 'Takımımla katıl'

  const click = () => {
    // Takımla katılım için takım adı lazım → detay sayfasında yapılır
    if (team && !joined) window.location.hash = 'mac-' + match.id
    else onToggle(match.id)
  }

  return (
    <article className={'card ' + match.sport}>
      <a href={'#mac-' + match.id} className="card-main">
        <div className="card-time">
          <span className="time">{match.time}</span>
          <span className="sport-tag">{SPORT[match.sport].label}</span>
        </div>
        <div className="card-body">
          <h3>{title(match)}</h3>
          <p className="meta">{match.place} · {match.size} kişilik · {match.level}</p>
          <div className="card-row">
            <Slots match={match} />
            <span className={'need' + (full ? ' done' : '')}>{needText(match)}</span>
            {wait.length > 0 && <span className="wait-tag">{wait.length} yedek</span>}
          </div>
          {!full && Object.keys(openPositions(match)).length > 0 && (
            <div className="pos-row">
              {Object.entries(openPositions(match)).map(([p, n]) => (
                <span key={p} className="pos-tag want">{n > 1 ? `${n} ` : ''}{p} aranıyor</span>
              ))}
            </div>
          )}
          <p className="host">
            Maçı açan: {guest ? <span className="blurred-text">Bir üye</span> : host?.name} <TrustBadge score={host?.trust ?? 0} compact />
            {match.minTrust > 0 && <span className="min">en az {match.minTrust} puan</span>}
          </p>
        </div>
      </a>
      <div className="card-btns">
        <button
          className={'btn ' + (joined || waiting ? 'ghost' : full ? 'accent' : 'primary')}
          disabled={isHost || (full && team && !joined)}
          onClick={click}
        >
          {label}
        </button>
        <button className="icon-btn" onClick={() => onShare(match.id)} aria-label="Maçı paylaş" title="Paylaş"><ShareIcon /></button>
      </div>
    </article>
  )
}
