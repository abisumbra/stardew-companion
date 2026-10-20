# 0.9.0 — görevler, fiyatlar ve çeviri

Bu belge 0.9 davranışının tarihsel kaydıdır. **0.10 bağlantı, görev dili ve aktarım kapsamını değiştirir:** [güncel kullanım ve sınırlar](CONNECTION_DESIGN_STORAGE.md). Artık ölçülemeyen notlar oyun günlüğüne yeni görev olarak gönderilmez.

## Oyun günlüğünün güncellenmesi

0.8 ve önceki sürümler düz metin hatırlatma yazıyordu. Bu nedenle uyumak/kaydetmek, oyun günlüğündeki notu tamamlamıyordu. 0.9 desteklenen yemek pişirme ve üretim hedeflerini, 1.6.9 ve sonraki kayıtlarda oyunun kendi `CraftingQuest` türüyle aktarır. Tarif eylemi oyunda gerçekleşince görev tamamlanır. Ödülü olmayan görev, oyunun normal davranışı gereği listeden kaldırılır; ödül alma kutusu beklenmemelidir.

Yeni sürümle oyunu kapat, Planlayıcı’daki oyun günlüğü bölümünden görevleri yeniden aktar, ardından kaydı oyunda aç. Bu adım eski düz notları yeni türe dönüştürür. Zaten tamamlanıp Planlayıcı’dan çıkan hedeflerin eski notları sonraki aktarımda kaldırılır. Aktarım ve geri alma hâlâ açık onay, kapalı oyun, güncel dosya özeti ve tam yedek gerektirir.

Bu görevler para, eşya, arkadaşlık, günlük ilan görevi kredisi veya sonraki görev vermez. Oyunda yapılan gerçek eylemin normal etkileri devam eder. Balık, arkadaşlık, müze, genel başarımlar ve kişisel metinler genel bir oyun olayıyla güvenle eşlenemediğinden hatırlatma olarak kalır. Kaydedilen destekli ilerlemeleri Companion taramada/sonraki açılışta doğrular. Mod, enjekte edilen kod veya arka plan servisi kurulmaz.

Görev başlığı, kısa açıklaması ve hedef cümlesi aktarım anındaki Companion dilini kullanır. Kişisel notun metni değiştirilmez. Oyunun dilini sonradan değiştirmek özel metni çevirmez; dili Companion’da seçip oyun kapalıyken yeniden aktar. Türkçe ve İngilizce aktarım aynı görev ve eşya kimliklerini korur.

## Kalite ve fiyat

Eşya ayrıntılarında normal/gümüş/altın/iridyum satırları vardır. Eşyada normalde bulunmayan kalite uygulanmaz olarak işaretlenir. Pişirilebilir yemekler için Qi Çeşnisiyle altın kalite, mayonez için devekuşu yumurtasıyla kalite seçenekleri dahil edilir. Kalite yıldızları kurulu oyunun özgün arayüzünden okunur.

Temel değerler kurulu oyun verisinden alınır. Kayıtlı meslek ve kâr oranı biliniyorsa seçili çiftçiye göre hesap gösterilir. Eksik veri sıfır veya %100 varsayılmaz. Çok oyunculu ortak cüzdanda başka aktif çiftçilerin bonusu farklı olabilir. Meyvede Çiftçi bonusu için yetiştirilmiş ürün varsayımı açıkça yazılır. Kullanılmış olta takımı ve değiştirilmiş ekipmanın değeri farklı olabilir. Bazı ekipmanlarda referans değer gösterilir; bu, her dükkânın onu satın aldığı anlamına gelmez.

Şarap, meyve suyu, reçel/turşu, tütsülenmiş balık, kurutulmuş ürün, bal ve balık yumurtası gibi ürünlerde kullanılan malzeme fiyatı değiştirir. Hesap için malzemeyi seç. Alış fiyatı, özel sipariş ödülü ve tek eşyalık satış değeri ayrı kavramlardır. Fiyat kuralları kurulu 1.6 verisini hedefler; desteklenmeyen kayıt sürümlerine kesin kişisel fiyat verilmez.

## Görseller, plan ve koleksiyonlar

Görsel denetimi katalog, tarif çıktıları/malzemeleri ve koleksiyon kimliklerini birlikte kontrol eder. Yabani tohum grubu için simge ve malzeme eşleşmesi onarıldı. Üç kullanılmayan oyuniçi kaydın özgün resmi boştur; açıklamalı yer tutucu gösterilir, resim uydurulmaz.

Planlayıcı; bekleyen hedef, kalan adım, malzeme ve doğrulanan hedef özetini gösterir. Sırada ne var, tamamlanmamış önkoşulları öne alır. Kısa eylem açıklamasının altında hazırlık ayrıntısı açılabilir. Hedef ve adım durumu filtreleri vardır. Elle işaretleme, kayıtla doğrulanan hedef tamamlanmasıyla karıştırılmaz.

Koleksiyonlar’da tümü/tamamlanmadı/tamamlandı/bilinmiyor filtreleri bulunur. Oyun günlüğündeki görevler Planlayıcı’ya yeniden eklenemez. Günlükten kaybolan normal bir görev için tamamlandı varsayılmaz; kayıt kanıtı yoksa bilinmiyor kalır.

## Çeviri kaynağı

Tüm yazıların ortak kaynak kataloğu `src/locales` içindedir: `en.json`, `tr.json`, dinamik cümle kuralları ve kaynak envanteri. Festival/başarım çevirileri alan kodundan buraya taşındı; eski sözlükler birleştirildi. Oyundan okunan Türkçe terim varsa önce o kullanılır. Oyun metinleri özel ve yereldir; kaynak dosyalarına aktarılmaz. Yeni dil hazırlama ve doğrulama adımları aynı klasördeki README’de açıklanır.

## Doğrulama ve sınırlar

201 test: 115 ön yüz/alan/çeviri, 54 Rust ve 32 arayüz senaryosu. Sentetik Rust çıktısı oyunun kendi XML serileştiricisinden geçirildi; gerçek tarif olayı sorgusu yalnızca amaçlanan eşyayı eşledi. Tam oyun penceresinde oynanış oturumu yapılmadı. Bütün yazma testleri sentetik dosyalardadır; orijinal kayıtlar değiştirilmedi.

Yerel çıkarım 7.535 simge referansı, 6.283 Türkçe oyun metni ve sıfır uyarı verdi. Piksel taraması 7.538 referansı (2.456 galeri kaydı dahil) denetledi; üç açıklanmış boş kayıt dışında bozuk/boş resim bulmadı. Türkçe rehberler, gerçek görseller, festival haritaları ve %130 metinle dar pencere kontrol edildi. Kurulum/güncelleme/kaldırma ve diğer işletim sistemleri doğrulanmış sayılmaz; paket imzasız geliştirme önizlemesidir.
