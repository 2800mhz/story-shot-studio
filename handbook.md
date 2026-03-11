# Story Shot Studio - Detaylı Teknik Mimari ve Sistem El Kitabı

Bu belge, **Story Shot Studio** uygulamasının altyapısını, veritabanı mimarisini, state yönetimini ve yapay zeka entegrasyonlarını (Prompt Mühendisliği & Metin Analizi) kaynak kod seviyesinde derinlemesine açıklamak üzere hazırlanmıştır.

---

## 1. Sistem Mimarisi ve Teknoloji Yığını

Uygulama, modern bir React ekosistemi üzerinde inşa edilmiştir.

*   **Frontend Framework:** React 18 (Vite tabanlı derleme).
*   **Arayüz (UI) ve Şekillendirme:** Tailwind CSS ve UI bileşenleri için `radix-ui` / `shadcn/ui` tabanlı modüler yapı.
*   **Bağımlılık (State) Yönetimi:** Karmaşık bölüm verileri için `React.useReducer` (Global Episode State) ve küçük bileşenler için `useState`.
*   **Layout Yönetimi:** Sürüklenebilir panel yapıları için `react-resizable-panels`.
*   **Veritabanı ve Auth:** Supabase (PostgreSQL veri tabanı ve RPC/REST API arayüzü).
*   **Yapay Zeka Servisi:** Google Gemini API (`@google/genai` resmi SDK'si, Model: `gemini-2.5-flash`).

---

## 2. Veri Modelleri ve Supabase Veritabanı Şeması

Uygulamanın merkezinde relasyonel (ilişkisel) bir PostgreSQL veritabanı yatar. Temel tablolar ve sütunları şunlardır:

### 2.1. `projects` Tablosu
Tüm verinin tepesindeki ebeveyn düğümdür (Parent Node).
*   `id` (UUID - PK)
*   `title` (String): Proje adı.
*   `master_prompt` (Text): **Kritik**. Tüm projedeki (tüm bölümlerdeki) görsel çıktılara etki edecek evrensel (global) prompt kural seti. (Örn: `--ar 16:9 --style raw, photorealistic, 4k`).
*   `global_characters` / `global_locations` (JSONB): Proje bazında ortak kullanılabilecek karakter/mekan kütüphanesi.

### 2.2. `episodes` Tablosu
Belgeselin / hikayenin bir bölümü. `projects`'e `project_id` ile bağlıdır.
*   `id` (UUID - PK)
*   `project_id` (UUID - FK)
*   `document_text` (Text): Uygulamanın **Merkez Panelinde** görünen, kullanıcının girdiği o bölümün ham senaryo/seslendirme metni.
*   `episode_prompt` (Text): Bölüm stili (Sadece bu bölüm için geçerli ekstra prompt kuralları. Örneğin "Bu bölümde gece karanlığı hakimdir").
*   `episode_prompt_tr` (Text): Bölüm stilinin Türkçe açıklaması (UI'da kullanıcıya ne döndüğünü göstermek için).
*   `time_contexts` (JSONB): Bölüme ait Zaman Bağlamları dizisi (id, label, era, lighting, weather vb.).
*   `character_data` / `location_data` (JSONB): Yalnızca bu bölümde geçerli olan ve UI'da "Varlıklar (Assets)" modülünde yönetilen karakter/mekan state dökümleri.

### 2.3. `scenes` Tablosu
Bir bölümün alt parçaları (Kare/Sahne). `episodes`'a `episode_id` ile bağlıdır.
*   `id` (UUID - PK)
*   `episode_id` (UUID - FK)
*   `scene_number` (Int): Sıralama (1, 2, 3...)
*   `text` (Text): Orijinal `document_text`'ten koparılan parça (sahneye denk düşen cümle).
*   `visual_note` (Text): Sahneyi Türkçe anlatan çok kısa (maks 10 kelime) görsel eylem (Kamera ne görüyor?).
*   **`start_index` & `end_index` (Int):** **Kritik UI Parametresi.** Bu sahne metninin (`text`), ana `document_text` string'indeki `indexOf` pozisyonları. Merkez paneldeki **İnline Text Highlighting (Metin İçi Vurgulama)** birebir bu indekslere göre `span` elementlerine bölünerek CSS ile sarıya boyanır.
*   `character_ids`, `location_ids`, `time_context_ids` (String Array): Bu sahnede görünen karakterlerin, mekanın ve ışığın referans ID'leri (Varlıklara işaret eder).

### 2.4. `prompts` Tablosu
Bir sahne için yapay zeka tarafından veya elle üretilmiş İngilizce Text-to-Image (Midjourney) komutlarıdır. `scenes`'e `scene_id` ile bağlıdır.
*   `id` (UUID - PK)
*   `scene_id` (UUID - FK)
*   `shot_type` (String): wide (geniş), medium (orta), closeup (yakın) vb.
*   `summary` (Text): Promptun amacı.
*   `prompt_text` (Text): MIDJOURNEY veya benzeri AI aracı için oluşturulmuş NİHAİ İngilizce metin.
*   `is_active` (Boolean): Yeniden prompt üretildiğinde (Re-generate) eski promptlar DB'den fiziksel olarak silinmez, soft-delete olarak `is_active = false` yapılır (İleride geri alma özelliği için).

---

## 3. Yapay Zeka (Gemini API) Entegrasyonları ve Sirkülasyonu

Sistem içindeki iki ana "Zeka" akışı `src/lib/aiProvider.ts` üzerinden çalıştırılır. Aşağıda her bir akışın input-output sistematiği verilmiştir.

### Akış 1: Scene Analyzer (Sahne Analizörü) -> `src/lib/sceneAnalyzer.ts`

**Tetikleyici:** Kullanıcı "Analiz Et" butonuna bastığında.
**Görev:** Düz bir metni alıp yönetmen gözüyle 1.5 - 2 saniyelik görsel anlara bölmek.

1.  **Chunking Mechanism (Parçalama):** Eğer metin çok uzunsa (token limitini aşmamak için), metin `splitTextIntoChunks` ile çift satır sonlarına (`\n\n`) göre yaklaşık 6000 karakterlik dizilere (`chunks[]`) ayrılır.
2.  **Sistem Promptu:** Gemini'ye "Sen bir belgesel kurgu editörüsün. Metni sahnelere böl (~4 kelime = 1 sahne). Karakter, mekan ve zaman detaylarını (visualDescription) çıkar" komutu verilir.
3.  **JSON Yanıtı & Error Handling:** Gemini bir JSON döndürür. Json parse olmadan önce `cleanJsonResponse` ve `recoverTruncatedJson` (eğer token biterse yarım kalan JSON'ı son `}` ile kapatarak kurtaran bir algoritma) ile temizlenir.
4.  **Deduplication (Tekilleştirme) ve Indexing:**
    *   **Mekan/Karakter Tekilleştirme:** `normalizeTurkishLocationName` kullanılarak "Osmanlı Sarayı" ile "Osmanlı sarayları" aynı obje kabul edilip tek ID (örn: `loc-osmanli-sarayi`) oluşturulur.
    *   **Metin İndeksleme (String Matching):** Dönen her sahnenin `.text` bloğu alınarak, orijinal `document_text` içerisinde sırayla aranır (`indexOf(scene.text, lastIndex)`). Bu işlem sonucunda `startIndex` ve `endIndex` hesaplanarak `SceneCard` objesine yazılır.
5.  **State Mapping:** Üretilen `SceneCard` dizisi React `useReducer` action'ı (`SET_SCENES`) ile global state'e basılır.

### Akış 2: Prompt Generator (Prompt Üreticisi) -> `src/lib/promptGenerator.ts`

**Tetikleyici:** Kullanıcı "Prompt Oluştur" (veya Tümünü Üret) butonuna bastığında.
**Görev:** Sahnede bulunan (ve ID referanslarıyla tutulan) dağınık verileri birleştirerek, mükemmel fotoğrafik kalitede bir İngilizce prompt inşa etmek.

**Konsolidasyon (Birleştirme) Algoritması:**
Prompt Generator API'ye istek atmadan önce lokalde şu büyük String paketini hazırlar (Prompt Mühendisliği Budur):

1.  **Scene Context (Sahne Aksiyonu):** Sahnenin Türkçe görsel açıklaması (`visualNote`).
2.  **Resolved Assets (Varlık Çözümleme):** 
    *   Algoritma `sceneCard.characterIds`'e bakar, Episode State'indeki Karakter kütüphanesinden o ID'leri bulur. Bulduğu karakterin sırf "Adı"nı değil, asıl kritik olan **`visualDescription`** (örn: "Yaşlı bir adam, beyaz sakallı, yırtık keten cüppe giyiyor, 16.yy") bilgisini alır.
    *   Aynı işlemi `locationIds` için de yapar.
3.  **Time & Lighting (Zaman ve Açılar):** `timeContextIds` referanslarını bularak "Günün vakti (timeOfDay)", "Işık (lighting)", "Dönem (era)" İngilizce verilerini toplar.
4.  **Master & Episode Prompts:** Projenin genel `master_prompt`'unu ve Bölümün `episode_prompt`'unu en üste koyar. (Örn: "Photography, 8k, cinematic lighting").
5.  **Gemini Call:** Tüm bu birleştirilmiş devasa İngilizce + Türkçe komut kütlesi Gemini'ye yollanır. Kendisinden JSON formatında `{ prompts: [ { type: "wide", promptText: "...", summary: "..." } ... ] }` olarak 3 farklı çekim açısı döndürmesi istenir.
6.  **Geri Dönüş ve Kayıt:** Gelen veri `promptText` olarak UI'a yansır.

---

## 4. Frontend (React) State ve Kalıcılık Döngüsü

Uygulamanın React mimarisinde performans (fazla re-render engelleme) ve veri kaybetmeme prensipleri esastır.

### State Yönetimi (`Index.tsx`)
Bütün Bölüm (Episode) verisi `React.useReducer` kullanılarak karmaşık nesne mutasyonlarından korunur. Aksiyonlar (Action Types):
*   `SET_SCENES`: Yeni sahneler dizisini yükler.
*   `UPDATE_SCENE`: Sadece tek bir sahnedeki yazıyı/varlığı günceller.
*   `SET_CHARACTERS` / `SET_LOCATIONS`: Varlık (Asset) dizilerini günceller.
*   `FINISH_PROMPT_GENERATION`: Üretilen promptları spesifik bir sahne ID'sine alt children olarak (`prompts: []` içine) bağlar.

### Veritabanı Senkronizasyonu (Debounce Auto-Save)
Kullanıcılar sürekli typing (klavyede yazı yazma) işlemi yapar. Her `onKeyDown` olayında API'ye gidilmez.
*   `supabaseQueries.ts` içindeki kaydetme işlemleri, `useDebounce` (veya custom useEffect tabanlı bir timeout) mekanizmasıyla çalışır.
*   State'te bir değişim olduğunda (örn: Sahneler `scenes` dizisi güncellendiğinde) `useEffect` tetiklenir.
*   Bir `setTimeout` başlatılır (örnek: 2000ms). Eğer kullanıcı bu 2 sn içinde başka bir tuşa basarsa eski timeout silinir (`clearTimeout`), süre sıfırlanır.
*   2 saniye klavyeye dokunulmazsa, `saveScenes` ve `updateEpisode` fonksiyonları çalışıp güncel JSON'ı ve sütunları Supabase'e göndererek donanımı yormadan kalıcılık sağlar (Silent Save).

### Inline Highlighting (Urayüz Render Mantığı)
`CenterPanel.tsx`'te ham `document_text` nasıl bölünür?
Algoritma; `scenes` dizisini `startIndex` (başlangıç indeksine) göre sayısal olarak küçükten büyüğe sıralar (`sort`). Sonra `0`ıncı karakterden başlayarak:
1.  Aktif imleç (`currentIndex`) ile sıradaki sahnenin `startIndex`'i arasında kalan alanı (işaretsiz düz metin) basit bir `<span>` olarak çizer.
2.  `startIndex` ile `endIndex` arasındaki alanı ise `<span className="bg-amber-600/30...">` olarak çizer ve tam önüne bir rozet (Sahne Numarası `scene.number`) yerleştirir. OnClick eventi de bu renkli spana bağlanarak, tıklandığında sol ve sağ panelde o sahnenin açılmasını sağlar (`activeSceneId`).
3.  `currentIndex`'i `endIndex` olarak güncelleyip bir sonraki sahneye geçer.

---

## 5. Uygulama API İçi Haberleşme Akış Şeması (Özet)

**[1. GİRİŞ]** -> Kullanıcı `document_text` girer.
**[2. TETİKLEME]** -> "Metni Analiz Et"
   |
   +--> **[3. CHUNKING]** -> Metinlere bölünür
   |
   +--> **[4. GEMINI API (sceneAnalyzer)]** -> Kurgu algoritması (JSON döner)
   |
   +--> **[5. STATE MAPPING]** -> İndeksler hesaplanır (startIndex, endIndex). `SceneCard` objeleri oluşturulur. Mekanlar/Karakterler ayıklanır.
   |
   v
**[6. UI GÜNCELLEMESİ]** -> Orta panalde Cümleler sarıya (highlight) boyanır. Sol panele sahne kartları listelenir.
   |
**[7. TETİKLEME 2]** -> "Prompt Üret" (Tekil veya Tümü)
   |
   +--> **[8. PROMPT ENJEKSİYONU]** -> Master + Episode + Scene Notes + Characters(Visual Desc) + Locations + TimeContext
   |
   +--> **[9. GEMINI API (promptGenerator)]** -> Fotoğrafik prompt komutları istenir.
   |
   v
**[10. KAYIT & ÇIKTI]** -> Gelen 3 farklı (Geniş, Orta, Yakın plan) İngilizce Prompt kartı sağ panelde gösterilir ve debounce ile Supabase `prompts` tablosuna `upsert` edilir.

---
Bu döküman, projenin backend'siz (BaaS olarak Supabase kullanarak) tamamen Client-Side ve Edge Functions / doğrudan API istekleri üzerinden ne kadar senkronize ve efektif bir Mimari (Orchestration) kurduğunu teknik şemalarla özetler.
