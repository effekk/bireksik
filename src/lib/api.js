// Veritabanı ile konuşan bütün fonksiyonlar burada.
// Veritabanındaki satırları, bileşenlerin kullandığı şekle çevirir.
import { supabase } from './supabase.js'
import { ME, USERS } from '../data/mock.js'

// İletişim / geri bildirim gönder
export async function sendFeedback({ kind, message, contact }) {
  const { error } = await supabase.from('feedback').insert({
    user_id: ME.id, kind, message: message.trim(), contact: contact?.trim() || null,
  })
  if (error) throw error
}

const KUDOS_WINDOW_H = 48
const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function dayLabel(date) {
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000)
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Yarın'
  if (diff === -1) return 'Dün'
  if (diff > 1 && diff < 7) return DAY_NAMES[date.getDay()]
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

export const timeLabel = (date) => date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

function toUser(p, counts) {
  return {
    id: p.id,
    name: p.name || 'İsimsiz',
    dept: p.dept,
    trust: p.trust,
    photo: p.photo_url || undefined,
    positions: p.positions,
    instagram: p.instagram || '',
    kudos: counts[p.id] || {},
  }
}

const one = (x) => (Array.isArray(x) ? x[0] : x)

// Maç satırını bileşenlerin beklediği şekle çevir
function toMatch(r) {
  const start = new Date(r.starts_at)
  const joins = (r.joins || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  const wait = (r.waitlist || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  return {
    id: r.id,
    sport: r.sport,
    mode: r.mode,
    start,
    day: dayLabel(start),
    time: timeLabel(start),
    hoursLeft: (start - Date.now()) / 3600000,
    place: r.place,
    level: r.level,
    size: r.size,
    ready: r.ready,
    wanted: r.wanted || {},
    joins: joins.map((j) => ({ u: j.user_id, plus: j.plus, ...(j.team ? { team: j.team } : {}), ...(j.pos ? { pos: j.pos } : {}) })),
    waitlist: wait.map((w) => w.user_id),
    confirmed: Object.fromEntries(joins.filter((j) => j.confirmed).map((j) => [j.user_id, true])),
    host: r.host,
    minTrust: r.min_trust,
    note: r.note,
    wa: one(r.match_private)?.wa_link || undefined,
  }
}

// Ana sayfa için her şeyi yükle: yaklaşan maçlar + takdir bekleyen biten maçlar
export async function loadAll() {
  // Biten maçların +2 puanını al (her maç bir kez; sunucu kontrol eder)
  await supabase.rpc('settle_my_matches').then(() => {}, () => {})
  const since = new Date(Date.now() - KUDOS_WINDOW_H * 3600000).toISOString()
  const { data: rows, error } = await supabase
    .from('matches')
    .select('*, joins(*), waitlist(*), match_private(wa_link)')
    .eq('status', 'open')
    .gte('starts_at', since)
    .order('starts_at')
  if (error) throw error

  // Maçlarda geçen herkesin profilini ve rozet sayılarını getir
  const ids = new Set([ME.id])
  for (const r of rows) {
    ids.add(r.host)
    for (const j of r.joins || []) ids.add(j.user_id)
    for (const w of r.waitlist || []) ids.add(w.user_id)
  }
  const idList = [...ids].filter(Boolean)
  const [{ data: profs, error: e1 }, { data: kc, error: e2 }, { data: given, error: e3 }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', idList),
    supabase.from('kudos_counts').select('*').in('user_id', idList),
    supabase.from('kudos').select('match_id').eq('from_user', ME.id),
  ])
  if (e1 || e2 || e3) throw e1 || e2 || e3

  const counts = {}
  for (const c of kc) (counts[c.user_id] ||= {})[c.tag] = c.count
  for (const p of profs) {
    if (p.id === ME.id) {
      Object.assign(ME, { trust: p.trust, played: p.played, photo: p.photo_url || undefined, phone: p.phone || '', instagram: p.instagram || '', kudos: counts[p.id] || {} })
      USERS[p.id] = ME
    } else {
      USERS[p.id] = toUser(p, counts)
    }
  }

  const now = Date.now()
  const all = rows.map(toMatch)
  const upcoming = all.filter((m) => m.start > now)

  // Biten, içinde olduğum ve henüz takdir etmediğim maçlar
  const givenSet = new Set(given.map((g) => g.match_id))
  const past = all
    .filter((m) => m.start <= now)
    .filter((m) => m.host === ME.id || m.joins.some((j) => j.u === ME.id))
    .map((m) => {
      const players = [m.host, ...m.joins.map((j) => j.u)].filter((v, i, a) => a.indexOf(v) === i)
      return {
        id: m.id,
        sport: m.sport,
        title: `${m.sport === 'padel' ? 'Padel' : 'Halı saha'} · ${m.place}`,
        when: `${m.day} ${m.time}`,
        hoursAgo: (now - m.start) / 3600000,
        players,
        given: givenSet.has(m.id),
      }
    })
    .filter((p) => p.players.length > 1)

  return { upcoming, past }
}

// Maç aç
export async function createMatch(f) {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      host: ME.id,
      sport: f.sport,
      mode: f.mode,
      starts_at: f.startsAt.toISOString(),
      place: f.place,
      level: f.level,
      size: f.size,
      ready: f.ready,
      wanted: f.wanted || {},
      min_trust: f.minTrust,
      note: f.note,
    })
    .select('id')
    .single()
  if (error) throw error
  if (f.wa) {
    const { error: e2 } = await supabase.from('match_private').insert({ match_id: data.id, wa_link: f.wa })
    if (e2) throw e2
  }
  return data.id
}

