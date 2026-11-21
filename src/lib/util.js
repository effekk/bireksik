// Instagram kullanıcı adını temizle: @ , bağlantı, boşluk at
export function cleanInstagram(s) {
  if (!s) return ''
  return s.trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')
    .trim()
    .slice(0, 40)
}

export const instaUrl = (h) => 'https://instagram.com/' + h

// 5'li seviye listesi (padel ve halı saha ortak)
export const SKILL_LEVELS = ['Yeni başladım', 'Başlangıç', 'Orta', 'İyi', 'İleri']
