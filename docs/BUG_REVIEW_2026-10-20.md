# Hata ve eksiklik incelemesi — 20 Ekim 2026

İncelenen sürüm: 0.11.0. Aşağıdaki metin ilk incelemenin tarihsel kaydıdır; gerçek oyun oturumunda yeniden üretim iddiası değildir. Ardından yapılan 0.12.0 düzeltmeleri, eklemeler ve doğrulama sınırları [uygulama raporunda](0.12-WORKLOG.md) listelenmiştir. Oyuncu kayıtları değiştirilmedi.

## Hata bulguları

### 1. P2 — Planlayıcıdan kaldırılıp yeniden eklenen canlı görev günlüğe dönmüyor

Konum: `bridge/Runtime.cs:132`, `bridge/Runtime.cs:154`.

Bir tamamlanmamış hedef oyuna gönderildiğinde görev kimliği `observed` kümesine ekleniyor. Hedef plandan çıkarıldığında oyun günlüğündeki görev kaldırılıyor; ancak `observed` temizlenmiyor. Aynı hedef yeniden eklendiğinde görev bulunamıyor ve `observed.Contains` kontrolü bunu oyuncunun iptal ettiği görev gibi değerlendirerek yeniden oluşturmayı atlıyor. Yeni plan yüklenirken yalnızca `cancelled.Clear()` çağrılması bu sorunu çözmüyor.

Etkisi: Kullanıcı hedefi yeniden eklese veya canlı görevleri güncellese de görev aynı oyun oturumunda görünmeyebilir.

Öneri: Plan revizyonları arasında çıkarılan ve yeniden eklenen görevleri ayırt etmek; ilgili gözlem/iptal durumunu yeniden ekleme sırasında sıfırlamak. Regresyon: ekle → kaldır → yeniden ekle.

### 2. P2 — Canlı tamamlanma, koşul sonradan bozulduğunda geri alınmıyor

Konum: `bridge/Runtime.cs:146`, `bridge/Runtime.cs:152`; tüketici: `src/companion.tsx:321`.

Koşulu sağlayan hedefler `completed` kümesine ekleniyor. Koşul artık sağlanmadığında kümeden çıkarılmıyorlar; üstelik `!completed.Contains(goal.Id)` kontrolü görevin yeniden oluşturulmasını engelliyor. Özellikle arkadaşlık puanı gibi azalabilen ölçüler bu varsayıma uymuyor.

Etkisi: Arkadaşlık eşiği altına inen bir hedef canlı planda tamamlanmış kalabilir ve yapılacaklar listesinden çıkarılabilir. Disk kaydından yapılan uzlaştırma ayrı olduğu için iki görünüm farklı sonuçlar verebilir.

Öneri: Güncel ölçümlerden tamamlanma kümesini yeniden hesaplamak veya koşulu bozulmuş hedefi kümeden çıkarmak; görev oluşturma ve `observed` durumunu birlikte güncellemek.

### 3. P2 — Başarılı çiftlik aktarımı tasarımın kaynak koordinatlarını güncellemiyor

Konum: `src/views/FarmDesignerView.tsx:140`; doğrulama: `bridge/FarmTransfer.cs:55`.

Aktarım sonucu geldiğinde `applied` kimlikleri yalnızca bildirimde sayılıyor. Taşınmış öğenin `sourceTile` değeri eski konumda kalıyor; yeni yerleştirilmiş öğeler de mevcut dünya nesnesi olarak işaretlenmiyor.

Senaryo: İçe alınmış sandığı A'dan B'ye taşı ve aktar; aynı tasarımda sandığı C'ye taşıyıp yeniden aktar. İkinci istek hâlâ A'yı kaynak gösterdiğinden oyun tarafı nesneyi bulamayıp reddeder. Daha önce yerleştirilen nesne değişmeden tasarımda kaldığında da sonraki toplu aktarım dolu hedefe takılabilir.

Öneri: Yalnızca sonuçtaki başarılı kimlikleri, gönderilen isteğin koordinatlarıyla uzlaştırmak. Kısmi sonuçlarda başarısız öğeleri değiştirmemek. İstek sürerken yapılan yeni düzenlemeleri ayrıca korumak.

