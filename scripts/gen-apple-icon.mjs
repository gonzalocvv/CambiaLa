// Genera src/app/apple-icon.png (180×180) a partir de src/app/icon.svg, sobre un
// fondo navy full-bleed (iOS aplica su propia máscara redondeada al icono).
// Requiere `npx playwright install chromium`. Uso: node scripts/gen-apple-icon.mjs
import { readFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

const svg = readFileSync('src/app/icon.svg', 'utf8')
  .replace('width="32"', 'width="180"')
  .replace('height="32"', 'height="180"');

const html = `<body style="margin:0;width:180px;height:180px;background:#1e3a8a">${svg}</body>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 180, height: 180 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(html);
await page.waitForTimeout(150);
await page.screenshot({ path: 'src/app/apple-icon.png' });
await browser.close();
console.info('apple-icon.png generado (180×180)');
