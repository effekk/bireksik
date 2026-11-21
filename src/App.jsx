import { useCallback, useEffect, useState } from 'react'
import { ME, USERS } from './data/mock.js'
import { cancelOffer, createMatch, inviteToMatch, loadAll, loadNotifications, loadOffers, makeOffer, markNotificationsRead, removeParticipant, removePhoto, respondOffer, rpc, sendKudos, sendReport, uploadPhoto } from './lib/api.js'
import ShareSheet from './components/ShareSheet.jsx'
import { isFull, left, myJoin } from './lib/match.js'
import { KUDOS_WINDOW_HOURS } from './lib/kudos.js'
import Kudos from './components/Kudos.jsx'
import Header from './components/Header.jsx'
import Feed from './components/Feed.jsx'
import MatchDetail from './components/MatchDetail.jsx'
import CreateMatch from './components/CreateMatch.jsx'
import Profile from './components/Profile.jsx'
import People from './components/People.jsx'
import PublicProfile from './components/PublicProfile.jsx'
import Offers from './components/Offers.jsx'
import Legal from './components/Legal.jsx'
import Feedback from './components/Feedback.jsx'
import GuestGate from './components/Guest.jsx'
import Welcome from './components/Welcome.jsx'
import { PhotoContext } from './components/Avatar.jsx'
import { supabase, trError } from './lib/supabase.js'

// Basit sayfa yönlendirme: adres çubuğundaki #maclar, #mac-m1, #takdir-p1, #olustur, #profil
function readRoute() {
  const h = window.location.hash.replace('#', '')
  if (h.startsWith('mac-')) return { page: 'detail', id: h.slice(4) }
  if (h.startsWith('takdir-')) return { page: 'kudos', id: h.slice(7) }
  if (h.startsWith('kisi-')) return { page: 'person', id: h.slice(5) }
  if (['olustur', 'profil', 'kisiler', 'teklifler', 'gizlilik', 'kvkk', 'kosullar'].includes(h)) return { page: h }
  return { page: 'maclar' }
}

// ---------------------------------------------------------------------
// Giriş kontrolü: oturum yoksa giriş ekranı, varsa site.
// Profil (isim, puan, sporlar…) artık gerçek veritabanından geliyor.
// Maçlar şimdilik örnek veri; bir sonraki adımda onlar da veritabanına bağlanacak.
// ---------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = kontrol ediliyor
  const [profile, setProfile] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    let cancel = false
    ;(async () => {
      const uid = session.user.id
      // Profili getir; yoksa (silinmişse) otomatik yeniden oluştur
      let { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
      if (!data) {
        try { await supabase.rpc('ensure_profile') } catch { /* yoksay */ }
        ;({ data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle())
      }
      if (cancel) return
      if (!data) return setLoadErr('Profil yüklenemedi, lütfen sayfayı yenile.')
      // Giriş yapan kullanıcıyı doldur (bileşenler ME'den okur)
      Object.assign(ME, {
        id: data.id,
        name: data.name || session.user.email.split('@')[0],
        dept: data.dept,
        age: data.age || null,
        gender: data.gender || '',
        trust: data.trust,
        played: data.played,
        phone: data.phone || '',
        instagram: data.instagram || '',
        photo: data.photo_url || undefined,
      })
      USERS[data.id] = ME
      setProfile(data)
    })()
    return () => { cancel = true }
  }, [session])

  if (session === undefined) return <div className="boot">Yükleniyor…</div>
  if (!session) return <GuestGate />
  if (loadErr) return (
    <div className="boot err">
      <p>{loadErr}</p>
      <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Çıkış yap</button>
    </div>
  )
  if (!profile) return <div className="boot">Yükleniyor…</div>

  // İlk giriş: kurulumu tamamlamadıysa hoş geldin ekranı
  if (!profile.onboarded) {
    const completeOnboarding = async (f) => {
      const { data, error } = await supabase.from('profiles').update({
        name: f.name,
        age: f.age ?? null,
        gender: f.gender || null,
        sports: f.sports,
        level_padel: f.level.padel,
        level_halisaha: f.level.halisaha,
        positions: f.positions,
        phone: f.phone || null,
        instagram: f.instagram || null,
        onboarded: true,
      }).eq('id', profile.id).select().single()
      if (error) throw new Error('Kaydedilemedi: ' + error.message)
      Object.assign(ME, { name: data.name, age: data.age || null, gender: data.gender || '', instagram: data.instagram || '', photo: data.photo_url || undefined })
      setProfile(data)
    }
    return <Welcome onDone={completeOnboarding} />
  }

  return <MainApp profile={profile} setProfile={setProfile} email={session.user.email} />
}

