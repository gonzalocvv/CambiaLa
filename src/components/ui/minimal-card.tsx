import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * cult-ui `MinimalCard` adaptado a CambiaLa: superficie `bg-card` con borde por
 * token y sombra suave (sin `neutral-*` ni rgba/#fff crudos). Se eliminó
 * `MinimalCardImage` (la landing no usa imágenes — LCP intacto, RF-821).
 */
const MinimalCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-border bg-card rounded-3xl border p-2 shadow-sm transition-colors',
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
MinimalCard.displayName = 'MinimalCard';

const MinimalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-foreground mt-2 px-1 text-lg leading-tight font-semibold', className)}
    {...props}
  />
));
MinimalCardTitle.displayName = 'MinimalCardTitle';

const MinimalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-muted-foreground px-1 pb-2 text-sm', className)} {...props} />
));
MinimalCardDescription.displayName = 'MinimalCardDescription';

const MinimalCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
MinimalCardContent.displayName = 'MinimalCardContent';

const MinimalCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
MinimalCardFooter.displayName = 'MinimalCardFooter';

export {
  MinimalCard,
  MinimalCardTitle,
  MinimalCardDescription,
  MinimalCardContent,
  MinimalCardFooter,
};

export default MinimalCard;
