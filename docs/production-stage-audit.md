# Story Shot Studio Production Stage Audit

Tarih: 2026-05-02  
Kapsam: `src/` ve `supabase/` altındaki ürün mantığını taşıyan tüm dosyalar, sayfalar, hook'lar, veri katmanları, agent akışı ve destekleyici altyapı.

Bu raporun amacı:

1. Mevcut sistemi film prodüksiyon zinciriyle eşleştirmek
2. Hangi aşamaları şu an karşıladığımızı netleştirmek
3. Hangi dosyanın bu zincirde ne iş yaptığını görünür kılmak
4. Şimdiki sürüm için gerekli olmayan prodüksiyon katmanlarını ayırmak
5. Kod ve ürün tarafında nerelerin değişmesi gerektiğini baştan sona yazmak

---

## 1. Kısa Hüküm

Story Shot Studio şu an tam bir film prodüksiyon yönetim sistemi değil.  
Asıl kimliği şu:

**Metinden sahne çıkaran, sahneleri görsel olarak yapılandıran, style/reference/entity continuity taşıyan ve prompt tabanlı coverage üreten bir AI-assisted visual preproduction workspace.**

Başka bir deyişle sistem şu zinciri güçlü biçimde çözüyor:

**Text -> Scene Breakdown -> Visual Context -> Prompt Coverage -> Revisions -> Export**

Şu zinciri ise henüz çözmüyor:

**Stripboard -> AD Scheduling -> DOOD -> Call Sheet -> Floor Plan -> On-set Logistics**

Bu ayrımı net tutmak önemli. Çünkü ürünün gücü şu an set lojistiğinde değil, **görsel ön üretim ve prompt-planning** tarafında.

---

## 2. Film Prodüksiyon Şemasıyla Uyum Özeti

| Prodüksiyon Aşaması | Mevcut Durum | Yorum |
|---|---|---|
| Shooting Script | Kısmi | Sahne bazlı yapı var, ama gerçek shooting script formatı yok |
| Script Breakdown | Güçlü kısmi | Karakter, mekan, zaman, sahne bağlamı var; props/wardrobe/stunts/VFX breakdown yok |
| Stripboard / Production Board | Yok | Sahneleri lojistiğe göre gruplayan üretim tahtası yok |
| One-Liner / DOOD | Yok | Cast availability / day-out-of-days sistemi yok |
| Shooting Schedule | Yok | Episode navigator var ama gerçek shooting schedule değil |
| Location Scout / Tech Scout | Zayıf kısmi | Mekan tanımı ve referanslar var; teknik scout checklist yok |
| Director's Concept / Visual Treatment | Güçlü | Episode style, render mode, narrative mode, visual treatment var |
| Scene-by-Scene Director Breakdown | Güçlü kısmi | SceneCard + visualNote var; dramatik beat / blocking intent yok |
| Storyboards | Dolaylı | Prompt tabanlı previs var ama storyboard panel sistemi yok |
| Shot List | Kısmi ve çok uygun büyüme alanı | Wide/Medium/Close-up var; structured shot list yok |
| Camera Angles / Movement / Lens | Kısmi | Shot size var, angle/movement/lens first-class field değil |
| Floor Plans / Top-down | Yok | Lokasyon diyagramı / blocking planı yok |
| Call Sheet | Yok | Günlük operasyon planı yok |
| Coverage Logic | Kavramsal olarak var | Wide/Medium/Close-up coverage mantığı var |

---

## 3. Şu Anki Gerçek Ürün Akışı

Mevcut sistemin gerçek çalışma akışı aşağıdaki gibi:

1. Proje ve episode oluşturma
2. Narrative mode / render mode belirleme
3. Metin yükleme
4. AI ile sahne ayrıştırma
5. Character / location / time context çıkarımı
6. SceneCard tabanlı görsel planlama
7. Episode style / visual treatment belirleme
8. Referans yükleme ve sahnelere bağlama
9. Sahne başına prompt coverage üretimi
10. Prompt revizyonu / pinleme / referans etkisi
11. Agent ile editoryal müdahale
12. JSON/export ve motion prompt gibi aşağı akışlara hazırlık

Bu akışın ürün tanımı açısından en doğru kısa adı:

**visual preproduction + prompt planning**

---

## 4. Mimari Katmanlar

Kod tabanı işlevsel olarak şu katmanlara ayrılıyor:

### A. Giriş / Navigasyon / Sayfa katmanı
- `src/App.tsx`
- `src/main.tsx`
- `src/pages/Landing.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/ProjectWorkspace.tsx`
- `src/pages/Index.tsx`
- `src/pages/MotionPrompt.tsx`
- `src/pages/Settings.tsx`
- `src/pages/AuthCallback.tsx`
- `src/pages/NotFound.tsx`

