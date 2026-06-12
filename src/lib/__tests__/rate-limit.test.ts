import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStoreForTests, checkRateLimit, getClientIp } from '../rate-limit';

beforeEach(() => {
  _resetStoreForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('permite N requests dentro de la ventana', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('key', 3, 60_000).allowed).toBe(true);
    }
  });

  it('bloquea el request N+1', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('key', 3, 60_000);
    expect(checkRateLimit('key', 3, 60_000).allowed).toBe(false);
  });

  it('resetea al vencerse la ventana', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('key', 3, 60_000);
    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit('key', 3, 60_000).allowed).toBe(true);
  });

  it('devuelve remaining correcto', () => {
    expect(checkRateLimit('key', 3, 60_000).remaining).toBe(2);
    expect(checkRateLimit('key', 3, 60_000).remaining).toBe(1);
    expect(checkRateLimit('key', 3, 60_000).remaining).toBe(0);
    expect(checkRateLimit('key', 3, 60_000).remaining).toBe(0);
  });

  it('claves distintas son independientes', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', 3, 60_000);
    expect(checkRateLimit('b', 3, 60_000).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('extrae el primer IP del header x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('devuelve "unknown" si no hay header', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
