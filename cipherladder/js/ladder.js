import { ladderWidthScale, profileForRung } from "./difficulty.js";

/**
 * Render the climbing ladder into a container.
 * @param {HTMLElement} root
 * @param {{
 *   currentRung: number,   // rung you're on (1-based)
 *   height: number,        // rungs cleared
 *   status: 'playing'|'cleared'|'fallen'|'miss',
 *   attemptsUsed?: number,
 *   maxAttempts?: number,
 *   animate?: boolean,
 * }} opts
 */
export function renderLadder(root, opts) {
  const {
    currentRung = 1,
    height = 0,
    status = "playing",
    attemptsUsed = 0,
    maxAttempts = 3,
    animate = true,
  } = opts;

  // Show enough rungs: from ground up past current
  const topRung = Math.max(6, currentRung + 2, height + 2);
  const width = ladderWidthScale(currentRung);

  root.innerHTML = "";
  root.className = "ladder-stage" + (animate ? " anim" : "");
  root.style.setProperty("--ladder-width", `${(width * 100).toFixed(1)}%`);
  root.dataset.status = status;

  const frame = document.createElement("div");
  frame.className = "ladder-frame";

  const labelTop = document.createElement("div");
  labelTop.className = "ladder-sky";
  labelTop.textContent = "↑ higher · skinnier · harder";
  frame.appendChild(labelTop);

  const ladder = document.createElement("div");
  ladder.className = "ladder";
  ladder.style.width = "var(--ladder-width)";

  const railL = document.createElement("div");
  railL.className = "rail left";
  const railR = document.createElement("div");
  railR.className = "rail right";
  ladder.appendChild(railL);
  ladder.appendChild(railR);

  const rungsEl = document.createElement("div");
  rungsEl.className = "rungs";

  // Draw from top (high numbers) down to 1
  for (let r = topRung; r >= 1; r--) {
    const rungEl = document.createElement("div");
    const cleared = r <= height;
    const current = r === currentRung;
    const w = ladderWidthScale(r);
    rungEl.className =
      "rung" +
      (cleared ? " cleared" : "") +
      (current ? " current" : "") +
      (r > currentRung && !cleared ? " future" : "");
    rungEl.style.setProperty("--rung-w", `${(w * 100).toFixed(1)}%`);

    const bar = document.createElement("div");
    bar.className = "rung-bar";
    const num = document.createElement("span");
    num.className = "rung-num";
    num.textContent = String(r);

    const diff = profileForRung(r);
    const tip = document.createElement("span");
    tip.className = "rung-diff";
    tip.textContent = diff.label;

    bar.appendChild(num);
    bar.appendChild(tip);
    rungEl.appendChild(bar);

    if (current) {
      const climber = document.createElement("div");
      climber.className =
        "climber" +
        (status === "fallen" ? " fallen" : "") +
        (status === "cleared" ? " cheer" : "");
      climber.textContent = status === "fallen" ? "💥" : "🔐";
      climber.setAttribute(
        "aria-label",
        status === "fallen" ? "Fell here" : "You are here"
      );
      rungEl.appendChild(climber);
    }

    rungsEl.appendChild(rungEl);
  }

  // Ground
  const ground = document.createElement("div");
  ground.className = "ground" + (height === 0 && currentRung === 1 ? " current" : "");
  ground.innerHTML = `<span>Ground</span>`;
  rungsEl.appendChild(ground);

  ladder.appendChild(rungsEl);
  frame.appendChild(ladder);

  const meta = document.createElement("div");
  meta.className = "ladder-meta";
  const lives = "●".repeat(Math.max(0, maxAttempts - attemptsUsed)) +
    "○".repeat(Math.min(maxAttempts, attemptsUsed));
  meta.innerHTML = `
    <div class="ladder-stat"><span class="k">Height</span><span class="v">${height}</span></div>
    <div class="ladder-stat"><span class="k">On rung</span><span class="v">${currentRung}</span></div>
    <div class="ladder-stat"><span class="k">Attempts</span><span class="v mono">${lives}</span></div>
  `;
  frame.appendChild(meta);

  root.appendChild(frame);
}

/** Compact emoji ladder for share text. */
export function shareLadderArt(height, fallenRung = null) {
  const top = Math.max(height + 1, 3);
  const lines = [];
  for (let r = top; r >= 1; r--) {
    const pad = Math.floor((top - r) * 0.5);
    const indent = " ".repeat(pad);
    if (fallenRung === r) lines.push(`${indent}💥 rung ${r}`);
    else if (r <= height) lines.push(`${indent}🟩 rung ${r}`);
    else lines.push(`${indent}⬜ rung ${r}`);
  }
  lines.push("🟫 ground");
  return lines.join("\n");
}
