import {
  buildRungPuzzle,
  formatClue,
  scoreGuess,
  isSolved,
  blankArrangement,
  isRevealedSlot,
  PUZZLE_VERSION,
} from "./puzzle.js";
import { ladderWidthScale } from "./difficulty.js";
import { renderLadder, shareLadderArt } from "./ladder.js";
import {
  loadState,
  upsertDay,
  recordClimbEnd,
  getDayRecord,
  buildShareText,
} from "./storage.js";
import { dayKey } from "./rng.js";

const $ = (sel) => document.querySelector(sel);

const els = {
  dateLabel: $("#date-label"),
  heightLabel: $("#height-label"),
  rungLabel: $("#rung-label"),
  attemptsLabel: $("#attempts-label"),
  diffChip: $("#diff-chip"),
  peekBar: $("#peek-bar"),
  peekDiff: $("#peek-diff"),
  cluesList: $("#clues-list"),
  slots: $("#slots"),
  tray: $("#tray"),
  hintLine: $("#hint-line"),
  btnClear: $("#btn-clear"),
  btnSubmit: $("#btn-submit"),
  historyPanel: $("#history-panel"),
  history: $("#history"),
  btnHelp: $("#btn-help"),
  btnStats: $("#btn-stats"),
  btnLadderPeek: $("#btn-ladder-peek"),
  modalHelp: $("#modal-help"),
  modalStats: $("#modal-stats"),
  modalLadder: $("#modal-ladder"),
  ladderTitle: $("#ladder-title"),
  ladderSub: $("#ladder-sub"),
  ladderView: $("#ladder-view"),
  ladderActions: $("#ladder-actions"),
  btnLadderContinue: $("#btn-ladder-continue"),
  btnLadderShare: $("#btn-ladder-share"),
  statsGrid: $("#stats-grid"),
  toast: $("#toast"),
  boardPanel: document.querySelector(".board-panel"),
};

let state = loadState();
let todayKey = dayKey();
/** Height = rungs cleared */
let height = 0;
/** Current rung being attempted (1-based) */
let currentRung = 1;
/** @type {'playing'|'done'} */
let runStatus = "playing";
let puzzle = null;
/** @type {(string|null)[]} */
let arrangement = [null, null, null, null, null];
/** @type {string[][]} */
let guesses = [];
let selectedItem = null;
let selectedSlot = null;
/** Pending ladder modal action */
let ladderMode = "peek"; // peek | miss | cleared | fallen
let sharePayload = null;

function itemsById() {
  return Object.fromEntries(puzzle.items.map((i) => [i.id, i]));
}

function init() {
  restoreRun();
  loadCurrentRung();
  renderAll();
  bindEvents();

  if (!localStorage.getItem("tcl-seen-help-v1")) {
    els.modalHelp.showModal();
    localStorage.setItem("tcl-seen-help-v1", "1");
  }

  if (runStatus === "done") {
    lockBoard();
  }
}

function restoreRun() {
  const rec = getDayRecord(state, todayKey);
  if (!rec || rec.version !== PUZZLE_VERSION) {
    height = 0;
    currentRung = 1;
    runStatus = "playing";
    guesses = [];
    return;
  }
  height = rec.height || 0;
  currentRung = rec.currentRung || height + 1;
  runStatus = rec.status === "done" ? "done" : "playing";
  guesses = rec.rungGuesses || [];
}

function loadCurrentRung() {
  puzzle = buildRungPuzzle(currentRung);
  const rec = getDayRecord(state, todayKey);
  if (
    runStatus === "playing" &&
    rec &&
    rec.version === PUZZLE_VERSION &&
    rec.puzzleId === puzzle.puzzleId &&
    rec.arrangement
  ) {
    arrangement = applyReveals(rec.arrangement.slice());
  } else if (runStatus === "done") {
    arrangement = puzzle.solution.slice();
  } else {
    arrangement = blankArrangement(puzzle);
  }
}

function applyReveals(arr) {
  for (const r of puzzle.reveals || []) arr[r.slot] = r.id;
  return arr;
}

function persist() {
  upsertDay(state, todayKey, {
    version: PUZZLE_VERSION,
    status: runStatus,
    height,
    currentRung,
    rungGuesses: guesses,
    arrangement: arrangement.slice(),
    puzzleId: puzzle.puzzleId,
  });
  state = loadState();
}

function renderAll() {
  renderMeta();
  renderPeek();
  renderClues();
  renderBoard();
  renderHistory();
}

