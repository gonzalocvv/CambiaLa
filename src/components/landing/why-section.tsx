'use client';

import { Gift, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * RF-822 — "¿Por qué CambiaLa?": tres diferenciales en cards.
 * Mismo patrón visual que las demás secciones de la landing (rounded-2xl + tokens).
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

        <div className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {cards.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="border-border bg-card hover:border-primary/40 rounded-2xl border p-8 transition-all"
            >
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-foreground mt-5 text-xl font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
