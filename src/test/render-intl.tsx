import type { ReactElement } from 'react';

import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import messages from '../../messages/es.json';

/**
 * Renderiza un componente client envuelto en el provider de next-intl con los
 * mensajes reales de `es.json`, para que `useTranslations` resuelva igual que en prod.
 */
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