function renderMeta() {
  const d = new Date();
  els.dateLabel.textContent = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  els.heightLabel.textContent = String(height);
  els.rungLabel.textContent = String(currentRung);
  els.attemptsLabel.textContent = `${guesses.length} / ${puzzle.maxAttempts}`;
  els.diffChip.textContent = puzzle.difficulty.label;
  els.diffChip.className = "panel-sub diff-" + puzzle.difficulty.id;
}

function renderPeek() {
  const w = ladderWidthScale(currentRung);
  els.peekBar.style.width = `${(w * 100).toFixed(1)}%`;
  els.peekDiff.textContent = puzzle.difficulty.label;
  els.peekDiff.className = "peek-diff diff-" + puzzle.difficulty.id;
}

function renderClues() {
  const map = itemsById();
  els.cluesList.innerHTML = "";
  for (const clue of puzzle.clues) {
    const li = document.createElement("li");
    const wrap = document.createElement("div");
    wrap.className = "clue-text";
    for (const part of formatClue(clue, map).parts) {
      if (part.type === "item") {
        const chip = document.createElement("span");
        chip.className = "item-chip";
        chip.style.setProperty("--chip", part.item?.color || "#888");
        chip.innerHTML = `<span class="glyph">${part.item?.glyph || ""}</span>${escapeHtml(part.name)}`;
        wrap.appendChild(chip);
      } else if (part.type === "strong") {
        const s = document.createElement("strong");
        s.textContent = part.text;
        wrap.appendChild(s);
      } else {
        wrap.appendChild(document.createTextNode(part.text));
      }
    }
    li.appendChild(wrap);
    els.cluesList.appendChild(li);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function renderBoard() {
  const map = itemsById();
  const placed = new Set(arrangement.filter(Boolean));
  const lockedPlay = runStatus !== "playing";

  els.slots.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const id = arrangement[i];
    const locked = isRevealedSlot(puzzle, i);
    const slot = document.createElement("div");
    slot.className =
      "slot" +
      (id ? " filled" : "") +
      (selectedSlot === i ? " selected" : "") +
      (locked ? " locked" : "");
    slot.tabIndex = !lockedPlay && !locked ? 0 : -1;

    const pos = document.createElement("span");
    pos.className = "pos";
    pos.textContent = String(i + 1);
    slot.appendChild(pos);

    if (id) {
      const item = map[id];
      const g = document.createElement("span");
      g.className = "glyph";
      g.textContent = item.glyph;
      const n = document.createElement("span");
      n.className = "name";
      n.textContent = item.name;
      slot.appendChild(g);
      slot.appendChild(n);
      slot.style.borderColor = item.color;
    }

    if (!lockedPlay && !locked) {
      slot.addEventListener("click", () => onSlotClick(i));
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over");
        const itemId = e.dataTransfer.getData("text/item-id");
        if (itemId) placeItem(itemId, i);
      });
    }
    els.slots.appendChild(slot);
  }

  els.tray.innerHTML = "";
  for (const item of puzzle.items) {
    const el = document.createElement("button");
    el.type = "button";
    el.className =
      "tray-item" +
      (placed.has(item.id) ? " placed" : "") +
      (selectedItem === item.id ? " selected" : "");
    el.style.setProperty("--chip", item.color);
    el.innerHTML = `<span class="glyph">${item.glyph}</span><span class="name">${escapeHtml(item.name)}</span>`;
    el.disabled = lockedPlay || placed.has(item.id);
    if (!lockedPlay && !placed.has(item.id)) {
      el.draggable = true;
      el.addEventListener("click", () => onTrayClick(item.id));
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/item-id", item.id);
      });
    }
    els.tray.appendChild(el);
  }

  const full = arrangement.every(Boolean);
  els.btnSubmit.disabled = lockedPlay || !full;
  const movable = arrangement.some((id, i) => id && !isRevealedSlot(puzzle, i));
  els.btnClear.disabled = lockedPlay || !movable;

  if (runStatus === "done") {
    els.hintLine.textContent = `Climb over — height ${height}. Come back tomorrow.`;
  } else if ((puzzle.reveals || []).length) {
    els.hintLine.textContent =
      "Green lock = free starter. Fill the rest, then submit.";
  } else {
    els.hintLine.textContent =
      "Tap a slot, then an item — or drag. Submit to check the ladder.";
  }
}

function onTrayClick(id) {
  if (runStatus !== "playing") return;
  if (selectedSlot !== null && !isRevealedSlot(puzzle, selectedSlot)) {
    placeItem(id, selectedSlot);
    return;
  }
  selectedItem = selectedItem === id ? null : id;
  selectedSlot = null;
  renderBoard();
}