### B. Workspace ve görsel editör katmanı
- `src/components/Header.tsx`
- `src/components/LeftPanel.tsx`
- `src/components/CenterPanel.tsx`
- `src/components/RightPanel.tsx`
- `src/components/SceneCard.tsx`
- `src/components/PromptCard.tsx`
- `src/components/SubSceneCard.tsx`
- `src/components/ReferencePanel.tsx`
- `src/components/EntityCardPanel.tsx`
- `src/components/EpisodeStylePanel.tsx`
- `src/components/ExportModal.tsx`
- `src/components/SettingsModal.tsx`

### C. AI analiz / prompt üretim çekirdeği
- `src/lib/sceneAnalyzer.ts`
- `src/lib/scriptSceneAnalyzer.ts`
- `src/lib/scriptSceneAnalysisSchema.ts`
- `src/lib/promptGenerator.ts`
- `src/lib/analysisPrompts.ts`
- `src/lib/sceneParser.ts`
- `src/lib/scriptParser.ts`
- `src/lib/entityExtractor.ts`
- `src/lib/episodeParser.ts`
- `src/lib/documentParser.ts`

### D. Agent katmanı
- `src/components/agent/AgentDrawer.tsx`
- `src/hooks/useAgentActions.ts`
- `src/hooks/useAgentSession.ts`
- `src/lib/agentIntent.ts`
- `src/lib/agentOperations.ts`
- `src/lib/agentParser.ts`
- `src/lib/agentSchema.ts`
- `src/lib/agentPrompts.ts`
- `src/lib/agentContext.ts`
- `src/lib/agentLocalActions.ts`
- `src/lib/agentLocalQueries.ts`
- `src/lib/agentPreview.ts`

### E. AI provider / persistence / infra katmanı
- `src/lib/aiProvider.ts`
- `src/lib/supabaseQueries.ts`
- `src/lib/supabase.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/hooks/useEpisodeWorkspace.ts`
- `src/hooks/useAutosave.ts`
- `src/hooks/useAppState.ts`
- `src/lib/episodePreferences.ts`
- `src/lib/encryption.ts`

### F. Motion downstream katmanı
- `src/lib/motionPromptApi.ts`
- `src/lib/motionPromptFormatter.ts`
- `src/lib/motionPromptParser.ts`
- `src/pages/MotionPrompt.tsx`

### G. Tasarım sistemi / genel UI altyapısı
- `src/components/ui/*`
- `src/hooks/use-toast.ts`
- `src/components/ui/use-toast.ts`
- `src/hooks/use-mobile.tsx`
- `src/lib/utils.ts`

---

## 5. Dosya Bazlı Ürün Analizi

Bu bölüm ürün mantığını gerçekten taşıyan dosyaları tek tek inceler.

## 5.1 Giriş, Route ve Sayfalar

### `src/App.tsx`
**Rol:** Route kompozisyonu  
**Prodüksiyon şemasındaki yeri:** Dolaylı  
**Yorum:** Uygulamanın ürün akışlarını birbirine bağlar: landing, dashboard, workspace, motion prompt, settings.  
**Değişiklik ihtiyacı:** Düşük. Asıl önemli olan route'ların ürün mantığı olarak net ayrılması. Şu an kabul edilebilir.

### `src/pages/Landing.tsx`
**Rol:** Giriş yüzeyi  
**Prodüksiyon şemasındaki yeri:** Yok; ürün keşif yüzeyi  
**Yorum:** Preproduction araç kimliğini net anlatmalı.  
**Öneri:** Landing metni, ürünü “full production platform” gibi değil, “scene planning / prompt preproduction / previs workspace” gibi konumlandırmalı.

### `src/pages/Dashboard.tsx`
**Rol:** Proje listesi / çalışma masası  
**Prodüksiyon şemasındaki yeri:** Üretim klasörü / proje giriş kapısı  
**Öneri:** Burada ileride proje seviyesinde “preproduction status” kartları olabilir:
- scene count
- prompt coverage count
- continuity warnings
- references attached

### `src/pages/ProjectWorkspace.tsx`
**Rol:** Episode listesi, narrative mode, render mode seçimi  
**Prodüksiyon şemasındaki yeri:** Project setup + visual treatment giriş aşaması  
**Güçlü tarafı:**  
- Episode oluştururken narrative mode / render mode seçimi doğru ürün kararı
  
**Eksik tarafı:**  
- burada henüz “production goal” yok  
- örn. `prompt exploration / storyboard / shot list` gibi episode purpose modu ileride eklenebilir

