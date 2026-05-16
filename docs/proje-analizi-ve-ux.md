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
  - AI tabanlı agent ile sahne/varlık (entity) operasyonları

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

Story Shot Studio; **preproduction odaklı**, **AI destekli** ve **prompt‑centric** bir çalışma alanıdır. Kod tabanı, frontend merkezli kalın istemci mimarisi (thick client) üzerine kuruludur. Tüm kritik iş mantığı (sahne analizi, prompt üretimi, revizyon, agent operasyonları) React + TypeScript tarafında yaşar; veri kalıcılığı ve auth Supabase üzerinden sağlanır.

Bu doküman, projeyi baştan sona okumadan genel resmi görmek isteyen ekip üyeleri veya yeni geliştiriciler için hızlı ama ayrıntılı bir “teknik UX anlatımı” olarak kullanılabilir.

---

## 16) Kapsam, Okuma Haritası ve Terminoloji (Genişletilmiş)

Bu bölüm, “sadece çalışma alanı” değil, projenin **tamamı** için genişletilmiş bir okuma haritasıdır.
Aşağıda yer alan kısımlar; **root dosyalar**, **konfigürasyon**, **Supabase katmanı**, **tüm src ağacı**, **testler**, **dokümanlar** ve **varlıklar** için ayrı ayrı açıklamalar içerir.
Amacımız, repository içindeki her parçayı **tek tek** görünür ve takip edilebilir hale getirmektir.

Bu metinde kullanılan temel terimler:
- **Çalışma alanı (workspace):** Episode bazlı ana üretim ekranı (`Index.tsx`).
- **Episode:** Projedeki bölüm/segment yapısı (UI ve data modelinde temel hiyerarşi).
- **Scene (Sahne):** Episode içindeki çekim birimi.
- **Prompt:** Sahne için üretilen görsel üretim komutu.
- **Varlık (entity):** Karakter, mekân, zaman bağlamı gibi referans unsurlar.
- **Agent:** AI destekli toplu düzenleme katmanı.
- **Downstream:** Motion prompt gibi aşağı akış modülleri.

Bu bölümden itibaren:
- Ürün akışı ayrıntılı adımlarla yeniden anlatılır.
- Veri modeli ve migrasyonlar ayrı başlıkta ele alınır.
- AppState alanları, action set’i ve hook akışları listelenir.
- Her modül için export edilen fonksiyonlar ayrı kataloglanır.
- Repo dosya envanteri tek tek listelenir.
- Bağımlılıklar ve build/test komutları açıklanır.

---

## 17) Uçtan Uca Akışın Derinlemesine Analizi (Mikro Adımlar)

### 17.1 Giriş & Kimlik Doğrulama
1. Kullanıcı uygulamayı açar.
2. `src/main.tsx` → React root oluşturur ve `App` render edilir.
3. `src/App.tsx` → Router ve AuthProvider devreye girer.
4. `AuthContext` ilk render’da `getCurrentUser()` ile session kontrolü yapar.
5. Session varsa `user` state güncellenir; yoksa login akışı başlar.
6. Kullanıcı Google OAuth seçer.
7. `supabase.auth.signInWithOAuth` ile redirect başlatılır.
8. OAuth tamamlanınca `/auth/callback` route’u açılır.
9. Session state güncellenir ve kullanıcı dashboard’a yönlendirilir.

### 17.2 Dashboard Akışı (Proje Girişi)
10. Dashboard yüklenir.
11. Kullanıcıya ait projeler Supabase’den çekilir.
12. Project listesi UI’da kartlar halinde gösterilir.
13. Kullanıcı yeni proje oluşturabilir.
14. Kullanıcı proje adını inline rename ile güncelleyebilir.
15. Kullanıcı projeyi silebilir.
16. Kullanıcı bir projeyi “pinned” olarak sabitleyebilir.
17. Proje kartına tıklanınca Project Workspace açılır.

### 17.3 Project Workspace Akışı (Episode Setup)
18. Project Workspace projenin meta bilgilerini yükler.
19. Episode listesi Supabase’den çekilir.
20. Episode listesi hiyerarşik UI olarak gösterilir.
21. Kullanıcı yeni episode ekleyebilir.
22. Episode adı güncellenebilir.
23. Episode sırası/sınıfı değiştirilebilir.
24. Kullanıcı episode’a tıklayınca çalışma alanına geçilir.

