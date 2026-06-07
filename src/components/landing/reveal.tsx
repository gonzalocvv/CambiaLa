'use client';

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

const subscribe = () => () => {};

/** `false` en SSR y en el primer render del cliente, `true` tras hidratar. */
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Revela su contenido con un fade-up al entrar al viewport (una sola vez), con
 * CSS (transform/opacity) + IntersectionObserver — sin librería de animación.
 * El estado oculto (`.cl-reveal`) solo se aplica DESPUÉS de hidratar: en SSR y
 * sin JS el contenido se ve igual (no queda invisible) y no hay mismatch.
 * `prefers-reduced-motion` lo neutraliza por CSS.
 */
export function Reveal({ children, className }: Props) {
  const hydrated = useHydrated();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = [hydrated && 'cl-reveal', shown && 'cl-reveal-in', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={cls || undefined}>
      {children}
    </div>
  );
}