**Öneri:** Episode oluştururken üçüncü bir katman ileride eklenebilir:
- `exploration`
- `coverage`
- `storyboard`
- `shot list`

### `src/pages/Index.tsx`
**Rol:** Ana workspace orkestratörü  
**Prodüksiyon şemasındaki yeri:** Bütün previsualization pipeline’ın merkezi  
**Güçlü tarafı:**  
- her ana modülü birbirine bağlıyor
- prompt üretimi, AI editör, style panel, reference panel burada birleşiyor

**Sorun:**  
Bu dosya hâlâ çok büyük ve çok fazla karar taşıyor:
- initialization
- provider sync
- upload
- analysis
- prompt generation
- agent
- layout
- save
- modals

**Öneri:** Bu dosya mutlaka daha fazla bölünmeli. En doğal hedef:
- `useWorkspaceModels`
- `usePromptGeneration`
- `useSceneAnalysis`
- `useSettingsSync`
- `useWorkspacePanels`

Bu refactor doğrudan prodüksiyon şemasıyla ilgili değil ama ürün güvenilirliği için kritik.

### `src/pages/MotionPrompt.tsx`
**Rol:** Generated still -> motion prompt downstream aracı  
**Prodüksiyon zincirindeki yeri:** Ana şemanın dışında, post-previs yardımcı modül  
**Yorum:** Güzel yan yol ama ana ürün omurgasının dışında.  
**Öneri:** Şu an ayrı kalması iyi. Ana workspace ile karışmamalı.

### `src/pages/Settings.tsx`
**Rol:** Provider, API key, model yönlendirme, bilanço  
**Prodüksiyon zincirindeki yeri:** Araç operasyonu  
**Yorum:** Bu ürünün prodüksiyon-plan değil, “tool operation control room” sayfası.  
**Mevcut sorun:** hâlâ büyük ve biraz heterojen.  
**Öneri:** İleride şu sekmelere ayrılmalı:
- Model Routing
- Keys
- Usage / Cost
- Reliability / Logs

---

## 5.2 Workspace Görsel Akışı

### `src/components/Header.tsx`
**Rol:** Import / export / text upload / settings erişimi  
**Uyum:** Shooting script giriş kapısı gibi davranıyor  
**Öneri:** İleride “Text / Scene Plan / Shot Plan / Export” gibi daha anlamlı bir üst navigasyon çıkabilir.

### `src/components/LeftPanel.tsx`
**Rol:** Episode / scene navigation  
**Şemadaki yeri:** Narrative organization  
**Önemli not:** Bu gerçek shooting schedule değil.  
**Öneri:** İleride ikinci görünüm eklenebilir:
- narrative order
- shoot order

Bu, stripboard-lite için ilk adım olur.

### `src/components/CenterPanel.tsx`
**Rol:** Kaynak metni ve sahne tıklama yüzeyi  
**Şemadaki yeri:** Shooting script / source text view  
**Güçlü tarafı:** sahnelerin metinden çıkışını gösteriyor  
**Eksik tarafı:** şu an prodüksiyon dilinde “locked script / analyzed chunks / scene beats” gibi katmanlar yok

### `src/components/RightPanel.tsx`
**Rol:** SceneCard çalışma yüzeyi  
**Şemadaki yeri:** Scene-by-scene breakdown + prompt coverage workspace  
**Güçlü tarafı:** ürünün kalbi burası  
**Karşıladığı aşamalar:**
- scene breakdown
- prompt coverage
- reference visibility
- prompt revizyonu

**Eksik tarafı:**  
- shot list tablosu değil  
- structured camera fields yok  
- continuity warnings yüzeyi zayıf

**Öneri:** En doğal büyüme:
- `Scene View`
- `Shot View`
- `Continuity View`

### `src/components/SceneCard.tsx`
**Rol:** Tek sahnenin görsel edit surface’i  
**Şemadaki yeri:** Scene breakdown + coverage + local continuity  
**Güçlü tarafı:**  
- character/location/time/reference aynı kartta toplanıyor
- promptlar sahne bağlamıyla birlikte görülebiliyor

**Sorun:**  
SceneCard şu an çok şey yapıyor ama sahnenin “prodüksiyon veri modeli” hâlâ eksik.

**Eksik alanlar:**
- scene objective
- emotional beat
- blocking note
- prop list
- wardrobe note
- shot plan metadata

**Öneri:** Uzun vadede SceneCard iki katmana bölünebilir:
- `Scene Breakdown`
- `Shot Coverage`

