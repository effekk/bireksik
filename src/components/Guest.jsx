import { useEffect, useState } from 'react'
import { loadPublic } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import { GuestContext } from '../lib/guest.js'
import Logo from './Logo.jsx'
import Feed from './Feed.jsx'
import MatchDetail from './MatchDetail.jsx'
import Login from './Login.jsx'

// Üye olmadan girilebilecek sayfalar: maç listesi ve maç detayı.
// Diğer sayfalara (maç aç, profil, kişiler, teklifler) basınca üyeliğe yönlendiririz.
function readGuestHash() {
  const h = window.location.hash.replace('#', '')
  if (h.startsWith('mac-')) return { page: 'detail', id: h.slice(4) }
  if (['olustur', 'profil', 'kisiler', 'teklifler', 'takdir-'].some((p) => h === p || h.startsWith('takdir-'))) return { page: 'gated' }
  return { page: 'maclar' }
}

export default function GuestGate() {
  const [authView, setAuthView] = useState(null) // null | 'login' | 'signup'
  if (authView) {
    return (
      <Login
        mode={authView}
        onBack={() => setAuthView(null)}
        onSwitch={() => setAuthView(authView === 'signup' ? 'login' : 'signup')}
      />
    )
  }
  return <GuestApp onAuth={setAuthView} />
}

function GuestApp({ onAuth }) {
  const [route, setRoute] = useState(readGuestHash)
  const [matches, setMatches] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    loadPublic().then(setMatches).catch((e) => setErr(trError(e))).finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const onHash = () => {
      const r = readGuestHash()
      if (r.page === 'gated') { onAuth('signup'); window.location.hash = 'maclar'; return }
      setRoute(r); window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [onAuth])

  const prompt = () => onAuth('signup')
  const feed = (
    <Feed matches={matches} onToggle={prompt} onShare={prompt} pending={[]} reminders={[]} onConfirm={prompt} mySports={['padel', 'halisaha']} />
  )

  let body
  if (!loaded) body = <div className="boot">Maçlar yükleniyor…</div>
  else if (err) body = <div className="boot err"><p>{err}</p></div>
  else if (route.page === 'detail') {
    const m = matches.find((x) => x.id === route.id)
    body = m ? (
      <>
        <div className="guest-note">
          👀 Katılımcıların isim ve bilgileri bulanık. Görüntülemek ve maça katılmak için üye olman gerekiyor.{' '}
          <button className="link" onClick={prompt}>Üye ol</button>
        </div>
        <MatchDetail key={m.id} match={m} onToggle={prompt} onShare={prompt} onCancel={prompt} myPositions={[]} />
      </>
    ) : feed
  } else body = feed

  return (
    <GuestContext.Provider value={true}>
      <header className="top">
        <div className="wrap top-in">
          <a href="#maclar" className="top-logo"><Logo light /></a>
          <div className="guest-auth">
            <button type="button" className="g-btn ghost" onClick={() => onAuth('login')}>Giriş yap</button>
            <button type="button" className="g-btn solid" onClick={() => onAuth('signup')}>Üye ol</button>
          </div>
        </div>
      </header>
      <div className="guest-banner">
        <div className="wrap">
          <span>Sadece bakıyorsun. Maça katılmak, maç açmak ve oyuncuları görmek için üye ol.</span>
          <span className="guest-banner-cta">
            <button type="button" className="link" onClick={() => onAuth('signup')}>Üye ol</button>
            <span aria-hidden="true"> · </span>
            <button type="button" className="link" onClick={() => onAuth('login')}>Giriş yap</button>
          </span>
        </div>
      </div>
      <main className="wrap page">{body}</main>
    </GuestContext.Provider>
  )
}
