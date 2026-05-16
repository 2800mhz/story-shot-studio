# Story Shot Studio — Uçtan Uca Proje Analizi ve UX Açıklaması

Bu metin, **Story Shot Studio** kod tabanını baştan sona özetler: ürünün amacı, kullanıcı akışları, UX katmanı, veri modeli, AI pipeline’ı ve kod parçalarının birbirleriyle nasıl konuştuğu detaylı şekilde anlatılır. Amaç, projeyi hiç görmemiş birinin bile sistemin nasıl çalıştığını, hangi modülün neyi yönettiğini ve verinin hangi adımlardan geçtiğini anlayabilmesidir.

---

## 1) Projenin Özeti (Ne Yapar?)

Story Shot Studio; **metinden sahne çıkaran**, sahneleri **görsel prodüksiyon planına dönüştüren** ve her sahne için **prompt tabanlı coverage** üreten bir **AI destekli görsel ön‑prodüksiyon (visual preproduction) çalışma alanıdır**.

Kullanıcı film/senaryo metnini sisteme yükler, sistem metni sahnelere böler, karakter/mekân/zaman bağlamlarını çıkarır ve her sahne için farklı planlarda (wide/medium/close‑up vb.) üretim promptları oluşturur. Üretim sonrasında prompt revizyonu yapılabilir, geçmiş prompt versiyonları korunur ve gerekiyorsa “pinned” prompt tek kaynak olarak öne çıkarılır.

Bu ürün, **set lojistiği** değil **görsel tasarım + prompt planlama** tarafında güçlüdür.

---

## 2) Teknoloji Yığını (Stack)

- **Frontend:** Vite + React + TypeScript
- **UI:** Tailwind CSS + shadcn‑ui bileşenleri
- **State & Side Effects:** Reducer tabanlı global state (`useAppState`), autosave hook’u (`useAutosave`)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **AI Entegrasyon Katmanı:** Çok sağlayıcılı (Gemini/OpenAI/Anthropic/Groq/DeepInfra) `aiProvider` katmanı
- **Routing:** React Router (`src/App.tsx`)
- **Data Fetching:** TanStack Query (temel yapı `QueryClientProvider` ile hazır)

---

## 3) Uçtan Uca Kullanıcı Akışı (End‑to‑End Flow)

**1. Landing → Login**  
Kullanıcı landing sayfasından Google OAuth ile giriş yapar. Auth akışı `AuthContext` üzerinden yönetilir ve callback sonrası kullanıcı **Dashboard**’a yönlendirilir.

**2. Dashboard → Project**  
Dashboard proje listesini gösterir, yeni proje oluşturulur ve proje seçilerek **Project Workspace** açılır.

**3. Project Workspace → Episode**  
Projenin episode’ları listelenir, yeni episode eklenir ve ilgili episode seçilerek ana çalışma alanına geçilir.

**4. Episode Workspace (Index)**  
Ana akış burada gerçekleşir:
- Metin yükleme / içe aktarma
- AI ile sahne analizini başlatma
- Sahne kartlarını düzenleme
- Karakter/mekân/zaman bağlamı ekleme
- Prompt üretimi → revizyon → prompt geçmişi yönetimi
- Referans görsel bağlama
- JSON export / downstream işlemlere gönderme

**5. Motion Prompt (Downstream)**  
Üretilen prompt’lar motion/video pipeline’ına hazırlanır.

**6. Settings**  
API key yönetimi, model seçimleri ve kullanım istatistikleri burada yönetilir.

---

## 4) Uygulama Yapısı ve Route Haritası

`src/App.tsx` uygulamanın giriş routing katmanıdır:

- `/` → `Landing`
- `/auth/callback` → `AuthCallback`
- `/dashboard` → `Dashboard`
- `/project/:id` → `ProjectWorkspace`
- `/project/:id/episode/:episodeId` → `Index` (ana çalışma alanı)
- `/motion-prompt` → `MotionPrompt`
- `/settings` → `Settings`
- `*` → `NotFound`

Bu yapı sayesinde **landing / dashboard / episode çalışma alanı** akışı net biçimde ayrılır.

---

