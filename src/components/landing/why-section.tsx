'use client';

import { Gift, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardTitle,
} from '@/components/ui/minimal-card';

import { RevealGroup, RevealItem } from './reveal';

/**
 * RF-822 — "¿Por qué CambiaLa?": tres diferenciales en `MinimalCard` (cult-ui).
 * Las cards entran con stagger al viewport (framer-motion, una vez).
 */
export function WhySection() {
  const t = useTranslations('Home.why');

  const cards = [
    { Icon: MapPin, title: t('card1Title'), desc: t('card1Desc') },
    { Icon: ShieldCheck, title: t('card2Title'), desc: t('card2Desc') },
    { Icon: Gift, title: t('card3Title'), desc: t('card3Desc') },
  ];

  return (
    <section className="border-border bg-muted/30 border-y px-6 py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            {t('eyebrow')}
          </p>
          <h2 className="text-foreground mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            {t('title')}
          </h2>
        </div>

        <RevealGroup className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {cards.map(({ Icon, title, desc }) => (
            <RevealItem key={title}>
              <MinimalCard className="hover:border-primary/40 h-full p-6 transition-colors">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <MinimalCardTitle className="mt-5 text-xl">{title}</MinimalCardTitle>
                <MinimalCardDescription className="mt-3 text-base leading-relaxed">
                  {desc}
                </MinimalCardDescription>
              </MinimalCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
