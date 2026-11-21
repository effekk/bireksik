import { USERS } from '../data/mock.js'
import Avatar from './Avatar.jsx'
import { left, listingSeats } from '../lib/match.js'

// Sadece ilandaki yerler: katılanlar (ve getirdikleri) + boş yerler
export default function Slots({ match, max = 6 }) {
  const seats = listingSeats(match)
  const shown = seats.slice(0, max)
  const extra = seats.length - shown.length
  const empty = left(match)
  return (
    <div className="slots" aria-label={`${seats.length} dolu, ${empty} boş`}>
      {shown.map((s, i) =>
        s.guest
          ? <span key={i} className="avatar guest" title={`${USERS[s.u]?.name} ile gelen`}>+</span>
          : <Avatar key={i} user={USERS[s.u]} />
      )}
      {extra > 0 && <span className="avatar more">+{extra}</span>}
      {Array.from({ length: Math.min(empty, 4) }).map((_, i) => (
        <span key={'e' + i} className="avatar empty" />
      ))}
      {empty > 4 && <span className="avatar more">+{empty - 4}</span>}
    </div>
  )
}
