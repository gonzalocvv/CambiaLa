// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render-intl';

import { WhySection } from './why-section';

describe('WhySection', () => {
  it('muestra los 3 diferenciales', () => {
    renderWithIntl(<WhySection />);

    expect(screen.getByText('Match automático por barrio')).toBeTruthy();
    expect(screen.getByText('Reputación real')).toBeTruthy();
    expect(screen.getByText('Gratis y sin publicidad')).toBeTruthy();
  });
});