### 4. P2 — Bağlantı sorgusu hata verirse eski canlı sonuç süresiz korunabiliyor

Konum: `src/lib/live-progress.ts:26`, `src/lib/live-progress.ts:35`; benzer durum: `src/components/GameConnection.tsx`.

Durum sorgusunun hata yolu boş. Önceki başarılı yanıt `active` ise sonraki tüm sorgular başarısız olsa bile durum ve tamamlanmış hedefler korunuyor. Ön yüzde son başarılı okumanın yaşına ilişkin bir sınır yok. Rust tarafındaki 15 saniyelik eskime kontrolü, durum dosyasının okunması veya ayrıştırılması hata verdiğinde uygulanamıyor.

Etkisi: Bağlantı durum dosyası erişilemez/bozuk olduğunda arayüz bağlı olduğunu ve eski hedeflerin canlı doğrulandığını göstermeyi sürdürebilir.

Öneri: Son başarılı okuma zamanını izlemek; hata veya zaman aşımında canlı kanıtı bilinmeyen/bağlantısı kesilmiş durumuna almak.

### 5. P2 — Tasarım kitaplığı yüklenirken yapılan düzenlemeler üzerine yazılabiliyor

Konum: `src/views/FarmDesignerView.tsx:78`, `src/views/FarmDesignerView.tsx:392`.

Kayıtlı tasarımlar yüklenirken ad, yerleşim ve çizim araçları kullanılabiliyor. Geciken okuma tamamlandığında son kayıtlı tasarım koşulsuz `setDesign` ile yükleniyor. Bu arada yapılan düzenlemeler kayboluyor; `ready` false olduğu için otomatik kayıt da onları korumuyor.

Öneri: İlk yükleme tamamlanana kadar düzenleme kontrollerini kapatmak veya yükleme yanıtını kullanıcı düzenlemesiyle çakıştırmayan bir durum yönetimi kullanmak. Regresyon: geciktirilmiş kitaplık okuması sırasında düzenleme.

## Bilinen özellik eksikleri

Bunlar mevcut belgelerde açıkça belirtilmiş kapsam sınırlarıdır; yukarıdaki hatalardan ayrıdır.

- Ev tasarımını oyuna aktarma, mobilya döndürme, duvar kâğıdı/döşeme düzenleme ve kayıtlı tadilat/mobilya düzenini yeniden oluşturma yok.
- Çiftlikte bina ve ekin aktarımı yok; aktarım desteklenen nesnelerle sınırlı.
- Canlı bağlantı Windows, vanilla 1.6.15 ve tek oyunculu oturumlarla sınırlı.
- Çeviri kapsamı eksik. Güncel katalog kontrolü 3.234 anahtar içinde Türkçede 1.894 çeviri / 1.340 İngilizceye dönüş bildiriyor. Diğer on dilin her birinde 131 çeviri / 3.103 İngilizceye dönüş var. Kurulu oyundan gelen terimler ayrıca çevrilebildiği için bu sayılar doğrudan görünür eksik ekran metni sayısı değildir.
- Depo bilgisi son disk kaydını yansıtıyor; anlık envanter eşitlemesi yok. Eski 1.5 ekipman kimliklerinin bir bölümü belirsiz.
- Tam oyun penceresinde uçtan uca canlı bağlantı oturumu ve ikincil platform davranışları için doğrulama açığı belgelenmiş.

Kaynaklar: `docs/DESIGN_WORKSPACE.md`, `DEVELOPMENT_STATUS.md`, `src-tauri/src/connection.rs`.

## Bu incelemede yapılan kontroller

