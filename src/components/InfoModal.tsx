import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export function InfoModal({ open, onClose }: InfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            ℹ️ Nasıl Çalışır?
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 text-sm text-foreground/90 leading-relaxed">

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🎬 Genel Bakış</h3>
              <p>
                Bu uygulama, belgesel senaryolarından yapay zeka destekli sinematik görsel promptlar üretir.
                Metin yükleyip sahne seçersiniz, uygulama Gemini API'yi kullanarak her sahne için
                profesyonel kamera talimatları içeren İngilizce prompt'lar oluşturur.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🤖 AI-Powered Analysis</h3>
              <p>
                When you upload your text, the system automatically uses AI to:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Extract Characters:</strong> Identifies people with their physical descriptions</li>
                <li><strong>Extract Locations:</strong> Detects places with architectural/geographic details</li>
                <li><strong>Analyze Scenes:</strong> Determines if a scene is static, a sequence, or time-lapse</li>
                <li><strong>Suggest Prompt Count:</strong> AI recommends how many images needed per scene</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                No manual annotation needed - just upload and the AI does the rest!
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">📄 Belge Yükleme</h3>
              <p>
                <strong>Ana Metin:</strong> Belgeselinizin senaryosu (.docx veya .txt).
                Yüklendiğinde otomatik olarak bölümlere ayrılır ve AI analizi başlar.
              </p>
              <p className="mt-2 text-xs text-muted-foreground line-through">
                Old system required a separate 5N1K file - this is no longer needed!
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">👤 Character & Location Consistency</h3>
              <p>
                AI extracts character and location descriptions once, then automatically includes them
                in every relevant scene's prompts. This ensures visual consistency across all generated images.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Example: If AI detects "John, a tall man with grey beard" in chapter 1, this description
                will be included in all scenes where John appears.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🎭 Sahne (Scene) Nedir?</h3>
              <p>
                Metinden seçtiğiniz bir pasaj. Her sahne, Gemini'ye gönderilecek bir "birim"dir.
                Bir sahne seçtiğinizde uygulama o metin parçası için görsel prompt üretir.
                Sahne, belgenizdeki anlatımın görselleştirilecek en küçük birimidir.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">👤 Referans (Subject Reference) Nedir?</h3>
              <p>
                Belirli bir karakter veya nesnenin fiziksel tanımını içeren metin seçimi.
                Referans eklediğinizde, o sahnedeki <strong>tüm prompt'larda</strong> aynı karakter
                tutarlı olarak yer alır — aynı kıyafet, yaş, fiziksel özellikler korunur.
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Örnek: "Kara saçlı, 40'lı yaşlarında, yün cübbeli bir tüccar" → Bu tanım tüm prompt'lara eklenir.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🔗 Tutarlılık Grubu (Consistency Group) Nedir?</h3>
              <p>
                Farklı sahneleri aynı görsel dile bağlayan gruptur. Aynı gruptaki sahneler
                şu özellikleri paylaşır: aynı ışık koşulları, günün aynı saati, aynı renk paleti,
                aynı coğrafi arka plan.
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Bir belgesel sekansında ardışık sahnelerin görsel olarak uyumlu olmasını sağlar.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🤖 Sistem Prompt</h3>
              <p>
                Gemini API'ye gönderilen yönerge metnidir. Prompt üretiminin kalitesini,
                formatını ve stilini belirler. <strong>Ayarlar → Sistem Prompt</strong> sekmesinden
                düzenleyebilirsiniz. Değişiklikleriniz kalıcıdır — siz değiştirmedikçe korunur.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🔑 API Anahtarları</h3>
              <p>
                Google AI Studio'dan aldığınız Gemini API anahtarları. Birden fazla anahtar
                ekleyebilirsiniz — rate limit'e takıldığınızda otomatik olarak sonraki anahtara geçilir.
                API anahtarları tarayıcınızda <strong>kalıcı olarak</strong> saklanır.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">📝 Model Ayarları</h3>
              <p>
                Model adını serbest metin olarak yazabilirsiniz (örn: <code className="text-primary">gemini-2.5-flash</code>,
                <code className="text-primary"> gemini-3</code>). Yeni bir model çıktığında sadece adını
                değiştirmeniz yeterli — kod güncellemesi gerekmez.
              </p>
              <p className="mt-1">
                <strong>Temperature:</strong> Düşük değer (0.7) → daha tutarlı, yüksek (1.2) → daha yaratıcı.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">💾 Veri Saklama (Bellek)</h3>
              <p>Uygulama iki tür veri saklar:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Kalıcı (silinmez):</strong> API anahtarları, sistem prompt, model adı ve ayarları</li>
                <li><strong className="text-foreground">Geçici (oturum):</strong> Yüklenen metin, sahneler, referanslar, tutarlılık grupları, üretilen prompt'lar</li>
              </ul>
              <p className="mt-1.5 text-muted-foreground text-xs">
                Tarayıcıyı kapattığınızda geçici veriler temizlenir, ama API ayarlarınız ve sistem prompt'unuz
                aynen kalır. Dışa aktarma özelliği ile çalışmanızı kaydetmeyi unutmayın.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">📤 Dışa Aktarma</h3>
              <p>
                Üretilen prompt'ları Excel (.xlsx) veya düz metin olarak dışa aktarabilirsiniz.
                Bu sayede çalışmanızı kaybetmeden saklayabilirsiniz.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-semibold mb-1.5">🎯 Kullanım Akışı</h3>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-muted-foreground">
                <li className="text-foreground">API anahtarınızı girin (Ayarlar → API Anahtarları)</li>
                <li className="text-foreground">Ana metni yükleyin (.docx veya .txt) — AI otomatik analiz eder</li>
                <li className="text-foreground">Sol panelden modunuzu seçin (Sahne, Referans, Tutarlı, Ekle)</li>
                <li className="text-foreground">Metinden pasaj seçerek sahne oluşturun</li>
                <li className="text-foreground">Gerekirse referans ve tutarlılık grubu ekleyin</li>
                <li className="text-foreground">Sağ panelden "Üret" butonuna basın</li>
                <li className="text-foreground">Prompt'ları inceleyin, revize edin, dışa aktarın</li>
              </ol>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
