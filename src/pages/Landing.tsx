import React from 'react';
import { Clapperboard, FileText, Image as ImageIcon, Layers3, Scissors, Sparkles, Video, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const FEATURE_CARDS = [
  {
    eyebrow: 'SCRIPT TO SCENES',
    title: 'Metni episode ve sahne kartlarina ayir',
    description: 'Senaryo ya da seslendirme metninden episode akisini, sahne omurgasini ve karakter/mekan/zaman baglamini cikar.',
  },
  {
    eyebrow: 'VISUAL PRODUCTION',
    title: 'Sahneyi gorsele donusturen karar hattini yonet',
    description: 'Kamera acisi, referans, stil, shot promptlari ve image generation akisi ayni calisma yuzeyinde kalir.',
  },
  {
    eyebrow: 'MOTION + ROUGH CUT',
    title: 'Img shotlari hareketli video parcalarina bagla',
    description: 'Uretilen gorseller motion prompt/video asamasina gider; kaba kurgu sirasi, revizyon ve export hazirligi takip edilir.',
  },
];

const WORKFLOW_STEPS = [
  {
    title: 'Text',
    description: 'Senaryo, seslendirme ya da bolum metnini iceri al.',
    icon: FileText,
  },
  {
    title: 'Scenes',
    description: 'Episode ve sahne kartlarini uret, baglami koru.',
    icon: Layers3,
  },
  {
    title: 'Prompts',
    description: 'Shot acilari, referanslar ve prompt varyasyonlarini yonet.',
    icon: Wand2,
  },
  {
    title: 'Image',
    description: 'Sahne kartlarini tutarli gorsel uretim komutlarina cevir.',
    icon: ImageIcon,
  },
  {
    title: 'Motion',
    description: 'Img ciktilarini hareketli shot mantigina hazirla.',
    icon: Video,
  },
  {
    title: 'Rough cut',
    description: 'Video parcalarini kaba kurgu sirasi icinde takip et.',
    icon: Scissors,
  },
];

const PIPELINE_LABELS = [
  'Text',
  'Episode',
  'Scenes',
  'Prompts',
  'Image',
  'Motion',
  'Rough cut',
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
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Prompt Forge</div>
              <div className="text-xs text-muted-foreground">Storyboard, image ve motion workspace</div>
            </div>
          </div>

          <Button onClick={signInWithGoogle} className="h-10 px-5">
            Google ile giris yap
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border/60 bg-card">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI destekli gorsel uretim hatti
              </div>
              <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl">
                Metinden sahneye,
                <br />
                sahneden gorsele,
                <br />
                gorselden kaba kurguya
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
                Story Shot Studio; metni episode ve sahne kartlarina ayiran, sahneleri img uretimine hazirlayan,
                uretilen gorselleri motion/video akisi ve kaba kurgu mantigiyla takip eden bir production workspace.
              </p>
              <div className="mt-7 flex max-w-xl flex-wrap gap-2">
                {PIPELINE_LABELS.map((label) => (
                  <span key={label} className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button onClick={signInWithGoogle} size="lg" className="h-11 px-7">
                  Calisma alanini ac
                </Button>
                <Button variant="outline" size="lg" className="h-11 px-7" onClick={() => navigate('/motion-prompt')}>
                  Motion aracina git
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-background p-5 shadow-sm">
              <div className="grid gap-4">
                {FEATURE_CARDS.map((feature) => (
                  <div key={feature.eyebrow} className="rounded-lg border border-border/70 bg-card p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{feature.eyebrow}</div>
                    <div className="mt-3 text-sm font-semibold">{feature.title}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-background">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-foreground">Temel akis</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Burasi tek atislik prompt yazma araci degil. Metinden gorsele, gorselden hareketli shotlara ve kaba
                kurguya uzanan bir uretim hattini yoneten calisma ortami.
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">{step.title}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
