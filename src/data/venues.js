// İzmir geneli padel ve halı saha mekanları — ilçelere göre.
// Web'den derlendi; liste genişletilebilir. Listede olmayan bir saha,
// yer seçicideki "kendim yazayım" seçeneğiyle elle eklenebilir.
// Kampüse yakın ilçeler üstte.

export const VENUES = {
  padel: [
    { ilce: 'Balçova', items: ['İzmir Ekonomi Üniversitesi (kampüs)'] },
    { ilce: 'Konak', items: ['Swiss Padel (Swissôtel, Alsancak)'] },
    { ilce: 'Buca', items: ['Pine Padel Club', 'Campus Padel & Pickleball Club (Tınaztepe Ü.)'] },
    { ilce: 'Bornova', items: ['Parla Padel & Tenis', 'The Rooftop Padel House'] },
    { ilce: 'Bayraklı', items: ['Orange Padel Club – Westpark', 'Mistral Carrera'] },
    { ilce: 'Karşıyaka', items: ['Padel Zone Social Club (Mavişehir)', 'CNC Padel (Mavişehir)'] },
    { ilce: 'Gaziemir', items: ['Altın Raket Padel'] },
    { ilce: 'Çiğli', items: ['Can Padel Kulübü', 'AREA Padel Club'] },
    { ilce: 'Güzelbahçe', items: ['Mavi Ege Tennis & Padel Club', 'Padel Empire'] },
    { ilce: 'Urla', items: ['Orange Padel Club (Göztepe Yelken)', "Url'amor Padel Club", 'Key Urla Padel'] },
    { ilce: 'Çeşme', items: ['Alaçatı Padel Club', 'Prime Padel (Alaçatı)', 'Tiebreakers Tennis & Padel Club (Ilıca)'] },
    { ilce: 'Seferihisar', items: ['Hidden Bay Teos (Sığacık)'] },
  ],
  halisaha: [
    { ilce: 'Balçova', items: ['İzmir Ekonomi Üniversitesi (kampüs)', 'Martı Halı Saha'] },
    { ilce: 'Karabağlar', items: ['Erkan Özcan Halı Saha (Akevler)', 'İzmir Spor Halı Saha (Bahçelievler)', 'Karabağlar Olimpiyat Halı Saha', 'Osman Kibar Futbol Sahası'] },
    { ilce: 'Buca', items: ['Şahlanlar Sportland Halı Saha', 'Cemil Seboy Halı Saha'] },
    { ilce: 'Bornova', items: ['Buğdaycılar Halı Saha (Kazımdirik)', 'Dr. Cavit Özyeğin Halı Saha', 'Langırt Spor Tesisleri', 'İkra Halı Saha', 'Lider Halı Saha (Pınarbaşı)', '10 Numara Mimar Sinan Halı Saha', 'Mazhar Zorlu Halı Saha Tesisleri', 'Çimentaş Lisesi Spor Tesisleri', 'Karayolları Yol Spor Halı Saha', 'Özkanlar Halı Saha', 'Yeşilova Halı Saha', 'Doku Spor Tesisleri', '909 Nolu Halı Saha (Atatürk Mah.)'] },
    { ilce: 'Bayraklı', items: ['75. Yıl Parkı Belediye Halı Sahası'] },
    { ilce: 'Karşıyaka', items: ['Atakent Halı Saha', 'Karşıyaka Spor Kulübü Halı Saha'] },
    { ilce: 'Çiğli', items: ['Çiğli Arena Halı Saha', 'Evka 5 Halı Saha', 'Organize Spor Tesisleri'] },
    { ilce: 'Gaziemir', items: ['Gaziemirgücü Halı Saha', 'Mustafa Yaman Halı Saha'] },
  ],
}
