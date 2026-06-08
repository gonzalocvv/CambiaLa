import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * cult-ui `GradientHeading` adaptado a CambiaLa.
 * Los gradientes salen SOLO de tokens (celeste = `primary`, naranja = `accent`),
 * nunca de colores crudos (`neutral`/`stone`/hex). `bg-clip-text` + `text-transparent`
 * → el texto toma el degradé. `pb-[0.12em] -mb-[0.12em]` evita que el clip corte
 * los descendentes (la "g" de "figuritas").
 */
const headingVariants = cva(
  'bg-clip-text pb-[0.12em] -mb-[0.12em] tracking-tight text-transparent',
  {
    variants: {
      variant: {
        // Identidad CambiaLa: celeste → naranja para resaltar una frase del copy.
        // Termina en `accent-text` (naranja más profundo en light) para legibilidad AA.
        brand: 'bg-gradient-to-r from-primary via-primary to-accent-text',
        default: 'bg-gradient-to-b from-foreground to-foreground/70',
        primary: 'bg-gradient-to-b from-primary to-primary/80',
        accent: 'bg-gradient-to-b from-accent to-accent/80',
      },
      size: {
        // `inherit` → toma el tamaño/tracking del elemento contenedor (uso inline en un H1).
        inherit: '',
        default: 'text-2xl sm:text-3xl lg:text-4xl',
        sm: 'text-xl sm:text-2xl lg:text-3xl',
        md: 'text-2xl sm:text-3xl lg:text-4xl',
        lg: 'text-3xl sm:text-4xl lg:text-5xl',
        xl: 'text-4xl sm:text-5xl lg:text-6xl',
      },
      weight: {
        inherit: '',
        base: 'font-normal',
        semi: 'font-semibold',
        bold: 'font-bold',
        extra: 'font-extrabold',
        black: 'font-black',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      weight: 'bold',
    },
  },
);

export interface GradientHeadingProps extends VariantProps<typeof headingVariants> {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

const GradientHeading = React.forwardRef<HTMLHeadingElement, GradientHeadingProps>(
  ({ asChild, variant, weight, size, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'h3';
    return (
      <Comp
        ref={ref}
        className={cn(headingVariants({ variant, size, weight }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
GradientHeading.displayName = 'GradientHeading';

export { GradientHeading, headingVariants };
