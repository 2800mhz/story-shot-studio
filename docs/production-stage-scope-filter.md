# Story Shot Studio Scope Filter

Tarih: 2026-05-02  
Bağlam: [production-stage-audit.md](C:/Users/emreg/OneDrive/Desktop/deneme/story-shot-studio/docs/production-stage-audit.md) için ek ürün filtresi

Bu notun amacı şu soruyu net cevaplamak:

**Film production pipeline içindeki hangi katmanlar bize gerçekten lazım, hangileri şu an gereksiz?**

Bu ayrımı net koymak önemli, çünkü her "eksik" alan ürün açısından değerli olmayabilir.

---

## Ana Soru

Story Shot Studio şu problemi mi çözüyor:

1. Set lojistiğini optimize etmek  
2. Metni görsel olarak planlanabilir hale getirmek

Şu anki ürün açık biçimde ikinci problemi çözüyor.

Bu yüzden tüm film production aşamalarını almak doğru değil. Özellikle şu soruyu sürekli sormak gerekiyor:

**"Bu özellik, sahneyi daha iyi görselleştirmemizi mi sağlıyor, yoksa bizi gereksiz yere operasyon yazılımına mı itiyor?"**

---

## Kesin Gerekli Olanlar

### 1. Visual Script Breakdown

Bu, ürünün çekirdeği.

Olmadan sistem:
- zayıf sahne ayrıştırır
- zayıf prompt üretir
- continuity kaybeder
- referansları düzgün taşıyamaz

Gerekli alt alanlar:
- karakter
- mekan
- zaman
- wardrobe / kıyafet dili
- prop / elde tutulan nesne
- atmosfer
- continuity note
- visual beat

Karar: **Kesin gerekli**

### 2. Director's Visual Treatment

Episode style, render mode, narrative mode ve genel görsel treatment bu ürünün kimliğinin merkezinde.

Bu katman olmazsa ürün:
- generic prompt generator'a döner
- sahneler arası estetik tutarlılığı kaybeder

Karar: **Kesin gerekli**

### 3. Scene-by-Scene Visual Planning

SceneCard sistemi zaten ürünün ana yüzeyi.

Burada zamanla güçlenmesi gereken ama gerekli olan alanlar:
- scene amacı
- emotional beat
- action beat
- visual emphasis
- continuity risk

Karar: **Kesin gerekli**

### 4. Coverage / Shot Planning

Wide / Medium / Close-up zaten bunun ilk formu.

İleride gelişebilecek alanlar:
- shot intent
- shot number
- angle
- movement
- lens

Karar: **Kesin gerekli**

### 5. Continuity

Şu an ürünün en büyük kalite risklerinden biri:
- karakter drift
- kıyafet drift
- style drift
- scene-to-scene prompt kopmaları

O yüzden continuity bir bonus değil, çekirdek kalite sistemi.

Karar: **Kesin gerekli**

### 6. Reference-Aware Visual Planning

Sistemi sıradan prompt aracından ayıran en önemli farklardan biri.

Referansların:
- sahneye
- karaktere
- stile
- genel world-building'e

bağlı yaşaması gerekiyor.

Karar: **Kesin gerekli**

---

## Değerli Ama İkinci Faz Olanlar

### 1. Storyboard / Previs Görselleştirmesi

Bu alan çok değerli çünkü:
- SceneCard'ı metinden görsele taşır
- ekip içi anlatımı kolaylaştırır
- shot ritmini daha görünür yapar

Ama mevcut ürünün çekirdeği zaten prompt-planning tarafında çalışıyor.

Karar: **Gerekli olabilir, ama ikinci faz**

### 2. Structured Shot List

Bu, ürünün en doğal profesyonelleşme alanlarından biri.

Neden önemli:
- coverage mantığını somutlaştırır
- export kalitesini artırır
- storyboard/previs katmanına köprü olur

Neden hemen şart değil:
- önce shot grammar state seviyesinde ayrışmalı