### 17.4 Episode Workspace Açılış Akışı
25. `Index.tsx` mount olur.
26. `useEpisodeWorkspace` tetiklenir.
27. Supabase’den şu veriler aynı anda çekilir:
    - project bilgisi
    - episode bilgisi
    - scenes
    - global characters
    - global locations
    - references
28. Gelen veriler reducer ile state’e yazılır.
29. Episode prompt (varsa) state’e eklenir.
30. Episode style history (varsa) state’e eklenir.
31. Scene listesi hazırlanır ve sceneCards state’e dönüştürülür.
32. Scene’lere bağlı promptlar tek `.in()` sorgusu ile fetch edilir.
33. Promptlar sceneCards içine map edilir.
34. Kullanıcı artık episode bazlı üretim ekranını kullanabilir.

### 17.5 Metin Yükleme / Import
35. Kullanıcı `Header` üzerinden metin yükleme başlatır.
36. DOCX veya TXT seçimi yapılır.
37. `documentParser` dosyayı işler ve plain text üretir.
38. `SET_MAIN_TEXT` action ile state’e yazılır.
39. Episode parser metni episode segmentlerine böler.
40. Episode listesi güncellenir.

### 17.6 AI Sahne Analizi
41. Kullanıcı metnin belirli kısmını seçer.
42. Floating toolbar “Analyze” aksiyonunu tetikler.
43. `analyzeTextIntoScenes` çağrılır.
44. Prompt: metni sahnelere böl + karakter/mekân/zaman çıkar.
45. AI yanıtı JSON olarak parse edilir.
46. Sahne kartları oluşturulur.
47. Karakter/mekân önerileri state’e eklenir.
48. UI sahne kartlarıyla güncellenir.

### 17.7 Sahne Düzenleme
49. Kullanıcı sahne kartında visual note ekler.
50. Karakter/mekân/time context ataması yapar.
51. Sahne sırası drag‑drop ile değiştirilebilir.
52. Scene number yeniden numaralandırılabilir.

### 17.8 Prompt Üretimi
53. Kullanıcı sahne için “Üret” butonuna basar.
54. `generatePromptsForScene` çağrılır.
55. Prompt generator sahne + entity + episode prompt birleşimi yapar.
56. AI JSON yanıtı üretir.
57. Prompt kartları oluşturulur ve state’e yazılır.
58. Prompt history modal eski versiyonları saklar.

### 17.9 Prompt Revizyonu
59. Kullanıcı prompt üzerindeki revizyon alanına metin yazar.
60. `revisePrompt` çalışır.
61. Yeni prompt üretir, eski prompt `is_active=false` olur.
62. Prompt history listesi güncellenir.

### 17.10 Reference Yönetimi
63. Kullanıcı referans görsel yükler.
64. Reference panelde görsel listelenir.
65. Referans bir veya birden fazla sahneye bağlanabilir.
66. Referans AI analizi yapılabilir (varsa).

### 17.11 Episode Style Akışı
67. Kullanıcı episode style paneline metin girer.
68. `generateEpisodePrompt` ile episode style üretilir.
69. `generateEpisodePromptExplanation` ile açıklama hazırlanır.
70. Style history modal geçmiş versiyonları saklar.
71. Episode style scene prompt birleşimine dahil edilir.

### 17.12 Agent Akışı
72. Kullanıcı Agent Drawer açar.
73. Agent context hazırlanır (scene + entities + prompt data).
74. Kullanıcı agent komutu verir.
75. Agent çıktısı parse edilerek operasyon seti oluşur.
76. Operasyonlar state’e uygulanır.
77. Agent mesajları Supabase’e kaydedilir.

### 17.13 Export / Downstream
78. Kullanıcı export modal ile JSON dışa aktarır.
79. Motion Prompt sayfası downstream akışı başlatır.
80. Promptlar motion formatına dönüştürülür.

---

## 18) Veri Modeli ve Supabase Katmanı (Detaylı)

