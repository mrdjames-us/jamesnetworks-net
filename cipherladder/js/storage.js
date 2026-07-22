const KEY = "thecipherladder-v1";

const defaultStats = () => ({
  daysPlayed: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayDay: null,
  lastClimbDay: null, // day that counted for streak (finished run with height>=1 or any settle)
  bestHeight: 0,
  totalHeight: 0,
  totalRungsCleared: 0,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { stats: defaultStats(), days: {} };
    const data = JSON.parse(raw);
    return {
      stats: { ...defaultStats(), ...(data.stats || {}) },
      days: data.days || {},
    };
  } catch {
    return { stats: defaultStats(), days: {} };
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDayRecord(state, dayKey) {
  return state.days[dayKey] || null;
}

/**
 * Day record shape:
 * {
 *   version, status: 'playing'|'done',
 *   height,           // rungs cleared
 *   currentRung,      // active rung
 *   rungGuesses,      // guesses on current rung
 *   arrangement,
 *   puzzleId,
 *   settled
 * }
 */
export function upsertDay(state, dayKey, record) {
  state.days[dayKey] = {
    ...(state.days[dayKey] || {}),
    ...record,
  };
  const keys = Object.keys(state.days).sort();
  while (keys.length > 60) {
    const k = keys.shift();
    delete state.days[k];
  }
  saveState(state);
  return state;
}

/**
 * Called once when the daily climb ends (fall or optional quit).
 */
export function recordClimbEnd(state, dayKey, height) {
  const stats = state.stats;
  if (state.days[dayKey]?.settled) {
    saveState(state);
    return state;
  }

  stats.daysPlayed += 1;
  stats.lastPlayDay = dayKey;
  stats.bestHeight = Math.max(stats.bestHeight, height);
  stats.totalHeight += height;
  stats.totalRungsCleared += height;

  if (stats.lastClimbDay) {
    const prev = parseDay(stats.lastClimbDay);
    const cur = parseDay(dayKey);
    const diff = dayDiff(prev, cur);
    if (diff === 1) stats.currentStreak += 1;
    else if (diff !== 0) stats.currentStreak = 1;
  } else {
    stats.currentStreak = 1;
  }
  stats.lastClimbDay = dayKey;
  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);

  if (state.days[dayKey]) {
    state.days[dayKey].settled = true;
    state.days[dayKey].status = "done";
    state.days[dayKey].height = height;
  }
  saveState(state);
  return state;
}

function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayDiff(a, b) {
  const ms = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / ms);
}

export function buildShareText({ dayKey, height, fallenRung, ladderArt }) {
  const lines = [
    `TheCipherLadder ${dayKey}`,
    `Height: ${height}`,
    ladderArt,
    `How high will you go?`,
  ];
  if (fallenRung) lines.splice(2, 0, `Fell on rung ${fallenRung}`);
  return lines.join("\n");
}
