import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StickerWithCount } from '@/lib/validations/sticker.schema';
import { renderWithIntl } from '@/test/render-intl';

import { StickerCell } from '../sticker-cell';

const base: StickerWithCount = {
  id: 'id1',
  number: 'URU1',
  name: 'Valverde',
  team: 'URU',
  rarity: 'comun',
  isSpecial: false,
  count: 0,
};

describe('StickerCell', () => {
  it('muestra el número de la figurita', () => {
    renderWithIntl(<StickerCell sticker={base} count={0} onUpdate={vi.fn()} />);
    expect(screen.getByText('URU1')).toBeInTheDocument();
  });

  it('usa el prop count (no sticker.count) para aria-label y lógica de click', () => {
    const onUpdate = vi.fn();
    // sticker.count=0 pero count prop=3 → el aria-label y el click deben usar 3
    renderWithIntl(<StickerCell sticker={base} count={3} onUpdate={onUpdate} />);
    expect(screen.getByRole('button', { name: /cantidad: 3/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('id1', 4);
  });

  it('llama onUpdate con count+1 al hacer click', () => {
    const onUpdate = vi.fn();
    renderWithIntl(<StickerCell sticker={base} count={2} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('id1', 3);
  });

  it('cicla de 99 a 0 al hacer click', () => {
    const onUpdate = vi.fn();
    renderWithIntl(<StickerCell sticker={base} count={99} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('id1', 0);
  });

  it('decrementa en click derecho (context menu)', () => {
    const onUpdate = vi.fn();
    renderWithIntl(<StickerCell sticker={base} count={2} onUpdate={onUpdate} />);
    fireEvent.contextMenu(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('id1', 1);
  });

  it('no decrementa por debajo de 0 en click derecho', () => {
    const onUpdate = vi.fn();
    renderWithIntl(<StickerCell sticker={base} count={0} onUpdate={onUpdate} />);
    fireEvent.contextMenu(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalledWith('id1', 0);
  });
});
