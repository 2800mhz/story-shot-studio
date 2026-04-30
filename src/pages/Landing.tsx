import React from 'react';
import { Film, Sparkles, Clapperboard, Layers3, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const WORKFLOW_STEPS = [
  {
    title: 'Metni iceri al',
    description: 'Seslendirme metnini yukle, episode akisini kur ve sahne iskeletini cikar.',
    icon: Film,
  },
  {
    title: 'Sahneleri duzenle',
    description: 'Karakter, mekan, zaman ve stil kararlarini tek yerde tut.',
    icon: Layers3,
  },
  {
    title: 'Promptlari yonet',
    description: 'Wide, medium ve close-up varyasyonlarini uret, pinle ve revize et.',
    icon: Wand2,
  },
];

export default function Landing() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Prompt Forge</div>
              <div className="text-xs text-muted-foreground">Storyboard ve prompt workspace</div>
            </div>
          </div>

          <Button onClick={signInWithGoogle} className="h-10 px-5">
            Google ile giris yap
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border/60 bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI destekli sahne ve prompt yonetimi
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Senaryodan cok,
                <br />
                uretim masasi gibi dusunen bir prompt araci
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Story Shot Studio; episode, sahne, karakter, mekan ve prompt kararlarini ayni yerde toplayan
                calisma yuzeyi. Metni parcala, sahneyi duzenle, varyasyonlari uret ve tutarliligi kaybetmeden
                revize et.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={signInWithGoogle} size="lg" className="h-11 px-6">
                  Calisma alanini ac
                </Button>
                <Button variant="outline" size="lg" className="h-11 px-6" onClick={() => navigate('/motion-prompt')}>
                  Motion Prompt aracina git
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Episode setup</div>
                  <div className="mt-2 text-sm font-semibold">Narrative mode + render mode secimi</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Belgesel, reklam veya kurgu tavrini; photoreal, stylized, illustration ya da animation render
                    cizgisiyle birlestir.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scene workspace</div>
                  <div className="mt-2 text-sm font-semibold">Sahne, entity ve prompt akislarini birlikte gor</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Bir panelde metin, digerinde sahne kartlari, yanda ise prompt ve revision akisi.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI editor</div>
                  <div className="mt-2 text-sm font-semibold">Chat gibi degil, editor gibi calisir</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Yasli adamin kiyafetini donemsellestir, bir promptu daha dogal yap ya da sahne notunu tek komutla
                    guncelle.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-background">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-foreground">Temel akis</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Burasi tek atislik prompt yazma araci degil. Episode olceginde karar alip sahne duzeyinde revizyon
                yoneten bir calisma ortami.
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.title} className="rounded-3xl border border-border/70 bg-card px-5 py-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">{step.title}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="text-2xl font-semibold">Promptlari tek tek degil, sistem olarak yonet</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Episode kararlarini erken ver, sahneleri daha temiz parcala, revizyonlari korkmadan uygula.
              </div>
            </div>
            <Button onClick={signInWithGoogle} size="lg" className="h-11 px-6">
              Calismaya basla
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
