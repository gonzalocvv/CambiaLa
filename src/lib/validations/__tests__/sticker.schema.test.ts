import { describe, expect, it } from 'vitest';

import { BulkUpdateStickersSchema } from '../sticker.schema';

function change(overrides: Partial<{ stickerId: string; count: number }> = {}) {
  return { stickerId: 's1', count: 1, ...overrides };
}

describe('BulkUpdateStickersSchema', () => {
  it('accepts a single change', () => {
    const result = BulkUpdateStickersSchema.safeParse({ changes: [change()] });
    expect(result.success).toBe(true);
  });

  it('accepts the max of 200 changes', () => {
    const changes = Array.from({ length: 200 }, (_, i) => change({ stickerId: `s${i}` }));
    const result = BulkUpdateStickersSchema.safeParse({ changes });
    expect(result.success).toBe(true);
  });

  it('accepts count 0 (missing) and 99 (cap)', () => {
    const result = BulkUpdateStickersSchema.safeParse({
      changes: [change({ count: 0 }), change({ stickerId: 's2', count: 99 })],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty changes array', () => {
    expect(BulkUpdateStickersSchema.safeParse({ changes: [] }).success).toBe(false);
  });

  it('rejects more than 200 changes', () => {
    const changes = Array.from({ length: 201 }, (_, i) => change({ stickerId: `s${i}` }));
    expect(BulkUpdateStickersSchema.safeParse({ changes }).success).toBe(false);
  });

  it('rejects count above 99', () => {
    expect(BulkUpdateStickersSchema.safeParse({ changes: [change({ count: 100 })] }).success).toBe(
      false,
    );
  });

  it('rejects negative count', () => {
    expect(BulkUpdateStickersSchema.safeParse({ changes: [change({ count: -1 })] }).success).toBe(
      false,
    );
  });

  it('rejects non-integer count', () => {
    expect(BulkUpdateStickersSchema.safeParse({ changes: [change({ count: 2.5 })] }).success).toBe(
      false,
    );
  });

  it('rejects a non-number count', () => {
    expect(
      BulkUpdateStickersSchema.safeParse({ changes: [{ stickerId: 's1', count: '1' }] }).success,
    ).toBe(false);
  });

  it('rejects an empty stickerId', () => {
    expect(
      BulkUpdateStickersSchema.safeParse({ changes: [change({ stickerId: '' })] }).success,
    ).toBe(false);
  });

  it('rejects a non-string stickerId', () => {
    expect(
      BulkUpdateStickersSchema.safeParse({ changes: [{ stickerId: 123, count: 1 }] }).success,
    ).toBe(false);
  });

  it('rejects a missing changes key', () => {
    expect(BulkUpdateStickersSchema.safeParse({}).success).toBe(false);
  });
});
