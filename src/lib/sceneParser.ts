import type { Scene } from '@/types';

const SCENE_PARSING_PROMPT = `Sen bir story-board uzmanısın. Her sahne = 1 STATIK FOTOĞRAF KARESI!

⚠️ KRİTİK: YASAKLI KELİMELER (ASLA KULLANMA!):

🚫 HAREKETLİ EKLER (-ması/-mesi/-ışı/-işi/-uşu/-üşü):
- YASAK: "fışkırması", "dağılışı", "koşuşu", "kuruşu", "dönüşümü", "akışı", "yükselişi"
- YERİNE: "fışkıran su anı (high-speed freeze)", "havada asılı kum (slow-motion freeze)", "koşan adam, ayaklar havada (mid-stride dondurulmuş)"

🚫 ZAMAN ATLAMASI TERİMLERİ (YASAK):
- "hızlandırılmış çekim"
- "time-lapse"
- "zaman atlaması"
- "yavaş çekim" → yerine: "slow-motion freeze" ✅

🚫 SÜREÇ KELİMELERİ (YASAK):
- "dönüşüm", "dönüşümü"
- "evrim", "evrimi"
- "geçiş", "geçişi"
- "değişim", "değişimi"
- YERİNE: her dönüşümü → 5 AYRI SAHNEYE BÖL!

🚫 SOYUT KONSEPTLER (YASAK):
- "ses dalgaları"
- "soyut oluşum"
- "yankılanma", "yankı"
- "belirme", "beliriyor"

🚫 YAZI/METİN (YASAK):
- "yazı", "kelime"
- "ad", "adı", "adının"
- "tabela", "kitap sayfası"
- YERİNE: 5 farklı kültürden insanı bir mekanda göster!

---

🎯 KRİTİK KURALLAR:

1. **STATIK FOTOĞRAF KARELERİ** (Hareketli değil!)
   ❌ KULLANMA: "fışkırıyor", "koşuyor", "dönüşüyor", "yükseliyor"
   ✅ KULLAN: "fışkıran su anı (dondurulmuş)", "koşarken donmuş adam", "yarı-çadır yarı-ev"

   ÖRNEKLER:
   - ❌ "Suyun aniden fışkırması" → YASAK (-ması eki!)
   - ✅ "Topraktan fışkıran su anı, damlacıklar havada asılı (splash dondurulmuş)"

   - ❌ "Kumların hızla dağılışı" → YASAK (-ışı eki!)
   - ✅ "Havada asılı kum tanecikleri (slow-motion freeze)"

   - ❌ "Adamın koşuşu" → YASAK (-uşu eki!)
   - ✅ "Koşan adam, ayaklar havada (mid-stride dondurulmuş)"

   - ❌ "Çadırları kuruşu" → YASAK (-uşu eki!)
   - ✅ "İnsanlar çadır kurarken donmuş (eller ipe tutunmuş, dondurulmuş)"

2. **ZAMAN ATLAMALARINI PARÇALA!** (ÇOK ÖNEMLİ!)

   Bir "dönüşüm/evrim/geçiş" gördüğün yerde → **EN AZ 5 AYRI SAHNEYE BÖL!**

   **ÖRNEK 1: Şehir Gelişimi**
   INPUT: "Çadırlar yavaşça şehre dönüştü."

   ❌ YANLIŞ (1 sahne):
   - "Çadırların şehre dönüşümü" → YASAK (dönüşüm kelimesi!)

   ✅ DOĞRU (6 sahne):
   - Sahne 1: "Kuyu çevresinde 2-3 eski çadır (havadan geniş açı)"
   - Sahne 2: "Kuyu çevresinde 8-10 çadır, küçük oba düzeni (havadan)"
   - Sahne 3: "15 çadır + 2-3 yarı-kerpiç yapı (hibrit görünüm, havadan)"
   - Sahne 4: "Çoğunlukla kerpiç evler, 3-4 çadır hala var (havadan)"
   - Sahne 5: "Tamamen kerpiç evler, ahşap kapılar, düzenli sokaklar"
   - Sahne 6: "Görkemli şehir, kubbe yapılar, kalabalık meydan"

   **ÖRNEK 2: İnsan Yaşlanması**
   INPUT: "Genç adam yıllar içinde bilge oldu."

   ❌ YANLIŞ (1 sahne):
   - "Adamın yaşlanma evrimi" → YASAK (evrim kelimesi!)

   ✅ DOĞRU (5 sahne):
   - Sahne 1: "20 yaşlarında genç adam portresi, pürüzsüz cilt, kısa saç"
   - Sahne 2: "30 yaşlarında adam portresi, hafif kırışıklıklar, sakal başlamış"
   - Sahne 3: "45 yaşlarında adam portresi, derin kırışıklıklar, gri saçlar"
   - Sahne 4: "60 yaşlarında adam portresi, uzun beyaz sakal, yaşlı gözler"
   - Sahne 5: "75 yaşlarında bilge adam, uzun beyaz sakal, derin kırışıklıklar"

   **ÖRNEK 3: Savaş → Barış**
   INPUT: "Savaş bitince barış geldi."

   ❌ YANLIŞ (2 sahne):
   - "Savaş geçişi" → YASAK (geçiş kelimesi!)

   ✅ DOĞRU (5 sahne):
   - Sahne 1: "2 asker kılıç sallarken (dondurulmuş aksiyon)"
   - Sahne 2: "Yere düşmüş kılıçlar ve kalkanlar"
   - Sahne 3: "İki komutan el sıkışıyor (statik)"
   - Sahne 4: "Askerler çadırlara dönüyor (geniş açı, durağan)"
   - Sahne 5: "Boş savaş alanında yeni çiçekler (geniş manzara)"

   **ÖRNEK 4: Su Fışkırması**
   INPUT: "Genç adam toprağı kazınca su fışkırdı."

   ❌ YANLIŞ:
   - "Suyun fışkırması" → YASAK (-ması eki!)

   ✅ DOĞRU (5 sahne):
   - Sahne 1: "Genç adam elleriyle toprağı kazıyor (eller yarı gömülü, dondurulmuş)"
   - Sahne 2: "Topraktan ilk ıslak nokta görünüyor (yakın çekim)"
   - Sahne 3: "Topraktan küçük su damlacıkları yükseliyor (slow-motion freeze)"
   - Sahne 4: "Topraktan fışkıran su anı, splash 30cm yüksekte (high-speed freeze)"
   - Sahne 5: "Su havada parçalanmış damlacıklar halinde (ultra slow-mo freeze)"

3. **YAZI KULLANMA! İNSAN VE MEKAN KULLAN!**

   ❌ YASAKLI:
   - "Şehir tabelasında 'Hive' adının belirmesi" → YASAK (adı + belirme!)
   - "Kitap sayfasında 'Hey vah' kelimesinin evrimi" → YASAK (kelime + evrim!)
   - "'Hive' adının belirginleşmesi" → YASAK (adı!)

   ✅ YERİNE YAP:
   - "5 farklı ırktan insan (Arap beyaz sarık, Çinli ipek kimono, Afrikalı renkli kumaş, Avrupalı deri pantolon, Hintli turuncu turban) şehir meydanında büyük çeşme çevresinde su içiyor"
   - "Şehir pazarında tüccarlar farklı dillerde konuşurken (ağızlar açık, el hareketleri dondurulmuş)"
   - "Saray duvarında işlemeli desenler (yakın çekim)"

4. **SOMUT GÖRSEL** (Soyut Kavramlar Yok!)

   ❌ YASAKLI:
   - "Umut ışığı beliriyor" → YASAK (belirme + soyut!)
   - "Ses dalgaları yankılanıyor" → YASAK (ses dalgaları + yankı!)
   - "Soyut bir isim oluşumu" → YASAK (soyut + oluşum!)

   ✅ SOMUTLAŞTIR:
   - "Gökyüzünde altın renkli güneş ışınları bulutların arasından (geniş açı)"
   - "Çöl üzerinde kuşbakışı görünüm, kuyunun etrafında toplanmış insanlar (sessiz manzara)"
   - "Adamın yüzünde korku ifadesi, gölgeler yüzünde (close-up)"

5. **BASİT AKSIYONLAR** (img2vid için)

   ❌ ÇOOOK KARMAŞIK:
   - "100 kişilik ordu çarpışması"

   ✅ BASİT:
   - "3-4 asker kılıç sallarken (dondurulmuş)"
   - "5-6 tüccar duran tezgahların önünde"

---

🎬 FOTOĞRAF KARE TİPLERİ:

**TİP 1: DONMUŞ AKSİYON** (High-speed freeze)
- "Zıplayan at, 4 ayak havada (dondurulmuş)"
- "Topraktan fışkıran su anı, splash havada asılı damlacıklar (high-speed freeze)"
- "Kılıç sallarken donmuş asker (blade mid-swing)"
- "Koşan adamlar, ayaklar yerde değil (mid-stride)"

**TİP 2: STATİK POZ** (Still pose)
- "Düşünen derviş heykeli gibi duruyor"
- "Elinde baston tutan yaşlı adam (statik)"
- "Kuyunun başında duran 3 kişi (statik grup portresi)"
- "Ufka bakan kervan lideri (durağan)"

**TİP 3: GENİŞ MANZARA** (Wide landscape)
- "Çöl ufku, güneş batımında (durağan manzara)"
- "Şehir kuşbakışı görünümü (havadan, statik)"
- "Kervan çöl ortasında (drone açısı, dondurulmuş)"

**TİP 4: YAKIN ÇEKİM** (Close-up detail)
- "Çatlamış dudaklar (extreme close-up)"
- "Yaşlı ellerde eski harita (statik)"
- "Gözlerde yansıyan ateş ışığı (close-up)"

**TİP 5: TIME-LAPSE ADIMI** (Snapshot in progression)
Zaman atlamasını adımlara böl! Her adım = 1 statik kare!
- "Kuyu çevresinde 7-8 çadır" (Adım 2/6)
- "35 yaşındaki adam portresi" (Adım 2/5)
- "Kerpiç evler, ahşap kapılar" (Adım 4/6)

---

🚫 YASAKLI KONSEPTLER:

1. **Yazı/Metin Nesneleri:**
   - Tabelalar, kitap sayfaları, duvar yazıları, "kelime", "ad", "adı"
   - **Çözüm:** İnsanlar ve aksiyonla anlat!

2. **Soyut Kavramlar:**
   - "ses dalgaları", "yankılanma", "belirme", "soyut oluşum"
   - **Çözüm:** Somut nesneler ve ifadeler!

3. **Süreç İfadeleri:**
   - "-ması/-mesi/-ışı/-işi/-uşu/-üşü" ekleri, "dönüşüm", "evrim", "geçiş"
   - **Çözüm:** "dondurulmuş an", adımlara böl!

4. **Zaman Atlaması Terimleri:**
   - "hızlandırılmış çekim", "time-lapse", "zaman atlaması"
   - **Çözüm:** Her adımı ayrı sahne olarak ver!

5. **Çok Karmaşık Kalabalık:**
   - "100 kişi çarpışıyor"
   - **Çözüm:** "2-3 kişi ana aksiyonda"

---

🎯 HEDEF SAHNE SAYILARI:
- Basit metin (100 kelime) = 25+ sahne
- Orta metin (200 kelime) = 50+ sahne
- Karmaşık metin (500 kelime) = 120+ sahne
- **Her dönüşüm/evrim/geçiş = EN AZ 5 AYRI SAHNE!**
- **Her hareket = Dondurulmuş an!**
- **Yazı YOK, insanlarla anlat!**

KONTROL LİSTESİ (Her sahne için zorunlu):
- "-ması/-mesi/-ışı/-işi/-uşu/-üşü" eki YOK mu?
- "dönüşüm/evrim/geçiş/değişim" kelimesi YOK mu?
- "hızlandırılmış/time-lapse" YOK mu?
- Yazı/kelime/ad konsepti YOK mu?
- Soyut kavram/ses dalgaları/yankı YOK mu?
- Dondurulmuş an veya statik durum belirtilmiş mi?

OUTPUT FORMAT:
{
  "scenes": [
    {
      "text": "Çok kısa, statik sahne tanımı (1 fotoğraf karesi)",
      "reasoning": "Hangi görsel? Neden önemli? (Türkçe 1 cümle)"
    }
  ]
}

ŞİMDİ BU METNİ PARÇALA:
`;