### 18.1 Ana Tablolar (001_initial_schema.sql)
**projects**
- id (UUID)
- user_id (UUID, auth.users FK)
- title (TEXT)
- style_guide (TEXT)
- master_prompt (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

**episodes**
- id (UUID)
- project_id (UUID, projects FK)
- episode_number (INT)
- title (TEXT)
- document_text (TEXT)
- created_at (TIMESTAMPTZ)
- UNIQUE(project_id, episode_number)

**global_characters**
- id (UUID)
- project_id (UUID, projects FK)
- name (TEXT)
- description (TEXT)
- base_prompt (TEXT)
- first_appearance (INT)
- created_at (TIMESTAMPTZ)
- UNIQUE(project_id, name)

**global_locations**
- id (UUID)
- project_id (UUID, projects FK)
- name (TEXT)
- description (TEXT)
- base_prompt (TEXT)
- created_at (TIMESTAMPTZ)
- UNIQUE(project_id, name)

**scenes**
- id (UUID)
- episode_id (UUID, episodes FK)
- scene_number (INT)
- text (TEXT)
- visual_note (TEXT)
- character_ids (UUID[])
- location_ids (UUID[])
- analysis (JSONB)
- optimizations (TEXT[])
- created_at (TIMESTAMPTZ)
- UNIQUE(episode_id, scene_number)

**prompts**
- id (UUID)
- scene_id (UUID, scenes FK)
- type (TEXT)
- label (TEXT)
- shot_type (TEXT)
- summary (TEXT)
- explanation (TEXT)
- prompt_text (TEXT)
- aspect_ratio (TEXT)
- created_at (TIMESTAMPTZ)

### 18.2 Indexler (001_initial_schema.sql)
- idx_projects_user_id
- idx_episodes_project_id
- idx_scenes_episode_id
- idx_prompts_scene_id
- idx_global_characters_project_id
- idx_global_locations_project_id

### 18.3 RLS Politikaları
- Projects: kullanıcı yalnızca kendi projelerini görür.
- Episodes: kullanıcı yalnızca kendi projelerine ait episode’ları görür.
- Characters/Locations/Scenes/Prompts: kullanıcı kendi projelerine ait kayıtları görür.

### 18.4 Migrasyon Dosyaları (002–015)
Aşağıdaki migration dosyaları zaman içinde ek alanlar ve sistemler ekler:
- 002_fix_character_location_ids.sql
- 003_api_keys_system.sql
- 004_user_settings_model.sql
- 005_characters_locations_sync.sql
- 006_episode_character_location_data.sql
- 007_add_time_contexts_to_episodes.sql
- 008_add_time_context_ids_to_scenes.sql
- 009_api_token_tracking.sql
- 010_token_model_tracking.sql
- 011_fix_unknown_models.sql
- 012_add_project_type.sql
- 013_add_groq_provider.sql
- 014_add_deepinfra_provider.sql
- 015_agent_persistence.sql

Bu dosyalar; API key sistemi, kullanıcı model ayarları, episode‑level data alanları, time context ilişkileri, token tracking, model provider genişletmeleri ve agent persistence gibi genişlemeleri kapsar.


---

## 19) AppState ve Action Haritası (Types Üzerinden)

Aşağıdaki liste `src/types/index.ts` dosyasındaki state alanları ve action setini **tek tek** görünür kılar.

### 19.1 AppState Alanları
- projectType
- renderMode
- mainText
- documentText
- episodes
- references
- activeSceneId
- apiKeys
- currentKeyIndex
- settings.model
- settings.geminiModel
- settings.groqModel
- settings.deepinfraModel
- settings.openaiModel
- settings.anthropicModel
- settings.thinkingMode
- settings.variantCount
- settings.temperature
- settings.imageModel
- imageApiKeys
- mainFileName
- sceneCards
- characters
- locations
- timeContexts
- masterPrompt
- episodePrompt
- episodePromptTr
- episodeStyleHistory
- isAnalyzing
- isGeneratingPrompts

### 19.2 AppAction Listesi (Reducer Event’leri)
- SET_PROJECT_TYPE
- SET_RENDER_MODE
- SET_MAIN_TEXT
- SET_EPISODES
- REORDER_EPISODES
- MOVE_EPISODE
- SET_ACTIVE_SCENE
- SET_API_KEYS
- SET_IMAGE_API_KEYS
- SET_CURRENT_KEY_INDEX
- ROTATE_API_KEY
- SET_SETTINGS
- SET_REFERENCES
- ADD_REFERENCE
- REMOVE_REFERENCE
- UPDATE_REFERENCE
- START_ANALYSIS
- FINISH_ANALYSIS
- SET_TIME_CONTEXTS
- UPDATE_SCENE_CARD_NOTE
- ADD_CHARACTER_TO_SCENE_CARD
- REMOVE_CHARACTER_FROM_SCENE_CARD
- ADD_LOCATION_TO_SCENE_CARD
- REMOVE_LOCATION_FROM_SCENE_CARD
- ADD_NEW_CHARACTER_TO_SCENE_CARD
- ADD_NEW_LOCATION_TO_SCENE_CARD
- START_PROMPT_GENERATION
- FINISH_PROMPT_GENERATION
- DELETE_SCENE_CARD
- SET_MASTER_PROMPT
- SET_EPISODE_PROMPT
- SET_EPISODE_PROMPT_TR
- SET_ANALYZING
- SET_DOCUMENT_TEXT
- SET_SCENES
- SET_CHARACTERS
- SET_LOCATIONS
- RESET_EPISODE_WORKSPACE
- UPSERT_CHARACTER
- DELETE_CHARACTER
- UPSERT_LOCATION
- DELETE_LOCATION
- ADD_TIME_CONTEXT
- UPDATE_TIME_CONTEXT
- DELETE_TIME_CONTEXT
- ADD_TIME_CONTEXT_TO_SCENE_CARD
- REMOVE_TIME_CONTEXT_FROM_SCENE_CARD
- REORDER_SCENE_CARDS
- SET_ALL_PROMPTS
- SET_PINNED_PROMPT
- ADD_EPISODE_STYLE_VERSION
- SET_EPISODE_STYLE_HISTORY
- SET_CAMERA_ANGLE_SLOTS
- START_SLOT_PROMPT_GENERATION
- FINISH_SLOT_PROMPT_GENERATION
- IMPORT_PROJECT

### 19.3 Çekirdek Tipler (Özet)
- NarrativeLayer
- ProjectType
- RenderMode
- EpisodeStyleVersion
- SceneReference
- Episode
- SceneAnalysis
- Character
- Location
- TimeContext
- CameraAngleSlot
- PromptCard
- PromptAnalysis
- GenerationResult
- SceneCard


---

## 20) Fonksiyon Kataloğu (Çekirdek Modüller)

Bu bölüm, kritik modüllerde **export edilen** fonksiyonları listeler.
Amaç: kodun ana API yüzeyini hızlıca görünür kılmak.

### 20.1 `src/lib/documentParser.ts`
- parseDocxFile(file)
- parseTxtFile(file)
- parseDocument(file)

### 20.2 `src/lib/episodeParser.ts`
- parseEpisodes(text)

### 20.3 `src/lib/sceneAnalyzer.ts`
- getSceneAnalysisSystemPrompt()
- getSceneAnalysisTargetInstruction(targetSceneCount)
- analyzeTextIntoScenes(text, ...)
- generateEpisodePrompt(text, ...)
- generateEpisodePromptExplanation(prompt, ...)
- reviseEpisodePrompt(oldPrompt, instruction, ...)

### 20.4 `src/lib/promptGenerator.ts`
- analyzeSceneComplexity(scene, ...)
- generatePromptsForScene(scene, ...)
- revisePrompt(oldPrompt, instruction)
- generatePromptForSlot(scene, slot, ...)

### 20.5 `src/lib/supabaseQueries.ts`
- fetchProject(projectId)
- updateProject(projectId, updates)
- deleteProject(projectId)
- fetchEpisodes(projectId)
- fetchEpisode(episodeId)
- createEpisode(projectId, title)
- updateEpisode(episodeId, updates)
- deleteEpisode(episodeId)
- saveTimeContexts(episodeId, timeContexts)
- fetchScenes(episodeId)
- saveScenes(episodeId, scenes)
- savePrompts(sceneId, prompts)
- fetchPrompts(sceneId)
- setPinnedPrompt(sceneId, promptId)
- fetchPromptHistory(sceneId)
- fetchAllPromptsForScenes(sceneIds)
- fetchGlobalCharacters(projectId)
- saveGlobalCharacter(projectId, character)
- upsertGlobalCharacter(projectId, character)
- fetchGlobalLocations(projectId)
- saveGlobalLocation(projectId, location)
- upsertGlobalLocation(projectId, location)
- fetchReferences(episodeId)
- saveReference(ref)
- deleteReference(id)
- updateReferenceAssignments(id, sceneIds, aiAnalysis)
- fetchUserModel(userId)
- saveUserModel(userId, model)
- ensureAgentSession(episodeId, userId)
- touchAgentSession(sessionId)
- fetchAgentMessages(sessionId)
- saveAgentMessage(sessionId, userId, message)
- fetchLatestAgentOperationLog(sessionId)
- saveAgentOperationLog(sessionId, log)

### 20.6 `src/lib/aiProvider.ts`
- AI provider seçim/rotasyon ve model fallback zinciri
- API key yönetimi ve rate‑limit yönetimi
- Kullanım sayacı / token tracking (Supabase RPC) entegrasyonu
- `aiProvider` singleton üzerinden tüm AI isteklerinin yönlendirilmesi

### 20.7 `src/lib/agent*` Modülleri (Özet)
- agentContext → context oluşturma
- agentIntent → intent sınıflandırma
- agentParser → agent çıktısını parse etme
- agentOperations → operasyon seti uygulama
- agentPrompts → sistem promptları
- agentSchema → zod/TS schema
- agentPreview → önizleme ve güvenlik katmanı


---

## 21) Dosya Envanteri (Tüm Repo) — Satır Satır

Aşağıdaki liste repository’deki dosyaların **tamamını** kapsar.
Her satırda dosya adı ve kısa rol açıklaması bulunur.

### 21.1 Root Dizin Dosyaları
- `.env`
  - Yerel ortam değişkenleri (runtime için).
- `.env.example`
  - Örnek env şablonu.
- `.gitignore`
  - İzlenmeyecek dosya/desen listesi.
- `README.md`
  - Kurulum ve genel proje bilgisi.
- `anlayana.md`
  - Ek iç dokümantasyon.
- `bun.lockb`
  - Bun paket yöneticisi lock dosyası.
- `cd`
  - Boş placeholder dosya (repo içinde kullanım referansı yok; legacy/işaret dosyası olabilir, kullanılmıyorsa kaldırılması düşünülebilir).
- `components.json`
  - shadcn-ui component konfigürasyonu.
- `dist/`
  - Vite build çıktıları (deploy bundle).
- `docs/`
  - Ürün ve sistem dokümantasyonları.
- `eslint.config.js`
  - ESLint konfigürasyonu.
- `git`
  - Boş placeholder dosya (repo içinde kullanım referansı yok; legacy/işaret dosyası olabilir, kullanılmıyorsa kaldırılması düşünülebilir).
- `handbook.md`
  - Ek iç kullanım rehberi.
- `index.html`
  - Vite giriş HTML şablonu.
- `main`
  - Boş placeholder dosya (repo içinde kullanım referansı yok; legacy/işaret dosyası olabilir, kullanılmıyorsa kaldırılması düşünülebilir).
- `node_modules/`
  - NPM bağımlılıkları (build/test gereksinimi).
- `package-lock.json`
  - NPM lock dosyası.
- `package.json`
  - Scriptler ve bağımlılık listesi.
- `postcss.config.js`
  - PostCSS konfigürasyonu.
- `prompt_architecture.md`
  - Prompt mimarisi üzerine doküman.
- `public/`
  - Statik assetler.
- `sistem-analizi.md`
  - Sistem analizi dokümanı.
- `story_shot_architecture.md`
  - Mimari dokümantasyon.
- `supabase/`
  - Supabase konfig ve migrasyonlar.
- `tailwind.config.ts`
  - Tailwind konfigürasyonu.
- `tsconfig.app.json`
  - Uygulama tsconfig.
- `tsconfig.json`
  - TypeScript root config.
- `tsconfig.node.json`
  - Node side TS config.
- `vercel.json`
  - Vercel deploy ayarları.
- `vite.config.ts`
  - Vite build config.
- `vitest.config.ts`
  - Vitest test config.

### 21.2 Docs Dizini
- `docs/ai-native-cinematic-production-system.md`
  - AI‑native production yaklaşımı dokümanı.
- `docs/current-and-future-output-map.md`
  - Mevcut/gelecek çıktı haritası.
- `docs/production-stage-audit.md`
  - Ürün ve kod audit raporu.
- `docs/production-stage-scope-filter.md`
  - Scope filtresi dokümanı.
- `docs/proje-analizi-ve-ux.md`
  - Bu genişletilmiş analiz dokümanı.
- `docs/savas-arslan-source-analysis.md`
  - Kaynak analiz notları.
- `docs/savaş arslan güncellemesi.md`
  - Güncelleme notları (Savaş Arslan ile ilgili).

### 21.3 Public Assetler
- `public/favicon-64.png`
  - Favicon.
- `public/favicon.ico`
  - Favicon.
- `public/favicon.svg`
  - Favicon.
- `public/og-image.png`
  - OpenGraph görseli.
- `public/og-image.svg`
  - OpenGraph görseli.
- `public/placeholder.svg`
  - Placeholder asset.
- `public/robots.txt`
  - Robots yönergeleri.
- `public/story-shot-logo.svg`
  - Marka logosu.
- `public/story-shot-video-logo.svg`
  - Video marka logosu.

### 21.4 Supabase Dizini
- `supabase/config.toml`
  - Supabase proje konfigürasyonu.
- `supabase/migrations/001_initial_schema.sql`
  - İlk şema (projects/episodes/scenes/prompts vb.).
- `supabase/migrations/002_fix_character_location_ids.sql`
  - Karakter/mekân id düzeltmeleri.
- `supabase/migrations/003_api_keys_system.sql`
  - API key sistemi ekleri.
- `supabase/migrations/004_user_settings_model.sql`
  - Kullanıcı model ayarı ekleri.
- `supabase/migrations/005_characters_locations_sync.sql`
  - Character/location senkron ekleri.
- `supabase/migrations/006_episode_character_location_data.sql`
  - Episode character/location data ekleri.
- `supabase/migrations/007_add_time_contexts_to_episodes.sql`
  - Episode time context ekleri.
- `supabase/migrations/008_add_time_context_ids_to_scenes.sql`
  - Scene time context ilişkileri.
- `supabase/migrations/009_api_token_tracking.sql`
  - Token tracking ekleri.
- `supabase/migrations/010_token_model_tracking.sql`
  - Token/model tracking ekleri.
- `supabase/migrations/011_fix_unknown_models.sql`
  - Model doğrulama düzeltmeleri.
- `supabase/migrations/012_add_project_type.sql`
  - Project type ekleri.
- `supabase/migrations/013_add_groq_provider.sql`
  - Groq provider ekleri.
- `supabase/migrations/014_add_deepinfra_provider.sql`
  - DeepInfra provider ekleri.
- `supabase/migrations/015_agent_persistence.sql`
  - Agent persistence ekleri.

### 21.5 `src/` Dizin Envanteri

#### 21.5.1 Entry & Genel
- `src/main.tsx`
  - React root init + App render.
- `src/App.tsx`
  - Router, Provider, auth ve page orchestration.
- `src/App.css`
  - App seviyesinde CSS.
- `src/index.css`
  - Global Tailwind ve base CSS.
- `src/vite-env.d.ts`
  - Vite TS tür deklarasyonları.

#### 21.5.2 Sayfalar (Pages)
- `src/pages/Landing.tsx`
  - Giriş/marketing yüzeyi.
- `src/pages/Dashboard.tsx`
  - Proje listesi ve proje yönetimi.
- `src/pages/ProjectWorkspace.tsx`
  - Episode listeleme + proje setup.
- `src/pages/Index.tsx`
  - Ana çalışma alanı (episode workspace).
- `src/pages/MotionPrompt.tsx`
  - Motion prompt downstream ekranı.
- `src/pages/Settings.tsx`
  - API key + model ayarları.
- `src/pages/AuthCallback.tsx`
  - OAuth callback yakalama.
- `src/pages/NotFound.tsx`
  - 404 ekranı.

#### 21.5.3 Core Components
- `src/components/BrandMark.tsx`
  - Logo ve marka lockup.
- `src/components/Header.tsx`
  - Üst bar: import/export/settings.
- `src/components/LeftPanel.tsx`
  - Episode + scene explorer.
- `src/components/CenterPanel.tsx`
  - Metin görüntüleme ve sahne highlight.
- `src/components/RightPanel.tsx`
  - Sahne kartları ve prompt üretimi.
- `src/components/SceneCard.tsx`
  - Sahne kartı UI ve prompt kartları.
- `src/components/PromptHistoryModal.tsx`
  - Prompt geçmişi modalı.
- `src/components/EntityCardPanel.tsx`
  - Karakter/mekân editör paneli.
- `src/components/EpisodeStylePanel.tsx`
  - Episode style oluşturma paneli.
- `src/components/EpisodeStyleHistoryModal.tsx`
  - Episode style geçmiş modalı.
- `src/components/ReferencePanel.tsx`
  - Referans görsel yönetimi.
- `src/components/SettingsModal.tsx`
  - Ayar modalı.
- `src/components/InfoModal.tsx`
  - Bilgi modalı.
- `src/components/ExportModal.tsx`
  - Export/JSON dışa aktarım modalı.
- `src/components/FloatingToolbar.tsx`
  - Metin seçim toolbar.
- `src/components/ProtectedRoute.tsx`
  - Auth guard bileşeni.

#### 21.5.4 Agent Components
- `src/components/agent/AgentDrawer.tsx`
  - Agent UI katmanı.

#### 21.5.5 Settings Components
- `src/components/settings/ProviderModelSettings.tsx`
  - Provider/model seçimi paneli.

#### 21.5.6 UI Kit (shadcn)
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/toaster.tsx`
- `src/components/ui/tooltip.tsx`

#### 21.5.7 Contexts
- `src/contexts/AuthContext.tsx`
  - Supabase auth state + sign in/out.

#### 21.5.8 Hooks
- `src/hooks/useAppState.ts`
  - Reducer + state yönetimi.
- `src/hooks/useAutosave.ts`
  - Debounce autosave.
- `src/hooks/useEpisodeWorkspace.ts`
  - Episode load & hydrate.
- `src/hooks/useAgentSession.ts`
  - Agent session lifecycle.
- `src/hooks/useAgentActions.ts`
  - Agent aksiyon wrapper.
- `src/hooks/useClipboardState.ts`
  - Clipboard state yönetimi.
- `src/hooks/use-toast.ts`
  - Toast hook wrapper.

#### 21.5.9 Lib Katmanı
- `src/lib/aiProvider.ts`
  - AI provider orchestration.
- `src/lib/documentParser.ts`
  - DOCX/TXT parse.
- `src/lib/episodeParser.ts`
  - Episode segment parser.
- `src/lib/episodePreferences.ts`
  - Episode preferences store.
- `src/lib/sceneAnalyzer.ts`
  - AI scene analysis pipeline.
- `src/lib/scriptSceneAnalysisSchema.ts`
  - Scene analysis schema.
- `src/lib/promptGenerator.ts`
  - Prompt generation + revise.
- `src/lib/referenceAnalyzer.ts`
  - Referans görsel analizi.
- `src/lib/projectUiPreferences.ts`
  - UI preference storage.
- `src/lib/agentContext.ts`
  - Agent context builder.
- `src/lib/agentIntent.ts`
  - Agent intent classifier.
- `src/lib/agentLocalActions.ts`
  - Lokal agent aksiyonları.
- `src/lib/agentLocalQueries.ts`
  - Lokal agent sorguları.
- `src/lib/agentModel.ts`
  - Agent model tipi/ayarı.
- `src/lib/agentOperations.ts`
  - Agent operasyon uygulama.
- `src/lib/agentParser.ts`
  - Agent output parser.
- `src/lib/agentPreview.ts`
  - Agent preview güvenlik katmanı.
- `src/lib/agentPrompts.ts`
  - Agent system prompts.
- `src/lib/agentSchema.ts`
  - Agent schema tipi.
- `src/lib/motionPromptApi.ts`
  - Motion prompt API işlemleri.
- `src/lib/motionPromptFormatter.ts`
  - Motion prompt formatlama.
- `src/lib/motionPromptParser.ts`
  - Motion prompt parse.
- `src/lib/encryption.ts`
  - Key encryption/decryption.
- `src/lib/supabase.ts`
  - Supabase client init.
- `src/lib/supabaseQueries.ts`
  - CRUD ve veri erişimi.
- `src/lib/utils.ts`
  - Genel util fonksiyonları.

#### 21.5.10 Types
- `src/types/index.ts`
  - Tüm domain tipleri ve AppAction.

#### 21.5.11 Testler
- `src/test/setup.ts`
  - Vitest setup (jsdom vb.).
- `src/test/example.test.ts`
  - Örnek test.
- `src/test/scriptSceneAnalysisSchema.test.ts`
  - Schema testleri.
- `src/test/promptGeneratorJsonRecovery.test.ts`
  - Prompt JSON recovery testleri.
- `src/test/motionPromptAgentic.test.ts`
  - Motion prompt testleri.


---

## 22) Bağımlılıklar (package.json) — Tam Liste

### 22.1 Dependencies
- @hookform/resolvers
  - react-hook-form doğrulama resolver’ları.
- @radix-ui/react-accordion
  - Accordion UI bileşeni.
- @radix-ui/react-alert-dialog
  - Alert dialog UI.
- @radix-ui/react-aspect-ratio
  - Aspect ratio wrapper.
- @radix-ui/react-avatar
  - Avatar bileşeni.
- @radix-ui/react-checkbox
  - Checkbox UI.
- @radix-ui/react-collapsible
  - Collapsible UI.
- @radix-ui/react-context-menu
  - Context menu UI.
- @radix-ui/react-dialog
  - Dialog UI.
- @radix-ui/react-dropdown-menu
  - Dropdown menü.
- @radix-ui/react-hover-card
  - Hover card UI.
- @radix-ui/react-label
  - Label bileşeni.
- @radix-ui/react-menubar
  - Menubar UI.
- @radix-ui/react-navigation-menu
  - Navigation menu.
- @radix-ui/react-popover
  - Popover UI.
- @radix-ui/react-progress
  - Progress bar.
- @radix-ui/react-radio-group
  - Radio group.
- @radix-ui/react-scroll-area
  - Scroll area.
- @radix-ui/react-select
  - Select UI.
- @radix-ui/react-separator
  - Separator UI.
- @radix-ui/react-slider
  - Slider UI.
- @radix-ui/react-slot
  - Slot composition helper.
- @radix-ui/react-switch
  - Switch UI.
- @radix-ui/react-tabs
  - Tabs UI.
- @radix-ui/react-toast
  - Toast UI.
- @radix-ui/react-toggle
  - Toggle UI.
- @radix-ui/react-toggle-group
  - Toggle group UI.
- @radix-ui/react-tooltip
  - Tooltip UI.
- @supabase/supabase-js
  - Supabase client SDK.
- @tanstack/react-query
  - Query/cache yönetimi.
- class-variance-authority
  - CVA utility.
- clsx
  - Classname birleştirme.
- cmdk
  - Command palette.
- date-fns
  - Tarih yardımcıları.
- embla-carousel-react
  - Carousel UI.
- fast-xml-parser
  - XML parser.
- fflate
  - Zip/flate utility.
- input-otp
  - OTP input bileşeni.
- lucide-react
  - Icon set.
- mammoth
  - DOCX parser.
- next-themes
  - Theme management.
- react
  - React core.
- react-day-picker
  - Tarih picker.
- react-dom
  - React DOM renderer.
- react-dropzone
  - File dropzone.
- react-hook-form
  - Form yönetimi.
- react-resizable-panels
  - Resizable panel layout.
- react-router-dom
  - Routing.
- recharts
  - Charts.
- sonner
  - Toast/notification UI.
- tailwind-merge
  - Tailwind class merge.
- tailwindcss-animate
  - Tailwind animasyon util’leri.
- vaul
  - Drawer / bottom sheet.
- xlsx
  - Excel parsing.
- zod
  - Şema doğrulama.

### 22.2 DevDependencies
- @eslint/js
  - ESLint core config.
- @tailwindcss/typography
  - Tailwind typography plugin.
- @testing-library/jest-dom
  - Jest DOM matcher’ları.
- @testing-library/react
  - React Testing Library.
- @types/node
  - Node types.
- @types/react
  - React types.
- @types/react-dom
  - React DOM types.
- @vitejs/plugin-react-swc
  - Vite React SWC plugin.
- autoprefixer
  - PostCSS autoprefixer.
- eslint
  - Linting.
- eslint-plugin-react-hooks
  - Hooks lint kuralları.
- eslint-plugin-react-refresh
  - Fast refresh lint.
- globals
  - JS globals listesi.
- jsdom
  - DOM environment for tests.
- lovable-tagger
  - Lovable tagging helper.
- postcss
  - PostCSS core.
- tailwindcss
  - Tailwind core.
- typescript
  - TypeScript compiler.
- typescript-eslint
  - TS ESLint tooling.
- vite
  - Vite build tool.
- vitest
  - Vitest test runner.