function MainApp({ profile, setProfile, email }) {
  const [route, setRoute] = useState(readRoute)
  const [matches, setMatches] = useState([])
  const [past, setPast] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photos, setPhotos] = useState({})
  const [kudosDone, setKudosDone] = useState({}) // { maçId: true } — bu oturumda gönderilenler
  const [reports, setReports] = useState({}) // { maçId: [kullanıcıId] }
  const [shareId, setShareId] = useState(null)

  // Kısa bilgi mesajı (ekranın altında birkaç saniye görünür)
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Profil tercihleri: oynadığın sporlar, seviyelerin, halı saha pozisyonların
  const [prefs, setPrefsState] = useState({
    sports: profile.sports,
    level: { padel: profile.level_padel, halisaha: profile.level_halisaha },
    positions: profile.positions,
  })
  const setPrefs = async (next) => {
    setPrefsState(next)
    const { error } = await supabase.from('profiles').update({
      sports: next.sports,
      level_padel: next.level.padel,
      level_halisaha: next.level.halisaha,
      positions: next.positions,
    }).eq('id', profile.id)
    if (error) setToast('Kaydedilemedi: ' + trError(error))
  }
  const saveInfo = async ({ name, age, gender, phone, instagram }) => {
    const { data, error } = await supabase.from('profiles')
      .update({ name, age: age ?? null, gender: gender || null, phone: phone || null, instagram: instagram || null })
      .eq('id', profile.id).select().single()
    if (error) return setToast('Kaydedilemedi: ' + trError(error))
    Object.assign(ME, { name: data.name, age: data.age || null, gender: data.gender || '', instagram: data.instagram || '' })
    setProfile(data)
    setToast('Profilin kaydedildi.')
  }
  const logout = () => supabase.auth.signOut()
  const myPositions = prefs.sports.includes('halisaha') ? prefs.positions : []

  // Profil fotoğrafı: yükle / kaldır
  const setPhoto = async (id, file) => {
    try {
      if (file) {
        setToast('Fotoğraf yükleniyor…')
        const url = await uploadPhoto(file)
        setPhotos((p) => ({ ...p, [id]: url }))
        setToast('Fotoğrafın güncellendi.')
      } else {
        await removePhoto()
        setPhotos((p) => ({ ...p, [id]: null }))
      }
    } catch (e) {
      setToast('Fotoğraf yüklenemedi: ' + trError(e))
    }
  }

  const [notifications, setNotifications] = useState([])
  const [offers, setOffers] = useState({ incoming: [], outgoing: [] })
  const markNotifsRead = async () => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!unread.length) return
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))
    try { await markNotificationsRead(unread) } catch { /* yoksay */ }
  }

  // Veritabanından maçları yükle (açılışta, her işlemden sonra ve 30 saniyede bir)
  const reload = useCallback(async () => {
    try {
      const { upcoming, past } = await loadAll()
      setMatches(upcoming)
      setPast(past)
      loadNotifications().then(setNotifications).catch(() => {})
      loadOffers().then(setOffers).catch(() => {})
    } catch (e) {
      setToast('Maçlar yüklenemedi: ' + trError(e))
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    reload()
    const t = setInterval(reload, 30000)
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [reload])

  useEffect(() => {
    const onHash = () => { setRoute(readRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (hash) => { window.location.hash = hash }

  // Bir işlemi çalıştır, mesaj göster, listeyi yenile
  const run = async (fn, okMsg) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fn()
      const msg = typeof okMsg === 'function' ? okMsg(res) : okMsg
      if (msg) setToast(msg)
    } catch (e) {
      setToast(trError(e))
    } finally {
      await reload()
      setBusy(false)
    }
  }

  // Katıl / ayrıl / yedeğe yazıl. Kurallar sunucuda (02_functions.sql) kontrol edilir.
  const toggleJoin = (id, opts = {}) => {
    const m = matches.find((x) => x.id === id)
    if (!m) return
    const mine = myJoin(m, ME.id)
    const wait = m.waitlist || []
    if (mine) {
      return run(() => rpc('leave_match', { p_match: id }), (pen) =>
        (mine.team ? `${mine.team} maçtan çıkarıldı.` : 'Maçtan ayrıldın.') +
        (pen < 0 ? ` Güven Puanından ${-pen} düştü.` : ''))
    }
    if (wait.includes(ME.id)) return run(() => rpc('leave_waitlist', { p_match: id }), 'Yedek listesinden çıktın.')
    if (isFull(m)) {
      return run(() => rpc('join_waitlist', { p_match: id }),
        `Yedek listesine yazıldın (${wait.length + 1}. sıra). Yer açılırsa otomatik alınırsın.`)
    }
    const plus = Math.max(0, Math.min(opts.plus || 0, left(m) - 1))
    return run(
      () => rpc('join_match', { p_match: id, p_plus: plus, p_team: opts.team || null, p_pos: opts.pos || null }),
      opts.team ? `${opts.team} maça eklendi!` : opts.pos && !plus ? `Maça ${opts.pos.toLowerCase()} olarak katıldın!` : plus ? `Sen ve ${plus} arkadaşın maça katıldınız!` : 'Maça katıldın!'
    )
  }

  // Hatırlatma: "Geliyorum" onayı
  const confirmComing = (id) => run(() => rpc('confirm_attendance', { p_match: id }), 'Harika, geleceğini maçtakilere bildirdik.')

  // İlan sahibi bir katılımcıyı maçtan çıkarır
  const removePlayer = (matchId, userId) => run(() => removeParticipant(matchId, userId), 'Oyuncu maçtan çıkarıldı; bilgilendirildi.')

  // İçinde olduğun ve maça 3 saat ya da daha az kalan maçlar
  const reminders = matches.filter((m) => m.hoursLeft > 0 && m.hoursLeft <= 3 && myJoin(m, ME.id))

  // Takdir bekleyen biten maçlar
  const pending = past.filter((m) => m.hoursAgo <= KUDOS_WINDOW_HOURS && !m.given && !kudosDone[m.id])

  const submitKudos = (matchId, vals) => run(async () => {
    await sendKudos(matchId, vals)
    setKudosDone((d) => ({ ...d, [matchId]: true }))
  }, 'Takdirlerin gönderildi!')

  const report = (matchId, userId, reason, detail) => run(async () => {
    await sendReport(matchId, userId, reason, detail)
    setReports((r) => ({ ...r, [matchId]: [...(r[matchId] || []), userId] }))
  }, 'Bildirimin bize ulaştı. Teşekkürler.')

  const addMatch = (m) => run(async () => {
    const id = await createMatch(m)
    go('mac-' + id)
  }, 'Maçın yayında!')

  // Maçı açan kişi kendi maçını iptal eder (listeden kalkar)
  const cancelMatch = (id) => run(async () => {
    await rpc('cancel_match', { p_match: id })
    go('maclar')
  }, 'Maç iptal edildi.')

  // Maç teklifi / ilana davet gönder
  const sendOffer = (to, f) => run(() => makeOffer(to, f), 'Teklifin gönderildi!')
  const sendInvite = (to, matchId, note) => run(() => inviteToMatch(to, matchId, note), 'Davetin gönderildi!')

  // Gelen teklife/davete yanıt. Kabul edilince ilgili maça git.
  const answerOffer = (id, accept) => run(async () => {
    const matchId = await respondOffer(id, accept)
    if (accept && matchId) go('mac-' + matchId)
  }, accept ? 'Kabul edildi!' : 'Teklif reddedildi.')

  const withdrawOffer = (id) => run(() => cancelOffer(id), 'Teklif geri çekildi.')

  // Teklifler sekmesindeki bekleyen (gelen) sayısı
  const pendingOffers = offers.incoming.filter((o) => o.status === 'pending').length

  let body
  if (!loaded) body = <div className="boot">Maçlar yükleniyor…</div>
  else if (route.page === 'detail') {
    const m = matches.find((x) => x.id === route.id)
    body = m ? <MatchDetail key={m.id} match={m} onToggle={toggleJoin} onShare={setShareId} onCancel={cancelMatch} onRemove={removePlayer} myPositions={myPositions} /> : <Feed matches={matches} onToggle={toggleJoin} pending={pending} reminders={reminders} onConfirm={confirmComing} onShare={setShareId} mySports={prefs.sports} />
  } else if (route.page === 'kudos') {
    const pm = past.find((x) => x.id === route.id)
    body = pm
      ? <Kudos key={pm.id} match={pm} done={!!kudosDone[pm.id] || pm.given} reports={reports[pm.id] || []} onSubmit={submitKudos} onReport={report} />
      : <Feed matches={matches} onToggle={toggleJoin} pending={pending} reminders={reminders} onConfirm={confirmComing} onShare={setShareId} mySports={prefs.sports} />
  } else if (route.page === 'olustur') body = <CreateMatch onCreate={addMatch} />
  else if (route.page === 'profil') body = <Profile prefs={prefs} onPrefs={setPrefs} onSaveInfo={saveInfo} email={email} onLogout={logout} />
  else if (route.page === 'kisiler') body = <People onOpen={(id) => go('kisi-' + id)} />
  else if (route.page === 'person') body = <PublicProfile key={route.id} id={route.id} myMatches={matches.filter((m) => m.host === ME.id)} onOffer={sendOffer} onInvite={sendInvite} busy={busy} />
  else if (route.page === 'teklifler') body = <Offers incoming={offers.incoming} outgoing={offers.outgoing} onRespond={answerOffer} onCancel={withdrawOffer} busy={busy} />
  else if (['gizlilik', 'kvkk', 'kosullar'].includes(route.page)) body = <Legal page={route.page} />
  else body = <Feed matches={matches} onToggle={toggleJoin} pending={pending} reminders={reminders} onConfirm={confirmComing} onShare={setShareId} mySports={prefs.sports} />

  return (
    <PhotoContext.Provider value={{ photos, setPhoto }}>
      <Header page={route.page} notifications={notifications} onMarkRead={markNotifsRead} offerCount={pendingOffers} />
      <main className="wrap page" key={route.page + (route.id || '')}>{body}</main>
      <footer className="foot wrap">
        <Feedback />
        <nav className="foot-links">
          <a href="#kosullar">Kullanım Koşulları</a>
          <a href="#gizlilik">Gizlilik</a>
          <a href="#kvkk">KVKK</a>
          <button type="button" className="link" onClick={logout}>Çıkış yap</button>
        </nav>
        <p className="foot-copy">© {new Date().getFullYear()} BirEksik · Bir kişi mi eksik? BirEksik'te bulursun.</p>
      </footer>
      {shareId && <ShareSheet match={matches.find((x) => x.id === shareId)} onClose={() => setShareId(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </PhotoContext.Provider>
  )
}
