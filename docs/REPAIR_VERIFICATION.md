# 0.5.0 düzeltme ve doğrulama kaydı

Tarih: 16 Ekim 2026. Mevcut Tauri projesi yerinde geliştirildi. Oyun kayıtları ve kurulu oyun dosyaları salt okunur kullanıldı.

Önceki incelemede listelenen 24 hata için uygulanan düzeltmeler:

| #   | Sorun                                                    | Düzeltme ve kontrol                                                                                                                                        |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ayrıntılarda yanlış çiftçinin ilerlemesi                 | Ayrıntı, malzeme ve rehberler seçili çiftçiyi kullanır. Çok oyunculu arayüz testi mevcut.                                                                  |
| 2   | Misafirin başarımında ev sahibinin sayılması             | Kişisel başarımlar seçili çiftçiden; dünya koşulları ilgili ev sahibi kaydından okunur. Alan testi mevcut.                                                 |
| 3   | Alt adımlar eksikken “hazır” görünmesi                   | Ön koşulların durumu bağımlılık sırasıyla üst adıma taşınır.                                                                                               |
| 4   | Ana hedef ve ara ürünün iki kez üretilmesi               | Planlanan ana üretim çıktısı ortak ihtiyaçta bir kez kullanılır; ek partiler aynı üretime eklenir. Tortilla/Lucky Lunch testi mevcut.                      |
| 5   | Bağışlanan paket seçimlerinin kalması                    | Bağışlanan, yinelenen ve geçersiz seçimler kalan ihtiyaç hesabından çıkarılır.                                                                             |
| 6   | Büyük üretim eşyalarının stoktan düşmesi                 | Büyük eşya kimlikleri normal nesnelerden ayrı korunur. Fırın ve sandık alt türleri test edildi.                                                            |
| 7   | Bozuk sayaçların sıfır kabul edilmesi                    | Geçersiz, yinelenen veya taşan sayaçların bulunduğu bölüm bilinmiyor kalır; uyarı verilir.                                                                 |
| 8   | Süt/yumurta kategorilerinin ayrıntıda sıfır görünmesi    | Rehber ve planlayıcı aynı kategori havuzunu kullanır.                                                                                                      |
| 9   | Okunamayan envanterin sıfır gösterilmesi                 | Okunan miktar alt sınırdır; toplam bilinmiyorsa kontrol adımı oluşturulur.                                                                                 |
| 10  | Tamamlanmış özel hedeflerin açık kalması                 | Özel hedeflerin tamamlanması kayıt kanıtıyla hesaplanır.                                                                                                   |
| 11  | Bütün ara adımların bütün hedeflere bağlanması           | Malzeme ve üretimlerin gerçek hedef sahipleri bağımlılıklardan taşınır.                                                                                    |
| 12  | Yükseltilmiş binanın eski hedefi açması                  | Yükseltme zinciri mevcut bina sayısına dâhildir. Birden fazla binanın öncül maliyetleri de hesaplanır.                                                     |
| 13  | Canavar grubu adlarının eşleşmemesi                      | Görünen ad, veri anahtarı ve ilgili eski adlar birlikte çözülür.                                                                                           |
| 14  | 1.5 böcek hedefinin 1.6 toplamını kullanması             | Cave Insects hedefi 1.5 için 125, kurulu 1.6 verisi için 80 olarak ayrılır.                                                                                |
| 15  | Tehlikeli varyantın normal bölgeye dönmesi               | Varyant kimliği bölge hesabında korunur. Temel istatistikler açıkça etiketlidir.                                                                           |
| 16  | Ayrıntılı çiftlik haritasının çiftlik türünü yok sayması | Sekiz standart çiftlik türü özgün harita dosyasına eşlenir; özel çiftlikte tahmin yapılmaz.                                                                |
| 17  | 100. kat balığında 20/60. kat haritasının açılması       | Yanlış harita seçenekleri kaldırıldı. Kurulumda doğrulanmış bağımsız 100. kat haritası bulunmadığında metin yönlendirmesi ve açık durum mesajı gösterilir. |
| 18  | “Fishing” adlı çiftçinin çevrilmesi                      | Oyuncu adları ve kullanıcı notları çeviriden korunur; kontrol değerleri değişmez.                                                                          |
| 19  | Ondalıklı stok girişinin hata oluşturması                | Tam sayıya dönüştürme ve güvenli plan doğrulaması eklendi. Arayüz testi mevcut.                                                                            |
| 20  | İlk Shift+Tab odağının kaçması; klavyesiz harita         | Açılış odağı ve sekme döngüsü düzeltildi. Haritada oklar/Enter ve koordinat kontrolleri çalışır.                                                           |
| 21  | Boş canavar aramasının açıklamasız kalması               | Sonuç bulunamadığında açıklama gösterilir.                                                                                                                 |
| 22  | Aynı kimlikteki daha yeni içe aktarımın atlanması        | Aynı çiftlik kimliğinde daha yeni kayıt tarihi kazanır. Rust testi mevcut.                                                                                 |
| 23  | Kaldırılan klasörün içe aktarım hatalarının kalması      | Klasörle ilişkili içe aktarım kayıtları uygulama veritabanından kaldırılır. Kayıt ve sorunlu dosya gizleme/geri gösterme eklendi.                          |
| 24  | Eski ev sahibi/stok/ceviz açıklamaları                   | Açıklamalar seçili çiftçi, tespit kapsamı ve ceviz ödül gruplarıyla uyumlu hâle getirildi.                                                                 |