Karar: **Çok mantıklı sonraki adım**

### 3. Stripboard-Lite

Burada kast edilen şey tam production stripboard değil.

Sadece:
- location cluster
- day/night cluster
- character cluster
- scene grouping

gibi taramayı kolaylaştıran bir görünüm olabilir.

Bu, lojistik için değil; scene planning ergonomisi için anlamlı olabilir.

Karar: **Belki, ama sadece hafif haliyle**

---

## Şu An Gereksiz veya Yanlış Yöne Çekebilecek Olanlar

### 1. Full Stripboard / Production Board

Burada ana soru şu:

**Neden sahneleri lojistiğe göre ayıralım?**

Eğer sistem:
- oyuncu availability yönetmiyorsa
- mekan rezervasyonu yapmıyorsa
- günlük çekim planı oluşturmuyorsa
- call sheet üretmiyorsa

o zaman full stripboard ürün için gereksiz ağırlık olur.

Bu katman ürünü:
- visual planning aracından
- production operations aracına

kaydırır.

Karar: **Şimdilik gereksiz**

### 2. DOOD / Cast Availability Matrix

Bu, prodüksiyon ofisi problemidir.

Story Shot Studio'nun bugünkü ana problemi:
- sahneyi planlamak
- görsel dil kurmak
- prompt / shot / continuity üretmek

Availability matrix bunların merkezinde değil.

Karar: **Gereksiz**

### 3. Full Shooting Schedule

Episode navigator ile shooting schedule aynı şey değil.

Gerçek shooting schedule şunları ister:
- gün bazlı plan
- call time
- company move
- sayfa sayısı / çekim yoğunluğu
- cast requirement

Bu veri seti ve kullanım amacı şu an ürünün merkezinde yok.

Karar: **Gereksiz**

### 4. Call Sheet

Call sheet, ürünün previsualization katmanından çıkıp set operasyonuna girdiği noktadır.

Bu aşama şu an için:
- ağır
- operasyonel
- ürün yönünü dağıtıcı

Karar: **Gereksiz**

### 5. Floor Plans / On-Set Diagrams

Bu tip katmanlar ancak:
- storyboard
- shot list
- blocking

yeterince olgunlaştıktan sonra anlam kazanır.

Şu an için erkendir.

Karar: **Şimdilik gereksiz**

---

## Kısa Karar Matrisi

| Katman | Durum | Yorum |
|---|---|---|
| Visual script breakdown | Gerekli | Çekirdek fonksiyon |
| Scene-by-scene visual planning | Gerekli | SceneCard sistemi bunun üstüne kurulu |
| Visual treatment / render mode / style | Gerekli | Ürün kimliği |
| Coverage / shot planning | Gerekli | Prompt üretiminin doğal merkezi |
| Continuity | Gerekli | Kalite ve güvenilirlik için kritik |
| Storyboard / previs | Sonra | Güçlü ama ikinci faz |
| Structured shot list | Sonra | En mantıklı büyüme alanı |
| Stripboard-lite | Belki | Sadece organizasyon kolaylaştırırsa |
| Full stripboard | Gerekli değil | Ürünü lojistik araca dönüştürür |
| DOOD | Gerekli değil | Operasyon yazılımı problemi |
| Full shooting schedule | Gerekli değil | Ana ürün kimliğinin dışında |
| Call sheet | Gerekli değil | Fazla operasyonel |
| Floor plans | Gerekli değil | Önce storyboard/shot katmanı olgunlaşmalı |

---

## Net Ürün Yargısı

Story Shot Studio'nun doğru odağı:

- görsel planlama
- shot planning
- continuity
- style / reference / entity control

Story Shot Studio'nun şu aşamada odağı olmaması gereken şeyler:

- full scheduling
- full stripboard
- call sheet
- AD operasyon araçları

Kısacası:

**Ürünün geleceği sete çıkma lojistiğinde değil, script-to-visual-plan katmanını daha profesyonel hale getirmekte.**
