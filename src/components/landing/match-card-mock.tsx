'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Datos de ejemplo del mock (no son copy traducible: los textos van por i18n).
// score = min(youGet, youGive), igual que el match engine real.
const MOCK = {
  score: 3,
  youGet: 5,
  youGive: 3,
  rating: 4.8,
  trades: 12,
} as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

// Composite-only: opacity + translateY. El "armado" entra de a campos.
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const avatarItem: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } },
};

/**
 * Réplica estática del `MatchCard` real para el hero de la landing.
 * Misma jerarquía de campos SEPARADOS (avatar / nombre / barrio / score /
 * intercambio / reputación) para que landing y app se vean 1:1.
 * El "armado" entra con stagger por campo (framer-motion, `whileInView` una vez,
 * SOLO opacity/transform). `prefers-reduced-motion` → render estático.
 */
export function MatchCardMock() {
  const t = useTranslations('MatchCard');
  const tm = useTranslations('Home.hero.matchMock');
  const reduced = useReducedMotion();

  const name = tm('name');
  const neighborhood = tm('neighborhood');
  const initials = name.slice(0, 2).toUpperCase();

  // La card vive en el hero (above-the-fold en desktop). El "armado" entra al
  // montar para que se vea siempre, también en mobile. reduced-motion → estático.
  const groupProps = reduced
    ? ({ initial: 'visible' } as const)
    : ({ initial: 'hidden', animate: 'visible' } as const);

  return (
    <Card className="w-full max-w-xs shadow-lg">
      <CardContent className="p-4">
        <motion.div className="flex items-center gap-4" variants={container} {...groupProps}>
          <motion.div
            variants={avatarItem}
            className="bg-primary text-primary-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
          >
            {initials}
          </motion.div>

          <div className="min-w-0 flex-1">
            <motion.div variants={item} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-foreground truncate font-semibold">{name}</p>
                <p className="text-muted-foreground truncate text-sm">{neighborhood}</p>
              </div>
              <Badge variant="accent" className="shrink-0 tabular-nums">
                {t('scoreLabel')} {MOCK.score}
              </Badge>
            </motion.div>

            <motion.p variants={item} className="text-muted-foreground mt-2 text-sm">
              {t('stickersExchange', { youGet: MOCK.youGet, youGive: MOCK.youGive })}
            </motion.p>

            <motion.p variants={item} className="text-muted-foreground mt-1 text-xs">
              {`${MOCK.rating.toFixed(1)} ⭐ · ${t('trades', { count: MOCK.trades })}`}
            </motion.p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