function onSlotClick(index) {
  if (runStatus !== "playing") return;
  if (isRevealedSlot(puzzle, index)) return;

  if (arrangement[index] && selectedItem === null && selectedSlot === null) {
    selectedItem = arrangement[index];
    arrangement[index] = null;
    persist();
    renderBoard();
    return;
  }
  if (selectedItem) {
    placeItem(selectedItem, index);
    return;
  }
  selectedSlot = selectedSlot === index ? null : index;
  selectedItem = null;
  renderBoard();
}

function placeItem(id, index) {
  if (isRevealedSlot(puzzle, index)) return;
  if ((puzzle.reveals || []).some((r) => r.id === id)) return;

  const prev = arrangement.indexOf(id);
  if (prev !== -1 && !isRevealedSlot(puzzle, prev)) arrangement[prev] = null;

  const occupant = arrangement[index];
  arrangement[index] = id;
  if (
    occupant &&
    occupant !== id &&
    prev !== -1 &&
    !isRevealedSlot(puzzle, prev) &&
    !(puzzle.reveals || []).some((r) => r.id === occupant)
  ) {
    arrangement[prev] = occupant;
  }
  applyReveals(arrangement);
  selectedItem = null;
  selectedSlot = null;
  persist();
  renderBoard();
}

function clearBoard() {
  if (runStatus !== "playing") return;
  arrangement = blankArrangement(puzzle);
  selectedItem = null;
  selectedSlot = null;
  persist();
  renderBoard();
}

function submitGuess() {
  if (runStatus !== "playing") return;
  applyReveals(arrangement);
  if (!arrangement.every(Boolean)) return;

  const guess = arrangement.slice();
  guesses.push(guess);
  const won = isSolved(guess, puzzle.solution);

  if (won) {
    height = currentRung;
    // Snapshot cleared rung for the ladder modal, then stage next rung in save
    const clearedRung = currentRung;
    persist();
    renderMeta();
    renderHistory();
    showLadderModal("cleared", {
      correct: 5,
      clearedRung,
    });
    return;
  }

  const correct = scoreGuess(guess, puzzle.solution).filter(Boolean).length;

  if (guesses.length >= puzzle.maxAttempts) {
    // Fall
    runStatus = "done";
    arrangement = puzzle.solution.slice();
    state = recordClimbEnd(loadState(), todayKey, height);
    persist();
    renderAll();
    lockBoard();
    showLadderModal("fallen", { correct });
    return;
  }

  // Miss but still on rung
  arrangement = blankArrangement(puzzle);
  persist();
  renderMeta();
  renderHistory();
  renderBoard();
  showLadderModal("miss", { correct });
}

function showLadderModal(mode, extra = {}) {
  ladderMode = mode;
  const attemptsUsed = guesses.length;
  let status = "playing";
  let title = "The Ladder";
  let sub = "";

  if (mode === "cleared") {
    status = "cleared";
    const cleared = extra.clearedRung ?? height;
    title = `Rung ${cleared} cleared!`;
    sub = `Height ${height}. The ladder gets skinnier — next is ${profileNextLabel()}.`;
    els.btnLadderContinue.textContent = "Climb higher";
    els.btnLadderShare.hidden = true;
    // Show climber celebrating on the cleared rung
    renderLadder(els.ladderView, {
      currentRung: cleared,
      height,
      status: "cleared",
      attemptsUsed: guesses.length,
      maxAttempts: puzzle.maxAttempts,
      animate: true,
    });
    els.ladderTitle.textContent = title;
    els.ladderSub.textContent = sub;
    els.modalLadder.showModal();
    return;
  } else if (mode === "miss") {
    status = "playing";
    title = "Not yet";
    sub = `${extra.correct ?? 0} of 5 correct. Still on rung ${currentRung} — ${puzzle.maxAttempts - attemptsUsed} attempt${puzzle.maxAttempts - attemptsUsed === 1 ? "" : "s"} left.`;
    els.btnLadderContinue.textContent = "Try again";
    els.btnLadderShare.hidden = true;
  } else if (mode === "fallen") {
    status = "fallen";
    title = height > 0 ? `Fell at rung ${currentRung}` : "Slipped on rung 1";
    sub = `Final height: ${height}. How high will you go tomorrow?`;
    els.btnLadderContinue.textContent = "Done for today";
    els.btnLadderShare.hidden = false;
    sharePayload = {
      dayKey: todayKey,
      height,
      fallenRung: currentRung,
      ladderArt: shareLadderArt(height, currentRung),
    };
  } else {
    // peek
    status = runStatus === "done" ? "fallen" : "playing";
    title = "Your ladder";
    sub =
      runStatus === "done"
        ? `Today's height: ${height}`
        : `On rung ${currentRung} · ${puzzle.difficulty.label} · ladder width ${(ladderWidthScale(currentRung) * 100).toFixed(0)}%`;
    els.btnLadderContinue.textContent = "Close";
    els.btnLadderShare.hidden = runStatus !== "done";
    if (runStatus === "done") {
      sharePayload = {
        dayKey: todayKey,
        height,
        fallenRung: currentRung,
        ladderArt: shareLadderArt(height, currentRung),
      };
    }
  }

  els.ladderTitle.textContent = title;
  els.ladderSub.textContent = sub;
  renderLadder(els.ladderView, {
    currentRung,
    height,
    status,
    attemptsUsed,
    maxAttempts: puzzle.maxAttempts,
    animate: true,
  });
  els.modalLadder.showModal();
}

