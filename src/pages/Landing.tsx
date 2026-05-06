import React from 'react';
import { Film, FileText, LayoutDashboard, Palette, Pin, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const WORKFLOW_STEPS = [
  {
    title: 'Projeyi kur',
    description: 'Proje tipini sec, kart rengini belirle ve oncelikli isleri basa sabitle.',
    icon: LayoutDashboard,
    className: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
  },
  {
    title: 'Episode akisini ac',
    description: 'Her bolum kendi narrative ve render kararini tasir.',
    icon: FileText,
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  },
  {
    title: 'Promptlari yonet',
    description: 'Sahne notu, referans, prompt ve revizyon ayni calisma yuzeyinde kalir.',
    icon: Wand2,
    className: 'border-violet-500/25 bg-violet-500/10 text-violet-200',
  },
];

const PREVIEW_PROJECTS = [
  {
    title: 'Islamin Yayilisi',
    meta: '35 sahne',
    className: 'border-amber-500/30 bg-amber-500/[0.04] text-amber-200',
    pinned: true,
  },
  {
    title: 'Kervan Yolu',
    meta: '18 sahne',
    className: 'border-sky-500/30 bg-sky-500/[0.04] text-sky-200',
    pinned: false,
  },
  {
    title: 'Sehir Belgeseli',
    meta: '9 sahne',
    className: 'border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-200',
    pinned: true,
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
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-300">
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
        <section className="border-b border-border/60 bg-background">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                AI destekli sahne ve prompt yonetimi
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Prompt uretmekten cok, produksiyon masasini duzenleyen bir calisma alani.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Projeleri pinle, renklerle ayir, episode kararlarini temiz baslat ve sahne bazli promptlari ayni
                yerde takip et.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={signInWithGoogle} size="lg" className="h-11 px-6">
                  Calisma alanini ac
                </Button>
                <Button variant="outline" size="lg" className="h-11 px-6" onClick={() => navigate('/motion-prompt')}>
                  Motion Prompt aracina git
                </Button>
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LayoutDashboard className="h-4 w-4 text-sky-300" />
                  Proje panosu
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-200">
                    2 sabit
                  </Badge>
                  <Badge variant="outline">12 proje</Badge>
                </div>
              </div>

              <div className="grid border-b border-border/70 md:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b border-border/70 p-4 md:border-b-0 md:border-r">
                  <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">Projeler</div>
                  <div className="space-y-2">
                    {PREVIEW_PROJECTS.map((project) => (
                      <div key={project.title} className={`flex items-center justify-between rounded-md border px-3 py-2 ${project.className}`}>
                        <div>
                          <div className="text-sm font-medium text-foreground">{project.title}</div>
                          <div className="text-xs text-muted-foreground">{project.meta}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.pinned ? <Pin className="h-4 w-4 fill-current" /> : <Palette className="h-4 w-4" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">Episode kuyrugu</div>
                  <div className="space-y-3">
                    <div className="rounded-md border border-violet-500/25 bg-violet-500/[0.04] p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Bolum 4 - Altin Saat</div>
                        <Badge variant="outline" className="border-violet-500/30 text-violet-200">
                          Photoreal
                        </Badge>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-2 w-2/3 rounded-full bg-violet-400" />
                      </div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-background/40 p-3">
                      <div className="text-sm font-medium">AI Editor</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        Sahne, karakter, mekan ve prompt revizyonlarini hedefli operasyonlara cevirir.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="grid gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md border ${step.className}`}>
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
