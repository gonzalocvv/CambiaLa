import { NextResponse } from 'next/server';

import { CreateRatingSchema } from '@/lib/validations/rating.schema';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  AlreadyRatedError,
  RatingMatchNotFoundError,
  RatingNotCompletedError,
  ratingService,
} from '@/services/rating.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: matchId } = await params;

  try {
    const result = await ratingService.getRatingsForMatch(matchId, session.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RatingMatchNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: matchId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = CreateRatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const rating = await ratingService.createRating(
      matchId,
      session.userId,
      parsed.data.stars,
      parsed.data.comment,
    );
    return NextResponse.json({ rating }, { status: 201 });
  } catch (err) {
    if (err instanceof RatingMatchNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (err instanceof RatingNotCompletedError) {
      return NextResponse.json({ error: 'Match not completed' }, { status: 409 });
    }
    if (err instanceof AlreadyRatedError) {
      return NextResponse.json({ error: 'Already rated' }, { status: 409 });
    }
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