// Kurallar sunucuda (02_functions.sql) çalışır
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

// Takdirleri gönder: vals = { kullanıcıId: { tags, note } }
export async function sendKudos(matchId, vals) {
  for (const [to, v] of Object.entries(vals)) {
    if (!v.tags.length) continue
    await rpc('give_kudos', { p_match: matchId, p_to: to, p_tags: v.tags, p_note: v.note || '' })
  }
}

export async function sendReport(matchId, reported, reason, detail) {
  const { error } = await supabase.from('reports').insert({ match_id: matchId, reporter: ME.id, reported, reason, detail: detail || '' })
  if (error) throw error
}

// Profil: bana gelen notlar ve puan geçmişi
export async function loadMyProfileExtras() {
  const [{ data: notes, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    supabase.from('kudos').select('match_id, from_user, tags, note, note_public, created_at').eq('to_user', ME.id).order('created_at', { ascending: false }),
    supabase.from('trust_events').select('*').eq('user_id', ME.id).order('created_at', { ascending: false }).limit(20),
  ])
  if (e1 || e2) throw e1 || e2
  // Not yazanların isimleri
  const missing = [...new Set(notes.map((n) => n.from_user))].filter((id) => !USERS[id])
  if (missing.length) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', missing)
    for (const p of profs || []) USERS[p.id] = toUser(p, {})
  }
  ME.cancels = events.filter((e) => e.delta < 0).length
  return {
    notes: notes.map((n) => ({ id: n.match_id + ':' + n.from_user, matchId: n.match_id, from: n.from_user, tags: n.tags, text: n.note, public: n.note_public })),
    history: events.map((e) => ({ what: e.reason, when: dayLabel(new Date(e.created_at)), delta: e.delta })),
  }
}

export async function setNotePublic(matchId, from, value) {
  const { error } = await supabase.from('kudos').update({ note_public: value })
    .eq('match_id', matchId).eq('from_user', from).eq('to_user', ME.id)
  if (error) throw error
}

// Profil fotoğrafı: tarayıcıda küçült ve profile metin olarak kaydet.
// Supabase depolama servisine hiç dokunmuyoruz; her şey normal veritabanı yolundan
// (profiles.photo_url) gidiyor — maçlar ve profil gibi, sorunsuz çalışan yol.
function shrinkToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      let q = 0.8
      let out = canvas.toDataURL('image/jpeg', q)
      while (out.length > 60000 && q > 0.4) { q -= 0.15; out = canvas.toDataURL('image/jpeg', q) }
      resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotoğraf okunamadı. Başka bir dosya dene.')) }
    img.src = url
  })
}

export async function uploadPhoto(file) {
  const dataUrl = await shrinkToDataUrl(file)
  const { error } = await supabase.from('profiles').update({ photo_url: dataUrl }).eq('id', ME.id)
  if (error) throw error
  ME.photo = dataUrl
  return dataUrl
}

export async function removePhoto() {
  const { error } = await supabase.from('profiles').update({ photo_url: null }).eq('id', ME.id)
  if (error) throw error
  ME.photo = undefined
}


// ---------- Bildirimler ----------
function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (sec < 60) return 'az önce'
  const m = Math.floor(sec / 60); if (m < 60) return m + ' dk önce'
  const h = Math.floor(m / 60); if (h < 24) return h + ' saat önce'
  const d = Math.floor(h / 24); return d + ' gün önce'
}

export async function loadNotifications() {
  const { data, error } = await supabase
    .from('notifications').select('*').eq('user_id', ME.id)
    .order('created_at', { ascending: false }).limit(30)
  if (error) throw error
  return data.map((n) => ({ id: n.id, kind: n.kind, text: n.text, matchId: n.match_id, read: n.read, when: timeAgo(n.created_at) }))
}