- Frontend/domain: 128 test geçti.
- TypeScript kontrolü: geçti.
- Rust: 40 birim + 25 ayrıştırıcı testi geçti. İlk çalıştırmadaki dört geçici dosya erişim hatası, geçici klasör proje içine taşındığında giderildi; uygulama hatası olarak sayılmadı.
- Dil kataloğu kontrolü: tamamlandı; yukarıdaki sayılar bu çalıştırmadan alındı.
- Tarayıcı testleri: tamamlanmış sonuç alınamadı; geçmiş rapordaki 42 test bu incelemede yeniden doğrulanmış sayılmıyor.
- Ayrı bridge senaryo denemesi derlenemedi; yeni denemenin NuGet varlık dosyası üretilemedi. Bridge bulguları kaynak kodu akışına dayanıyor.

Öncelikli takip: canlı görevlerin kaldırma/yeniden ekleme ve koşul kaybı regresyonları; ardışık çiftlik aktarımı; bağlantı okuma hatası; geciken tasarım yüklemesi.

## Ek iyileştirmeler ve yeni özellik önerileri

Bu bölüm mevcut kod ve kullanıcı akışlarının ikinci incelemesine dayanır. Aşağıdakiler ürün geliştirme önerileridir; hepsi hata veya zorunlu gereksinim değildir. Sıralama, önce veri koruma ve doğru geri bildirim, sonra günlük kullanım kolaylığı esas alınarak yapılmıştır. Eforlar yaklaşık ve birbirine göredir.

### Önce: güvenilirlik ve veri koruma

| Öneri | Mevcut durum ve gerekçe | İlk teslimin kabul ölçütü | Efor |
| --- | --- | --- | --- |
| Tasarım sürüm geçmişi ve silmeyi geri alma | Tasarımda oturum içi undo/redo ve genel yedek var; bunlar kalıcı tasarım geçmişi yerine geçmiyor. Silme doğrudan kitaplığı değiştiriyor. | Tasarım başına sınırlı sayıda önceki sürüm; uygulamayı yeniden açınca da geri yükleme; silinen tasarımlar için geri alma. | Orta |
| Yedek geri yükleme önizlemesi ve geri dönüş | Geri yükleme eşleşen kayıtların üzerine yazıyor. Arayüz esas olarak çiftlik planı sayısını gösteriyor; tasarım ve hesap farklarını tek tek sunmuyor. Dil/yazı boyutu ayrı localStorage alanlarında ve yedek şemasına dahil değil. | Değişecek plan, tasarım ve hesap bölümlerini listele; seçimli geri yükleme; önceki uygulama durumunun yerel kopyası; dil/yazı boyutunu sürümlü yedek şemasına dahil et. | Orta |
| Ortak bağlantı ve veri güncelliği göstergesi | Üst çubuk disk kaydını, planlayıcı canlı bağlantıyı ayrı gösteriyor. Canlı durum iki farklı yerde farklı aralıklarla sorgulanıyor. | Tek durum kaynağı; “son disk kaydı / canlı bağlantı / son başarılı iletişim” ayrımı; eski veride açık durum; tekrar deneme eylemi. | Orta |
| Aktarım önizlemesi ve sonuç geçmişi | Tasarım aktarımında malzeme toplamı, desteklenmeyen öğe sayısı ve onay kutusu var. Sonuç ağırlıklı olarak kısa bir bildirim. | Gönderilecek nesneler, eski/yeni koordinatlar, tahmini tüketim ve atlanan öğeler ayrı gösterilsin; başarılı/kısmi/başarısız işlemler uygulama yeniden açıldığında incelenebilsin. Oyundaki son doğrulama korunmalı. | Orta–yüksek |
| Hata sonrası bölüm bazında kurtarma | Ana uygulama tek ErrorBoundary altında; hata ekranının temel çözümü tüm uygulamayı yenilemek. | Bir rehber veya harita hatası diğer bölümleri kapatmasın; bölüm bazında yeniden dene; kullanıcı isterse kayıt içeriği ve kişisel yollar ayıklanmış yerel tanılama raporu oluştur. | Orta |

İlgili kaynaklar: `src/views/FarmDesignerView.tsx`, `src/views/SettingsView.tsx`, `src/domain/backup.ts`, `src/lib/display.ts`, `src/lib/locale.tsx`, `src/lib/live-progress.ts`, `src/components/GameConnection.tsx`, `src/main.tsx`, `src/components/ErrorBoundary.tsx`.

