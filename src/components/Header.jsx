import Logo from './Logo.jsx'
import { ME } from '../data/mock.js'
import TrustBadge from './TrustBadge.jsx'
import Avatar from './Avatar.jsx'
import Notifications from './Notifications.jsx'

const NAV = [
  { hash: 'maclar', label: 'Maçlar', pages: ['maclar', 'detail'] },
  { hash: 'kisiler', label: 'Kişiler', pages: ['kisiler', 'person'] },
  { hash: 'olustur', label: 'Maç aç', pages: ['olustur'] },
  { hash: 'teklifler', label: 'Teklifler', pages: ['teklifler'] },
  { hash: 'profil', label: 'Profil', pages: ['profil'] },
]

export default function Header({ page, notifications = [], onMarkRead, offerCount = 0 }) {
  return (
    <header className="top">
      <div className="wrap top-in">
        <a href="#maclar" className="top-logo"><Logo light /></a>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.hash} href={'#' + n.hash} className={n.pages.includes(page) ? 'on' : ''}>
              {n.label}
              {n.hash === 'teklifler' && offerCount > 0 && <span className="nav-badge">{offerCount > 9 ? '9+' : offerCount}</span>}
            </a>
          ))}
        </nav>
        <Notifications items={notifications} onMarkRead={onMarkRead} />
        <a href="#profil" className="me">
          <Avatar user={ME} className="sm" />
          <TrustBadge score={ME.trust} compact />
        </a>
      </div>
    </header>
  )
}