// Patterns that indicate a scene uses dynamic/motion expressions instead of static frozen shots
const BANNED_PATTERNS = [
  // Turkish verbal noun suffixes indicating motion/process
  /\w+ması\b/gi,
  /\w+mesi\b/gi,
  /\w+ışı\b/gi,
  /\w+işi\b/gi,
  /\w+uşu\b/gi,
  /\w+üşü\b/gi,
  // Time-lapse / slow-motion terms
  /hızlandırılmış\s+çekim/gi,
  /time-?lapse/gi,
  /zaman\s+atlaması/gi,
  // Process/transformation words
  /\bdönüşüm/gi,
  /\bevrim\b/gi,
  /\bgeçiş\b/gi,
  /\bdeğişim\b/gi,
  // Abstract concepts
  /ses\s+dalgaları/gi,
  /soyut.*oluşum/gi,
  /\byankılan/gi,
  /\bbelirme\b/gi,
  // Text/writing concepts
  /\byazı/gi,
  /\bkelime/gi,
  /\badı\b/gi,
  /\badın\b/gi,
  /\badının\b/gi,
  /\bisim/gi,
  /\btabela/gi,
  /\bmetin\b/gi,
  /\bmetni\b/gi,
  /\byazıt\b/gi,
  /\bharfler\b/gi,
];

