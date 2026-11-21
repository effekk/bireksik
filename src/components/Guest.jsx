import { useEffect, useRef, useState } from 'react'
import { loadPublic } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import { GuestContext } from '../lib/guest.js'
import Logo from './Logo.jsx'
import Feed from './Feed.jsx'
import MatchDetail from './MatchDetail.jsx'
import Legal from './Legal.jsx'
import Login from './Login.jsx'

// Üye olmadan girilebilecek sayfalar: karşılama + maç listesi, maç detayı, yasal metinler.
// Diğer sayfalara (maç aç, profil, kişiler, teklifler) basınca üyeliğe yönlendiririz.
function readGuestHash() {
  const h = window.location.hash.replace('#', '')
  if (h.startsWith('mac-')) return { page: 'detail', id: h.slice(4) }
  if (['gizlilik', 'kvkk', 'kosullar'].includes(h)) return { page: 'legal', which: h }
  if (['olustur', 'profil', 'kisiler', 'teklifler'].includes(h) || h.startsWith('takdir-')) return { page: 'gated' }
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

// Karşılama ekranı: hero + nasıl çalışır + canlı ilanlar + kapanış
export function Landing({ matches, onAuth, prompt }) {
  const listRef = useRef(null)
  const toList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <>
      <section className="w-hero">
        <div className="wrap">
          <span className="w-live">Şu an İzmir'de {matches.length} açık maç</span>
          <h1>Bir kişi mi eksik?<br />BirEksik'te bulursun.</h1>
          <p>İzmir'de padel partnerini, rakibini ya da halı sahaya eksik oyuncunu dakikalar içinde bul.</p>
          <div className="w-cta">
            <button type="button" className="g-btn solid big" onClick={() => onAuth('signup')}>Üye ol — ücretsiz</button>
            <button type="button" className="g-btn ghost big" onClick={toList}>İlanlara göz at ↓</button>
          </div>
          <p className="w-mini">30 saniyede hesap · Üyelik ücretsiz · Güven Puanı ile güvenli kadro</p>
        </div>
      </section>

      <section className="w-steps wrap">
        <h2>Nasıl çalışır?</h2>
        <div className="w-step-row">
          <div className="w-step"><i>🎾</i><b>Maç aç ya da bul</b><small>Padel veya halı saha — yerini ve saatini seç, ilanını aç.</small></div>
          <div className="w-step"><i>👥</i><b>Kadronu doldur</b><small>Eksik oyuncular tek tek katılır; dolunca yedek sıraya geçer.</small></div>
          <div className="w-step"><i>📍</i><b>Sahada buluş</b><small>WhatsApp grubu ve Güven Puanı ile güvenle oynayın.</small></div>
        </div>
      </section>

      <section className="w-live-list wrap" ref={listRef}>
        <div className="w-live-head">
          <h2>Canlı ilanlar</h2>
          <span>Tüm İzmir · ilçe ilçe sahalar</span>
        </div>
        <Feed hideHero matches={matches} onToggle={prompt} onShare={prompt} pending={[]} reminders={[]} onConfirm={prompt} mySports={['padel', 'halisaha']} />
        <p className="w-note">Katılmak ve oyuncuların isimlerini görmek için <button className="link" onClick={() => onAuth('signup')}>üye ol</button>.</p>
      </section>

      <section className="w-final">
        <div className="wrap">
          <h2>Bu hafta sahadaki eksiği sen tamamla.</h2>
          <button type="button" className="btn primary big" onClick={() => onAuth('signup')}>Hemen üye ol</button>
        </div>
      </section>
    </>
  )
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

  let body
  if (!loaded) body = <main className="wrap page"><div className="boot">Maçlar yükleniyor…</div></main>
  else if (err && route.page === 'maclar') body = <main className="wrap page"><div className="boot err"><p>{err}</p></div></main>
  else if (route.page === 'detail') {
    const m = matches.find((x) => x.id === route.id)
    body = (
      <main className="wrap page" key={'d' + route.id}>
        {m ? (
          <>
            <div className="guest-note">
              👀 Katılımcıların isim ve bilgileri bulanık. Görüntülemek ve maça katılmak için üye olman gerekiyor.{' '}
              <button className="link" onClick={prompt}>Üye ol</button>
            </div>
            <MatchDetail key={m.id} match={m} onToggle={prompt} onShare={prompt} onCancel={prompt} myPositions={[]} />
          </>
        ) : (
          <div className="boot"><p>Bu ilan artık yok ya da dolmuş olabilir. <button className="link" onClick={() => { window.location.hash = 'maclar' }}>İlanlara dön</button></p></div>
        )}
      </main>
    )
  } else if (route.page === 'legal') {
    body = <main className="wrap page" key={route.which}><Legal page={route.which} /></main>
  } else {
    body = <div className="page" key="landing"><Landing matches={matches} onAuth={onAuth} prompt={prompt} /></div>
  }

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
      {body}
      <footer className="foot wrap">
        <p className="foot-note">Öneri, istek ya da şikayetin mi var? <button type="button" className="link" onClick={() => onAuth('signup')}>Üye ol</button>, bize ileti bırak.</p>
        <nav className="foot-links">
          <a href="#kosullar">Kullanım Koşulları</a>
          <a href="#gizlilik">Gizlilik</a>
          <a href="#kvkk">KVKK</a>
        </nav>
        <p className="foot-copy">© {new Date().getFullYear()} BirEksik · Bir kişi mi eksik? BirEksik'te bulursun.</p>
      </footer>
    </GuestContext.Provider>
  )
}
