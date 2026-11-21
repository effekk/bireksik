// Güven Puanı yardımcıları (şimdilik sadece görünüm; ceza hesabı sunucuda olacak)

export function trustTier(score) {
  if (score >= 85) return { key: 'good', label: 'Güvenilir' }
  if (score >= 60) return { key: 'mid', label: 'Orta' }
  return { key: 'low', label: 'Düşük' }
}

// Anlaştığımız ceza tablosu — profil sayfasında gösteriliyor
export const PENALTIES = [
  { when: 'Maça 48 saatten fazla varken', pts: 0 },
  { when: 'Maça 24–48 saat kala', pts: -2 },
  { when: 'Maça 12–24 saat kala', pts: -5 },
  { when: 'Maça 5–12 saat kala', pts: -7 },
  { when: 'Maça 2–5 saat kala', pts: -10 },
  { when: 'Son 2 saatte', pts: -15 },
  { when: 'Haber vermeden gelmemek', pts: -25 },
]

// Maça kalan saate göre iptal cezası (yukarıdaki tabloyla aynı)
export function penaltyFor(hoursLeft) {
  if (hoursLeft > 48) return 0
  if (hoursLeft > 24) return -2
  if (hoursLeft > 12) return -5
  if (hoursLeft > 5) return -7
  if (hoursLeft > 2) return -10
  return -15
}
