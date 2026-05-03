# Story Shot Studio: Current and Future Output Map

Tarih: 2026-05-02

Bu belge, [ai-native-cinematic-production-system.md](C:/Users/emreg/OneDrive/Desktop/deneme/story-shot-studio/docs/ai-native-cinematic-production-system.md) metninin somut çıktılar odaklı tamamlayıcısıdır.

Amaç:

1. Bugün sistem bir metin verildiğinde tam olarak ne üretiyor, onu net yazmak
2. Bu çıktılar nasıl oluşuyor, onu görünür kılmak
3. Savaş Arslan güncellemesinden sonra ürünün çıktı seti nasıl genişlemeli, onu tanımlamak

---

## 1. Bugün Sisteme Ne Veriyoruz?

Bugün sisteme ana girdi olarak şunlar verilebiliyor:

- düz metin
- anlatı metni
- episode / bölüm metni
- sahneleştirilebilir tarihsel veya belgesel metin

Yani sistemin başlangıç noktası çoğu zaman bir senaryo, çekim planı ya da shot list değil; metnin kendisi.

Bu nedenle sistemin ilk işi:

**metni üretim zincirine uygun yapılandırılmış bir forma çevirmek**

---

## 2. Bugün Sistem Nasıl Çalışıyor?

Bir kullanıcı metni verdiğinde bugünkü temel zincir kabaca şöyle ilerliyor:

1. Metin alınır
2. Metin sahnelere bölünür
3. Sahne kartları oluşturulur
4. Karakterler çıkarılır
5. Mekanlar çıkarılır
6. Zaman bağlamları çıkarılır
7. Her sahne için görsel yön / visual note oluşur
8. Episode-level görsel treatment bağlanır
9. Render mode ve narrative mode devreye girer
10. Referanslar sahnelere bağlanabilir
11. Her sahne için image prompt varyasyonları üretilir
12. Bu promptlardan bir tanesi seçili / pinned hale gelir
13. İstenirse motion tarafında image-to-video promptları üretilir

Bu zincir bugün zaten çalışan bir ilk üretim mekanizmasıdır.

---

## 3. Bugün Metinden Hangi Çıktıları Alıyoruz?

## 3.1 Scene Cards

Bir metnin ilk büyük çıktısı sahne kartlarıdır.

Her sahne kartı bugün kabaca şunları taşıyor:

- scene text
- scene order
- visual note
- prompt alanı
- prompt varyasyonları
- bağlı karakterler
- bağlı mekanlar
- bağlı zaman bağlamları
- bağlı referanslar

Bu yapı bugün sistemin ana çalışma yüzeyidir.

## 3.2 Character / Location / Time Entities

Sistem metni sadece sahnelere bölmüyor; aynı zamanda ondan üretim bağlamı da çıkarıyor.

Bugünkü yapıda bunlar:

- karakterler
- mekanlar
- zaman katmanları

olarak yaşıyor.

Bu katman daha sonra:
- prompt üretimini
- continuity’yi
- agent düzenlemelerini
- referans eşlemelerini

besliyor.

## 3.3 Episode-Level Visual Treatment

Bugün sistem tek sahne bazlı çalışmıyor; episode düzeyinde de bir estetik yön taşıyor.

Çıktı olarak burada şunlar var:

- render mode
- narrative mode
- episode style
- visual treatment
- atmosfer yönü

Bu ürünün önemli farklarından biri; çünkü sahneler tek tek promptlar olarak değil, ortak bir görsel rejim altında üretiliyor.

## 3.4 Image Prompt Coverage

Her sahne için bugün tipik olarak şu coverage varyasyonları üretiliyor:

- Wide
- Medium
- Close-up

Bu çok kritik, çünkü sistem yalnızca “tek prompt üreten bir araç” değil; temel coverage mantığına göre çalışan bir sistem.

Bu coverage bugün henüz tam structured shot list değil, ama güçlü bir başlangıç.

## 3.5 Reference-Linked Prompt Context

Kullanıcı bir sahneye referans atadığında bu da çıktı setinin parçası oluyor.

Yani üretilen promptlar yalnızca metne göre değil:

- sahne bağlamına
- style bağlamına
- referanslara

göre şekillenebiliyor.

## 3.6 Img2Vid / Motion Prompt Layer

Bugün sistemin önemli ikinci üretim halkası bu.

Image prompttan sonra sistem, görseli video üretimine taşıyacak hareket yönlendirmesi de üretebiliyor.

Bu katmandaki çıktılar:

- motion prompt
- hareket vurgusu
- kamera hissi
- still-to-video köprüsü

gibi davranıyor.

---

## 4. Bugünkü Çıktı Setinin Sınırı Nerede?

Bugünkü çıktı seti güçlü ama hâlâ sınırlı.

Henüz tam üretmediğimiz şeyler:

- gerçek breakdown sheet
- structured shot list
- prop / wardrobe / action beat breakdown
- continuity raporları
- scene-to-sequence plan
- kurgu / assembly planı
- Premiere / AE için metadata-rich handoff