function profileNextLabel() {
  const next = buildRungPuzzle(currentRung + 1);
  return next.difficulty.label;
}

function onLadderContinue() {
  if (ladderMode === "cleared") {
    // Advance to next rung
    currentRung += 1;
    guesses = [];
    puzzle = buildRungPuzzle(currentRung);
    arrangement = blankArrangement(puzzle);
    selectedItem = null;
    selectedSlot = null;
    persist();
    els.boardPanel.classList.remove("locked");
    renderAll();
    els.modalLadder.close();
    showToast(`Rung ${currentRung} · ${puzzle.difficulty.label}`);
    return;
  }

  if (ladderMode === "miss") {
    els.modalLadder.close();
    return;
  }

  if (ladderMode === "fallen" || ladderMode === "peek") {
    els.modalLadder.close();
  }
}

function lockBoard() {
  els.boardPanel.classList.add("locked");
  els.btnSubmit.disabled = true;
  els.btnClear.disabled = true;
}

function renderHistory() {
  if (!guesses.length) {
    els.historyPanel.hidden = true;
    return;
  }
  els.historyPanel.hidden = false;
  const map = itemsById();
  els.history.innerHTML = "";
  guesses.forEach((guess, gi) => {
    const marks = scoreGuess(guess, puzzle.solution);
    const row = document.createElement("div");
    row.className = "attempt-row";
    row.innerHTML = `<div class="attempt-num">${gi + 1}</div>`;
    const slots = document.createElement("div");
    slots.className = "attempt-slots";
    guess.forEach((id, i) => {
      const item = map[id];
      const cell = document.createElement("div");
      cell.className = "mini-slot " + (marks[i] ? "correct" : "wrong");
      cell.textContent = item.glyph;
      slots.appendChild(cell);
    });
    row.appendChild(slots);
    els.history.appendChild(row);
  });
}

function renderStats() {
  const s = state.stats;
  const boxes = [
    { n: s.daysPlayed, l: "Days climbed" },
    { n: s.bestHeight, l: "Best height" },
    { n: s.currentStreak, l: "Streak" },
    { n: s.maxStreak, l: "Max streak" },
  ];
  els.statsGrid.innerHTML = boxes
    .map(
      (b) =>
        `<div class="stat-box"><div class="n">${b.n}</div><div class="l">${b.l}</div></div>`
    )
    .join("");
}

function showToast(msg) {
  els.toast.hidden = false;
  els.toast.textContent = msg;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

async function share() {
  const payload =
    sharePayload ||
    {
      dayKey: todayKey,
      height,
      fallenRung: runStatus === "done" ? currentRung : null,
      ladderArt: shareLadderArt(height, runStatus === "done" ? currentRung : null),
    };
  const text = buildShareText(payload);
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch {
    /* cancel */
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  } catch {
    showToast("Couldn't copy");
  }
}

function bindEvents() {
  els.btnClear.addEventListener("click", clearBoard);
  els.btnSubmit.addEventListener("click", submitGuess);
  els.btnHelp.addEventListener("click", () => els.modalHelp.showModal());
  els.btnStats.addEventListener("click", () => {
    state = loadState();
    renderStats();
    els.modalStats.showModal();
  });
  els.btnLadderPeek.addEventListener("click", () => showLadderModal("peek"));
  els.btnLadderContinue.addEventListener("click", onLadderContinue);
  els.btnLadderShare.addEventListener("click", share);

  document.addEventListener("keydown", (e) => {
    if (runStatus !== "playing") return;
    if (e.target.closest("dialog")) return;
    if (e.key === "Escape") {
      selectedItem = null;
      selectedSlot = null;
      renderBoard();
    }
  });
}

init();