### `src/components/PromptCard.tsx`
**Rol:** Prompt varyant UI’si  
**Şemadaki yeri:** Shot variation / visual coverage  
**Eksik tarafı:** prompt hala text blob merkezli  
**Öneri:** İleride structured shot metadata gösterilmeli:
- shot type
- camera angle
- movement
- lens
- subject focus

### `src/components/ReferencePanel.tsx`
**Rol:** Görsel referans yükleme, sahneye atama  
**Şemadaki yeri:** Storyboard/style/reference preproduction desteği  
**Güçlü tarafı:** referanslar episode içinde gerçek iş görüyor  
**Eksik tarafı:** reference -> visual continuity / shot planning bağları daha görünür olabilir

### `src/components/EpisodeStylePanel.tsx`
**Rol:** Director's concept / visual treatment paneli  
**Şemadaki yeri:** Director's Concept & Visual Treatment  
**Bu modül stratejik olarak çok doğru.**  
Ürünün film prodüksiyon şemasıyla en güçlü örtüştüğü yerlerden biri.

**Öneri:** İleride buraya structured treatment alanları eklenebilir:
- palette
- contrast
- lens world
- motion language
- abstraction level

### `src/components/ExportModal.tsx`
**Rol:** Scene/prompt export  
**Şemadaki yeri:** Shot package delivery  
**Öneri:** Uzun vadede buraya format seçenekleri eklenebilir:
- Prompt JSON
- Shot List CSV
- Storyboard package
- Motion handoff pack

---

## 5.3 AI Analiz Katmanı

### `src/lib/sceneAnalyzer.ts`
**Rol:** Genel metni sahnelere, karakterlere, mekanlara ve zaman bağlamlarına ayırır  
**Şemadaki yeri:** Script Breakdown + Scene-by-scene visual breakdown  
**Güçlü tarafı:**  
- scene card generation
- character extraction
- location extraction
- time context extraction
- visual-note odaklı scene construction

**Sorun:**  
Bu modül çok güçlü ama prodüksiyon şemasında yalnızca “görsel breakdown” kısmını çözüyor.

**Eksik kalan breakdown alanları:**
- props
- wardrobe
- VFX/SFX
- stunts
- vehicles/animals
- sound cue / playback

**Öneri:** Eğer gerçek script breakdown’a yaklaşılacaksa, `sceneAnalyzer` payload’ına şu alanlar eklenmeli:
- `props`
- `wardrobeNotes`
- `blockingHint`
- `dramaticBeat`
- `coveragePriority`

### `src/lib/scriptSceneAnalyzer.ts`
**Rol:** Script-format input için daha structured analiz yolu  
**Yorum:** Bu, ürünün ileride script tabanlı daha resmi girişleri desteklemesi için kıymetli.  
**Ama:** kullanıcı yönü şu an voiceover/text daha baskın.

**Öneri:** Şu an tutulabilir ama ikinci sınıf yol gibi yönetilmeli. Ana ürün yolu hâlâ serbest metin/narration.

### `src/lib/scriptSceneAnalysisSchema.ts`
**Rol:** Script analyzer output schema  
**Yorum:** Yapısal güvenilirlik için iyi.

### `src/lib/sceneParser.ts`
**Rol:** Ayrıştırılmış sahne formatlarını parse etme  
**Yorum:** Breakdowns’ın parser katmanı.

### `src/lib/scriptParser.ts`
**Rol:** Script text parsing  
**Yorum:** Şu an ana ürün mantığında merkezî değil. Kaldırılmasa da geri plana itilebilir.

### `src/lib/entityExtractor.ts`
**Rol:** Character/location extraction kuralları  
**Yorum:** Script breakdown’ın entity ayağı  
**Öneri:** Props ve wardrobe gibi yeni breakdown tipleri eklenecekse buna benzer ayrı extractor katmanları gerekir.

### `src/lib/analysisPrompts.ts`
**Rol:** Analiz promptları / LLM talimat seti  
**Yorum:** Scene analyzer davranışının ürün politikası burada yaşıyor.

---

## 5.4 Prompt Üretim Katmanı

### `src/lib/promptGenerator.ts`
**Rol:** Sahne bağlamından prompt coverage üretimi  
**Şemadaki yeri:** Shot list / camera coverage / visual treatment’in prompt karşılığı  
**Bu dosya ürünün ikinci çekirdeği.**

**Mevcut olarak çözdüğü şeyler:**
- project type
- render mode
- style continuity
- scene context
- characters / locations / time context
- reference etkisi
- prompt variants

**Güçlü tarafı:**  
film prodüksiyon şemasında “Director's visual treatment + camera coverage language” kısmının AI karşılığı burada.

