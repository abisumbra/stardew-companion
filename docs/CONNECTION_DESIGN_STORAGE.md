# Bağlantı, çiftlik tasarımı ve sandıklar

0.11 harita/tasarım yenilikleri ve Ev Tasarımı için [yeni kullanım kılavuzuna](DESIGN_WORKSPACE.md) bak. Aşağıdaki canlı aktarım sınırları sürer.

## Oyuna tek uygulamadan bağlanma

**Smart Planner → Canlı oyun bağlantısı → Oyunu Companion ile başlat.** Önce oyunu kapat. Çiftliği yükledikten sonra bağlantı durumu güncellenir. Ek SMAPI veya mod kurulumu gerekmez. Oyun doğrudan Steam'den başlatılırsa bağlantı yüklenmez. Steam başarım takibi Steam hesabının/istemcisinin erişilebilir olmasına bağlıdır; bağlantı Steam başarımı yazmaz.

Bağlantı, uygulamaya dahil iki açık kaynak DLL'yi kendi veri klasörüne çıkarır. Yalnızca başlattığı oyun sürecinde .NET başlangıç kancasını etkinleştirir; Windows ortam ayarlarını, Steam başlatma seçeneklerini veya oyun dosyalarını değiştirmez. Harmony oyun güncellemesinin sonunda çalışır. Görev ve yerleşim değişiklikleri ana iş parçacığında yapılır; açık oyunun kayıt dosyasına dışarıdan yazılmaz.

Destek: **Windows, vanilla 1.6.15, tek oyunculu**. Farklı sürümler ve çok oyunculu oyun reddedilir. Oyun başladıktan sonra Companion kapanabilir; bağlantı çalışmaya ve sonucu uygulamaya ait dosyada saklamaya devam eder. Sonraki açılışta okunur.

Ölçülebilir hedefler: pişirme, üretim, balık yakalama, gönderim, seçilen arkadaşlık/seviye hedefleri ve doğrulanmış yerel başarım koşulları. En fazla 80 hedef gönderilir. Envanterde bulunma eylemin yapılması sayılmaz. **Gönderim, eşya kutuya bırakılınca değil, gece satış işlendiğinde tamamlanır.** Gerçek eylem kaydı hedefe ulaşınca yalnızca Companion'a ait görev günlüğünden kaldırılır. Ek para/eşya/arkadaşlık ödülü veya yapay görev tamamlama kredisi verilmez; normal oyun görevleri korunur.

Serbest metin ve doğrulanmış canlı koşulu bulunmayan hedefler Companion'da kalır. Önceki sürümlerin artık seçili olmayan Companion notları temizlenir. Oyun görevleri oyunun güncel dilini izler; arayüz dili bağımsızdır. Bilinmeyen yerel etiketler için yazı tipiyle uyumlu İngilizce ad kullanılır. Canlı sonuç, eski disk kaydının kanıtı gibi gösterilmez. Kalıcı doğrulama oyunda kaydettikten sonra güncellenir.

Bağlantısız eski aktarım yalnızca oyunun kendi takip edebildiği yemek/üretim görevlerini gönderir; yazı tipi uyumu için İngilizce kullanır. Tam yedek, kapalı oyun, güncel dosya ve değişmemiş kaydı geri alma kontrollerini korur.

## Çiftlik tasarımı

Sekiz tip: Standard, Riverland, Forest, Hill-top, Wilderness, Four Corners, Beach, Meadowlands. Kurulu oyunun özgün haritası, eşya/bina/ürün paleti, ızgara, yakınlaştırma, koordinatla yerleştirme, taşıma, silme ve geri alma/yenileme bulunur. Özgün harita bulunmazsa bunun yalnızca tasarım ızgarası olduğu belirtilir.

Tasarımlar oyun kaydından ayrı, Companion veritabanında saklanır. Otomatik kayıt, açık kayıt düğmesi, kopyalama, silme ve yedek desteği vardır. En fazla 100 tasarım ve tasarım başına 1500 yerleşim saklanır. Malzeme tahmini tam üretim partilerini kullanır; malzemelerin gerçekten erişilebilir olduğu anlamına gelmez.

**Canlı aktarım:** ana çiftçinin envanterindeki hazır, desteklenen tek karelik nesneler; öğrenilmiş tek çıktılı tariflerle envanter malzemelerinden üretim; mevcut desteklenen nesnelerin taşınması. Sandık aynı nesne ve içeriği korunarak taşınır. Çok çıktılı tarifleri önce oyunda üretip hazır eşyaları envantere koy. **Binalar ve ekinler şimdilik yalnızca tasarım içindir.** Tohum/gübre ve patlayıcılar otomatik yerleştirilmez. Sandık içindeki malzeme otomatik tüketilmez.

Oyunu Companion'dan başlat, aynı çiftliği aç, çiftlikte dur ve menüleri kapat. Envanter kullanma onayını işaretleyip desteklenen yerleşimleri gönder. Güncel kayıt özeti, çiftlik tipi, oturum, süre, nesne kimliği, dolu kare, yerleştirme kuralı ve tüm malzemeler kontrol edilir. Yer açmak için hiçbir şey silinmez. Kısmi uygulama olursa gerçek uygulanan sayı bildirilir; başarı varsayılmaz. **Sonucu inceleyip normal oyun kaydını kendin yap.** Dünya değişiklikleri için otomatik geri alma yoktur.

## Sandıklar ve Steam

Storage Finder son kayıt içindeki sandık/buzdolaplarını, koordinatlarını ve kalite/miktar içeren eşyalarını gösterir. Desteklenen özgün haritalarda işaretçi bulunur. Arama eşya ve yer adlarını kapsar. Junimo ortak envanteri bir kez sayılır. Bozuk/bilinmeyen miktarlar doğrulanmış stok sayılmaz; özel/modlu depolar ve desteklenmeyen iç mekânlar açıkça sınırlıdır. Oyun kaydından sonra yenilenir.

Steam Achievements bölümünden herkese açık profil adresi/kimliği isteğe bağlı bağlanabilir. Şifre, API anahtarı ve oturum açma istenmez; Steam'e başarım yazılmaz. Gizli/eksik/yanlış oyun verisi eski kanıtın yerine geçmez. Steam doğrulaması, kayıt gereksinimi ve elle işaretleme ayrıdır. Resmî 49 başarım görseli düğmeyle indirilip çevrimdışı kullanılabilir. Installer oyun/Steam görselleri içermez.

## Diller ve doğrulama

12 dil: İngilizce, Türkçe, Almanca, İspanyolca, Fransızca, Macarca, İtalyanca, Japonca, Korece, Brezilya Portekizcesi, Rusça, Basitleştirilmiş Çince. Menülerin ve yeni ekranların temel metinleri çevrilmiştir; binlerce oyun terimi kurulu oyundan seçilen dilde okunur. Uzun Companion rehberlerinde İngilizceye dönüş vardır. Merkezi kaynak `src/locales/`; bu sürüm tam çeviri garantisi değildir.

Sentetik oyun/kayıt testleri ve gerçek vanilla 1.6.15 türleriyle yalıtılmış uyumluluk kontrolleri yapıldı. Gerçek başlangıç kancası, sayaç erişimi ve görev alanları kontrol edilir. Bu, oyun penceresiyle tam oynanış oturumunun yerine geçmez. Geliştirme sırasında orijinal oyun kayıtları değiştirilmedi.