### Sonra: günlük kullanımda en çok fayda sağlayacak eklemeler

**1. “Bu malzeme hangi sandıkta?” bağlantısı — yüksek fayda, orta efor.**

Planlayıcı eldeki malzemeyi sayıyor; Storage Finder sandık konumlarını biliyor. Bu iki bilgi tek akışta birleşmeli. Malzeme satırından ilgili sandıklara geçiş, ihtiyaç kadar toplanacak miktar ve kalite bilgisi gösterilmeli. Çantada olanlar ile sandıkta olanlar ayrılmalı; Junimo ortak stoğu iki kez sayılmamalı. İlk sürüm rota optimizasyonu gerektirmeden sandık listesi ve harita işaretleriyle çalışabilir.

Dayanak: `src/domain/supplies.ts` miktarları topluyor; `src/views/StorageView.tsx` konum ve kaliteyi gösteriyor. Mevcut genel stok hesabı yeni özellik diye yeniden yapılmamalı.

**2. Oyun gününe bağlı “Bugün / Yaklaşanlar” listesi — yüksek fayda, orta efor.**

Mevsim ekranındaki doğum günleri, ekim tarihleri, balık fırsatları ve festival bilgileri mevcut. Bunları seçili çiftçinin hedefleriyle birleştirerek kısa bir gündem oluşturmak faydalı olur. Elle eklenen işlere oyun yılı/mevsimi/günü ve tekrar aralığı eklenebilir. Önce kayıtlı oyun tarihine göre uygulama içi liste yapılmalı; gerçek dünya saatiyle hatırlatıcıya dönüştürülmemeli. Bilinmeyen hava ve erişim koşulları kesinleşmiş gibi gösterilmemeli.

Kabul ölçütü: Aynı olay iki kez listelenmez; geçmiş tarih, yaklaşan tarih ve bugün ayrılır; çiftlik/çiftçi değişince doğru gündem yüklenir.

Dayanak: `src/views/SeasonalView.tsx`, `src/views/FestivalsView.tsx`, `src/views/DashboardView.tsx`, `src/domain/models.ts`. Manuel görev şemasında şu anda başlık, tamamlanma ve öncelik var; tarih/tekrar alanı yok.

**3. Tasarımlarda çoklu seçim, grup taşıma ve katman kilidi — yüksek fayda, orta–yüksek efor.**

Tek tek taşıma ve sürekli boyama mevcut. Büyük düzenlerde dikdörtgen seçim, seçili grubu taşıma/kopyalama, nesne–ekin–bina katmanlarını gizleme/kilitleme işi hızlandırır. Grubun bir parçası geçersiz yere taşınacaksa tüm işlem açık bir gerekçeyle durmalı; tek geri alma adımıyla eski konuma dönmelidir. Mobilya döndürme ayrı bir geliştirme olarak gerçek yön/ölçü bilgisiyle ele alınmalı.

Dayanak: `src/components/FarmCanvas.tsx`, `src/views/FarmDesignerView.tsx`.

**4. Tek tasarımı dışa aktarma/içe alma — orta fayda, orta efor.**

Tüm uygulama yedeğini paylaşmadan yalnızca seçilen çiftlik/ev tasarımını taşımak mümkün olmalı. Dosya, oyun görselleri ve kişisel kayıt bilgileri içermeyen sürümlü bir yerleşim şeması olmalı. İçe alırken ölçü/öğe sınırları doğrulanmalı, kimlik çakışmaları giderilmeli ve önizleme sunulmalı. Başka çiftliğe taşınan tasarımdaki `sourceTile` gibi eski dünyaya bağlı referanslar otomatik aktarım yetkisi olarak kullanılmamalı.

Dayanak: `src/domain/farm-design.ts`, `src/domain/backup.ts`. Mevcut genel yedek bu ihtiyacın altyapısını sağlıyor ancak tek tasarım paylaşma akışı değil.

**5. Depoda eşya odaklı sonuçlar ve kişisel sandık etiketleri — orta fayda, orta efor.**