export async function parseTextIntoScenes(
  fullText: string,
  apiKey: string,
  model: string
): Promise<Scene[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const chunks = splitIntoChunks(fullText, 20000);
  const allScenes: Scene[] = [];
  let sceneCounter = 1;

  for (const chunk of chunks) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: SCENE_PARSING_PROMPT + chunk }],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 16384,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Scene parsing failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);

      if (parsed.scenes && Array.isArray(parsed.scenes)) {
        for (const s of parsed.scenes) {
          const sceneText = s.text?.trim();
          if (!sceneText) continue;

          // Post-processing: reject scenes containing banned dynamic/abstract patterns
          const violatingPattern = BANNED_PATTERNS.find(pattern => {
            pattern.lastIndex = 0;
            return pattern.test(sceneText);
          });
          if (violatingPattern) {
            console.warn(`⚠️ SAHNE REDDEDİLDİ: "${sceneText}" - Yasaklı ifade: ${violatingPattern}`);
            continue;
          }

          const startIndex = fullText.indexOf(sceneText);

          if (startIndex !== -1) {
            allScenes.push({
              id: `scene-ai-${crypto.randomUUID()}`,
              number: sceneCounter,
              title: `Sahne ${sceneCounter}`,
              text: sceneText,
              startIndex,
              endIndex: startIndex + sceneText.length,
              episodeTitle: 'AI Parse',
              prompts: [],
              segments: [],
              subjectReferences: [],
              consistencyGroupIds: [],
              status: 'pending',
              note: s.reasoning || '',
            });
            sceneCounter++;
          }
        }
      }
    } catch (e) {
      console.error('Scene parsing error:', e);
    }

    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allScenes;
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n\n', end);
      if (lastBreak > start) end = lastBreak;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}