export async function markNotificationsRead(ids) {
  if (!ids || !ids.length) return
  await supabase.from('notifications').update({ read: true }).in('id', ids)
}


// ---------- Kişiler (profil arama) ----------
// Profil satırını, kişi kartı/profili için gereken tüm alanlarla çevir
function fullUser(p, counts) {
  return {
    id: p.id,
    name: p.name || 'İsimsiz',
    dept: p.dept || '',
    trust: p.trust,
    played: p.played,
    photo: p.photo_url || undefined,
    sports: p.sports || [],
    levelPadel: p.level_padel,
    levelHalisaha: p.level_halisaha,
    positions: p.positions || [],
    instagram: p.instagram || '',
    kudos: counts[p.id] || {},
  }
}

// Kurulumunu tamamlamış bütün oyuncular (kendim hariç). Okul küçük; hepsini çekmek yeterli.
export async function loadPeople() {
  const [{ data: profs, error }, { data: kc }] = await Promise.all([
    supabase.from('profiles').select('*').eq('onboarded', true).neq('id', ME.id).order('name'),
    supabase.from('kudos_counts').select('*'),
  ])
  if (error) throw error
  const counts = {}
  for (const c of kc || []) (counts[c.user_id] ||= {})[c.tag] = c.count
  const people = profs.map((p) => fullUser(p, counts))
  for (const u of people) USERS[u.id] = USERS[u.id] || u
  return people
}

// Tek bir kişinin profili: bilgiler + rozetler + profilinde açık notlar
export async function loadPerson(id) {
  const [{ data: p, error }, { data: kc }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('kudos_counts').select('*').eq('user_id', id),
    supabase.from('kudos').select('note, tags, from_user').eq('to_user', id).eq('note_public', true).order('created_at', { ascending: false }).limit(12),
  ])
  if (error) throw error
  if (!p) throw new Error('Kişi bulunamadı.')
  const counts = {}
  for (const c of kc || []) (counts[id] ||= {})[c.tag] = c.count
  const u = fullUser(p, counts)
  USERS[id] = u
  const froms = [...new Set((notes || []).map((n) => n.from_user))].filter((x) => !USERS[x])
  if (froms.length) {
    const { data: fp } = await supabase.from('profiles').select('id, name, photo_url').in('id', froms)
    for (const x of fp || []) USERS[x.id] = { id: x.id, name: x.name || 'Bir oyuncu', photo: x.photo_url || undefined }
  }
  u.notes = (notes || []).filter((n) => n.note).map((n) => ({ from: n.from_user, tags: n.tags, text: n.note }))
  return u
}


// ---------- Teklifler ve davetler ----------
export async function loadOffers() {
  const { data, error } = await supabase
    .from('offers')
    .select('*, match:matches(id, sport, place, starts_at, status)')
    .or(`from_user.eq.${ME.id},to_user.eq.${ME.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error

  // İlgili kişilerin isimleri
  const ids = new Set()
  for (const o of data) { ids.add(o.from_user); ids.add(o.to_user) }
  const miss = [...ids].filter((id) => id && id !== ME.id && !USERS[id])
  if (miss.length) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', miss)
    for (const p of profs || []) USERS[p.id] = fullUser(p, {})
  }

  const map = (o) => ({
    id: o.id,
    kind: o.kind,
    status: o.status,
    from: o.from_user,
    to: o.to_user,
    sport: o.sport,
    place: o.place,
    level: o.level,
    size: o.size,
    note: o.note,
    startsAt: o.starts_at ? new Date(o.starts_at) : null,
    match: o.match ? { id: o.match.id, sport: o.match.sport, place: o.match.place, startsAt: new Date(o.match.starts_at), status: o.match.status } : null,
    when: timeAgo(o.created_at),
  })
  return {
    incoming: data.filter((o) => o.to_user === ME.id).map(map),
    outgoing: data.filter((o) => o.from_user === ME.id).map(map),
  }
}

// f: { sport, startsAt(Date), place, level, size, note }
export const makeOffer = (to, f) =>
  rpc('make_offer', { p_to: to, p_sport: f.sport, p_starts_at: f.startsAt.toISOString(), p_place: f.place, p_level: f.level, p_size: f.size || null, p_note: f.note || '' })

export const inviteToMatch = (to, matchId, note) =>
  rpc('invite_to_match', { p_to: to, p_match: matchId, p_note: note || '' })

export const respondOffer = (id, accept) => rpc('respond_offer', { p_offer: id, p_accept: accept })

export const cancelOffer = (id) => rpc('cancel_offer', { p_offer: id })