Yani bugün elimizde bir ilk üretim hattı var, fakat henüz “uçtan uca film üretim paketi” yok.

---

## 5. Savaş Arslan Güncellemesinden Sonra Ne Değişmeli?

Savaş Arslan ile çalışırken sistemin sadece prompt üreten bir yüzeyden biraz daha ciddi bir üretim düşüncesine geçmesi gerekiyor.

Buradaki fark şu:

Amaç sadece görsel üretmek değil; sahneyi:

- tarihsel olarak
- anlatısal olarak
- görsel olarak
- yapısal olarak

daha sağlam kurmak.

Bu yüzden çıktı setinin de genişlemesi gerekiyor.

---

## 6. Genişleyen Çıktı Seti Nasıl Olmalı?

## 6.1 Scene Card -> Breakdown Unit

Bugünkü scene card yapısı daha çok:

- scene text
- visual note
- prompt

üzerinde duruyor.

Genişlemiş yapıda ise sahne birimi şunları da üretmeli / taşımalı:

- scene number
- dramatic function
- emotional beat
- action beat
- prop notes
- wardrobe notes
- continuity notes
- production notes
- reference notes

Yani sahne kartı sadece prompt kaynağı değil, gerçek bir breakdown unit haline gelmeli.

## 6.2 Breakdown Reports

Savaş Arslan güncellemesi sonrası sistem sadece sahne kartı değil, rapor da üretmeli.

Örnek çıktılar:

- scene-by-scene breakdown summary
- character presence report
- location report
- wardrobe / prop note summary
- continuity warning report
- reference attachment report

Bu özellikle akademik, tarihsel ve yönetmenlik odaklı çalışma için büyük değer sağlar.

## 6.3 Prompt Coverage -> Shot Planning

Şu an wide / medium / close-up var.

Gelişmiş yapıda buna şu structured çıktılar eşlik etmeli:

- shot intent
- shot size
- camera angle
- movement
- lens suggestion
- dramatic purpose

Bu sayede ürün çıktısı “üç prompt” düzeyinden “gerçek shot planning paketi” düzeyine yükselir.

## 6.4 Motion Layer -> Video Intent Layer

Bugün motion prompt var, ama bu daha çok img2vid köprüsü gibi.

Genişlemiş yapıda şunları da üretmeli:

- shot bazlı video intent
- hareket tipi
- giriş / çıkış ritmi
- camera movement behavior
- clip duration suggestion
- adjacent shot continuity hints

Bu sayede still-to-video katmanı daha anlamlı hale gelir.

## 6.5 Sequence / Edit Planning

En büyük sıçrama burada olur.

Sistem artık sadece sahneleri ve promptları değil, onların akışını da düşünmeye başlamalı.

O zaman alınabilecek yeni çıktılar:

- scene order vs edit order ayrımı
- sequence grouping
- rhythm notes
- transition suggestions
- assembly recommendations

Bu doğrudan ilerideki Premiere / AE katmanının ön koşuludur.

---

## 7. Güncelleme Sonrası Toplam Çıktı Haritası

## 7.1 Bugün Aldıklarımız

- scene cards
- character / location / time extraction
- visual notes
- render mode / narrative mode / style treatment
- image prompts
- pinned prompt
- img2vid prompts

## 7.2 Yakın Vadede Eklenmesi Gerekenler

- structured breakdown fields
- breakdown index
- breakdown reports
- continuity warnings
- shot planning metadata

## 7.3 Orta Vadede Eklenmesi Gerekenler

- structured shot list
- sequence plan
- rhythm / transition notes
- assembly plan
- exportable production package

## 7.4 Uzun Vadede Eklenmesi Gerekenler

- Premiere plugin handoff
- After Effects handoff
- timeline-aware export
- clip / shot lineage tracking
- generation-to-edit feedback loop

---

## 8. Bunun Ürün Açısından Anlamı Ne?

Bu genişleme ile ürün çıktısı sadece şu olmaktan çıkar:

- “bir metin verdim, bana prompt verdi”

Şuna dönüşür:

- “bir metin verdim”
- “sistem bunu sahnelere böldü”
- “her sahnenin üretim bağlamını çıkardı”
- “görsel treatment kurdu”
- “shot coverage üretti”
- “video üretim niyetini hazırladı”
- “kurguya yaklaşabilecek bir üretim paketi oluşturdu”

Bu çok daha büyük ve çok daha doğru bir ürün tanımıdır.

---

## 9. Net Sonuç

Bugün Story Shot Studio bir metinden şunları üretiyor:

- sahne yapısı
- karakter / mekan / zaman bağlamı
- görsel yön
- image prompt coverage
- motion prompt köprüsü

Savaş Arslan güncellemesinden sonra ise bunun üstüne şunların gelmesi gerekir:

- gerçek breakdown intelligence
- breakdown raporları
- shot planning metadata
- sequence / kurgu yönü
- downstream araçlara daha ciddi handoff

Yani ürünün çıktısı giderek:

**scene cards + prompts**

seviyesinden

**structured cinematic production package**

seviyesine doğru genişlemelidir.
