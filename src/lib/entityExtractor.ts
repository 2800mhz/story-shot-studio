import type { Character, Location } from '@/types';

const ENTITY_EXTRACTION_PROMPT = `Sen bir görsel analiz AI'sın. Sahneden karakterleri ve mekanları çıkar.

🚫 YASAKLI (Asla extract etme):
- Yazı/metin nesneleri: "tabela", "kitap", "yazı", "duvar yazısı", "kelime", "ad", "adı"
- Soyut kavramlar: "ses dalgaları", "yankı", "soyut oluşum", "belirme", "dönüşüm", "evrim"
- Hareketli süreç ifadeleri: "-ması/-mesi/-ışı/-işi/-uşu/-üşü" ekleri

🏛️ MEKAN YASAKLARI — Bu tür isimleri asla locations'a ekleme:
- Soyut/kavramsal mekanlar: "teknolojik gelişim", "ekran birliği", "takvim", "ses yansımaları", "soyut uzam", "kavramsal alan", "zaman geçişi", "dönüşüm", "evrim", "iletişim", "bilgi", [...]
- "-ması/-mesi/-ışı/-işi/-uşu/-üşü" fiilimsi ekleriyle biten mekan isimleri
- Soyut fikirler, buluşlar veya süreçler mekan olarak gösterilemez
- KURAL: Yalnızca gerçek, fiziksel, bir kamerayla fotoğraflanabilir mekanlar kabul edilir (çarşı, saray, cami avlusu, atölye, kütüphane, şehir kapısı, vb.)

✅ ZORUNLU:
- İNSAN karakterler (fiziksel özellikler: yaş, ırk, kıyafet, saç)
- SOMUT mekanlar (mimari, doku, renk, malzeme)

🔄 YAZI/SOYUT SAHNELERİNİ YENİDEN YORUMLA (İNSANLARLA):

ÖRNEK 1:
INPUT: "Şehrin tabelasında 'Hive' adının belirmesi" veya "'Hive' adının belirginleşmesi"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Şehir Tabelası", "description": "Yazı var" }]
}

✅ DOĞRU (5 farklı kültürden insanla yeniden yorumla):
{
  "characters": [
    { "name": "Arap Tüccar", "description": "White turban, brown silk robe, long black beard, 40s, dark complexion", "age": "40s", "ethnicity": "Arab", "clothing": "White turban, brown silk robe", "physicalFeatures": "long black beard, dark complexion" },
    { "name": "Çinli Yolcu", "description": "Blue silk kimono, bamboo hat, thin mustache, middle-aged", "age": "middle-aged", "ethnicity": "Chinese", "clothing": "Blue silk kimono, bamboo hat", "physicalFeatures": "thin mustache" },
    { "name": "Afrikalı Sanatkâr", "description": "Orange-yellow-red colorful tunic, young man, short hair", "age": "young", "ethnicity": "African", "clothing": "colorful tunic", "physicalFeatures": "short hair" },
    { "name": "Avrupalı Gezgin", "description": "Leather brown trousers, white linen shirt, blonde hair, blue eyes, 30s", "age": "30s", "ethnicity": "European", "clothing": "Leather brown trousers, white linen shirt", "physicalFeatures": "blonde hair, blue eyes" },
    { "name": "Hintli Baharat Tüccarı", "description": "Orange turban, green silk vest, dark complexion, long black beard", "age": "middle-aged", "ethnicity": "Indian", "clothing": "Orange turban, green silk vest", "physicalFeatures": "dark complexion, long black beard" }
  ],
  "locations": [
    { "name": "Şehir Meydanı Büyük Çeşmesi", "description": "Marble stone fountain in center, water flowing, 5 people from different cultures gathered around, colorful cloth stalls, stone paved floor" }
  ]
}

ÖRNEK 2:
INPUT: "'Hey vah' kelimesinin evrimi, ses dalgaları" veya "soyut bir isim oluşumu"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Soyut Mekan", "description": "Abstract concept" }]
}

✅ DOĞRU (Pazarda konuşan insanlarla somutlaştır):
{
  "characters": [
    { "name": "Yaşlı Hikaye Anlatıcısı", "description": "Long white beard, brown robe, mouth open speaking, 70s", "age": "70s", "ethnicity": "Middle Eastern", "clothing": "brown robe", "physicalFeatures": "Long white beard" },
    { "name": "Genç Dinleyici", "description": "Simple clothing, sitting, attentively listening, 20s", "age": "20s", "ethnicity": "Middle Eastern", "clothing": "Simple clothing", "physicalFeatures": "sitting" },
    { "name": "Kadın Öğretmen", "description": "Colorful headscarf, long dress, holding a book, middle-aged", "age": "middle-aged", "ethnicity": "Middle Eastern", "clothing": "Colorful headscarf, long dress", "physicalFeatures": "holding a book" }
  ],
  "locations": [
    { "name": "Şehir Pazarı", "description": "Open market, merchants frozen mid-gesture, colorful fabrics, stone walls, busy stalls" }
  ]
}

ÖRNEK 3:
INPUT: "Farklı dillerde 'Hey vah' kelimesinin evrimi, yazılı metinler"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Kütüphane", "description": "Books present" }]
}

✅ DOĞRU (İnsanlarla yeniden yorumla):
{
  "characters": [
    { "name": "Yaşlı Âlim", "description": "Long white beard, brown robe, holding a book", "age": "elderly", "ethnicity": "Middle Eastern", "clothing": "brown robe", "physicalFeatures": "Long white beard" },
    { "name": "Genç Öğrenci", "description": "Simple clothing, holding notepad, listening", "age": "young", "ethnicity": "Middle Eastern", "clothing": "Simple clothing", "physicalFeatures": "" },
    { "name": "Kadın Hikaye Anlatıcısı", "description": "Colorful headscarf, elderly, children around her", "age": "elderly", "ethnicity": "Middle Eastern", "clothing": "Colorful headscarf", "physicalFeatures": "" }
  ],
  "locations": [
    { "name": "Eski Kütüphane", "description": "Wooden shelves, old bound books, candlelight, stone walls" }
  ]
}

KURALLAR:
- Sadece JSON döndür
- Karakterlerin görsel tanımı prompt için kullanılacak (İngilizce)
- Mekanlar için atmosfer ve stil önemli (İngilizce)
- Yazı/metin/soyut içeren sahneleri MUTLAKA insanlar ve somut mekanlarla yeniden yorumla
- Ek olarak karakterlerin "age", "ethnicity", "clothing", "physicalFeatures" bilgilerini ayrı alanlar olarak da sağla.

SAHNE METNİ:
`;