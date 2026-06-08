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

/**
 * Figurita estilizada (retrato 3:4): código de equipo + número dorsal, con un
 * sheen diagonal sutil para textura de "carta de colección". Sobria, sin íconos.
 * `repe` muestra el badge naranja "2" (figurita repetida que sale al cambio).
 */
function StickerFace({
  code,
  number,
  variant,
  repe = false,
}: {
  code: string;
  number: string;
  variant: Variant;
  repe?: boolean;
}) {
  const f = FACE[variant];
  return (
    <div
      className={`cl-figu bg-card relative flex h-full w-full flex-col overflow-hidden rounded-[5px] border ${f.border}`}
    >
      <span className="cl-figu-sheen" aria-hidden="true" />
      <div
        className={`flex items-center justify-center py-0.5 text-[8px] font-bold tracking-[0.18em] ${f.band}`}
      >
        {code}
      </div>
      <div
        className={`flex flex-1 items-center justify-center font-mono text-2xl font-extrabold ${f.num}`}
      >
        {number}
      </div>
      {repe ? (
        <span className="cl-figu-repe bg-accent text-accent-foreground" aria-hidden="true">
          2
        </span>
      ) : null}
    </div>
  );
}

/**
 * Mini-álbum tilteado en 3D con grilla 3×3. Dos copias ESTÁTICAS ancladas
 * (encaje exacto a cualquier viewport, rotadas con el álbum):
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
    <div className={`album album-${side} bg-card border-border border shadow-md`}>
      <span className="cl-album-spine" aria-hidden="true" />
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 p-2">
        {Array.from({ length: 9 }).map((_, i) => {
          if (i === repeIndex) {
            return (
              <div key={i} className="relative rounded-[4px]">
                <div className={`static-src static-src-${side} absolute inset-0`}>
                  <StickerFace {...source} repe />
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
                <div
                  className={`hole-fill hole-fill-${side} border-primary bg-primary/20 ring-primary/40 absolute inset-0 rounded-[4px] border ring-2`}
                />
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
 * RF-821 — Animación decorativa "el intercambio" (relay de 3 segmentos):
 * copia estática en la celda origen (despegue exacto) → voladora a NIVEL ESCENA
 * (hermana de los álbumes, z por encima de ambos → nunca ocluida; interpola la
 * inclinación origen→destino en 3D real bajo la `perspective` de la escena) →
 * copia estática en el hueco destino (aterrizaje exacto). El loop es 100% CSS
 * (transform/opacity). Debajo, la match card (el desenlace) se arma una sola vez
 * con stagger (framer-motion). `aria-hidden`, pausa offscreen, reduced-motion =
 * estado final estático.
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
    <div aria-hidden="true" className="cl-hero-visual pointer-events-none w-full select-none">
      <div
        ref={stageRef}
        className="exchange-scene relative mx-auto h-[330px] w-full max-w-[520px] sm:h-[380px]"
      >
        <div className="cl-floor" aria-hidden="true" />

        <MiniAlbum side="a" />
        <MiniAlbum side="b" />

        {/* Voladoras a nivel escena: por encima de ambos álbumes (nunca ocluidas) */}
        <div className="scene-fly scene-fly-a">
          <StickerFace code="URU" number="9" variant="primary" repe />
        </div>
        <div className="scene-fly scene-fly-b">
          <StickerFace code="BRA" number="7" variant="accent" repe />
        </div>

        <div className="match-badge bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-bold shadow-lg">
          {t('matchBadge')}
        </div>
      </div>

      {/* Desenlace: la match card, armada con stagger (una vez al entrar al viewport) */}
      <div className="relative z-10 mx-auto -mt-2 flex w-full max-w-[300px] justify-center">
        <MatchCardMock />
      </div>
    </div>
  );
}