**Ana eksik:**  
Bilginin çoğu structured alan yerine prompt metnine gömülü.

**Eklenecek alanlar:**
- shot size (zaten dolaylı var)
- angle
- movement
- lens
- frame intent
- coverage role (`master`, `OTS`, `detail`, `insert`, `POV`)

Bu dosya gelecekte doğrudan **Shot List Engine**’e evrilebilir.

### `src/lib/geminiApi.ts`
**Rol:** Legacy/alt prompt generation hattı  
**Yorum:** Kodda hâlâ bazı eski prompt generation akışları var.  
**Öneri:** `promptGenerator.ts` merkezde kalacaksa bu dosya giderek sadeleşmeli ya da sadece backward compatibility katmanı olmalı.

---

## 5.5 Agent Katmanı

### `src/components/agent/AgentDrawer.tsx`
**Rol:** AI editör yüzeyi  
**Şemadaki yeri:** Director revision surface  
**Yorum:** Ürün açısından çok önemli. Çünkü yönetmenin notunu operasyonel edit’e çeviriyor.

**Bu katman film şemasında doğrudan bir belgeye denk gelmez.**  
Ama pratikte şuna denk gelir:
- director notes
- revision passes
- visual change requests

### `src/hooks/useAgentActions.ts`
**Rol:** Agent submit -> intent -> apply -> regenerate/stale zinciri  
**Yorum:** Director revision engine burada.

**Güçlü tarafı:**  
- artık intent-first düşünmeye başlamış
- prompt patch / regenerate / stale sırası app tarafında

**Eksik tarafı:**  
Director notlarını hâlâ daha sistematik bir “revision grammar” ile sınıflandırmak gerekiyor.

### `src/lib/agentIntent.ts`
**Rol:** Kullanıcı niyetini düşük seviyeli op yerine edit intent olarak çözmek  
**Yorum:** Bu çok doğru yönde atılmış adım.

**Bu dosya gelecekte şuna dönüşmeli:**
- target resolver
- directorial note parser
- revision classifier

### `src/lib/agentOperations.ts`
**Rol:** Operation apply / prompt patch / regeneration kararları  
**Yorum:** Agent’ın prodüksiyonel etkisinin gerçek yürütücüsü.

**Önemli stratejik yön:**  
`mark_prompt_stale` ilk seçenek değil, en son fallback olmalı. Bu yönde doğru evrilmiş.

### `src/lib/agentParser.ts`
**Rol:** Legacy operation JSON toleransı  
**Yorum:** Faydalı tampon katman ama uzun vadede azaltılması daha iyi.

### `src/lib/agentPrompts.ts`
**Rol:** Agent davranış talimatları  
**Öneri:** Intent-first mimari güçlendikçe low-level operation zorlaması daha da azaltılmalı.

### `src/lib/agentContext.ts`
**Rol:** Agent’a state snapshot hazırlama  
**Sorun:** Fazla context yavaşlık üretme riski taşır.  
**Öneri:** hedeflenmiş slice mantığı güçlendirilmeli.

### `src/lib/agentLocalActions.ts` / `agentLocalQueries.ts`
**Rol:** Lokal hızlı çözüm / LLM’siz cevaplar  
**Yorum:** UX ve hız için doğru.

### `src/lib/agentPreview.ts`
**Rol:** Sonuçları kullanıcı diline çevirme  
**Yorum:** JSON kusmak yerine edit günlüğü hissi vermeli; doğru yönde.

### `src/lib/agentSchema.ts`
**Rol:** Structured contract  
**Yorum:** Hâlâ gerekli, ama contract seviyesi intent/plan tarafında kalmalı.

---

## 5.6 State, Persistence ve Supabase

### `src/hooks/useAppState.ts`
**Rol:** Ana client state  
**Yorum:** Uygulamanın ürün modeli burada yaşıyor.

**Bugünkü veri modelinin güçlü yanları:**
- `sceneCards`
- `characters`
- `locations`
- `timeContexts`
- `renderMode`
- `projectType`

Bu zaten prodüksiyon şemasından alınacak pek çok şeyi destekleyebilecek bir omurga.

**Eksik veri alanları:**
- props
- wardrobe notes
- shot plan fields
- continuity status
- production grouping metadata

### `src/hooks/useAppState_immer.ts`
**Rol:** Alternatif state denemesi / bozuk görünüyor  
**Durum:** Şu an kullanılmıyor ve dosya içeriği kırık/yarım görünüyor.  
**Öneri:** Ya tamamen silinmeli ya da düzeltilmeli. Şu haliyle teknik borç.

