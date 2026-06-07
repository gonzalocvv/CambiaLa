// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render-intl';

import { MatchCardMock } from './match-card-mock';

describe('MatchCardMock', () => {
  it('muestra nombre y barrio como campos separados', () => {
    renderWithIntl(<MatchCardMock />);

    expect(screen.getByText('Juan')).toBeTruthy();
    expect(screen.getByText('Pocitos')).toBeTruthy();
  });

  it('muestra intercambio, score y reputación con el wording del MatchCard real', () => {
    renderWithIntl(<MatchCardMock />);

    expect(screen.getByText('te da 5 / le das 3')).toBeTruthy();
    expect(screen.getByText(/Score 3/)).toBeTruthy();
    expect(screen.getByText(/4\.8 ⭐ · 12 cambios/)).toBeTruthy();
  });
});
