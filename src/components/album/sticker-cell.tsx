'use client';

import { memo, useCallback } from 'react';

import type { StickerWithCount } from '@/lib/validations/sticker.schema';

type Props = {
  sticker: StickerWithCount;
  count: number;
  onUpdate: (stickerId: string, count: number) => void;
};

export const StickerCell = memo(function StickerCell({ sticker, count, onUpdate }: Props) {
  const { id, number, name, isSpecial } = sticker;
  // Para los especiales el nombre trae " — País"; en la celda mostramos solo
  // la parte de la persona/figurita para que entre.
  const shortName = name?.split(' — ')[0];

  const handleClick = useCallback(() => {
    onUpdate(id, count >= 99 ? 0 : count + 1);
  }, [id, count, onUpdate]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onUpdate(id, count === 0 ? 0 : count - 1);
    },
    [id, count, onUpdate],
  );

  const colorClass =
    count === 0
      ? 'bg-muted text-muted-foreground border-border'
      : count === 1
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-accent/10 text-accent-text border-accent/30';

  const specialRing = isSpecial ? 'ring-2 ring-special' : '';

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`relative flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors select-none sm:h-16 sm:w-16 ${colorClass} ${specialRing}`}
      title={name ?? number}
      aria-label={`${number}${name ? ` — ${name}` : ''}, cantidad: ${count}`}
    >
      <span className="font-mono text-[10px] leading-tight font-semibold">{number}</span>
      {shortName && (
        <span className="mt-0.5 line-clamp-2 w-full px-0.5 text-center text-[8px] leading-[1.05] opacity-70">
          {shortName}
        </span>
      )}
      {count > 0 && (
        <span className="bg-accent text-accent-foreground absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
});
