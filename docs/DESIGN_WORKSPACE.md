# 0.11.0 — tasarım araçları ve haritalar

## Çiftlik ve ev tasarımı

Sol menüde **Çiftlik Tasarımı** ve **Ev Tasarımı** ayrı bölümlerdir. Kayıt kitaplıkları birbirinden bağımsızdır; uygulama yedeği ikisini de içerir. Önce planı ve paletten öğeyi seç.

- Sol tuşla yerleştir. Yol, ekin ve diğer tek karoluk öğelerde basılı tutup sürükleyerek çiz. Çizgi önizlemesi anında görünür; bütün çizgi tek geri alma adımıdır.
- Seçili öğeyi sürükleyerek taşı. Taşıma aracında boş karoya tıklamak veya koordinatları kullanmak da mümkündür.
- Sağ tuşla sürükle veya Silgi aracını seçerek tasarımdaki öğeleri kaldır. Bu işlem oyun dünyasındaki nesneleri silmez.
- Fare tekerleği imlecin bulunduğu noktada yakınlaştırır. Boşluk + sürükleme, orta tuş veya El aracı haritayı taşır. **Haritayı sığdır** çalışma alanına göre ölçekler.
- Ctrl+Z geri alır; Ctrl+Y veya Ctrl+Shift+Z yeniler. Harita odaktayken Delete seçili öğeyi kaldırır; F haritayı sığdırır.
- **Geniş ekranda aç** ile aynı araçları büyük çalışma alanında kullan. Sayfaya dön düğmesi veya Escape ile çık. Tasarım korunur.

Ev seçenekleri: başlangıç evi, mutfaklı ev, büyük ev, eş odalı iki gelişmiş ev ve bodrum. Mobilyalar kurulu oyundan özgün görselleri ve yerleşim ölçüleriyle okunur; arama, tür filtresi ve daha fazla yükleme bulunur. Halılar diğer mobilyaların altında kalabilir. İlk yerleştirme yönü kullanılır; döndürme, duvar kâğıdı/döşeme boyama ve oda tadilatı bu sürüme dahil değildir.

Evler temel harita şablonlarıdır; kayıtlı tadilatlar, mevcut mobilyalar ve eşe özel oda dekoru yeniden oluşturulmaz. **Ev tasarımları Companion içinde saklanır; mobilyalar oyuna aktarılmaz.** Çiftlikte önceki sürümün desteklenen nesneler için gerçek envanterle aktarım sınırları sürer. Bina ve ekin aktarımı eklenmemiştir.

## Diğer haritalar ve sandıklar

Konum, NPC, festival ve balıkçılık haritalarında da fare tekerleği ve geniş ekran bulunur. Özgün harita katmanları bir kez çözülüp tekrar kullanılır. Tasarım yakınlaştırması her öğeyi tekrar boyamak yerine ortak kamera katmanını ölçekler.

Sandıklar üstte yatay bir şerittedir. Filtredeki ilk sandık kendiliğinden açılır; eşya aramasıyla bulunan sandık da doğrudan incelenebilir. Sandığın özgün tür görseli, kalite/miktar, kayıtlı iç koordinatlar ve varsa binasının çiftlikteki konumu gösterilir. Aynı mekândaki sandıklar numaralı işaretçilerle listelenir.

GUID içeren iç mekân adları, kayıttaki binanın `nonInstancedIndoorsName` veya eski `indoors/uniqueName` bağlantısıyla çözülür. Gerçek iç harita `Data/Buildings.IndoorMap` alanından alınır; isim son ekleri tahmin edilmez. Ev haritası kayıtlı geliştirme seviyesi/eş odasına göre seçilir. Kayıtlı koordinatlar ve stok son oyun kaydına aittir; canlı ekran görüntüsü veya anlık stok değildir. Modlu/eksik haritalar için garanti verilmez.

## Steam ve diller

Steam başarımlarında **Tümü / Tamamlandı / Tamamlanmadı / Bilinmeyen** düğmeleri vardır. Tamamlandı filtresi Steam doğrulaması, kayıtta sağlanan şartlar veya elle işaretleme içerir; kartlar kanıtın türünü göstermeye devam eder. Steam hesabına başarım yazılmaz. Yeni arayüz metinleri merkezi dil dosyalarındadır; Türkçe kapsam genişletilmiştir. Uzun rehberlerin diğer dillerdeki kapsamı hâlâ kısmi olabilir.

Etkileşim referansı: [Stardew Planner](https://stardewplanner.com/). Sitenin yerleştirme, sürükleme, fırça ve araç akışı incelendi; kodu ve görselleri kopyalanmadı. Oyun görselleri yalnızca kullanıcının kurulumundan okunur.
