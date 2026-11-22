// Maç (ilan) yardımcıları
//
// Bir ilan şöyle düşünülür:
//   size  : maçta toplam kaç kişi oynayacak (örn. halı saha 14)
//   ready : maçı açanın tarafında zaten hazır olan kişi sayısı (kendisi dahil, uygulamada olmaları gerekmez)
//   need  : ilanda aranan kişi sayısı = size - ready
//   joins : ilana katılanlar. Her katılım TEK hesaptan yapılır:
//           { u: 'kullanıcıId', plus: yanında getirdiği kişi sayısı, team?: 'takım adı' }
//   mode  : 'players' → tek tek ya da arkadaşıyla katılınır
//           'team'    → bir kaptan bütün rakip takımı tek seferde ekler
//
// Getirilen kişilerin (plus) uygulamaya üye olması gerekmez; sorumluluk katılan hesaptadır.

export const need = (m) => m.size - m.ready
export const filled = (m) => (m.joins || []).reduce((a, j) => a + 1 + (j.plus || 0), 0)
export const left = (m) => Math.max(0, need(m) - filled(m))
export const isFull = (m) => left(m) === 0
export const myJoin = (m, uid) => (m.joins || []).find((j) => j.u === uid)

// Pozisyonlar (halı saha). wanted: { Kaleci: 1, Defans: 2 } → ilanda aranan pozisyonlar
// Katılanın seçtiği pozisyon j.pos olarak tutulur; getirdiği arkadaşlar "fark etmez" sayılır.
export function openPositions(m) {
  const out = { ...(m.wanted || {}) }
  for (const j of m.joins || []) if (j.pos && out[j.pos] > 0) out[j.pos]--
  return Object.fromEntries(Object.entries(out).filter(([, n]) => n > 0))
}
export const openPosCount = (m) => Object.values(openPositions(m)).reduce((a, b) => a + b, 0)
// Pozisyonu serbest (fark etmez) kalan yer sayısı
export const freeSlots = (m) => Math.max(0, left(m) - openPosCount(m))

export function title(m) {
  if (m.sport === 'kosu') return isFull(m) ? 'Eşlikçi bulundu' : 'Eşlikçi aranıyor'
  if (isFull(m)) return 'Kadro tamam'
  if (m.mode === 'team') return m.sport === 'padel' ? 'Rakip ikili arıyoruz' : 'Rakip takım arıyoruz'
  if (m.sport === 'padel' && m.ready === 1 && filled(m) === 0) return 'Partner ve rakip arıyorum'
  return `${left(m)} kişi eksik`
}

export function needText(m) {
  if (m.sport === 'kosu') return isFull(m) ? 'Eşlikçi bulundu' : 'Eşlikçi aranıyor'
  if (isFull(m)) return 'Kadro tamam'
  if (m.mode === 'team') return `${need(m)} kişilik takım aranıyor`
  return `${left(m)} kişi aranıyor`
}

// Kart ve kort çizimi için koltuk listesi (sadece ilandaki yerler)
export function listingSeats(m) {
  const seats = []
  for (const j of m.joins || []) {
    seats.push({ u: j.u, guest: false })
    for (let i = 0; i < (j.plus || 0); i++) seats.push({ u: j.u, guest: true })
  }
  return seats
}

// Kortun tamamı: önce maçı açanın hazır grubu, sonra ilana katılanlar
export function allSeats(m) {
  const seats = [{ u: m.host, guest: false }]
  for (let i = 1; i < m.ready; i++) seats.push({ u: m.host, guest: true })
  return seats.concat(listingSeats(m))
}
