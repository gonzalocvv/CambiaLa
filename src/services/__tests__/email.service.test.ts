import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.hoisted(() => vi.fn());
const ResendCtor = vi.hoisted(() =>
  vi.fn(function MockResend() {
    return { emails: { send: mockSend } };
  }),
);
const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('resend', () => ({ Resend: ResendCtor }));
vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import { emailService } from '../email.service';

const INPUT = { to: 'a@b.com', subject: 'Sub', html: '<p>hi</p>', text: 'hi' };
const ORIGINAL_KEY = process.env.RESEND_API_KEY;
const ORIGINAL_FROM = process.env.RESEND_FROM_EMAIL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 're_test';
  process.env.RESEND_FROM_EMAIL = 'consultas@cambiala.uy';
  mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
});

afterEach(() => {
  process.env.RESEND_API_KEY = ORIGINAL_KEY;
  process.env.RESEND_FROM_EMAIL = ORIGINAL_FROM;
});

describe('emailService.sendEmail', () => {
  it('sends via Resend with the branded from address and all fields', async () => {
    await emailService.sendEmail(INPUT);

    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith({
      from: 'CambiaLa <consultas@cambiala.uy>',
      to: 'a@b.com',
      subject: 'Sub',
      html: '<p>hi</p>',
      text: 'hi',
    });
  });

  it('is a no-op (warns, never constructs Resend) when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;

    await emailService.sendEmail(INPUT);

    expect(ResendCtor).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith('email skipped: RESEND_API_KEY not set');
  });

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });

    await expect(emailService.sendEmail(INPUT)).rejects.toThrow('domain not verified');
  });

  it('throws when the send exceeds the timeout', async () => {
    vi.useFakeTimers();
    mockSend.mockReturnValue(new Promise(() => {})); // never resolves

    const promise = emailService.sendEmail(INPUT);
    const assertion = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(4001);
    await assertion;

    vi.useRealTimers();
  });
});
