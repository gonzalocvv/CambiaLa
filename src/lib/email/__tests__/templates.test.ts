import { describe, expect, it } from 'vitest';

import { buildNotificationEmail, escapeHtml } from '../templates';

const base = {
  recipientName: 'Gonza',
  payload: {},
  ctaUrl: 'https://cambia-la.vercel.app/matches/m1',
  unsubscribeUrl: 'https://cambia-la.vercel.app/api/unsubscribe?token=t1',
};

describe('escapeHtml', () => {
  it('escapes the dangerous HTML characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;',
    );
  });
});

describe('buildNotificationEmail', () => {
  it('returns null for non-emailable types', () => {
    expect(buildNotificationEmail('trade_completed', base)).toBeNull();
    expect(buildNotificationEmail('whatever', base)).toBeNull();
  });

  for (const type of ['new_match', 'new_message', 'rating_received'] as const) {
    it(`builds subject + html + text for ${type}`, () => {
      const email = buildNotificationEmail(type, base);
      expect(email).not.toBeNull();
      expect(email!.subject.length).toBeGreaterThan(0);
      // brand wordmark + lang + CTA + unsubscribe link present in HTML
      expect(email!.html).toContain('<html lang="es">');
      expect(email!.html).toContain('>Cambia</span>');
      expect(email!.html).toContain(base.ctaUrl);
      expect(email!.html).toContain(base.unsubscribeUrl);
      expect(email!.html).toContain('Darme de baja');
      // plain-text alternative carries the CTA + unsubscribe URLs
      expect(email!.text).toContain(base.ctaUrl);
      expect(email!.text).toContain(base.unsubscribeUrl);
      // subjects are plain UTF-8, never HTML entities
      expect(email!.subject).not.toContain('&');
    });
  }

  it('escapes a malicious recipient name in the HTML (no injection)', () => {
    const email = buildNotificationEmail('new_match', {
      ...base,
      recipientName: '<script>alert(1)</script>',
    });
    expect(email!.html).not.toContain('<script>alert(1)</script>');
    expect(email!.html).toContain('&lt;script&gt;');
  });

  it('falls back to a nameless greeting when recipientName is null/blank', () => {
    const email = buildNotificationEmail('new_match', { ...base, recipientName: null });
    expect(email!.html).toContain('Hola, ');
    expect(email!.html).not.toContain('Hola null');
  });

  it('renders the star count for rating_received', () => {
    const one = buildNotificationEmail('rating_received', { ...base, payload: { stars: 1 } });
    expect(one!.text).toContain('1 estrella');
    const five = buildNotificationEmail('rating_received', { ...base, payload: { stars: 5 } });
    expect(five!.text).toContain('5 estrellas');
    const none = buildNotificationEmail('rating_received', { ...base, payload: {} });
    expect(none!.text).toContain('una reseña');
  });
});
