import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { SendMessageSchema } from '@/lib/validations/message.schema';
import { MatchNotFoundError, MessageAccessError, messageService } from '@/services/message.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: matchId } = await params;

  try {
    const messages = await messageService.getMessages(matchId, session.userId);
    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof MatchNotFoundError || err instanceof MessageAccessError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Anti-spam: 60 mensajes por minuto por usuario
  const rl = checkRateLimit(`msg:${session.userId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id: matchId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const message = await messageService.sendMessage(matchId, session.userId, parsed.data.body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    if (err instanceof MatchNotFoundError || err instanceof MessageAccessError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw err;
  }
}
