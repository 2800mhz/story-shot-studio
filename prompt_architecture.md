# Story Shot Studio - Prompt Mimari Analizi

Bu döküman, uygulamadaki AI (Gemini) çağrılarında farklı prompt katmanlarının nasıl birleştirildiğini ve önceliklendirme mantığını açıklar.

## 1. Prompt Katmanlarının Birleşme Sırası

[src/lib/promptGenerator.ts](file:///c:/Users/gcmsx/Desktop/prompt_forge_2/story-shot-studio/src/lib/promptGenerator.ts) içerisindeki [generatePromptsForScene](file:///c:/Users/gcmsx/Desktop/prompt_forge_2/story-shot-studio/src/lib/promptGenerator.ts#188-368) fonksiyonu, AI'ya gönderilecek olan `userMessage` stringini aşağıdaki hiyerarşik sırayla inşa eder:

| Sıra | Katman | İçerik Özeti |
| :--- | :--- | :--- |
| 1 | **Sahne Metni** | Senaryodaki ham metin bloğu. |
| 2 | **Görsel Not** | Kullanıcı tarafından düzenlenen veya analizörden gelen kısa aksiyon özeti. |
| 3 | **Varlıklar (Entities)** | Sahnede işaretlenmiş karakter ve mekanların fiziksel betimlemeleri. |
| 4 | **Zaman/Tarih Bağlamı** | Işık, hava durumu, dönem ve sezon detayları. |
| 5 | **Referanslar** | Varsa "Konu" (Subject) ve "Stil" (Style) referanslarının açıklamaları. |
| 6 | **Master & Episode Prompt** | Proje genel kuralları ve o bölüme özel stil talimatları. |
| 7 | **Teknik Detaylar** | Aspect Ratio (En-Boy Oranı) ve kompozisyon ipuçları. |
| 8 | **Final Talimat** | AI'ya kaç adet prompt üretmesi gerektiğini söyleyen son komut. |

## 2. Override ve Birleşme Mantığı



Sistem **"Üst Üste Eklemeli" (Additive)** bir mantıkla çalışır:

*   **Master vs Episode:** `episodePrompt` (Bölüm Stili) varsa, `masterPrompt`'un hemen altına şu başlıkla eklenir:  
    `EPISODE STYLE OVERRIDE (apply on top of master rules above):`  
    Bu sayede AI, genel kuralları bilir ama o bölüm için gelen ek kuralların daha öncelikli olduğunu anlar.
*   **Varlık Tanımları:** Karakter ve mekan tanımları, Master Prompt'tan bağımsız olarak o sahneye özel fiziksel detayları (yaş, giysi, mimari) enjekte eder.

## 3. Çakışma Yönetimi

Birden fazla katmanda çakışan bilgiler varsa (Örn: Master Prompt "modern olsun" derken, Episode Prompt "ortaçağ olsun" diyorsa):

1.  **En Son ve En Spesifik Gelen Kazanır:** LLM modelleri (Gemini gibi), mesajın sonuna daha yakın olan ve en spesifik duruma (sahneye) hitap eden talimatlara daha fazla ağırlık verir.
2.  **Hiyerarşi:** `Sahne Notu > Bölüm Stili > Master Prompt`.

## 4. Final Mesaj Yapısı (Pseudo-Code)

AI'ya giden tam mesajın yapısı yaklaşık olarak şöyledir:

```python
# SYSTEM INSTRUCTION (AI'nın Görevi)
system_prompt = "Sen bir sinematik prompt mühendisisin. Çıktıyı JSON formatında ver..."

# USER MESSAGE (Dinamik İçerik)
user_message = f"""
SAHNE METNİ: {scene.text}
TÜRKÇE GÖRSEL NOT: {scene.visualNote}

CHARACTERS IN THIS SCENE:
- {char.name}: {char.visualDescription}

LOCATIONS IN THIS SCENE:
- {loc.name}: {loc.visualDescription}

MASTER PROMPT:
{master_prompt}

EPISODE STYLE OVERRIDE (apply on top of master rules above):
{episode_prompt}

🎬 ASPECT RATIO: {aspectRatio}
COMPOSITION HINT: {composition_technical_note}

FINAL COMMAND: 3 farklı cinematic prompt üret. 
Her birinin sonuna '--ar {aspectRatio} --v 6' ekle.
"""
```
