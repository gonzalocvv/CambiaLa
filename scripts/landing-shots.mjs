// Capturas de la landing para el loop visual: 390/1440 × light/dark.
// Standalone (NO test) → no lo agarra el glob de vitest. Requiere `npx playwright install chromium`.
// Uso: SHOT_URL=http://localhost:3000 node scripts/landing-shots.mjs
import { mkdir } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const BASE = process.env.SHOT_URL ?? 'http://localhost:3000';
const OUT = '.shots';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];
const schemes = ['light', 'dark'];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// Estado final determinístico (reduced-motion): la composición "en reposo".
for (const vp of viewports) {
  for (const scheme of schemes) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: scheme,
      reducedMotion: 'reduce',
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${vp.name}-${scheme}-hero.png` });
    await page.screenshot({ path: `${OUT}/${vp.name}-${scheme}-full.png`, fullPage: true });
    await ctx.close();
    console.info(`shot: ${vp.name}-${scheme} (reduced)`);
  }
}

// Frames del loop en movimiento (390 Y 1440) para revisar despegue/cruce/aterrizaje.
for (const vp of viewports) {
  for (const t of [600, 1920, 2280, 4200, 6800]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(t);
    await page.screenshot({ path: `${OUT}/${vp.name}-motion-${t}ms.png` });
    await ctx.close();
    console.info(`shot: ${vp.name}-motion-${t}ms`);
  }
}

await browser.close();
console.info('listo →', OUT);