### `src/hooks/useEpisodeWorkspace.ts`
**Rol:** Episode hydrate etme  
**Yorum:** Supabase -> workspace veri yükleme omurgası.

### `src/hooks/useAutosave.ts`
**Rol:** SceneCards / prompts / episode metadata autosave  
**Yorum:** Çok kritik altyapı katmanı.

**Ürün açısından anlamı:**  
Bu dosya, preproduction workspace’in gerçekten “çalışan sistem” olmasını sağlıyor.

### `src/lib/supabaseQueries.ts`
**Rol:** DB query layer  
**Yorum:** Ürünün kalıcılaşmış bilgi yapısı burada.

**Önemli gözlem:**  
Şu an DB katmanı daha çok:
- projects
- episodes
- scenes
- prompts
- global characters/locations
- references
- user model setting
- agent persistence

taşıyor.

**Ama production-oriented tablolara henüz genişlememiş:**
- shot lists
- storyboard frames
- props
- continuity warnings
- schedule groups

### `src/lib/supabase.ts` / `src/integrations/supabase/*`
**Rol:** Tipler ve client

### `src/lib/episodePreferences.ts`
**Rol:** Episode düzeyinde projectType/renderMode tercihi  
**Yorum:** Çok doğru çekirdek tercih.

---

## 5.7 Motion Katmanı

### `src/pages/MotionPrompt.tsx`
### `src/lib/motionPromptApi.ts`
### `src/lib/motionPromptFormatter.ts`
### `src/lib/motionPromptParser.ts`

**Rol:** Still prompt sonrası motion prompting  
**Şemadaki yeri:** Film prodüksiyon zincirinin dışında, ama previs/video pipeline için değerli  
**Yorum:** Ana sahne-plan ürününden ayrı tutulması iyi.

---

## 5.8 Ayarlar ve Operasyon Katmanı

### `src/components/SettingsModal.tsx`
**Rol:** Workspace-level hızlı kontrol paneli  
**Yorum:** Son revizyonlarla daha mantıklı hale gelmiş; artık küçük bir control room gibi davranıyor.

### `src/components/settings/ProviderModelSettings.tsx`
**Rol:** Provider bazlı model routing UI  
**Yorum:** Doğru ekleme. Çünkü ürün artık tek model değil çok sağlayıcılı çalışma mantığına sahip.

### `src/pages/Settings.tsx`
**Rol:** Geniş ayar, keys, usage, routing sayfası  
**Yorum:** İşlev olarak doğru, ama ileride sekmeli ve daha yoğun bir bilgi mimarisi gerekiyor.

---

## 6. Mevcut Kod Tabanında Prodüksiyon Şemasına En Uygun Olanlar

Bugünkü sürümde prodüksiyon şemasıyla en uyumlu ve büyütülmeye en uygun modüller şunlar:

1. `sceneAnalyzer.ts`
2. `promptGenerator.ts`
3. `SceneCard.tsx`
4. `RightPanel.tsx`
5. `EpisodeStylePanel.tsx`
6. `ReferencePanel.tsx`
7. `useAgentActions.ts` + `agentIntent.ts`
8. `useAppState.ts`

Bunlar doğrudan şu ilerlemelere evrilebilir:

- richer breakdown sheets
- shot list
- coverage planning
- continuity system
- storyboard/previs support

---

## 7. Şu An Sisteme Eklenmemesi Gereken Ağır Prodüksiyon Katmanları

Şimdiki ürün odağı açısından aşağıdakiler erken:

1. Full stripboard
2. Day-out-of-days
3. Full shooting schedule
4. Call sheet generator
5. Floor plan / lighting plan CAD benzeri sistem
6. Contract / cast availability yönetimi

Bunlar ürünü başka kategoriye iter.  
Mevcut ürünün değerini artıracak şey önce **shot planning derinliği** ve **continuity intelligence**.

---

## 8. En Kritik Değişiklik İhtiyaçları

## 8.1 Ürün Modeli

Mevcut veri modeline aşağıdaki kavramlar eksik:

- `props`
- `wardrobeNotes`
- `dramaticBeat`
- `blockingHint`
- `coverageRole`
- `cameraAngle`
- `cameraMovement`
- `lensHint`
- `continuityFlags`

Bu alanlar gelmeden ürün “scene breakdown” ile “shot planning” arasında sıkışık kalır.

## 8.2 Shot List Yönüne Evrilme

Şu an prompt varyasyonları var ama bunlar structured shot list değil.

İlk mantıklı genişleme:

Her prompt/sahne için ayrı metadata:
- shot size
- angle
- movement
- lens
- framing intent
- coverage role

