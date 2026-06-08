'use client';

import { type FC } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

/**
 * cult-ui `TextAnimate` adaptado a CambiaLa.
 * Reveal palabra por palabra al entrar al viewport (`whileInView`, una sola vez),
 * SOLO con `opacity` + `transform: translateY` (composite, sin blur ni layout).
 * `prefers-reduced-motion` → texto plano sin animación. Sin colores: el color y
 * el tamaño los pone el contenedor (se usa dentro de un H2/H1 ya tipado).
 */
type AnimationType = 'fadeIn' | 'fadeInUp' | 'calmInUp';

interface Props {
  text: string;
  type?: AnimationType;
  className?: string;
  /** Stagger por palabra, en segundos. */
  stagger?: number;
  /** Delay inicial antes de la primera palabra, en segundos. */
  delay?: number;
}

const CHILD: Record<AnimationType, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  },
  calmInUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.125, 0.92, 0.69, 0.975] } },
  },
};

const TextAnimate: FC<Props> = ({
  text,
  type = 'fadeInUp',
  className,
  stagger = 0.06,
  delay = 0,
}) => {
  const reduced = useReducedMotion();
  const words = text.split(' ');

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  const child = CHILD[type];

  return (
    <motion.span
      className={className}
      style={{ display: 'inline-block' }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} className="inline-block whitespace-pre" variants={child}>
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
};

export { TextAnimate };
export default TextAnimate;
