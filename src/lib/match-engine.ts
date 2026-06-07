// RF-301 Match Engine — pure functions, zero side effects.
// RF-306: no rarity weighting; rarity is visual-only.
// RF-305: offerUniques=false (default) → only stickers with count >= 2 are offered.
// RF-302/303/304: filtering helpers for location, activity, participation.

import type {
  FindMatchesOptions,
  MatchRadius,
  MatchResult,
  UserCollectionInput,
} from '@/types/match';

// Exported as the single source of truth for the activity window (RF-303): the
// service imports it so the SQL cutoff and the engine filter never drift apart.
export const ACTIVE_DAYS_DEFAULT = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Returns the set of sticker numbers a user can offer for trading.
// offerUniques=false → minCount=2 (must have a spare beyond their own copy)
// offerUniques=true  → minCount=1 (willing to give away their only copy)
function getAvailableNumbers(
  stickers: UserCollectionInput['stickers'],
  offerUniques: boolean,
): Set<string> {
  const minCount = offerUniques ? 1 : 2;
  return new Set(stickers.filter((s) => s.count >= minCount).map((s) => s.number));
}

// RF-301: Compute a potential match between two users.
// A sticker is "needed" by a user if their count for it is 0 (or absent from list).
// Returns null when one side has nothing to offer the other.
export function computeMatch(
  userA: UserCollectionInput,
  userB: UserCollectionInput,
): MatchResult | null {
  const aAvailable = getAvailableNumbers(userA.stickers, userA.offerUniques);
  const bAvailable = getAvailableNumbers(userB.stickers, userB.offerUniques);

  // Build count maps so absent stickers default to 0 (missing)
  const aCountMap = new Map(userA.stickers.map((s) => [s.number, s.count]));
  const bCountMap = new Map(userB.stickers.map((s) => [s.number, s.count]));

  const aToB = [...aAvailable].filter((num) => (bCountMap.get(num) ?? 0) === 0);
  const bToA = [...bAvailable].filter((num) => (aCountMap.get(num) ?? 0) === 0);

  if (aToB.length === 0 || bToA.length === 0) return null;

  return {
    userAId: userA.userId,
    userBId: userB.userId,
    aToB,
    bToA,
    score: Math.min(aToB.length, bToA.length),
  };
}

// RF-303: Returns true if the user has been seen within activeDays.
export function isActiveUser(
  user: Pick<UserCollectionInput, 'lastSeenAt'>,
  opts: { activeDays?: number; now?: Date } = {},
): boolean {
  const { activeDays = ACTIVE_DAYS_DEFAULT, now = new Date() } = opts;
  const cutoff = new Date(now.getTime() - activeDays * MS_PER_DAY);
  return user.lastSeenAt > cutoff;
}

// RF-302: Returns true if both users are within the given radius.
// 'department' maps to city-level (city = department in Uruguay).
// 'neighborhood' requires matching city AND neighborhood.
// 'country' always matches.
export function isSameLocation(
  userA: Pick<UserCollectionInput, 'city' | 'neighborhood'>,
  userB: Pick<UserCollectionInput, 'city' | 'neighborhood'>,
  radius: MatchRadius,
): boolean {
  if (radius === 'country') return true;
  if (!userA.city || !userB.city) return false;
  if (userA.city !== userB.city) return false;
  if (radius === 'department') return true;
  // radius === 'neighborhood'
  if (!userA.neighborhood || !userB.neighborhood) return false;
  return userA.neighborhood === userB.neighborhood;
}

// RF-301 + RF-302 + RF-303 + RF-304:
// Find all valid matches for a target user against a pool of candidates.
// The pool must NOT include the target user.
// Returns results sorted by score descending.
export function findMatchesForUser(
  target: UserCollectionInput,
  pool: UserCollectionInput[],
  options: FindMatchesOptions = {},
): MatchResult[] {
  const { radius = 'department', activeDays = ACTIVE_DAYS_DEFAULT, now = new Date() } = options;

  const results: MatchResult[] = [];

  for (const candidate of pool) {
    if (!candidate.participatesInMatchmaking) continue; // RF-304
    if (!isActiveUser(candidate, { activeDays, now })) continue; // RF-303
    if (!isSameLocation(target, candidate, radius)) continue; // RF-302

    const match = computeMatch(target, candidate);
    if (match) results.push(match);
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}
