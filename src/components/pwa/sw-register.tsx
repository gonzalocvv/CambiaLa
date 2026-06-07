'use client';

import { useEffect } from 'react';

export function SwRegister() {
  useEffect(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Fallo de registro del SW — no bloquea la app
      });
    }
  }, []);

  return null;
}
