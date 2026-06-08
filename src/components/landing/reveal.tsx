'use client';

import { type ReactNode, useSyncExternalStore } from 'react';

import { motion, useReducedMotion, type Variants } from 'motion/react';

const subscribe = () => () => {};

/** `false` en SSR y en el primer render del cliente, `true` tras hidratar. */
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const groupContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const groupItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

type Props = { children: ReactNode; className?: string };

/**
 * Reveal al entrar al viewport (una sola vez) con framer-motion — SOLO
 * opacity/transform (composite). Antes de hidratar (y sin JS) el contenido se
 * renderiza visible, así nunca queda invisible. `prefers-reduced-motion` lo
 * neutraliza. Reemplaza al reveal por CSS+IntersectionObserver anterior.
 */
export function Reveal({ children, className }: Props) {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();

  if (!hydrated || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** Contenedor que escalona el reveal de sus `RevealItem` hijos. */
export function RevealGroup({ children, className }: Props) {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();

  if (!hydrated || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={groupContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** Ítem hijo de `RevealGroup` (cada card aparece con stagger). */
export function RevealItem({ children, className }: Props) {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();

  if (!hydrated || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={groupItem}>
      {children}
    </motion.div>
  );
}