## 5) UX Katmanı — Ana Sayfalar ve Deneyim

### 5.1 Landing
- Ürünü tanıtan giriş sayfası
- OAuth giriş butonu
- Kullanıcıyı “visual preproduction” konsepti ile tanıştırır

### 5.2 Dashboard
- Proje listesi ve proje sayacı
- Proje oluşturma / yeniden adlandırma / pinleme
- Proje detayına (Project Workspace) geçiş kapısı

### 5.3 Project Workspace
- Episode listesi (hiyerarşik yapı)
- Proje türü ve render modu seçimi
- Episode oluşturma ve seçme

### 5.4 Episode Workspace (Index)
**Bu ekran ürünün beyni ve en yoğun UX alanıdır.**

- **Header:**
  - JSON içe aktarma
  - Metin yükleme
  - JSON dışa aktarma
  - Motion sayfasına geçiş
  - Ayarlar / bilgi modalları

- **Left Panel (Explorer):**
  - Episode ağacı (drag‑drop sıralama)
  - Sahne listesi ve sahneye hızlı atlama
  - Filtre / arama yardımcıları

- **Center Panel (Document View):**
  - Yüklenen metnin zengin metin görüntüsü
  - Sahne highlight’ları
  - AI analiz başlatma (metin seçimi üstünden)
  - Aktif sahneyi merkezde tutma (scroll & focus)

- **Right Panel (Scene Cards):**
  - Sahne kartları
  - Prompt üretimi (tekli veya toplu)
  - Prompt revizyonu
  - Prompt geçmişi / pinleme
  - Karakter / mekân / zaman bağlamı yönetimi

- **Entity & Style Panelleri:**
  - Karakter ve mekân editörleri
  - Episode style (visual treatment) paneli
  - Style history modal (versiyon takibi)
  - Reference panel (görsel referans bağlama)

- **Agent Drawer:**
  - AI tabanlı agent ile sahne/varlık operasyonları

### 5.5 Motion Prompt
- Prompt’ları motion pipeline formatına çevirir
- Downstream süreçlere aktarım için hazırlık sağlar

### 5.6 Settings
- API key yönetimi
- Model seçimi (Gemini, OpenAI, Anthropic, Groq, DeepInfra)
- Kullanım ve limit takibi

---

## 6) Veri Modeli (Supabase Şeması)

Sistem, projeyi **episode → scene → prompt** hiyerarşisiyle modellemektedir:

- `projects` → projeler
- `episodes` → episode'lar
- `scenes` → sahne kartları
- `prompts` → üretilen prompt’lar
- `global_characters` / `global_locations` → projeye bağlı varlık havuzları

Bu yapı sayesinde:
- Bir episode içindeki sahneler doğrudan proje/episode ilişkisine bağlıdır.
- Karakter/mekânlar proje düzeyinde tekrar kullanılabilir.
- Prompt geçmişi “soft delete” mantığı ile korunur.

---

## 7) State Management & Autosave Mantığı

### 7.1 `useAppState`
- Global state yönetimi reducer üzerinden yapılır
- Undo/redo desteği
- API key ve ayarlar localStorage’da saklanır
- Proje/episode verileri Supabase’te tutulur

### 7.2 `useEpisodeWorkspace`
- `fetchProject`, `fetchEpisode`, `fetchScenes` gibi supabase sorguları ile tüm episode verisi yüklenir
- Yüklenen veriler reducer’a dispatch edilir
- Episode style, references, characters, locations ve prompt’lar tek seferde yüklenir

### 7.3 `useAutosave`
- Kullanıcı her değişiklik yaptığında autosave devreye girer
- 5 saniyelik debounce ile sahneler, episode verisi ve prompt’lar kaydedilir
- Dirty check ile gereksiz kayıtlar engellenir

---

## 8) Metin İşleme & Sahne Analizi Pipeline’ı

**1. Metin Yükleme**  
`documentParser` ve `episodeParser` ile metin parçalara ayrılır, episode listesi çıkarılır.

**2. AI Sahne Analizi**  
`analyzeTextIntoScenes` fonksiyonu;
- Sahne sınırlarını
- Karakter/mekân/bağlam çıkarımlarını
- Sahne analiz meta verilerini döndürür

