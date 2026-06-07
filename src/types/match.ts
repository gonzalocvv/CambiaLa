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

// RF-320: DTO del usuario target para el recompute de matches. `matchRadius` es el
// String crudo del schema (validado en el service antes de castear a MatchRadius).
// `isSuspended` corta el recompute si el target está suspendido (el pool ya los excluye).
// `notifyOnMatch` gobierna si recibe la notificación new_match (preferencia de settings).
export type MatchmakingProfile = {
  id: string;
  city: string | null;
  neighborhood: string | null;
  matchRadius: string;
  offerUniques: boolean;
  participatesInMatchmaking: boolean;
  isSuspended: boolean;
  notifyOnMatch: boolean;
  lastSeenAt: Date;
  stickers: StickerEntry[];
};

// RF-320: DTO de un candidato del pool. No incluye `matchRadius` — el radius lo
// decide el target (RF-302/RF-318); el del candidato no se usa. `notifyOnMatch`
// se usa para gatear la notificación new_match del candidato cuando hay match nuevo.
export type MatchmakingCandidate = {
  id: string;
  city: string | null;
  neighborhood: string | null;
  offerUniques: boolean;
  participatesInMatchmaking: boolean;
  notifyOnMatch: boolean;
  lastSeenAt: Date;
  stickers: StickerEntry[];
};

export type FindMatchesOptions = {
  radius?: MatchRadius; // RF-302: default 'department'
  activeDays?: number; // RF-303: default 30
  now?: Date; // injectable for testing
};
