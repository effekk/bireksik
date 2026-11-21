// Takdir rozetleri — sadece olumlu, Güven Puanını ETKİLEMEZ
export const KUDOS = [
  { key: 'fairplay', icon: '🤝', label: 'Fair play' },
  { key: 'skill', icon: '⚡', label: 'İyi oyuncu' },
  { key: 'ontime', icon: '⏰', label: 'Dakik' },
  { key: 'fun', icon: '😄', label: 'Keyifli' },
  { key: 'team', icon: '🧠', label: 'Takım oyuncusu' },
]

export const KUDOS_BY_KEY = Object.fromEntries(KUDOS.map((k) => [k.key, k]))

export const NOTE_MAX = 100
export const KUDOS_WINDOW_HOURS = 48

export const REPORT_REASONS = ['Kaba davranış', 'Kavga çıkardı', 'Taciz / rahatsız etme', 'Sahte profil', 'Diğer']

// En çok alınan rozet (kadro listesinde gösteriliyor)
export function topKudos(counts = {}) {
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? { ...KUDOS_BY_KEY[best[0]], count: best[1] } : null
}
