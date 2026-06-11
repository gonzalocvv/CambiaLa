// Inicialización de Sentry en el navegador (cliente).
// Sin este archivo, los errores del lado del cliente (ej. el botón de
// /sentry-example-page) no se envían a Sentry.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://5447eccdbb786c83623cae9b26a646b8@o4511546557464576.ingest.us.sentry.io/4511546563821568',

  // Performance: bajar en producción para no quemar la cuota. Los errores se
  // capturan siempre al 100%, independientemente de este valor.
  tracesSampleRate: 1,

  // Enviar logs a Sentry
  enableLogs: true,

  // Poné true para ver en consola qué manda Sentry mientras debuggeás el setup.
  debug: false,
});

// Captura los cambios de ruta del App Router para trazas de navegación.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
