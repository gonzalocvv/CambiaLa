import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ storage: { from: mockFrom } }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { BANNER_MAX_BYTES } from '@/lib/validations/activity.schema';

import { BannerValidationError, uploadActivityBanner } from '../activity-banner';

// File falso para no materializar buffers grandes en el test.
function makeFile(type: string, size: number): File {
  return {
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as File;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/x.png' } });
});

describe('uploadActivityBanner', () => {
  it('rejects a disallowed MIME type before touching storage', async () => {
    await expect(uploadActivityBanner(makeFile('image/gif', 1000))).rejects.toBeInstanceOf(
      BannerValidationError,
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects a file over the size cap before touching storage', async () => {
    await expect(
      uploadActivityBanner(makeFile('image/png', BANNER_MAX_BYTES + 1)),
    ).rejects.toBeInstanceOf(BannerValidationError);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads a valid file and returns the public URL', async () => {
    const url = await uploadActivityBanner(makeFile('image/png', 1000));
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(url).toBe('https://cdn/x.png');
  });

  it('returns null (does not throw) when storage upload fails', async () => {
    mockUpload.mockResolvedValue({ error: new Error('bucket not found') });
    const url = await uploadActivityBanner(makeFile('image/webp', 1000));
    expect(url).toBeNull();
  });
});
