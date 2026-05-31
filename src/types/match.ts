// Domain types for the match engine — pure, no Prisma deps.
// Used by match-engine.ts, match.service.ts, match.repository.ts.

export type StickerEntry = {
  number: string; // e.g. "URU9", "FWC1"
  count: number; // 0 = missing, 1 = have one, 2+ = duplicates
};

export type UserCollectionInput = {
  userId: string;
  stickers: StickerEntry[];
  offerUniques: boolean; // RF-305: if false, only offer count >= 2 stickers
  city: string | null;
  neighborhood: string | null;
  lastSeenAt: Date;
  participatesInMatchmaking: boolean;
};

export type MatchResult = {
  userAId: string;
  userBId: string;
  aToB: string[]; // sticker numbers A gives to B
  bToA: string[]; // sticker numbers B gives to A
  score: number; // min(|aToB|, |bToA|)
};

export type MatchRadius = 'neighborhood' | 'department' | 'country';

export type FindMatchesOptions = {
  radius?: MatchRadius; // RF-302: default 'department'
  activeDays?: number; // RF-303: default 30
  now?: Date; // injectable for testing
};
