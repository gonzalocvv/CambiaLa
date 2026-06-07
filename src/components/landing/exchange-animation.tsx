'use client';

import { useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { MatchCardMock } from './match-card-mock';

type Variant = 'primary' | 'accent' | 'special';

const FACE: Record<Variant, { border: string; band: string; num: string }> = {
  primary: { border: 'border-primary/40', band: 'bg-primary/15 text-primary', num: 'text-primary' },
  accent: { border: 'border-accent/40', band: 'bg-accent/15 text-accent', num: 'text-accent' },
  special: { border: 'border-special/50', band: 'bg-special/20 text-special', num: 'text-special' },
};

/** Figurita estilizada (retrato 3:4): código de equipo + número dorsal. Sobria, sin íconos. */
function StickerFace({
  code,
  number,
  variant,
}: {
  code: string;
  number: string;
  variant: Variant;
}) {
  const f = FACE[variant];
  return (
    <div
      className={`bg-card flex h-full w-full flex-col overflow-hidden rounded-md border ${f.border}`}
    >
      <div
        className={`flex items-center justify-center py-0.5 text-[8px] font-bold tracking-widest ${f.band}`}
      >
        {code}
      </div>
      <div
        className={`flex flex-1 items-center justify-center font-mono text-2xl font-extrabold ${f.num}`}
      >
        {number}
      </div>
    </div>
  );
}

/** Mini-álbum tilteado en 3D con grilla 3×3, un hueco punteado y una repe. */
function MiniAlbum({ side }: { side: 'a' | 'b' }) {
  const holeIndex = side === 'a' ? 7 : 1;
  const repeIndex = side === 'a' ? 0 : 8;
  const repeTint =
    side === 'a' ? 'bg-primary/15 border-primary/30' : 'bg-accent/15 border-accent/30';

  return (
    <div className={`album album-${side} bg-card border-border border shadow-md`}>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 p-2">
        {Array.from({ length: 9 }).map((_, i) => {
          if (i === holeIndex) {
            return (
              <div
                key={i}
                className="border-primary/50 relative rounded-[3px] border border-dashed"
              >
                {/* Estado "completo" pre-renderizado: aparece SOLO por opacity (composite-only) */}
                <div
                  className={`hole-fill hole-fill-${side} border-primary bg-primary/20 ring-primary/40 absolute inset-0 rounded-[3px] border ring-2`}
                />
              </div>
            );
          }
          if (i === repeIndex) {
            return <div key={i} className={`rounded-[3px] border ${repeTint}`} />;
          }
          if (side === 'a' && i === 4) {
            return (
              <div
                key={i}
                className="bg-special/15 border-special/40 ring-special/30 rounded-[3px] border ring-1"
              />
            );
          }
          return <div key={i} className="bg-muted rounded-[3px]" />;
        })}
      </div>
    </div>
  );
}

/**
 * RF-821 — Animación decorativa "el intercambio". Dos mini-álbumes en 3D, dos
 * figuritas que vuelan hacia la cámara, se cruzan y encajan en el hueco opuesto;
 * el desenlace es la match card. Loop 100% CSS (solo transform/opacity), sin JS
 * ni Motion (es above-the-fold → se renderiza directo). `aria-hidden` (la copia
 * del hero lleva el mensaje semántico). Pausa offscreen vía IntersectionObserver.
 */
export function ExchangeAnimation() {
  const t = useTranslations('Home.hero.matchMock');
  const stageRef = useRef<HTMLDivElement>(null);

  // El loop es CSS (sin JS). Solo lo pausamos cuando la escena sale del viewport.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle('is-paused', !entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none w-full select-none">
      <div
        ref={stageRef}
        className="exchange-scene relative mx-auto h-[340px] w-full max-w-[440px] sm:h-[400px]"
      >
        <MiniAlbum side="a" />
        <MiniAlbum side="b" />

        <div className="fly fly-a">
          <StickerFace code="URU" number="9" variant="primary" />
        </div>
        <div className="fly fly-b">
          <StickerFace code="BRA" number="7" variant="accent" />
        </div>

        <div className="match-badge bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold shadow-lg">
          {t('matchBadge')}
        </div>

        <div className="match-reveal">
          <MatchCardMock />
        </div>
      </div>
    </div>
  );
}
