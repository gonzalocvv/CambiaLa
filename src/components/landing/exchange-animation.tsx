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
      className={`bg-card flex h-full w-full flex-col overflow-hidden rounded-[4px] border ${f.border}`}
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

/**
 * Mini-álbum tilteado con grilla 3×3. Tiene:
 *  - una celda "repe" que CONTIENE la figurita que SALE: anclada inset-0 → ES la figurita en reposo
 *    (sin clon) y despega desde ahí, con encaje perfecto y CERO calibración.
 *  - una celda "hueco" con una copia ESTÁTICA de la figurita que LLEGA, anclada inset-0 → encaje
 *    perfecto del aterrizaje; aparece por opacity cuando la voladora del otro álbum llega.
 */
function MiniAlbum({ side }: { side: 'a' | 'b' }) {
  const isA = side === 'a';
  // A tiene la repe URU/9 (sale) y recibe BRA/7. B al revés.
  const source = isA
    ? { code: 'URU', number: '9', variant: 'primary' as const, fly: 'fly-a' }
    : { code: 'BRA', number: '7', variant: 'accent' as const, fly: 'fly-b' };
  const landed = isA
    ? { code: 'BRA', number: '7', variant: 'accent' as const }
    : { code: 'URU', number: '9', variant: 'primary' as const };
  const repeIndex = isA ? 0 : 8;
  const holeIndex = isA ? 7 : 1;

  return (
    <div className={`album album-${side} bg-card border-border border shadow-md`}>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 p-2">
        {Array.from({ length: 9 }).map((_, i) => {
          if (i === repeIndex) {
            return (
              <div key={i} className="relative rounded-[4px]">
                {/* La repe ES la voladora: despega desde su propia celda → sin clon, sin calibrar */}
                <div className={`fly ${source.fly} absolute inset-0`}>
                  <StickerFace code={source.code} number={source.number} variant={source.variant} />
                </div>
              </div>
            );
          }
          if (i === holeIndex) {
            return (
              <div
                key={i}
                className="border-primary/50 relative rounded-[4px] border border-dashed"
              >
                {/* Hueco "completo" pre-renderizado: aparece SOLO por opacity */}
                <div
                  className={`hole-fill hole-fill-${side} border-primary bg-primary/20 ring-primary/40 absolute inset-0 rounded-[4px] border ring-2`}
                />
                {/* Copia aterrizada: anclada en el hueco → encaje perfecto, aparece al llegar */}
                <div className={`static-dst static-dst-${side} absolute inset-0`}>
                  <StickerFace code={landed.code} number={landed.number} variant={landed.variant} />
                </div>
              </div>
            );
          }
          if (isA && i === 4) {
            return (
              <div
                key={i}
                className="bg-special/15 border-special/40 ring-special/30 rounded-[4px] border ring-1"
              />
            );
          }
          return <div key={i} className="bg-muted rounded-[4px]" />;
        })}
      </div>
    </div>
  );
}

/**
 * RF-821 — Animación decorativa "el intercambio". La figurita "repe" vive en su
 * celda ORIGEN y ES la que despega (sin clon) → takeoff con encaje perfecto y cero
 * calibración. Vuela al álbum opuesto; el aterrizaje EXACTO lo da una copia estática
 * anclada en el hueco destino (handoff por opacity). Loop 100% CSS (solo
 * transform/opacity). `aria-hidden`, pausa offscreen, reduced-motion = estado final.
 */
export function ExchangeAnimation() {
  const t = useTranslations('Home.hero.matchMock');
  const stageRef = useRef<HTMLDivElement>(null);

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
        className="exchange-scene relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[480px]"
      >
        <MiniAlbum side="a" />
        <MiniAlbum side="b" />

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
