// Yasal metinler — Türkçe taslak. Veri sorumlusu iletişimi: bireksik.app@gmail.com
// Not: Bunlar genel taslaktır; yayına çıkmadan bir hukukçuya gözden geçirtmen önerilir.
const CONTACT = 'bireksik.app@gmail.com'
const YEAR = new Date().getFullYear()

function Privacy() {
  return (
    <>
      <h1>Gizlilik Politikası</h1>
      <p className="meta">Son güncelleme: {YEAR}</p>
      <p>BirEksik ("uygulama"), kullanıcılarının gizliliğine önem verir. Bu politika, hangi verileri neden topladığımızı ve nasıl koruduğumuzu açıklar.</p>
      <h2>Topladığımız veriler</h2>
      <ul>
        <li>Hesap bilgileri: e-posta adresi (giriş için), ad.</li>
        <li>Profil bilgileri (isteğe bağlı): bölüm, telefon, Instagram kullanıcı adı, profil fotoğrafı, oynadığın sporlar ve seviyen.</li>
        <li>Kullanım verileri: açtığın/katıldığın maçlar, güven puanı, takdirler, bildirimler.</li>
      </ul>
      <h2>Neden topluyoruz</h2>
      <p>Verileri yalnızca hizmeti sunmak için kullanırız: maç eşleştirmek, bildirim ve hatırlatma göndermek, güven puanı ve takdir sistemini işletmek, kötüye kullanımı önlemek.</p>
      <h2>Hizmet sağlayıcılar</h2>
      <p>Altyapı için güvenilir üçüncü taraf hizmetler kullanırız: barındırma ve veritabanı (Supabase, Cloudflare) ve e-posta gönderimi (Resend). Verilerin bu hizmetlerin sunucularında işlenir; bu sağlayıcılar verileri yalnızca bize hizmet vermek için işler.</p>
      <h2>Çerezler ve yerel depolama</h2>
      <p>Oturumunu açık tutmak için tarayıcının yerel depolaması (localStorage) kullanılır. Reklam veya takip amaçlı çerez kullanmıyoruz.</p>
      <h2>Saklama ve silme</h2>
      <p>Verilerini hesabın aktif olduğu sürece saklarız. Hesabının ve verilerinin silinmesini istersen <a href={'mailto:' + CONTACT}>{CONTACT}</a> adresinden bize yazman yeterli.</p>
      <h2>Haklarına ilişkin</h2>
      <p>Verilerine erişme, düzeltme ve silme haklarına sahipsin. Talebin için <a href={'mailto:' + CONTACT}>{CONTACT}</a>.</p>
    </>
  )
}

function Kvkk() {
  return (
    <>
      <h1>KVKK Aydınlatma Metni</h1>
      <p className="meta">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında</p>
      <h2>Veri sorumlusu</h2>
      <p>BirEksik. İletişim: <a href={'mailto:' + CONTACT}>{CONTACT}</a>. (Veri sorumlusu kimlik ve iletişim bilgileri yayın öncesi güncellenecektir.)</p>
      <h2>İşlenen kişisel veriler</h2>
      <p>Kimlik ve iletişim (ad, e-posta, isteğe bağlı telefon ve Instagram), profil bilgileri (bölüm, fotoğraf, spor/seviye) ve uygulama kullanım verileri (maçlar, katılımlar, güven puanı, takdirler).</p>
      <h2>İşleme amaçları</h2>
      <p>Üyelik ve kimlik doğrulama, maç eşleştirme hizmetinin sunulması, bildirim/hatırlatma gönderimi, hizmet güvenliğinin ve kötüye kullanımın önlenmesi.</p>
      <h2>Hukuki sebep</h2>
      <p>Bir sözleşmenin kurulması/ifası için gerekli olması, meşru menfaat ve açık rızanın gerektiği hâllerde açık rıza (KVKK m.5).</p>
      <h2>Aktarım</h2>
      <p>Veriler, hizmetin sağlanması amacıyla barındırma ve e-posta sağlayıcılarımıza (Supabase, Cloudflare, Resend) aktarılabilir. Pazarlama amacıyla üçüncü taraflarla paylaşılmaz.</p>
      <h2>Haklarınız (KVKK m.11)</h2>
      <p>Kişisel verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme ve kanunda sayılan diğer haklara sahipsin. Başvurularını <a href={'mailto:' + CONTACT}>{CONTACT}</a> adresine iletebilirsin.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <h1>Kullanım Koşulları</h1>
      <p className="meta">Son güncelleme: {YEAR}</p>
      <h2>Hizmet</h2>
      <p>BirEksik, kullanıcıların padel ve halı saha için birbirini bulup maç ayarlamasına yardımcı olan bir eşleştirme platformudur. BirEksik maçların kendisini organize etmez; yalnızca kullanıcıları bir araya getirir.</p>
      <h2>Hesap ve doğruluk</h2>
      <p>Hesabını gerçek bilgilerle oluşturmayı ve bilgilerini güncel tutmayı kabul edersin. Hesabının güvenliğinden sen sorumlusun.</p>
      <h2>Kullanıcı davranışı</h2>
      <ul>
        <li>Diğer kullanıcılara saygılı davranırsın; taciz, nefret söylemi ve sahtekârlık yasaktır.</li>
        <li>Katılacağın maçlara gelmeye özen gösterirsin; son dakika iptalleri ve gelmeme güven puanını etkiler.</li>
        <li>Platformu yalnızca amacına uygun kullanırsın.</li>
      </ul>
      <h2>Sorumluluğun reddi</h2>
      <p>Maçlar kullanıcılar arasında gerçekleşir. Saha kiralama, ödeme, oyun sırasında yaşanan anlaşmazlık veya yaralanmalar dâhil olmak üzere maçlarla ilgili her türlü sorumluluk kullanıcılara aittir. BirEksik, kullanıcıların davranışlarından veya üçüncü taraf tesislerden sorumlu değildir.</p>
      <h2>Fikri mülkiyet</h2>
      <p>BirEksik adı, logosu ve tasarımı BirEksik'e aittir; izinsiz kullanılamaz.</p>
      <h2>Değişiklik ve fesih</h2>
      <p>Kurallara aykırı kullanımda hesabını askıya alabilir veya kapatabiliriz. Bu koşulları zaman zaman güncelleyebiliriz; güncel sürüm bu sayfada yayımlanır.</p>
      <h2>İletişim</h2>
      <p>Sorularını <a href={'mailto:' + CONTACT}>{CONTACT}</a> adresine iletebilirsin.</p>
    </>
  )
}

export default function Legal({ page }) {
  return (
    <div className="legal">
      <a href="#maclar" className="back">← Ana sayfa</a>
      {page === 'gizlilik' && <Privacy />}
      {page === 'kvkk' && <Kvkk />}
      {page === 'kosullar' && <Terms />}
    </div>
  )
}
