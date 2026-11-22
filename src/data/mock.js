// Sabit listeler (pozisyonlar, sahalar, seviyeler) + giriş yapan kullanıcının bilgileri.

// Giriş yapan kullanıcı ve sitede görünen kullanıcılar.
// Bu iki nesne veritabanından doldurulur (src/lib/api.js). Bileşenler buradan okur.
export const ME = {
  id: null,
  name: '',
  dept: '',
  age: null,
  gender: '',
  trust: 100,
  played: 0,
  cancels: 0,
  phone: '',
  instagram: '',
  kudos: {},
}

// Cinsiyet seçenekleri (isteğe bağlı)
export const GENDERS = ['Kadın', 'Erkek', 'Belirtmek istemiyorum']

export const USERS = {}

// Desteklenen sporlar (tek merkezden). Yeni spor eklemek için buraya ekle.
export const SPORTS = [
  { key: 'padel', label: 'Padel' },
  { key: 'halisaha', label: 'Halı saha' },
  { key: 'tenis', label: 'Tenis' },
  { key: 'voleybol', label: 'Voleybol' },
  { key: 'basket', label: 'Basket' },
]
export const SPORT_KEYS = SPORTS.map((s) => s.key)

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
  // Yeni sporlar: esnek kadro, tek mod (oyuncu ararsın, kişi sayısını sen belirlersin)
  tenis: [{ key: 'players', label: 'Oyuncu / rakip arıyorum' }],
  voleybol: [{ key: 'players', label: 'Oyuncu arıyorum' }],
  basket: [{ key: 'players', label: 'Oyuncu arıyorum' }],
}

export const LEVELS = ['Yeni başladım', 'Başlangıç', 'Orta', 'İyi', 'İleri', 'Fark etmez']