Bu geldiği anda ürün gerçek anlamda **AI-assisted shot list workspace**’e dönüşmeye başlar.

## 8.3 Continuity Sistemi

Şu an consistency grouping var ama uyarı sistemi zayıf.

İhtiyaç:
- character appearance drift warning
- wardrobe drift warning
- location drift warning
- render mode drift warning
- stale severity
- regen recommendation severity

## 8.4 Agent’in Rolü

AI editörün rolü şuna net oturmalı:

**director revision assistant**

Yani:
- “Sahne 12 daha tehditkâr olsun”
- “Yaşlı karakterin giyimi daha 11. yüzyıl Türkmen gibi olsun”
- “Close-up’lar fazla posed”

gibi notları çözmeli.

Bu yüzden agent’i production operation compiler değil, **revision planner** olarak geliştirmek daha doğru.

## 8.5 Kod Yapısı

En yüksek teknik borç alanları:

- `src/pages/Index.tsx` çok büyük
- `src/pages/Settings.tsx` çok büyük
- legacy / alternate yollar fazla
- `useAppState_immer.ts` kırık ve ölü görünüyor

---

## 9. Önerilen Ürün Yönü

Eğer bu proje film prodüksiyon zincirinden sadece gerekli olanları alacaksa, önerilen yön şu:

### Faz 1 — Hemen değer üretecek
- Scene breakdown alanlarını genişlet
- Shot metadata’yı structured hale getir
- Continuity warning sistemi kur
- Prompt coverage -> shot coverage görünümüne yaklaş

### Faz 2 — Previs / storyboard gücü
- Generated image preview’ler
- Storyboard strip görünümü
- Sequence bazlı akış
- Shot list export

### Faz 3 — Hafif prodüksiyon planlama
- Location grouping
- Day/night grouping
- Shoot-order view
- Stripboard-lite

### Faz 4 — Opsiyonel daha ağır üretim
- call sheet lite
- department notes
- floor plan sketches

---

## 10. Sonuç

Bugünkü sürümde Story Shot Studio’nun kimliği en doğru şu şekilde okunmalı:

**Bu bir metinden filme giden tüm üretim zincirini çözen set-prodüksiyon aracı değil.**  
**Bu, filmin görsel planını, sahne dilini, style treatment’ını, reference continuity’sini ve shot/prompt coverage’ını yöneten bir previsualization ve prompt preproduction sistemi.**

Bu iyi haber. Çünkü ürünün yönü aslında net:

- Tam scheduling aracı olmaya çalışmamalı
- Tam call sheet sistemi olmaya çalışmamalı
- Önce scene breakdown + shot planning + continuity + storyboard/previs tarafında derinleşmeli

Kod tabanı da bunu destekleyecek kadar güçlü bir omurgaya sahip:

- SceneCard modeli doğru
- Prompt engine güçlü
- Style katmanı güçlü
- Reference sistemi değerli
- Agent doğru yöne evriliyor

Ama bir sonraki büyük sıçrama için artık şu dönüşüm şart:

**Prompt-first yapıdan shot-plan-first yapıya doğru gitmek.**

Yani:

- sadece “3 prompt üret”
değil,
- “bu sahnenin coverage planı ne”
- “hangi shot neden var”
- “hangi continuity riskleri var”

seviyesine çıkmak.

Bu dönüşüm olursa ürün, attığın prodüksiyon şemasının gerçekten anlamlı bölümünü kendi diline çevirmiş olur.

---

## 11. Ek A — Dosya Envanteri ve Kısa Statü

Bu ek, repo içindeki dosyaları kısa statü notuyla birlikte toplar.

### Çekirdek ürün dosyaları

- `src/pages/Index.tsx` — ana workspace orkestratörü, refactor şart
- `src/pages/ProjectWorkspace.tsx` — episode setup, iyi yönde
- `src/pages/Settings.tsx` — ayar/usage control room, yeniden bölünmeli
- `src/pages/MotionPrompt.tsx` — ayrı downstream modül
- `src/pages/Dashboard.tsx` — proje listesi
- `src/pages/Landing.tsx` — giriş yüzeyi

### Sahne / prompt / style yüzeyleri

- `src/components/RightPanel.tsx` — ana scene workspace
- `src/components/SceneCard.tsx` — sahne breakdown yüzeyi
- `src/components/PromptCard.tsx` — prompt varyant UI
- `src/components/ReferencePanel.tsx` — reference management
- `src/components/EpisodeStylePanel.tsx` — visual treatment
- `src/components/EpisodeStyleHistoryModal.tsx` — style versioning
- `src/components/ExportModal.tsx` — dışa aktarım
- `src/components/SettingsModal.tsx` — hızlı ayar paneli
- `src/components/settings/ProviderModelSettings.tsx` — provider routing UI

