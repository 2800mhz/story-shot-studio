import type { Scene } from '@/types';

const SCENE_PARSING_PROMPT = `Sen bir story-board uzmanısın. Her sahne = 1 STATIK FOTOĞRAF KARESI!

🎯 KRİTİK KURALLAR:

1. **STATIK FOTOĞRAF KARELERİ** (Hareketli değil!)
   ❌ KULLANMA: "fışkırıyor", "koşuyor", "dönüşüyor", "yükseliyor"
   ✅ KULLAN: "fışkıran su anı (dondurulmuş)", "koşarken donmuş adam", "yarı-çadır yarı-ev"

   ÖRNEKLER:
   - ❌ "Suyun aniden fışkırması" → Çok dinamik!
   - ✅ "Topraktan fışkıran su anı, damlacıklar havada asılı (splash dondurulmuş)"

   - ❌ "Kumların hızla dağılması" → Animasyon!
   - ✅ "Havada asılı kum tanecikleri (slow-motion etkisi)"

   - ❌ "Atın koşması" → Video!
   - ✅ "Dörtnala koşan at, 4 ayak havada (dondurulmuş)"

2. **ZAMAN ATLAMALARINI PARÇALA!** (ÇOK ÖNEMLİ!)

   Bir "dönüşüm/evrim" gördüğün yerde → **5-6 AYRI SAHNEYE BÖL!**

   **ÖRNEK 1: Şehir Gelişimi**
   INPUT: "Çadırlar yavaşça şehre dönüştü."

   ❌ YANLIŞ (1 sahne):
   - "Çadırların şehre dönüşümü"

   ✅ DOĞRU (6 sahne):
   - Sahne 1: "Kuyu çevresinde 2 kişi, 1 eski çadır"
   - Sahne 2: "Kuyu çevresinde 7-8 çadır, küçük oba görünümü"
   - Sahne 3: "15-20 çadır, bazı taş duvar başlangıçları"
   - Sahne 4: "Taş evler, ahşap kapılar, küçük pazar yeri"
   - Sahne 5: "2 katlı binalar, düzenli sokaklar, kervansaray"
   - Sahne 6: "Görkemli şehir, kubbe yapılar, kalabalık meydan"

   **ÖRNEK 2: İnsan Yaşlanması**
   INPUT: "Genç adam yıllar içinde bilge oldu."

   ❌ YANLIŞ (1 sahne):
   - "Adamın yaşlanma süreci"

   ✅ DOĞRU (4 sahne):
   - Sahne 1: "20 yaşlarında genç adam portresi, pürüzsüz cilt"
   - Sahne 2: "35 yaşlarında adam, hafif kırışıklıklar, kısa sakal"
   - Sahne 3: "50 yaşlarında adam, gri saçlar, derin kırışıklıklar"
   - Sahne 4: "70 yaşlarında bilge adam, uzun beyaz sakal"

   **ÖRNEK 3: Savaş → Barış**
   INPUT: "Savaş bitince barış geldi."

   ❌ YANLIŞ (2 sahne):
   - "Savaş sahnesi"
   - "Barış sahnesi"

   ✅ DOĞRU (5 sahne):
   - Sahne 1: "2 asker kılıç sallarken (dondurulmuş aksiyon)"
   - Sahne 2: "Yere düşmüş kılıçlar ve kalkanlar"
   - Sahne 3: "İki komutan el sıkışıyor"
   - Sahne 4: "Askerler çadırlara dönüyor (geniş açı)"
   - Sahne 5: "Boş savaş alanında yeni çiçekler"

3. **YAZI KULLANMA! İNSAN VE MEKAN KULLAN!**

   ❌ YASAKLI:
   - "Şehir tabelasında 'Hive' yazısı"
   - "Kitap sayfasında 'Hey vah' kelimesi"
   - "Duvar yazıları"

   ✅ YERİNE YAP:
   - "5 farklı kıyafetli insan şehir meydanında çeşme çevresinde su içiyor"
   - "Yaşlı bilge kitap okurken, genç öğrenci dinliyor"
   - "Saray duvarında işlemeli desenler"

4. **SOMUT GÖRSEL** (Soyut Kavramlar Yok!)

   ❌ YASAKLI:
   - "Umut ışığı beliriyor"
   - "Değişim rüzgarı esiyor"
   - "Korkunun gölgesi"

   ✅ SOMUTLAŞTIR:
   - "Gökyüzünde altın renkli güneş ışınları bulutların arasından"
   - "Güçlü rüzgar, adamın cübbesini savuruyor"
   - "Adamın yüzünde korku ifadesi, gölgeler yüzünde"

5. **BASİT AKSIYONLAR** (img2vid için)

   ❌ ÇOOOK KARMAŞIK:
   - "100 kişilik ordu çarpışması"
   - "Kalabalık pazar yeri kaos"

   ✅ BASİT:
   - "2-3 asker kılıç sallarken (dondurulmuş)"
   - "5-6 tüccar duran tezgahların önünde"

---

🎬 FOTOĞRAF KARE TİPLERİ:

**TİP 1: DONMUŞ AKSİYON** (Action frozen mid-motion)
- "Zıplayan at, 4 ayak havada (dondurulmuş)"
- "Havada asılı su damlacıkları (splash effect)"
- "Kılıç sallarken donmuş asker"

**TİP 2: STATİK POZ** (Still pose)
- "Düşünen adam heykeli gibi"
- "Elinde kitap tutan bilge"
- "Ufka bakan kervan lideri"

**TİP 3: GENİŞ MANZARA** (Wide landscape)
- "Çöl ufku, güneş batımında"
- "Şehir kuşbakışı görünümü"
- "Kervan çöl ortasında (drone açısı)"

**TİP 4: YAKIN ÇEKİM** (Close-up detail)
- "Çatlamış dudaklar (extreme close-up)"
- "Yaşlı ellerde eski harita"
- "Gözlerde yansıyan ateş"

**TİP 5: TIME-LAPSE ADIMI** (Single step in evolution)
- "Kuyu çevresinde 7-8 çadır" (Adım 2/6)
- "35 yaşındaki adam portresi" (Adım 2/4)
- "Taş evler yeni yükseliyor" (Adım 3/6)

---

🚫 YASAKLI KONSEPTLER:

1. **Yazı/Metin Nesneleri:**
   - Tabelalar, kitap sayfaları, duvar yazıları
   - **Çözüm:** İnsanlar ve aksiyonla anlat!

2. **Soyut Kavramlar:**
   - "Umut", "korku", "değişim", "zaman", "ses"
   - **Çözüm:** Somut nesneler ve ifadeler!

3. **Süreç İfadeleri:**
   - "-mesi", "-ması", "-yor", "-iyor" ekleri
   - **Çözüm:** "... anı", "... durumu", "dondurulmuş ..."

4. **Çok Karmaşık Kalabalık:**
   - "100 kişi çarpışıyor"
   - **Çözüm:** "2-3 kişi ana aksiyonda"

---

🎯 HEDEF SAHNE SAYILARI:
- Basit metin (100 kelime) = 20-25 sahne
- Orta metin (200 kelime) = 40-50 sahne
- Karmaşık metin (500 kelime) = 100+ sahne
- **Her dönüşüm/evrim = 5-6 AYRI SAHNE!**
- **Her zaman atlaması = 4-5 AYRI SAHNE!**

SON HATIRLATMA:
- Hareketli ifade gördün mü → "dondurulmuş" ekle!
- "Dönüşüm" gördün mü → 5-6 adıma böl!
- Yazı gördün mü → İnsan ve mekana çevir!
- Soyut kavram gördün mü → Somutlaştır!

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
