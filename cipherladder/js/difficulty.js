/**
 * Rung → difficulty. Ladder starts wide/easy and narrows as you climb.
 * Rung is 1-based.
 */

export const PROFILES = {
  easy: {
    id: "easy",
    label: "Easy",
    clueCount: 5,
    minPins: 2,
    maxPins: 3,
    freeReveals: 1,
    maxAttempts: 4,
    weight: {
      at: 10,
      immediate_left: 9,
      adjacent: 8,
      ends: 6,
      left_of: 3,
      right_of: 3,
      between: 2,
      not_at: 0,
      not_adjacent: 0,
      not_ends: 0,
    },
    banned: ["not_at", "not_adjacent", "not_ends"],
  },
  medium: {
    id: "medium",
    label: "Medium",
    clueCount: 5,
    minPins: 1,
    maxPins: 1,
    freeReveals: 0,
    maxAttempts: 3,
    weight: {
      at: 6,
      immediate_left: 7,
      adjacent: 7,
      ends: 5,
      left_of: 6,
      right_of: 6,
      between: 5,
      not_ends: 3,
      not_at: 2,
      not_adjacent: 2,
    },
    banned: [],
  },
  hard: {
    id: "hard",
    label: "Hard",
    clueCount: 5,
    minPins: 0,
    maxPins: 0,
    freeReveals: 0,
    maxAttempts: 3,
    weight: {
      at: 0,
      immediate_left: 5,
      adjacent: 6,
      ends: 4,
      left_of: 7,
      right_of: 7,
      between: 6,
      not_ends: 5,
      not_at: 4,
      not_adjacent: 5,
    },
    banned: ["at"],
  },
  expert: {
    id: "expert",
    label: "Expert",
    clueCount: 5,
    minPins: 0,
    maxPins: 0,
    freeReveals: 0,
    maxAttempts: 2,
    weight: {
      at: 0,
      immediate_left: 3,
      adjacent: 5,
      ends: 3,
      left_of: 8,
      right_of: 8,
      between: 7,
      not_ends: 6,
      not_at: 5,
      not_adjacent: 6,
    },
    banned: ["at", "immediate_left"],
  },
};

/** Profile for a given rung (1 = ground). */
export function profileForRung(rung) {
  const r = Math.max(1, rung | 0);
  if (r <= 2) return withBannedSet(PROFILES.easy);
  if (r <= 4) return withBannedSet(PROFILES.medium);
  if (r <= 7) return withBannedSet(PROFILES.hard);
  return withBannedSet(PROFILES.expert);
}

function withBannedSet(p) {
  return { ...p, banned: new Set(p.banned) };
}

/**
 * Ladder visual width (0–1). Higher rung → skinnier.
 * Rung 1 = full width; floors around 20%.
 */
export function ladderWidthScale(rung) {
  const r = Math.max(1, rung);
  return Math.max(0.2, Math.pow(0.84, r - 1));
}

/** Human label for share / UI. */
export function heightLabel(height) {
  if (height <= 0) return "Ground";
  if (height === 1) return "Rung 1";
  return `Rung ${height}`;
}
