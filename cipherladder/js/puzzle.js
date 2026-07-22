import { mulberry32, hashString, dayKey, shuffle } from "./rng.js";
import { THEMES } from "./themes.js";
import { profileForRung } from "./difficulty.js";

const N = 5;
/** Bump when generator / climb rules change. */
export const PUZZLE_VERSION = 3;

export function clueHolds(clue, order) {
  const pos = (id) => order.indexOf(id);
  switch (clue.type) {
    case "at":
      return pos(clue.a) === clue.p;
    case "not_at":
      return pos(clue.a) !== clue.p;
    case "left_of":
      return pos(clue.a) < pos(clue.b);
    case "right_of":
      return pos(clue.a) > pos(clue.b);
    case "adjacent":
      return Math.abs(pos(clue.a) - pos(clue.b)) === 1;
    case "not_adjacent":
      return Math.abs(pos(clue.a) - pos(clue.b)) !== 1;
    case "immediate_left":
      return pos(clue.a) + 1 === pos(clue.b);
    case "ends":
      return pos(clue.a) === 0 || pos(clue.a) === N - 1;
    case "not_ends":
      return pos(clue.a) !== 0 && pos(clue.a) !== N - 1;
    case "between": {
      const pa = pos(clue.a);
      const pb = pos(clue.b);
      const pc = pos(clue.c);
      return pa > Math.min(pb, pc) && pa < Math.max(pb, pc);
    }
    default:
      return false;
  }
}

export function allCluesHold(clues, order) {
  return clues.every((c) => clueHolds(c, order));
}

function permutations(ids) {
  if (ids.length <= 1) return [ids.slice()];
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    const rest = ids.slice(0, i).concat(ids.slice(i + 1));
    for (const p of permutations(rest)) out.push([ids[i], ...p]);
  }
  return out;
}

function countSolutions(clues, ids) {
  let n = 0;
  let one = null;
  for (const order of permutations(ids)) {
    if (allCluesHold(clues, order)) {
      n++;
      if (n === 1) one = order;
      if (n > 1) return { count: n, solution: null };
    }
  }
  return { count: n, solution: one };
}

function clueSignature(c) {
  switch (c.type) {
    case "at":
    case "not_at":
      return `${c.type}:${c.a}:${c.p}`;
    case "ends":
    case "not_ends":
      return `${c.type}:${c.a}`;
    case "left_of":
    case "right_of":
    case "adjacent":
    case "not_adjacent":
    case "immediate_left":
      return `${c.type}:${c.a}:${c.b}`;
    case "between":
      return `${c.type}:${c.a}:${[c.b, c.c].sort().join(",")}`;
    default:
      return JSON.stringify(c);
  }
}

function generateCandidates(solution, ids) {
  const pos = Object.fromEntries(solution.map((id, i) => [id, i]));
  const raw = [];

  for (const a of ids) {
    raw.push({ type: "at", a, p: pos[a] });
    for (let p = 0; p < N; p++) {
      if (p !== pos[a]) raw.push({ type: "not_at", a, p });
    }
    if (pos[a] === 0 || pos[a] === N - 1) raw.push({ type: "ends", a });
    else raw.push({ type: "not_ends", a });
  }

  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const a = ids[i];
      const b = ids[j];
      if (pos[a] < pos[b]) raw.push({ type: "left_of", a, b });
      if (pos[a] > pos[b]) raw.push({ type: "right_of", a, b });
      if (Math.abs(pos[a] - pos[b]) === 1) {
        raw.push({ type: "adjacent", a, b });
        if (pos[a] + 1 === pos[b]) raw.push({ type: "immediate_left", a, b });
      } else {
        raw.push({ type: "not_adjacent", a, b });
      }
    }
  }

  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      for (const c of ids) {
        if (c === a || c === b) continue;
        const pa = pos[a];
        const lo = Math.min(pos[b], pos[c]);
        const hi = Math.max(pos[b], pos[c]);
        if (pa > lo && pa < hi) raw.push({ type: "between", a, b, c });
      }
    }
  }

  const seen = new Set();
  const unique = [];
  for (const c of raw) {
    const sig = clueSignature(c);
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(c);
  }
  return unique;
}

