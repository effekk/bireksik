// Sabit listeler (pozisyonlar, sahalar, seviyeler) + giriş yapan kullanıcının bilgileri.

// Giriş yapan kullanıcı ve sitede görünen kullanıcılar.
// Bu iki nesne veritabanından doldurulur (src/lib/api.js). Bileşenler buradan okur.
export const ME = {
  id: null,
  name: '',
  dept: '',
  trust: 100,
  played: 0,
  cancels: 0,
  phone: '',
  instagram: '',
  kudos: {},
}

export const USERS = {}

// Halı saha pozisyonları
export const POSITIONS = ['Kaleci', 'Defans', 'Orta saha', 'Forvet']

export const PLACES = {
  padel: ['Kampüs padel kortu 1', 'Kampüs padel kortu 2'],
  halisaha: ['Halı saha · A sahası', 'Halı saha · B sahası'],
}

// İlan türleri
export const MODES = {
  padel: [
    { key: 'players', label: 'Oyuncu arıyorum' },
    { key: 'team', label: 'Rakip ikili arıyorum' },
  ],
  halisaha: [
    { key: 'players', label: 'Eksik oyuncu arıyorum' },
    { key: 'team', label: 'Rakip takım arıyorum' },
  ],
}

export const LEVELS = ['Yeni başladım', 'Başlangıç', 'Orta', 'İyi', 'İleri', 'Fark etmez']

