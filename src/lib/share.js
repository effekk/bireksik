// Paylaşım metni. SITE_URL gerçek adres alınınca değişecek (örn. Vercel adresi).
import { isFull, needText } from './match.js'

export const SITE_URL = (typeof window !== 'undefined' && window.location.origin) || 'https://bireksik.pages.dev'

const EMOJI = { padel: '🎾', halisaha: '⚽' }
const NAME = { padel: 'padel', halisaha: 'halı saha' }

export function matchLink(m) {
  return `${SITE_URL}/#mac-${m.id}`
}

export function shareText(m) {
  const need = isFull(m) ? 'kadro tamam, yedek alınıyor' : needText(m).toLowerCase()
  return `${EMOJI[m.sport]} ${m.day} ${m.time} ${NAME[m.sport]} · ${need}\n${m.place} · Seviye: ${m.level}\nKatılmak için 👉 ${matchLink(m)}`
}
