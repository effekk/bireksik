import Logo from './Logo.jsx'
import { ME } from '../data/mock.js'
import TrustBadge from './TrustBadge.jsx'
import Avatar from './Avatar.jsx'
import Notifications from './Notifications.jsx'

// Alt sekme çubuğu (mobil) ve üst menü (masaüstü) ikonları
const I = {
  maclar: <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5" />,
  kisiler: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19" /><path d="M16 5.5a3 3 0 0 1 0 5.8" /><path d="M20.5 19c-.4-2-1.4-3.2-3-3.9" /></>,
  olustur: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></>,
  teklifler: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  profil: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20c0-4 3.5-6 7.5-6s7.5 2 7.5 6" /></>,
}

const Ico = ({ name }) => (
  <span className="nav-ico" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{I[name]}</svg>
  </span>
)

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
              <Ico name={n.hash} />
              <span className="nav-label">{n.label}</span>
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
