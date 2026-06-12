import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Dominio de Supabase (auth, storage de avatares y realtime).
const SUPABASE_ORIGIN = 'https://rsemxzcibxatwqwdzlis.supabase.co';
const SUPABASE_WS = 'wss://rsemxzcibxatwqwdzlis.supabase.co';

// Content-Security-Policy.
// 'unsafe-inline'/'unsafe-eval' en script-src son necesarios para los scripts
// inline que inyecta Next.js. Es permisivo pero estándar; si querés endurecerlo
// más adelante, se migra a nonces. Si algo se rompe, pasá el header a
// 'Content-Security-Policy-Report-Only' para diagnosticar sin bloquear.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  `font-src 'self' data:`,
  // Sentry crea un web worker desde un blob para procesar los eventos.
  `worker-src 'self' blob:`,
  // connect-src: Supabase (datos/realtime) + Sentry (envío de errores).
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS} https://*.sentry.io https://*.ingest.us.sentry.io`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplica a todas las rutas.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'ort-q3',

  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
