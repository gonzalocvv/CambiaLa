'use client';

import { useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { MatchCardMock } from './match-card-mock';

type Variant = 'primary' | 'accent' | 'special';

const FACE: Record<Variant, { border: string; band: string; num: string }> = {
  primary: {
    border: 'border-primary/40',
    band: 'bg-primary/15 text-primary border-b border-primary/25',
    num: 'text-primary',
  },
  accent: {
    border: 'border-accent/40',
    band: 'bg-accent/15 text-accent border-b border-accent/25',
    num: 'text-accent',
  },
  special: {
    border: 'border-special/50',
    band: 'bg-special/20 text-special border-b border-special/30',
    num: 'text-special',
  },
};

/** Figurita estilizada (retrato 3:4): código de equipo + número dorsal. Sobria, sin íconos.
 *  Look "de papel": esquinas filosas, marco fino impreso (ring-inset) y sombra recortada. */
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
      className={`bg-card ring-border/40 relative flex h-full w-full flex-col overflow-hidden rounded-[1.5px] border shadow-[0_1px_1px_rgba(0,0,0,0.22),0_2px_5px_-1px_rgba(0,0,0,0.16)] ring-1 ring-inset ${f.border}`}
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
      {/* Brillo de papel impreso: reflejo diagonal sutil (material, no color de marca). */}
      <div className="sticker-sheen pointer-events-none absolute inset-0" />
    </div>
  );
}

/**
 * Mini-álbum tilteado con grilla 3×3. Dos copias ESTÁTICAS ancladas (encaje exacto
 * a cualquier viewport, rotadas con el álbum):
 *  - en la celda "repe" (origen): la figurita que sale; se desvanece en el takeoff.
 *  - en el "hueco" (destino): la figurita que llega; aparece al aterrizar.
 * El vuelo visible entre ambas lo hace una voladora a nivel escena (ver abajo).
 */
function MiniAlbum({ side }: { side: 'a' | 'b' }) {
  const isA = side === 'a';
  // A tiene la repe URU/9 (sale) y recibe BRA/7. B al revés.
  const source = isA
    ? { code: 'URU', number: '9', variant: 'primary' as const }
    : { code: 'BRA', number: '7', variant: 'accent' as const };
  const landed = isA
    ? { code: 'BRA', number: '7', variant: 'accent' as const }
    : { code: 'URU', number: '9', variant: 'primary' as const };
  const repeIndex = isA ? 0 : 8;
  const holeIndex = isA ? 7 : 1;

  return (
    <div className={`album album-${side} border-border border`}>
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 p-2">
        {Array.from({ length: 9 }).map((_, i) => {
          if (i === repeIndex) {
            return (
              <div key={i} className="relative rounded-[1.5px]">
                <div className={`static-src static-src-${side} absolute inset-0`}>
                  <StickerFace {...source} />
                </div>
              </div>
            );
          }
          if (i === holeIndex) {
            return (
              <div
                key={i}
                className="border-primary/50 relative rounded-[1.5px] border border-dashed shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]"
              >
                <div
                  className={`hole-fill hole-fill-${side} border-primary bg-primary/20 ring-primary/40 absolute inset-0 rounded-[1.5px] border ring-2`}
                />
                <div className={`static-dst static-dst-${side} absolute inset-0`}>
                  <StickerFace code={landed.code} number={landed.number} variant={landed.variant} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="bg-muted rounded-[1.5px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]"
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * RF-821 — Animación decorativa "el intercambio" (relay de 3 segmentos):
 * copia estática en la celda origen (despegue exacto) → voladora a NIVEL ESCENA
 * (hermana de los álbumes, z por encima de ambos → nunca ocluida; interpola la
 * inclinación origen→destino en 3D real bajo la `perspective` de la escena) →
 * copia estática en el hueco destino (aterrizaje exacto). Handoffs con crossfade
 * simultáneo y co-ubicado en ambos bordes. Loop 100% CSS (transform/opacity).
 * `aria-hidden`, pausa offscreen, reduced-motion = estado final.
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
      <div ref={stageRef} className="exchange-scene relative mx-auto w-full max-w-[520px]">
        <MiniAlbum side="a" />
        <MiniAlbum side="b" />

        {/* Sombras de piso de las voladoras: venden la altura del arco (transform/opacity only) */}
        <div className="fly-shadow fly-shadow-a" />
        <div className="fly-shadow fly-shadow-b" />

        {/* Voladoras a nivel escena: por encima de ambos álbumes (nunca ocluidas) */}
        <div className="scene-fly scene-fly-a">
          <StickerFace code="URU" number="9" variant="primary" />
        </div>
        <div className="scene-fly scene-fly-b">
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
