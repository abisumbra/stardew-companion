# Oyun bağlantısı gereksinimi — 19 Ekim 2026

Durum: 0.10.0'da tek paketli bağlantı uygulandı. Kullanıcının “geliştirip kur” talebiyle Companion üzerinden başlatma yolu kullanılıyor. Sentetik testler ve gerçek oyun türleriyle yalıtılmış uyumluluk kontrolü geçti; tam oyun penceresiyle oynanış testi henüz yapılmadı. Güncel kullanım ve sınırlar: [0.10 rehberi](CONNECTION_DESIGN_STORAGE.md).

## İstenen deneyim

- Kullanıcı yalnızca Companion'ı indirip kurar. Ayrıca SMAPI, mod yükleyicisi veya bağlantı modu kurması istenmez.
- Oyun günlüğüne aktarılan ölçülebilir bir hedef, şartı gerçekleşince oyun sırasında listeden kaldırılır. Companion'ın kendi listesinden kaldırılması yeterli değildir.
- Ek para, eşya veya arkadaşlık ödülü verilmez. Oyundaki gerçek eylemin normal etkileri korunur.
- Companion kapalıyken de oyunda yüklenmiş bağlantı çalışmaya devam edebilmelidir. Sonuç Companion'ın sonraki açılışında okunabilmelidir.

Bu istek, ayrı bir SMAPI kurulumu için izin değildir. SMAPI'yi otomatik veya gizli kurmak da varsayılan çözüm değildir.

## Mevcut davranış ve doğrulanmış sorun

0.9.0, 1.6.9+ kayıtlarda yemek/üretim için yerleşik CraftingQuest kullanır. Gönderme dahil diğer hedefler düz Quest hatırlatmasıdır. Kullanıcının bildirdiği “taşları gönder” kaydı salt okunur incelendi: türü Quest, questType=1, completed=false; satış koşulu bulunmuyor. Companion kayıtlı gönderim ilerlemesini okuyabiliyor, ancak bu okuma açık oyunun belleğindeki notu tamamlamıyor.

Yerleşik normal Quest türünde genel bir gönderim olayı yoktur. SpecialOrder/ShipObjective gönderimi takip edebilir, fakat farklı bir görev sistemidir: paylaşılmış katılımcılar, süre, özel sipariş tamamlanma sayacı ve olası bilet sayacı davranışı taşır. Bütün hedefler için ödülsüz normal görev yerine geçtiği varsayılmamalıdır.

## Araştırılacak tek paketli seçenek

Companion'a dahil edilen bağlantı Microsoft'un DOTNET_STARTUP_HOOKS mekanizmasıyla yalnızca Companion'dan başlatılan oyuna yükleniyor. Harmony güncelleme kancası gerçek 1.6.15 derlemesinde doğrulandı. Görev kaldırma, koşul sayaçları ve çiftlik aktarımı sentetik testlerle; gerçek oyun türlerine erişim ayrı yalıtılmış ortamda kontrol edildi. Çok oyunculu mod açıkça reddediliyor. Bu kontroller tam oyun penceresi testi yerine geçmez.

Bir uygulama ancak şu kontrollerden sonra çalışan özellik olarak sunulabilir:

- Paket harici SMAPI/mod kurulumuna ihtiyaç duymaz ve oyun dosyalarını değiştirmez.
- Canlı görev değişiklikleri oyunun ana iş parçacığında yapılır; açık oyunun kayıt dosyasına dışarıdan yazılmaz.
- Desteklenen oyun sürümleri doğrulanır; uyumsuz sürümde bağlantı kapalı kalır.
- Görevler açık koşullara dayanır. Serbest metin notlarının tamamlanması tahmin edilmez; ölçülemeyen notlar otomatik görev olarak sunulmaz.
- Yalnız Companion'a ait görevler değişir; normal görevler, diğer oyuncular ve ödül/sayaçlar korunur.
- Gönderim için tamamlanma anı gerçek satışın işlendiği andır; kutuya bırakıp geri alınabilen eşya tamamlanmış satış sayılmaz.
- Companion açık/kapalı, oyun yeniden yükleme, dil seçimi, kayıt alma ve çok oyunculu durumları gerçek oyun testinden geçer.

## Kaynaklar

- [Microsoft: .NET ortam değişkenleri — DOTNET_STARTUP_HOOKS](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-environment-variables#dotnet_startup_hooks)
- [Microsoft .NET: başlangıç kancası tasarımı](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-startup-hook.md)
- [Stardew Valley Wiki: Special orders](https://stardewvalleywiki.com/Modding:Special_orders)
- Kurulu vanilla 1.6.15 Quest, CraftingQuest, SpecialOrder ve ShipObjective kodunun salt okunur incelemesi. Özel kayıtlar ve çıkarılan oyun kodu dağıtım paketine dahil değildir.