**3. Sahne Kartlarının Oluşturulması**  
Analiz sonucu `SceneCard` yapısına dönüştürülür ve state’e eklenir.

---

## 9) Prompt Üretimi ve Revizyon Akışı

**1. Prompt Üretimi (`generatePromptsForScene`)**  
- Sahne metni, episode style, karakter/mekân verisi ve zaman bağlamları birleştirilir
- AI’ye “tek seferde büyük context” gönderilir
- JSON yanıtı parse edilerek prompt kartları oluşturulur

**2. Prompt Revizyonu (`revisePrompt`)**  
- Kullanıcı Türkçe bir revizyon talimatı yazar
- AI, var olan promptu bozmadan revizyonu entegre eder
- Yeni prompt “revision” olarak kaydedilir

**3. Prompt Geçmişi**  
- Eski promptlar `is_active=false` olur
- Prompt history modal ile geçmiş versiyonlar görüntülenir

---

## 10) Agent Katmanı (AI‑Assisted Operations)

Agent sistemi, kullanıcı yerine çalışma alanında düzenlemeler yapabilen bir katmandır:

- `buildAgentContext` ile sahne ve varlık bilgileri paketlenir
- `parseAgentOperationSet` ile AI çıktısı operasyon setine dönüştürülür
- `applyAgentOperations` ile sahnelere/varlıklara uygulanır
- UI tarafında `AgentDrawer` üzerinden yönetilir

Bu sayede kullanıcı, sahne düzenlemelerini tek tek yapmak yerine AI’ya “talimat” vererek toplu değişiklik yapabilir.

---

## 11) AI Provider ve Key Yönetimi

`aiProvider.ts`:
- Çoklu sağlayıcı destekler
- Key rotation ve rate‑limit yönetimi yapar
- Fallback model zinciri uygular
- Kullanım logları Supabase tarafına yazılır

Ayarlar sayfasından kullanıcı hangi modeli kullanacağını belirler; `useAppState` üzerinden bu tercihler saklanır.

---

## 12) Import / Export & Downstream Akış

- JSON içe aktarma → `Header` üzerinden yapılır
- Export işlemi `ExportModal` ile gerçekleştirilir
- Motion prompt katmanı `motionPrompt` sayfasında özel formatlar üretir

Bu yapı, üretilen prompt’ları başka pipeline’lara taşıma için esneklik sağlar.

---

## 13) Kod Parçalarının Birbirleriyle Çalışma Şekli (Özet)

1. **Routing (`App.tsx`)** → doğru sayfayı açar
2. **`Index.tsx`** → tüm panelleri ve modalları bir araya getirir
3. **Hook’lar (`useAppState`, `useEpisodeWorkspace`, `useAutosave`)** → veri yükleme, state ve kaydetme akışını yönetir
4. **`supabaseQueries.ts`** → tüm CRUD işlemlerinin tek merkezi
5. **AI Fonksiyonları (`sceneAnalyzer`, `promptGenerator`)** → analiz + prompt üretimini sağlar
6. **UI Panelleri** → sahne, varlık ve prompt düzenleme UX’ini sağlar

Bu zincir, “metin → sahne → prompt” akışını sürdürülebilir hale getirir.

---

## 14) Test & Build

Projede temel doğrulama:
- `npm run test -- --run` → vitest testleri
- `npm run build` → Vite prod build

---

## 15) Özet

Story Shot Studio; **preproduction odaklı**, **AI destekli** ve **prompt‑centric** bir çalışma alanıdır. Kod tabanı, frontend merkezli kalın istemci mimarisi üzerine kuruludur. Tüm kritik iş mantığı (sahne analizi, prompt üretimi, revizyon, agent operasyonları) React + TypeScript tarafında yaşar; veri kalıcılığı ve auth Supabase üzerinden sağlanır.

Bu doküman, projeyi baştan sona okumadan genel resmi görmek isteyen ekip üyeleri veya yeni geliştiriciler için hızlı ama ayrıntılı bir “teknik UX anlatımı” olarak kullanılabilir.
