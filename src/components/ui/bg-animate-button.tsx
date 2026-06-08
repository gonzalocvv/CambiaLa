import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * cult-ui `BgAnimateButton` adaptado a CambiaLa: CTA con anillo de gradiente
 * animado. El degradé y el giro viven en `globals.css` (`.cl-cta-ring`) y salen
 * de tokens (celeste = `primary`, naranja = `accent`) — nada de conic-gradients
 * con hex ni `text-white`/`text-black`. Animación composite-only (`transform:
 * rotate`); `prefers-reduced-motion` la frena. Como todos los CTA de la landing
 * navegan, renderiza un `Link` de Next (o un `button` si no hay `href`).
 */
const ctaVariants = cva(
  'cl-cta group shadow-accent/25 focus-visible:ring-ring focus-visible:ring-offset-background relative isolate inline-flex items-center justify-center overflow-hidden rounded-full p-[3px] shadow-lg transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
);

const faceVariants = cva(
  'bg-accent text-accent-foreground relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full font-semibold',
  {
    variants: {
      size: {
        sm: 'px-5 py-2.5 text-sm',
        default: 'px-8 py-4 text-base',
        lg: 'px-10 py-4 text-base',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

export interface BgAnimateButtonProps extends VariantProps<typeof faceVariants> {
  children: React.ReactNode;
  className?: string;
  href?: string;
  'aria-label'?: string;
}

function Ring() {
  return <span className="cl-cta-ring" aria-hidden="true" />;
}

const BgAnimateButton = React.forwardRef<HTMLAnchorElement, BgAnimateButtonProps>(
  ({ children, className, href, size, ...props }, ref) => {
    const face = <span className={cn(faceVariants({ size }))}>{children}</span>;

    if (href) {
      return (
        <Link ref={ref} href={href} className={cn(ctaVariants(), className)} {...props}>
          <Ring />
          {face}
        </Link>
      );
    }
    return (
      <button className={cn(ctaVariants(), className)} {...props}>
        <Ring />
        {face}
      </button>
    );
  },
);
BgAnimateButton.displayName = 'BgAnimateButton';

export { BgAnimateButton };
export default BgAnimateButton;