### Metin / sahne analizi

- `src/lib/sceneAnalyzer.ts` — ana scene breakdown engine
- `src/lib/scriptSceneAnalyzer.ts` — script-format structured yol
- `src/lib/scriptSceneAnalysisSchema.ts` — script analyzer schema
- `src/lib/sceneParser.ts` — parse katmanı
- `src/lib/scriptParser.ts` — script parsing
- `src/lib/entityExtractor.ts` — entity breakdown
- `src/lib/documentParser.ts` — docx/txt text extraction
- `src/lib/episodeParser.ts` — episode derivation
- `src/lib/analysisPrompts.ts` — analyzer instructions

### Prompt / generation çekirdeği

- `src/lib/promptGenerator.ts` — ana prompt coverage engine
- `src/lib/geminiApi.ts` — legacy/alt generation yolu
- `src/lib/aiProvider.ts` — multi-provider runtime
- `src/lib/referenceAnalyzer.ts` — reference -> scene relevance

### Agent sistemi

- `src/components/agent/AgentDrawer.tsx` — AI edit surface
- `src/hooks/useAgentActions.ts` — agent execution path
- `src/hooks/useAgentSession.ts` — session + persistence
- `src/lib/agentIntent.ts` — intent-first parser/planner
- `src/lib/agentOperations.ts` — apply / patch / regenerate
- `src/lib/agentParser.ts` — legacy op parsing
- `src/lib/agentSchema.ts` — contracts
- `src/lib/agentPrompts.ts` — prompts
- `src/lib/agentContext.ts` — context builder
- `src/lib/agentLocalActions.ts` — local fast path
- `src/lib/agentLocalQueries.ts` — local answers
- `src/lib/agentPreview.ts` — user-facing result summaries

### Persistence / state

- `src/hooks/useAppState.ts` — primary state source
- `src/hooks/useAppState_immer.ts` — broken/unused; cleanup needed
- `src/hooks/useEpisodeWorkspace.ts` — hydrate layer
- `src/hooks/useAutosave.ts` — autosave
- `src/lib/supabaseQueries.ts` — DB query layer
- `src/lib/supabase.ts` — typed DB layer
- `src/lib/episodePreferences.ts` — episode local prefs
- `src/lib/encryption.ts` — API key encryption helpers

### Motion modülü

- `src/lib/motionPromptApi.ts`
- `src/lib/motionPromptFormatter.ts`
- `src/lib/motionPromptParser.ts`

### Destekleyici / yardımcı ama çekirdek olmayanlar

- `src/components/CenterPanel.tsx`
- `src/components/LeftPanel.tsx`
- `src/components/Header.tsx`
- `src/components/InfoModal.tsx`
- `src/components/NavLink.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/FloatingToolbar.tsx`
- `src/components/EntityCardPanel.tsx`
- `src/components/EntityManager.tsx`
- `src/components/ScriptUploader.tsx`
- `src/components/SubSceneCard.tsx`
- `src/components/PromptHistoryModal.tsx`

### Context / auth / infra

- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/types/index.ts`
- `src/lib/utils.ts`

### Testler

- `src/test/example.test.ts`
- `src/test/scriptSceneAnalyzerStructuredOutput.test.ts`
- `src/test/promptGeneratorJsonRecovery.test.ts`
- `src/test/motionPromptAgentic.test.ts`

### UI primitives

`src/components/ui/*` altındaki dosyalar ürün mantığı değil, tasarım sistemi altyapısıdır.  
Doğrudan prodüksiyon şemasıyla eşleşmezler; onları tek tek dönüştürmek yerine ürün bileşenlerinin bilgi mimarisini düzeltmek daha önemlidir.

### Supabase migration seti

- `001_initial_schema.sql` — temel veri modeli
- `002_fix_character_location_ids.sql`
- `003_api_keys_system.sql`
- `004_user_settings_model.sql`
- `005_characters_locations_sync.sql`
- `006_episode_character_location_data.sql`
- `007_add_time_contexts_to_episodes.sql`
- `008_add_time_context_ids_to_scenes.sql`
- `009_api_token_tracking.sql`
- `010_token_model_tracking.sql`
- `011_fix_unknown_models.sql`
- `012_add_project_type.sql`
- `013_add_groq_provider.sql`
- `014_add_deepinfra_provider.sql`
- `015_agent_persistence.sql`

Bu migration seti şunu gösteriyor:
ürün set-prodüksiyon değil, **AI-assisted workspace operation and persistence** yönünde büyümüş.

