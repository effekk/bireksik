// İzmir Ekonomi Üniversitesi lisans bölümleri (fakültelere göre).
// Kaynak: ieu.edu.tr lisans programları. Yeni bölüm açılırsa buraya eklenir.
export const DEPARTMENTS = [
  { faculty: 'Mühendislik Fakültesi', items: [
    'Bilgisayar Mühendisliği', 'Biyomedikal Mühendisliği', 'Elektrik-Elektronik Mühendisliği',
    'Endüstri Mühendisliği', 'Genetik ve Biyomühendislik', 'Havacılık ve Uzay Mühendisliği',
    'İnşaat Mühendisliği', 'Makine Mühendisliği', 'Mekatronik Mühendisliği', 'Yazılım Mühendisliği',
  ] },
  { faculty: 'İşletme Fakültesi', items: [
    'Ekonomi', 'İşletme', 'Lojistik Yönetimi', 'Siyaset Bilimi ve Uluslararası İlişkiler',
    'Uluslararası Ticaret ve Finansman',
  ] },
  { faculty: 'Güzel Sanatlar ve Tasarım Fakültesi', items: [
    'Endüstriyel Tasarım', 'Görsel İletişim Tasarımı', 'İçmimarlık ve Çevre Tasarımı',
    'Mimarlık', 'Tekstil ve Moda Tasarımı',
  ] },
  { faculty: 'Fen-Edebiyat Fakültesi', items: [
    'Fizik', 'Matematik', 'İngilizce Mütercim ve Tercümanlık', 'Psikoloji', 'Sosyoloji',
  ] },
  { faculty: 'İletişim Fakültesi', items: [
    'Halkla İlişkiler ve Reklamcılık', 'Yeni Medya ve İletişim', 'Sinema ve Dijital Medya',
  ] },
  { faculty: 'Sağlık Bilimleri Fakültesi', items: [
    'Hemşirelik', 'Fizyoterapi ve Rehabilitasyon', 'Beslenme ve Diyetetik',
  ] },
  { faculty: 'Hukuk Fakültesi', items: ['Hukuk'] },
  { faculty: 'Tıp Fakültesi', items: ['Tıp'] },
  { faculty: 'Uygulamalı Yönetim Bilimleri Yüksekokulu', items: ['Gastronomi ve Mutfak Sanatları'] },
  { faculty: 'Diğer', items: ['İngilizce Hazırlık', 'Yüksek Lisans / Doktora', 'Meslek Yüksekokulu (Ön lisans)', 'Diğer'] },
]

export const ALL_DEPARTMENTS = DEPARTMENTS.flatMap((g) => g.items)