Eklenen geliştirmeler:

- 39 olumlu oyun içi başarım kimliği, daha fazla sayaç ve kalan başarımların işlem rehberleri; Steam doğrulaması ayrı kalır.
- Müze, paket, ceviz ve görev hedeflerine doğrudan ayrıntılar, kaynaklar ve kayıt kanıtı.
- Kaliteye uygun paket stokları, üretim/işleme/sabit fiyatlı satın alma alternatifleri, bina adet hedefleri.
- Yerel oyun verisinden 32 karakter için 132 kalp etkinliği başvurusu, görülme kanıtı ve anlaşılır koşullar. Olay betikleri çalıştırılmaz.
- Hediye kalitesi/zamanı/Arkadaşlık 101 senaryoları, özel ilişki hediyeleri ve evlilik yönlendirmesi.
- Normal ve tehlikeli madenlerde belgelenmiş canavar kat aralıkları.
- Kaydedilmiş bilinen engelleri dışlayan harita rotaları, özgün çıkışlardan bağlı haritalara geçiş ve klavye erişimi.
- Çiftçiye göre eksik balık filtresi, yaklaşan normal yakalama dönemi bitişleri ve tarih uyarıları.
- Kategori ayrıntılı yerel ilerleme geçmişi; 40 adımlık plan sayfaları, önbellek ve ekranların ihtiyaç anında yüklenmesi.
- %100/%115/%130 yazı boyutu ve daha fazla Türkçe açıklama.

## Doğrulama

- 78 alan/çeviri testi, 38 Rust testi ve 16 arayüz testi geçti. Örnek programların yinelenen testleri bu toplama dâhil değildir.
- TypeScript denetimi, üretim derlemesi, Rust biçim denetimi ve Clippy geçti.
- Gerçek kurulum: 7.554 sprite başvurusu, 22 veri sözlüğü, 31 program dosyası, 6.017 Türkçe metin; görsel/veri doğrulama uyarısı yok.
- 456 koleksiyon hedefi ve 49 başarım tek tek genişletildi; çözümleyici veya bağımlılık hatası yok. Ortak yemek/üretim planı: 230 hedef, 633 adım.
- Gerçek görseller ve yapay ilerlemeyle ek arayüz kontrolü: beş hediye sınıfı, 18px kalp sırası/iki kilitli kalp, canavar katları, boş arama, klavyeli harita ve harita çıkışları. Tarayıcı/console hatası yok; %130 yazı boyutunda yatay sayfa taşması yok.
- Son paket ve dört özgün kaydın parmak izi karşılaştırması `DEVELOPMENT_STATUS.md` içinde kaydedilir. Özel tanılama çıktıları ve oyun pikselleri yalnızca yok sayılan yerel dosyalardadır.

## Kapsam sınırları

Bu sürüm bütün Master Prompt özelliklerinin tamamlandığı iddiasında değildir. Saat/hava ve kaydedilmemiş konumlar okunamaz. Bilinmeyen harita nesneleri, olaylarla değişen kapılar ve modların sanal içeriği simüle edilmez. Bağlı haritalar gezilebilir; bütün dünya için otomatik ulaşım optimizasyonu uygulanmaz. Tehlikeli canavarların çalışma anında ölçeklenen istatistikleri tahmin edilmez.

Bazı özel görev/başarım ön koşulları, aromalı ürünlerin hediye istisnaları ve özel koşullar oyun içinde kontrol gerektirir. Satın alma seçimi desteklenen sabit tekliflerle sınırlıdır; küresel maliyet optimizasyonu değildir. Türkçe kapsamı genişletildi, ancak her üretilen/özel veri metni çevrilmiş değildir. Doğrulanmış kaynaklar korunur; her eşya için ayrı doğrulanmış sayfa bulunmadığında açıkça Wiki araması sunulur.

Linux/macOS çalışma, Windows yükseltme/kaldırma ve oyun içi Mükemmellik ekranıyla bağımsız karşılaştırma bu makinede doğrulanmamıştır. Mevcut kurulu uygulama değiştirilmemiştir.