Arama şu anda eşleşen sandıkları getiriyor ve seçili sandığın bütün içeriğini gösteriyor. “Odun: toplam 320; şu iki sandıkta” gibi eşya odaklı görünüm, kalite filtresi ve eşleşen satırın vurgulanması aramayı hızlandırır. “Maden”, “Tohum” gibi etiketler yalnızca Companion içinde tutulabilir.

Kabul ölçütü: Aranan eşyanın toplamı ile eşleşen sandıklardaki bütün eşyaların toplamı karıştırılmaz; belirsiz içerik ayrı belirtilir; taşınan sandığın etiketi yanlış sandığa sessizce bağlanmaz.

Dayanak: `src/views/StorageView.tsx`.

### Teknik kalite ve teslim süreci

**Ölçüme dayalı performans çalışması.** Aynı plan hem `useCompanion` hem `PlannerView` içinde yeniden hesaplanıyor; canlı görünüm ayrıca filtreli plan üretiyor. Önce büyük sentetik kayıt, çok hedef ve 1.500 yerleşimle ilk açılış, arama, sürükleme ve bellek kullanımı ölçülmeli. Sonra ortak hesaplama sonuçları paylaşılmalı; gerekiyorsa büyük listelerde yalnızca görünür satırlar çizilmeli. Harita çizim önbelleği ve tembel yükleme zaten var; bunlar eksikmiş gibi yeniden yapılmamalı. Kaynaklar: `src/companion.tsx:319`, `src/components/PlannerView.tsx:45`, `src/lib/map-renderer.ts`.

**Çeviride ekran bazlı öncelik ve gerileme kontrolü.** Önce Türkçe ana akışlar, hata mesajları ve aktarım/yedekleme metinleri tamamlanmalı. Anahtar sayısını azaltmak tek başına yeterli değil; görünür ekranlar kontrol edilmeli. CI'ya `locale:check` ve gerekli dillerde yeni temel metinlerin çevirisiz kalmasını yakalayan kapsam kontrolü eklenebilir. Mevcut test/build iş akışı bulunuyor; öneri bunun genişletilmesidir.

**Klavye ve dar pencere doğrulaması.** Mevcut kısayollar, yazı ölçeği ve geniş harita diyaloğu korunmalı. Tasarımda çoklu seçim/taşıma için klavye eşdeğerleri, odak görünürlüğü, renk dışında durum işaretleri ve desteklenen minimum pencere boyutunda %130 metin ölçeği birlikte denenmeli. Bu madde doğrulanmış genel bir erişilebilirlik hatası iddiası değildir.

**Yayımlama kapısını güçlendirme.** `.github/workflows/ci.yml` frontend, tarayıcı, Rust ve bridge testlerini içeriyor; fakat ayrı `release.yml` akışı tarayıcı ve bridge testlerini çalıştırmadan taslak paket üretebiliyor. Ortak doğrulama işi veya aynı sürümün başarılı CI sonucunu şart koşan bir kapı eklenmeli. Paket içeriği/sürümü ve sağlama toplamı doğrulaması standartlaştırılmalı. Windows'ta kurulum, yükseltmede uygulama verisini koruma ve kaldırma için tekrarlanabilir denemeler eklenmeli.

### Önerilen uygulama sırası

1. Önce rapordaki beş hatayı düzelt; gecikme, okuma hatası, yeniden ekleme ve ardışık aktarım testlerini ekle.
2. Tasarım geçmişi, geri yükleme önizlemesi, ortak bağlantı durumu ve aktarım sonucu geçmişini tamamla.
3. Planlayıcı–depo bağlantısı ve oyun içi gündemi ekle.
4. Çoklu seçim, tek tasarım paylaşımı ve eşya odaklı depo görünümünü ekle.
5. Ölçülen performans sorunlarını gider; çeviri/erişilebilirlik ve yayımlama kontrollerini genişlet.

Bu öneriler ilk inceleme sırasında yazılmıştır. Güncel uygulama durumu için [0.12.0 raporuna](0.12-WORKLOG.md) bakın.