function filterForProfile(candidates, profile) {
  return candidates.filter((c) => {
    if (profile.banned.has(c.type)) return false;
    const w = profile.weight[c.type];
    return w === undefined || w > 0;
  });
}

function typeWeight(profile, type) {
  return profile.weight[type] ?? 1;
}

function pinCount(clues) {
  return clues.filter((c) => c.type === "at").length;
}

function selectClues(candidates, ids, rand, profile) {
  const pool = filterForProfile(candidates, profile);
  const pins = shuffle(
    pool.filter((c) => c.type === "at"),
    rand
  );
  const rest = shuffle(
    pool.filter((c) => c.type !== "at"),
    rand
  ).sort(
    (a, b) =>
      typeWeight(profile, b.type) - typeWeight(profile, a.type) || rand() - 0.5
  );

  let clues = [];
  const wantPins = Math.min(profile.minPins, pins.length);
  for (let i = 0; i < wantPins; i++) clues.push(pins[i]);

  const remainingPins = pins.filter(
    (p) => !clues.some((c) => clueSignature(c) === clueSignature(p))
  );

  for (const c of rest) {
    if (clues.some((x) => clueSignature(x) === clueSignature(c))) continue;
    if (c.type === "at" && pinCount(clues) >= profile.maxPins) continue;
    clues.push(c);
    if (countSolutions(clues, ids).count === 1) break;
    if (clues.length >= 14) break;
  }

  if (countSolutions(clues, ids).count !== 1) {
    for (const p of remainingPins) {
      if (pinCount(clues) >= Math.max(profile.maxPins, profile.minPins + 2)) break;
      clues.push(p);
      if (countSolutions(clues, ids).count === 1) break;
    }
  }

  if (countSolutions(clues, ids).count !== 1) {
    for (const c of shuffle(candidates, rand)) {
      if (clues.some((x) => clueSignature(x) === clueSignature(c))) continue;
      clues.push(c);
      if (countSolutions(clues, ids).count === 1) break;
    }
  }

  if (countSolutions(clues, ids).count !== 1) return null;

  const target = profile.clueCount;

  let changed = true;
  while (changed && clues.length > target) {
    changed = false;
    const order = shuffle(
      clues.map((_, i) => i),
      rand
    );
    for (const idx of order) {
      const trial = clues.filter((_, i) => i !== idx);
      if (pinCount(trial) < profile.minPins) continue;
      if (countSolutions(trial, ids).count === 1) {
        clues = trial;
        changed = true;
        break;
      }
    }
  }

  if (clues.length < target) {
    const have = new Set(clues.map(clueSignature));
    const extras = pool
      .filter((c) => !have.has(clueSignature(c)))
      .filter((c) => c.type !== "at" || pinCount(clues) < profile.maxPins)
      .sort(
        (a, b) =>
          typeWeight(profile, b.type) - typeWeight(profile, a.type) ||
          rand() - 0.5
      );
    for (const c of extras) {
      if (c.type === "at" && pinCount(clues) >= profile.maxPins) continue;
      clues.push(c);
      if (clues.length >= target) break;
    }
  }

  if (clues.length > target) {
    for (let t = 0; t < 40; t++) {
      const sample = shuffle(clues, rand).slice(0, target);
      if (pinCount(sample) < profile.minPins) continue;
      if (countSolutions(sample, ids).count === 1) return sample;
    }
  }

  return clues;
}

function pickReveals(solution, rand, count, clues) {
  if (count <= 0) return [];
  const pinned = new Set(
    clues.filter((c) => c.type === "at").map((c) => c.a)
  );
  const indices = shuffle(
    solution.map((_, i) => i),
    rand
  );
  indices.sort((a, b) => {
    const ap = pinned.has(solution[a]) ? 0 : 1;
    const bp = pinned.has(solution[b]) ? 0 : 1;
    return ap - bp;
  });
  const reveals = [];
  for (const i of indices) {
    reveals.push({ slot: i, id: solution[i] });
    if (reveals.length >= count) break;
  }
  return reveals;
}

export function formatClue(clue, itemsById) {
  const chip = (id) => ({
    id,
    name: itemsById[id]?.name ?? id,
    item: itemsById[id],
  });
  const posLabel = (p) => String(p + 1);

  switch (clue.type) {
    case "at":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is in position " },
          { type: "strong", text: posLabel(clue.p) },
          { type: "text", text: "." },
        ],
      };
    case "not_at":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is not in position " },
          { type: "strong", text: posLabel(clue.p) },
          { type: "text", text: "." },
        ],
      };
    case "left_of":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is somewhere left of " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: "." },
        ],
      };
    case "right_of":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is somewhere right of " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: "." },
        ],
      };
    case "adjacent":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is next to " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: "." },
        ],
      };
    case "not_adjacent":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is not next to " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: "." },
        ],
      };
    case "immediate_left":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is immediately left of " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: "." },
        ],
      };
    case "ends":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is at one of the ends." },
        ],
      };
    case "not_ends":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is not at either end." },
        ],
      };
    case "between":
      return {
        parts: [
          { type: "item", ...chip(clue.a) },
          { type: "text", text: " is between " },
          { type: "item", ...chip(clue.b) },
          { type: "text", text: " and " },
          { type: "item", ...chip(clue.c) },
          { type: "text", text: "." },
        ],
      };
    default:
      return { parts: [{ type: "text", text: "Unknown clue." }] };
  }
}

/**
 * Build puzzle for a specific rung of today's ladder.
 * Same (day, rung) → same puzzle for everyone.
 */
export function buildRungPuzzle(rung, date = new Date()) {
  const key = dayKey(date);
  const profile = profileForRung(rung);
  const seed = hashString(
    `thecipherladder-v${PUZZLE_VERSION}|r${rung}|${key}`
  );
  const rand = mulberry32(seed);

  const theme = THEMES[Math.floor(rand() * THEMES.length)];
  const items = theme.items.map((i) => ({ ...i }));
  const ids = items.map((i) => i.id);
  const solution = shuffle(ids, rand);

  const candidates = generateCandidates(solution, ids);
  let clues = selectClues(candidates, ids, rand, profile);

  if (!clues || countSolutions(clues, ids).count !== 1) {
    clues = solution.slice(0, 3).map((id, p) => ({ type: "at", a: id, p }));
    for (let i = 0; i < N - 1 && clues.length < 5; i++) {
      clues.push({
        type: "immediate_left",
        a: solution[i],
        b: solution[i + 1],
      });
    }
  }

  clues = shuffle(clues, rand);

  const check = countSolutions(clues, ids);
  const finalSolution = check.solution ?? solution;
  const reveals = pickReveals(
    finalSolution,
    rand,
    profile.freeReveals,
    clues
  );

  return {
    dayKey: key,
    rung,
    puzzleId: `TCL-v${PUZZLE_VERSION}-${key}-r${rung}`,
    version: PUZZLE_VERSION,
    difficulty: { id: profile.id, label: profile.label },
    theme: { id: theme.id, label: theme.label },
    items,
    clues,
    solution: finalSolution,
    reveals,
    maxAttempts: profile.maxAttempts,
  };
}

/** @deprecated use buildRungPuzzle — kept for scripts */
export function buildDailyPuzzle(date = new Date()) {
  return buildRungPuzzle(1, date);
}

export function scoreGuess(guess, solution) {
  return guess.map((id, i) => id === solution[i]);
}

export function isSolved(guess, solution) {
  return (
    guess.length === solution.length && guess.every((id, i) => id === solution[i])
  );
}

export function blankArrangement(puzzle) {
  const arr = [null, null, null, null, null];
  for (const r of puzzle.reveals || []) {
    arr[r.slot] = r.id;
  }
  return arr;
}

export function isRevealedSlot(puzzle, index) {
  return (puzzle.reveals || []).some((r) => r.slot === index);
}

export function selfTest(days = 14, maxRung = 10) {
  const results = [];
  const start = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    for (let rung = 1; rung <= maxRung; rung++) {
      const p = buildRungPuzzle(rung, d);
      const ids = p.items.map((x) => x.id);
      const { count, solution } = countSolutions(p.clues, ids);
      const ok =
        count === 1 &&
        solution &&
        solution.join() === p.solution.join() &&
        p.clues.length >= 4;
      results.push({
        day: p.dayKey,
        rung,
        ok,
        clueCount: p.clues.length,
        difficulty: p.difficulty.id,
        pins: p.clues.filter((c) => c.type === "at").length,
      });
    }
  }
  return results;
}
