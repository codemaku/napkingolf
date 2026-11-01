import "./style.css";

const COURSES = {
  samarahan: {
    name: "Samarahan CC",
    teeName: "Blue Tees",
    totalYardage: 6370,
    courseRating: 71.1,
    slopeRating: 133,
    holes: [
      { num: 1, dist: 380 },
      { num: 2, dist: 364 },
      { num: 3, dist: 137 },
      { num: 4, dist: 506 },
      { num: 5, dist: 165 },
      { num: 6, dist: 312 },
      { num: 7, dist: 328 },
      { num: 8, dist: 553 },
      { num: 9, dist: 340 },
      { num: 10, dist: 395 },
      { num: 11, dist: 340 },
      { num: 12, dist: 349 },
      { num: 13, dist: 412 },
      { num: 14, dist: 531 },
      { num: 15, dist: 196 },
      { num: 16, dist: 405 },
      { num: 17, dist: 157 },
      { num: 18, dist: 500 },
    ],
  },
  pebble: {
    name: "Pebble Beach",
    teeName: "Gold Tees",
    totalYardage: 6392,
    courseRating: 73.6,
    slopeRating: 140,
    holes: [
      { num: 1, dist: 380 },
      { num: 2, dist: 502 },
      { num: 3, dist: 390 },
      { num: 4, dist: 180 },
      { num: 5, dist: 530 },
      { num: 6, dist: 202 },
      { num: 7, dist: 106 },
      { num: 8, dist: 430 },
      { num: 9, dist: 464 },
      { num: 10, dist: 445 },
      { num: 11, dist: 390 },
      { num: 12, dist: 202 },
      { num: 13, dist: 390 },
      { num: 14, dist: 580 },
      { num: 15, dist: 395 },
      { num: 16, dist: 178 },
      { num: 17, dist: 188 },
      { num: 18, dist: 440 },
    ],
  },
  thehay: {
    name: "The Hay",
    teeName: "Short Course",
    totalYardage: 670,
    courseRating: 18.5,
    slopeRating: 45,
    holes: [
      { num: 1, dist: 57 },
      { num: 2, dist: 106 },
      { num: 3, dist: 82 },
      { num: 4, dist: 47 },
      { num: 5, dist: 48 },
      { num: 6, dist: 77 },
      { num: 7, dist: 61 },
      { num: 8, dist: 92 },
      { num: 9, dist: 100 },
    ],
  },
};
const ROUNDS = {
  quick3: { label: "Quick 3", n: 3 },
  half6: { label: "Half Front (6)", n: 6 },
  front9: { label: "Front 9", n: 9, start: 1 },
  back9: { label: "Back 9", n: 9, start: 10 },
  full18: { label: "Full 18", n: 18 },
  all: { label: "Whole course", n: 0 }, // only offered for courses you build
};
function roundLen(k, c) {
  return k === "all" ? c.holes.length : ROUNDS[k].n;
}
function roundOk(k, c) {
  if (k === "all") return !!c.user;
  const r = ROUNDS[k];
  return (
    r.n <= c.holes.length &&
    (!r.start || r.start + r.n - 1 <= c.holes.length)
  );
}
// Course requests: set this to your own email, form or issue-tracker link.
const COURSE_REQUEST_URL =
  "mailto:YOUR-EMAIL@example.com?subject=" +
  encodeURIComponent("Napkin Golf course request") +
  "&body=" +
  encodeURIComponent(
    "Course name:\nCity / country:\nTees (name, rating, slope if known):\nHole yardages (if you have them):\n",
  );
const FREE = "Free Play";
const CLUBS = [
  "Driver", "3 Wood", "5 Wood", "Hybrid",
  "3 Iron", "4 Iron", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron",
  "PW", "GW", "SW", "LW",
];
const NA_KEY = "__na";
const UC_KEY = "pgs:courses";
const HELP =
  "Scales your distance to the hole, similar to playing from forward tees. The fairway width and green size remain standard to keep the challenge fair. Adjust in 5% increments (e.g., 20% to 25%) as your game improves.";

// ---------- state ----------
const cfg = {
  course: "samarahan",
  round: "full18",
  start: 1,
  customDist: 127,
  err: "",
  players: [{ name: "", factor: 1.0 }],
};
let G = null; // game
let T = null; // current turn
let screen = "setup";
let dlg = null; // open dialog: "exit" | "delcourse" | "clear" | null
let UC = LS_GET_COURSES(); // courses built on this device, keyed by id
let B = null; // course-builder draft
let dispP = 0; // dispersion map: player index
let dispC = "all"; // dispersion map: club filter
let deferredInstall = null; // beforeinstallprompt event (Android / desktop Chrome)
let histView = false; // true while viewing a saved round from history
let lastScreen = null; // used to decide whether render() should reset scroll

function LS_GET_COURSES() {
  try {
    const v = JSON.parse(localStorage.getItem(UC_KEY));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch (e) {
    return {};
  }
}

// ---------- helpers ----------
const getCourse = (k) => COURSES[k] || UC[k] || null;
// Keep the round length / start hole valid for whichever course is selected.
function fitRound() {
  const c = getCourse(cfg.course);
  if (!c) return;
  if (!roundOk(cfg.round, c))
    cfg.round =
      ["full18", "front9", "half6", "quick3", "all"].find((k) =>
        roundOk(k, c),
      ) || "all";
  if (ROUNDS[cfg.round].start) cfg.start = ROUNDS[cfg.round].start;
  else if (cfg.start > c.holes.length) cfg.start = 1;
}
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (n) => Math.round(n * 10) / 10;
const fmtPar = (n) => (n === 0 ? "E" : n > 0 ? "+" + n : String(n));
const parCls = (n) => (n < 0 ? "under" : n > 0 ? "over" : "");
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const ANIMALS = [
  "Tiger",
  "Eagle",
  "Panther",
  "Falcon",
  "Shark",
  "Cobra",
  "Wolf",
  "Bear",
  "Lion",
  "Hawk",
  "Fox",
  "Rhino",
];
function defName(i) {
  const n = ANIMALS.length;
  return ANIMALS[i % n] + (i >= n ? " " + (Math.floor(i / n) + 1) : "");
}
function cfgName(i) {
  return ((cfg.players[i] && cfg.players[i].name) || "").trim() || defName(i);
}
// Names are frozen into G when a round starts, so saved rounds keep their
// names. Older saves without G.names fall back to the setup form.
function pName(i) {
  return (G && G.names && G.names[i]) || cfgName(i);
}

function makeHole(label, baseDist) {
  const par =
    baseDist <= 250 ? 3 : baseDist <= 470 ? 4 : baseDist <= 690 ? 5 : 6;
  const maxVar = 20 + baseDist * 0.05;
  return {
    label,
    baseDist,
    par,
    width: maxVar * 2,
    maxVar,
    greenR: 10 + baseDist * 0.01,
    overhang: maxVar,
  };
}
function suggestPutts() {
  const ft = T.dist * 3;
  return ft <= 6 ? 1 : ft <= 40 ? 2 : 3;
}
function holeTitle(h) {
  return h.label === "Custom" ? "Custom" : "Hole " + h.label;
}
function curHole() {
  return G.holes[G.hi];
}
function onGreen() {
  return T.dist <= curHole().greenR;
}

// Slider range scales with the player's playing-distance factor:
//   max(200, baseDist * factor * 1.5)
const SLIDER_FLOOR = 200;
const SLIDER_HEADROOM = 1.5;
function smax() {
  const h = curHole(),
    p = G.players[G.pi];
  const scaled = Math.ceil(
    Math.max(SLIDER_FLOOR, h.baseDist * p.factor * SLIDER_HEADROOM),
  );
  // never let the slider end before the ball's current distance
  return Math.max(scaled, Math.ceil(T.dist));
}
function startRound() {
  const custom = cfg.course === "custom";
  let holes = [],
    course = null;
  if (custom) {
    if (!(+cfg.customDist > 0)) {
      cfg.err = "Enter a distance in yards.";
      render();
      return;
    }
    holes = [makeHole(1, clamp(Math.round(+cfg.customDist), 1, 2000))];
  } else {
    course = getCourse(cfg.course);
    if (!course) {
      cfg.course = "samarahan";
      fitRound();
      render();
      return;
    }
    for (let k = 0; k < roundLen(cfg.round, course); k++) {
      const h = course.holes[(cfg.start - 1 + k) % course.holes.length];
      holes.push(makeHole(h.num, h.dist));
    }
  }
  const players = cfg.players.map((p, i) => ({ i, factor: p.factor }));
  const names = cfg.players.map((p, i) => cfgName(i));
  histView = false;
  G = {
    id: Date.now(),
    saved: false,
    names,
    course,
    custom,
    holes,
    hi: 0,
    pi: 0,
    players,
    scores: players.map(() => holes.map(() => null)),
    stats: players.map(() => holes.map(() => null)),
  };
  resume = null;
  keepAwake();
  startTurn();
  screen = "play";
  render();
}
function startTurn() {
  const h = curHole(),
    p = G.players[G.pi];
  T = {
    dist: r1(h.baseDist * p.factor),
    strokes: 0,
    history: [],
    shot: 0,
    vari: 0,
    side: 1,
    msg: null,
    putts: 2,
    pens: 0,
    fw: null,
    greenAt: null,
    shots: [],
    club: "",
  };
  resetInputs();
  if (onGreen()) T.greenAt = 0;
}
function resetInputs() {
  T.shot = r1(clamp(T.dist, 0, smax()));
  T.vari = 0;
  T.club = ""; // club defaults to NA for every shot
}

function totals(pi) {
  let strokes = 0,
    par = 0,
    pts = 0;
  G.scores[pi].forEach((s, k) => {
    if (s !== null) {
      strokes += s;
      par += G.holes[k].par;
      pts += Math.max(0, 2 - (s - G.holes[k].par));
    }
  });
  return { strokes, toPar: strokes - par, pts };
}

// ---------- actions ----------
function takeShot() {
  const h = curHole(),
    d = T.shot,
    v = T.vari,
    why = [],
    lim = h.maxVar;
  T.history.push({
    dist: T.dist,
    strokes: T.strokes,
    pens: T.pens,
    fw: T.fw,
    greenAt: T.greenAt,
    ns: T.shots.length,
  });
  T.shots.push({ d, v, club: T.club || "", ob: false });
  if (Math.abs(v) > lim)
    why.push(
      "variation " +
        fmt1(Math.abs(v)) +
        " is past the max of " +
        fmt1(lim),
    );
  if (d - T.dist > h.overhang)
    why.push(
      "shot is " +
        fmt1(d - T.dist) +
        " yds past the pin, over the limit of " +
        fmt1(h.overhang),
    );
  if (why.length) {
    T.shots[T.shots.length - 1].ob = true;
    T.strokes += 2;
    T.pens += 1;
    buzz([80, 50, 80]);
    if (T.fw === null) T.fw = false;
    T.msg = {
      t: "bad",
      s:
        "Out of bounds: " +
        why.join("; ") +
        ". Ball has not moved. +2 strokes (the shot plus a 1 stroke penalty). Try again.",
    };
    resetInputs();
  } else {
    const forwardDist = Math.abs(T.dist - d);
    const sideDist = Math.abs(v);
    T.dist = r1(Math.sqrt(forwardDist ** 2 + sideDist ** 2));
    T.strokes += 1;
    const fair = Math.abs(v) <= lim / 2;
    const miss =
      v === 0
        ? "Dead straight. "
        : fmt1(Math.abs(v)) +
          " yds " +
          (v < 0 ? "left" : "right") +
          (d > 0
            ? " (" +
              ((Math.abs(v) * 100) / d).toFixed(1) +
              "% of the shot). "
            : ". ");
    if (T.fw === null) T.fw = fair;
    if (T.greenAt === null && onGreen()) T.greenAt = T.strokes;
    T.msg = onGreen()
      ? {
          t: "ok",
          s:
            "On the green, " +
            fmt1(T.dist) +
            " yds (" +
            fmt1(T.dist * 3) +
            " ft) to the pin. Tap Putt or keep hitting.",
        }
      : {
          t: "ok",
          s:
            (fair ? "You hit the fairway. " : "You are in the rough. ") +
            miss +
            "Ball is now " +
            fmt1(T.dist) +
            " yds from the hole.",
        };
    resetInputs();
  }
  render(true); // snap back to the top after every shot
}
function undoShot() {
  if (!T.history.length) return;
  const last = T.history.pop();
  T.dist = last.dist;
  T.strokes = last.strokes;
  T.pens = last.pens;
  T.fw = last.fw;
  T.greenAt = last.greenAt;
  if (last.ns !== undefined) T.shots.length = last.ns;
  resetInputs();
  T.msg = { t: "ok", s: "Last shot undone." };
  render();
}
function finishHole() {
  T.strokes += T.putts;
  G.scores[G.pi][G.hi] = T.strokes;
  G.stats[G.pi][G.hi] = {
    pens: T.pens,
    fw: T.fw,
    gir: T.greenAt !== null && T.greenAt <= curHole().par - 2,
    putts: T.putts,
    shots: T.shots.slice(),
  };
  if (T.strokes - curHole().par < 0) buzz(150);
  screen = "result";
  render();
}
function advance() {
  if (G.pi < G.players.length - 1) {
    G.pi++;
  } else {
    G.pi = 0;
    G.hi++;
  }
  if (!G.custom && G.hi >= G.holes.length) {
    screen = "final";
    render();
    return;
  }
  if (G.custom && G.pi === 0) {
    G.hsd = G.holes[G.hi - 1].baseDist;
    screen = "holeset";
    render();
    return;
  }
  startTurn();
  screen = "play";
  render();
}

// ---------- storage, history, extras ----------
const LS = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
};
let resume = LS.get("pgs:save");
if (resume && !(resume.G && resume.T && resume.screen)) resume = null;

// Player names and playing distances are remembered between sessions.
const PLAYERS_KEY = "pgs:players";
function savePlayers() {
  LS.set(
    PLAYERS_KEY,
    cfg.players.map((p) => ({ name: p.name, factor: p.factor })),
  );
}
(function loadPlayers() {
  const saved = LS.get(PLAYERS_KEY);
  if (!Array.isArray(saved) || !saved.length) return;
  const list = saved.slice(0, 12).map((p) => ({
    name: typeof (p && p.name) === "string" ? p.name.slice(0, 40) : "",
    factor:
      typeof (p && p.factor) === "number" && p.factor >= 0.1 && p.factor <= 1.5
        ? Math.round(p.factor * 100) / 100
        : 1,
  }));
  cfg.players = list;
})();
function buzz(p) {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch (e) {}
}
let wake = null;
async function keepAwake() {
  try {
    if (navigator.wakeLock && !wake) {
      wake = await navigator.wakeLock.request("screen");
      wake.addEventListener("release", () => {
        wake = null;
      });
    }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && G && screen !== "setup")
    keepAwake();
});
function save() {
  if (G && screen !== "setup" && screen !== "final" && screen !== "builder")
    LS.set("pgs:save", { G, T, screen });
}
const HIST_KEY = "pgs:history";
const DETAILS_KEY = "pgs:roundDetails";
const HIST_MAX = 20;
function roundName() {
  return G.course ? G.course.name : FREE;
}
function finishRound() {
  LS.del("pgs:save");
  resume = null;
  if (G.saved) return;
  G.saved = true;
  const players = G.players.map((p, i) => {
    const t = totals(i);
    return {
      name: pName(p.i),
      factor: p.factor,
      strokes: t.strokes,
      toPar: t.toPar,
      pts: t.pts,
      holes: G.scores[i].filter((x) => x !== null).length,
    };
  });
  const holes = G.holes.filter((h, k) =>
    G.scores.some((sc) => sc[k] !== null),
  ).length;
  if (!holes) return;
  const date = Date.now();
  G.date = date;
  const hist = LS.get(HIST_KEY) || [];
  hist.unshift({
    id: G.id,
    date,
    course: roundName(),
    holes,
    players,
  });
  const newHist = hist.slice(0, HIST_MAX);

  // Full scorecard (same shape as G, so vFinal() can render it as-is).
  const detail = {
    id: G.id,
    date,
    saved: true,
    ended: !!G.ended,
    course: G.course,
    custom: G.custom,
    holes: G.holes,
    players: G.players,
    names: G.players.map((p) => pName(p.i)),
    scores: G.scores,
    stats: G.stats,
  };
  // Keep details only for rounds that are still in the summary list
  const keep = new Set(newHist.map((r) => r.id));
  const prevDetails = LS.get(DETAILS_KEY);
  const newDetails = [detail]
    .concat((prevDetails || []).filter((d) => d.id !== G.id))
    .filter((d) => keep.has(d.id))
    .slice(0, HIST_MAX);

  // Save both together: if the summary write fails, undo the details write.
  const okDetails = LS.set(DETAILS_KEY, newDetails);
  const okHist = LS.set(HIST_KEY, newHist);
  if (!okHist && okDetails) {
    if (prevDetails) LS.set(DETAILS_KEY, prevDetails);
    else LS.del(DETAILS_KEY);
  }
}
function bestFor(name, holes) {
  let best = null;
  (LS.get(HIST_KEY) || []).forEach((r) => {
    if (r.id === G.id || r.course !== roundName() || r.holes !== holes)
      return;
    r.players.forEach((p) => {
      if (
        p.name.toLowerCase() === name.toLowerCase() &&
        p.holes === holes &&
        (best === null || p.toPar < best)
      )
        best = p.toPar;
    });
  });
  return best;
}
function resumeCard() {
  if (!resume) return "";
  const g = resume.G;
  return `<div class="card"><h2 class="h3">Round in progress</h2><div class="hint flush">${esc(g.course ? g.course.name : FREE)} · hole ${g.hi + 1}</div><div class="row"><button class="primary" data-act="resume">Resume</button><button data-act="discard">Discard</button></div></div>`;
}
function historyLine(r) {
  return r.players
    .map(
      (p) =>
        `${esc(p.name)}${p.factor != null ? " " + Math.round(p.factor * 100) + "%" : ""} · ${fmtPar(p.toPar)} (${p.pts} pts)`,
    )
    .join(" · ");
}
function historyCard() {
  const hist = LS.get(HIST_KEY) || [];
  if (!hist.length) return "";
  const withDetails = new Set(
    (LS.get(DETAILS_KEY) || []).map((d) => String(d.id)),
  );
  return `<div class="card mt"><h2 class="h3">Recent rounds</h2>${hist
    .slice(0, 6)
    .map((r) => {
      const body = `<b>${esc(new Date(r.date).toLocaleDateString())}</b> · ${esc(r.course)} · ${r.holes} holes<br>${historyLine(r)}`;
      return withDetails.has(String(r.id))
        ? `<button class="hist" data-act="view-history" data-id="${esc(r.id)}">${body}</button>`
        : `<div class="tl">${body}</div>`;
    })
    .join("")}</div>`;
}

// ---------- views ----------
function optList(items, sel) {
  return items
    .map(
      ([v, l]) =>
        `<option value="${v}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`,
    )
    .join("");
}
function courseInfo(c) {
  return (
    `${c.teeName} · ${c.totalYardage.toLocaleString("en-US")} yds` +
    (c.courseRating && c.slopeRating
      ? ` · Rating ${c.courseRating} / Slope ${c.slopeRating}`
      : "")
  );
}

function courseOptions() {
  const own = Object.entries(UC);
  return (
    optList(
      Object.entries(COURSES).map(([k, v]) => [k, v.name]),
      cfg.course,
    ) +
    (own.length
      ? `<optgroup label="My courses">${optList(
          own.map(([k, v]) => [k, v.name]),
          cfg.course,
        )}</optgroup>`
      : "") +
    optList([["custom", "Free Play (Any Yardage)"]], cfg.course)
  );
}
function roundHint(c) {
  const n = roundLen(cfg.round, c),
    end = cfg.start + n - 1;
  if (end > c.holes.length)
    return `Plays ${n} holes from hole ${cfg.start}, wrapping back to hole 1 after ${c.holes.length}.`;
  return n === 1
    ? `Plays hole ${cfg.start}.`
    : `Plays ${n} holes, hole ${cfg.start} to ${end}.`;
}
const isStandalone = () =>
  (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
  navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installCard() {
  if (isStandalone()) return "";
  if (deferredInstall)
    return `<div class="card mt"><h2 class="h3">Install Napkin Golf</h2><div class="hint flush">Add it to your home screen to play full screen, even offline.</div><button class="wide" data-act="install">Install app</button></div>`;
  if (isIOS())
    return `<div class="card mt"><h2 class="h3">Install Napkin Golf</h2><div class="hint">In Safari, tap the Share button, then Add to Home Screen. It will open full screen and work offline.</div></div>`;
  return "";
}

function vSetup() {
  const custom = cfg.course === "custom",
    c = getCourse(cfg.course);
  const rows = cfg.players
    .map(
      (p, i) => `
    <div class="prow">
<label for="n${i}">Player ${i + 1}</label>
<div class="row"><input type="text" id="n${i}" data-k="name" data-i="${i}" placeholder="${esc(defName(i))}" value="${esc(p.name)}">
<button class="rm" data-act="rm" data-v="${i}" ${cfg.players.length <= 1 ? "disabled" : ""}>Remove</button></div>
<label for="f${i}">Playing distance (forward tees)</label>
<div class="fslider"><input type="range" id="f${i}" data-k="factor" data-i="${i}" min="10" max="150" step="5" value="${Math.round(p.factor * 100)}"><output id="fo${i}" for="f${i}">${Math.round(p.factor * 100)}%</output></div>
    </div>`,
    )
    .join("");
  return `
  <h1>Napkin Golf</h1>
  <p class="sub">Numbers-only golf for the driving range.</p>
  ${resumeCard()}
  <div class="cols">
  <div class="card">
    <label for="course">Course</label>
    <select id="course">${courseOptions()}</select>
    ${custom ? "" : `<div class="hint">${esc(courseInfo(c))}</div>`}
    <div class="course-actions">
      <div class="row">
        <button data-act="newcourse">+ Build a course</button>
        ${c && c.user ? `<button data-act="editcourse">Edit</button><button class="warn-text" data-act="delask">Delete</button>` : ""}
      </div>
      <div class="hint">Course not listed? <a href="${esc(COURSE_REQUEST_URL)}" target="_blank" rel="noopener">Request it</a></div>
    </div>
    ${
custom
  ? `
<label for="cdist">First hole distance (yards)</label>
<input type="number" id="cdist" inputmode="numeric" min="1" value="${esc(cfg.customDist)}" placeholder="e.g. 127">
${cfg.err ? `<div class="err">${esc(cfg.err)}</div>` : ""}
<div class="hint">Play as many holes as you like and tap End game when you are done. Before each new hole you can change the distance or keep it the same. Stats build up across the session.</div>
    `
  : `
<label for="round">Round length</label>
<select id="round">${optList(
  Object.entries(ROUNDS)
    .filter(([k]) => roundOk(k, c))
    .map(([k, v]) => [k, v.label]),
  cfg.round,
)}</select>
<label for="start">Starting hole</label>
<select id="start">${optList(
  c.holes.map((h) => [h.num, "Hole " + h.num + " · " + h.dist + " yds"]),
  cfg.start,
)}</select>
<div class="hint">${roundHint(c)}</div>
    `
    }
  </div>
  <div class="card">
    ${rows}
    <div class="help">${HELP}</div>
    <button class="wide mt" data-act="add">Add Player</button>
  </div>
  </div>
  <button class="primary" data-act="start">Start round</button>
  ${historyCard()}
  ${installCard()}
  <div class="foot"><button class="linkbtn" data-act="clearask">Clear saved data</button></div>`;
}

function scoreboard() {
  return `<div class="sb">${G.players
    .map((p, k) => {
      const t = totals(k);
      return `<span><b>${esc(pName(p.i))}</b> ${t.strokes} · <span class="${parCls(t.toPar)}">${fmtPar(t.toPar)}</span></span>`;
    })
    .join("")}</div>`;
}

function syncVar() {
  const n = $("#varNum"),
    sl = $("#vslider");
  if (n) n.value = fmt1(Math.abs(T.vari));
  if (sl && +sl.value !== T.vari) sl.value = T.vari;
  $("#segL").classList.toggle("on", T.side < 0);
  $("#segR").classList.toggle("on", T.side > 0);
}
function syncShot() {
  const n = $("#shotNum"),
    sl = $("#slider");
  if (n) n.value = fmt1(T.shot);
  if (sl && +sl.value !== T.shot) sl.value = T.shot;
}
function topBar(showScore) {
  return `<div class="top">${showScore ? scoreboard() : '<div class="grow"></div>'}<button class="exit" data-act="exit">End game</button></div>`;
}
function vPlay() {
  const h = curHole(),
    p = G.players[G.pi],
    g = onGreen();
  const eff = r1(h.baseDist * p.factor);
  const hdr = G.course
    ? G.course.name + " · " + G.course.teeName
    : FREE;
  return `
  ${topBar(true)}
  <div class="hd"><span>${esc(hdr)}</span></div>
  <div class="hd sp"><b>${esc(pName(p.i))}</b><span>${holeTitle(h)} · Par ${h.par} · Start ${fmt1(eff)} yds</span></div>
  <div class="card">
    <div class="big">
<div><div class="num">${fmt1(T.dist)}</div><div class="lab">Yards to hole</div></div>
<div><div class="num">${T.strokes}</div><div class="lab">Strokes</div></div>
    </div>
    <div class="lim">Max var ±${fmt1(h.maxVar)} · Green ${fmt1(h.greenR)} yds · Overhang ${fmt1(h.overhang)} yds</div>
  </div>
  ${T.msg ? `<div class="msg ${T.msg.t}" role="status">${esc(T.msg.s)}</div>` : ""}
  ${g ? `<button class="putt-big" data-act="putt">Putt<small>${fmt1(T.dist * 3)} ft to the pin</small></button>` : ""}
  <div class="card clubrow"><label for="club">Club</label><select id="club"><option value="" ${T.club ? "" : "selected"}>NA</option>${optList(
    CLUBS.map((k) => [k, k]),
    T.club || "",
  )}</select></div>
  <div class="inputs">
  <div class="card inp">
    <div class="lab">Distance (yds) · tap the number to type</div>
    <input type="number" class="numin" id="shotNum" inputmode="decimal" step="0.1" min="0" value="${fmt1(T.shot)}" aria-label="Shot distance in yards">
    <input type="range" id="slider" min="0" max="${smax()}" step="0.1" value="${T.shot}" aria-label="Shot distance">
    <div class="btns">
<button data-act="d" data-v="-10">−10</button><button data-act="d" data-v="-1">−1</button><button data-act="d" data-v="-0.1">−0.1</button>
<button data-act="d" data-v="0.1">+0.1</button><button data-act="d" data-v="1">+1</button><button data-act="d" data-v="10">+10</button>
    </div>
  </div>
  <div class="card inp">
    <div class="lab">Variation (yds) · tap the number to type</div>
    <input type="number" class="numin" id="varNum" inputmode="decimal" step="0.1" min="0" value="${fmt1(Math.abs(T.vari))}" aria-label="Variation in yards">
    <div class="row seg"><button id="segL" data-act="side" data-v="-1" class="${T.side < 0 ? "on" : ""}">◀ Left</button><button id="segR" data-act="side" data-v="1" class="${T.side > 0 ? "on" : ""}">Right ▶</button></div>
    <input type="range" id="vslider" min="-50" max="50" step="0.1" value="${T.vari}" aria-label="Variation">
    <div class="btns">
<button data-act="v" data-v="-5">◀5</button><button data-act="v" data-v="-1">◀1</button><button data-act="v" data-v="-0.1">◀.1</button>
<button data-act="v" data-v="0.1">.1▶</button><button data-act="v" data-v="1">1▶</button><button data-act="v" data-v="5">5▶</button>
    </div>
  </div>
  </div>
  <div class="stack">
    <button class="primary" data-act="shot">Take Shot</button>
    <div class="row">
<button data-act="undo" ${T.history.length ? "" : "disabled"}>Undo Last Shot</button>
<button data-act="reset">Reset Shot</button>
    </div>
  </div>`;
}

// What the player is putting for, based on strokes so far + selected putts
function puttTarget() {
  const d = T.strokes + T.putts - curHole().par;
  let word;
  if (d <= -2) word = "Eagle or better";
  else if (d === -1) word = "Birdie";
  else if (d === 0) word = "Par";
  else if (d === 1) word = "Bogey";
  else if (d === 2) word = "Double Bogey";
  else if (d === 3) word = "Triple Bogey";
  else word = d + " Over Par";
  return { d, word };
}
function vPutt() {
  const h = curHole(),
    p = G.players[G.pi],
    pt = puttTarget();
  return `
  ${topBar(true)}
  <div class="hd"><span>${esc(G.course ? G.course.name : FREE)}</span><b>${esc(pName(p.i))} · ${holeTitle(h)}</b></div>
  <h2 class="title">On the green</h2>
  <div class="card center">
    <div class="puttfor ${pt.d < 0 ? "under" : pt.d > 0 ? "over" : ""}" role="status">Putting for ${pt.word}</div>
    <div class="num">${fmt1(T.dist * 3)}</div><div class="lab">feet to pin</div><div class="lab">(${fmt1(T.dist)} yds)</div>
    <div class="lab mt">Number of putts</div>
    <div class="row stepper">
<button data-act="pm" data-v="-1" ${T.putts <= (T.strokes ? 0 : 1) ? "disabled" : ""} aria-label="Fewer putts">−1</button>
<div class="num">${T.putts}</div>
<button data-act="pm" data-v="1" ${T.putts >= 9 ? "disabled" : ""} aria-label="More putts">+1</button>
    </div>
    <div class="hint">${T.putts === 0 ? "Holed out without putting. " : ""}Strokes so far ${T.strokes} → hole total ${T.strokes + T.putts}</div>
  </div>
  <div class="stack">
    <button class="primary" data-act="finish">Finish Hole</button>
    <button data-act="keep">Keep Hitting</button>
  </div>`;
}

function scoreWord(d, s) {
  if (s === 1) return "Hole in one";
  return (
    {
      "-3": "Albatross",
      "-2": "Eagle",
      "-1": "Birdie",
      0: "Par",
      1: "Bogey",
      2: "Double bogey",
      3: "Triple bogey",
    }[d] || (d > 2 ? d + " over par" : -d + " under par")
  );
}
function vResult() {
  const h = curHole(),
    s = G.scores[G.pi][G.hi],
    d = s - h.par,
    p = G.players[G.pi];
  const last = G.pi === G.players.length - 1,
    lastHole = !G.custom && G.hi === G.holes.length - 1;
  let btns;
  if (!last)
    btns = `<button class="primary" data-act="next">Pass to ${esc(pName(G.players[G.pi + 1].i))}</button>`;
  else if (lastHole)
    btns = `<button class="primary" data-act="next">View Final Scorecard</button>`;
  else
    btns = `<button class="primary" data-act="next">Next Hole</button>`;
  return `
  ${topBar(false)}
  <div class="hd"><span>${esc(G.course ? G.course.name : FREE)}</span><b>${esc(pName(p.i))} · ${holeTitle(h)}</b></div>
  <div class="card center mt">
    <div class="verdict ${parCls(d)}">${scoreWord(d, s)}</div>
    <div class="verdict-sub ${parCls(d)}">${fmtPar(d)}</div>
    <div class="lab mt">${s} strokes · Par ${h.par} · ${Math.max(0, 2 - d)} Stableford pts</div>
  </div>
  <div class="card cum">
    <h2>Running total</h2>
    ${G.players
.map((q, k) => {
  const t = totals(k);
  return `<div class="r"><span>${esc(pName(q.i))}</span><span><b>${t.strokes}</b> · <span class="${parCls(t.toPar)}">${fmtPar(t.toPar)}</span> · ${t.pts} pts</span></div>`;
})
.join("")}
  </div>
  <div class="stack">${btns}<button data-act="fix">Change putts</button></div>`;
}

function holeDiff(d) {
  const p = G.holes[G.hi - 1].baseDist;
  if (!(d > 0)) return "Enter a distance.";
  const x = r1(d - p);
  return x === 0
    ? "Same as the last hole (" + p + " yds)."
    : fmt1(Math.abs(x)).replace(/\.0$/, "") +
        " yards " +
        (x > 0 ? "more" : "less") +
        " than the last hole (" +
        p +
        " yds).";
}
function holePrev(d) {
  if (!(d > 0)) return "";
  const h = makeHole(0, d);
  return `Par ${h.par} · Max var ±${fmt1(h.maxVar)} · Green ${fmt1(h.greenR)} yds · Overhang ${fmt1(h.overhang)} yds`;
}
function vHoleSet() {
  return `
  ${topBar(false)}
  <div class="hd"><span>${FREE}</span><b>Hole ${G.hi + 1}</b></div>
  <h2 class="title">Next hole</h2>
  <div class="card center">
    <label for="hsd">Distance to hole (yards)</label>
    <input type="number" class="numin" id="hsd" inputmode="numeric" min="1" step="1" value="${G.hsd}">
    <div class="btns two"><button data-act="hs" data-v="-10">−10</button><button data-act="hs" data-v="-1">−1</button><button data-act="hs" data-v="1">+1</button><button data-act="hs" data-v="10">+10</button></div>
    <div class="hint" id="hsPrev">${holePrev(+G.hsd)}</div>
    <div class="hint" id="hsDiff">${holeDiff(+G.hsd)}</div>
  </div>
  <div class="stack"><button class="primary" data-act="hsstart">Start hole</button></div>`;
}
function pstats(i) {
  const o = { fwH: 0, fwN: 0, gir: 0, n: 0, pens: 0, strokes: 0, putts: 0 };
  G.stats[i].forEach((x, k) => {
    if (!x) return;
    o.n++;
    o.strokes += G.scores[i][k];
    o.pens += x.pens;
    o.putts += x.putts;
    if (x.gir) o.gir++;
    if (x.fw !== null) {
      o.fwN++;
      if (x.fw) o.fwH++;
    }
  });
  return o;
}
function vFinal() {
  const c = G.course;
  const played = G.holes
    .map((h, k) => k)
    .filter((k) => G.scores.some((sc) => sc[k] !== null));
  const parTot = played.reduce((a, k) => a + G.holes[k].par, 0);
  const rows = played
    .map((k) => {
      const h = G.holes[k];
      return `<tr><td class="hn">${h.label}</td>${c ? "" : `<td class="pr">${r1(h.baseDist)}</td>`}<td class="pr">${h.par}</td>${G.players
        .map((p, i) => {
          const sc = G.scores[i][k];
          if (sc === null) return `<td class="mu">–</td>`;
          const d = sc - h.par;
          return `<td class="sc ${parCls(d)}">${fmtPar(d)}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");
  const foot = G.players
    .map((p, i) => {
      const t = totals(i);
      return `<td class="sc ${parCls(t.toPar)}">${fmtPar(t.toPar)}<div class="st">${t.strokes} strokes</div></td>`;
    })
    .join("");
  const pct = (a, b) => (b ? Math.round((a * 100) / b) + "%" : "–");
  const st = G.players.map((p, i) => {
    const { fwH, fwN, gir, n, pens, strokes, putts } = pstats(i);
    return {
      fw: fwN ? `${fwH}/${fwN} · ${pct(fwH, fwN)}` : "–",
      gir: n ? `${gir}/${n} · ${pct(gir, n)}` : "–",
      pen: n ? `${pens} · ${pct(pens, strokes)}` : "–",
      pt: n ? (putts / n).toFixed(1) : "–",
      pts: n ? totals(i).pts : "–",
      diff:
        n && c && c.courseRating && c.slopeRating
          ? ((v) => (v > 0 ? "+" : "") + v.toFixed(1))(
              ((strokes - (c.courseRating * n) / c.holes.length) * 113) /
                c.slopeRating,
            )
          : "–",
    };
  });
  const srow = (label, key) =>
    `<tr><td class="hn">${label}</td>${st.map((x) => `<td>${x[key]}</td>`).join("")}</tr>`;
  const shape = (() => {
    const blocks = G.players
      .map((p, i) => {
        const shots = [];
        G.stats[i].forEach((x) => {
          if (x && x.shots) shots.push(...x.shots);
        });
        if (!shots.length) return "";
        const L = shots.filter((s) => s.v < 0),
          R = shots.filter((s) => s.v > 0),
          S = shots.length - L.length - R.length;
        const sumAbs = (a) => a.reduce((t, s) => t + Math.abs(s.v), 0),
          sumD = (a) => a.reduce((t, s) => t + s.d, 0);
        const pctD = (a) =>
          sumD(a) > 0
            ? ((sumAbs(a) * 100) / sumD(a)).toFixed(1) + "% of distance"
            : "";
        const side = (name, a, col) =>
          `<span style="color:${col}">■</span> ${name} <b>${a.length}</b> (${pct(a.length, shots.length)})` +
          (a.length
            ? ` · avg ${(sumAbs(a) / a.length).toFixed(1)} yds · ${pctD(a)}`
            : "");
        const avg = sumAbs(shots) / shots.length,
          bias = shots.reduce((t, s) => t + s.v, 0) / shots.length;
        const tend =
          Math.abs(bias) < Math.max(0.5, avg * 0.15)
            ? "No strong left or right tendency"
            : `Drifts ${bias > 0 ? "right" : "left"} by ${Math.abs(bias).toFixed(1)} yds on average`;
        const bar = `<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin:6px 0 4px"><div style="flex:${L.length};background:var(--blue)"></div><div style="flex:${S};background:var(--green)"></div><div style="flex:${R.length};background:#d99a2b"></div></div>`;
        return `<div style="margin-bottom:14px"><div><b>${esc(pName(p.i))}</b> <span class="mu">· ${shots.length} shots</span></div>${bar}<div class="tl">${side("Left", L, "var(--blue)")}</div><div class="tl"><span style="color:var(--green)">■</span> Straight <b>${S}</b> (${pct(S, shots.length)})</div><div class="tl">${side("Right", R, "#d99a2b")}</div><div class="tl"><b>Overall</b> avg miss ${avg.toFixed(1)} yds · ${pctD(shots)}</div><div class="tl">${tend}</div></div>`;
      })
      .join("");
    return blocks
      ? `<div class="card"><h2 class="h3">Shot tendencies</h2>${blocks}<div class="hint">Every swing counts, including out of bounds shots. Percentages are the sideways miss as a share of the distance you hit.</div></div>`
      : "";
  })();
  const pbHtml = histView ? "" : G.players
    .map((p, i) => {
      const n = G.scores[i].filter((x) => x !== null).length;
      if (!n || n !== played.length) return "";
      const prev = bestFor(pName(p.i), n),
        t = totals(i);
      return prev !== null && t.toPar < prev
        ? `<div class="msg ok">🏆 ${esc(pName(p.i))}: new personal best here (${fmtPar(t.toPar)}, previous ${fmtPar(prev)})</div>`
        : "";
    })
    .join("");
  const tally = G.players
    .map((p, i) => {
      const n = {
        "Eagle+": 0,
        Birdies: 0,
        Pars: 0,
        Bogeys: 0,
        "Double+": 0,
      };
      G.scores[i].forEach((sc, k) => {
        if (sc === null) return;
        const d = sc - G.holes[k].par;
        if (sc === 1 || d <= -2) n["Eagle+"]++;
        else if (d === -1) n.Birdies++;
        else if (d === 0) n.Pars++;
        else if (d === 1) n.Bogeys++;
        else n["Double+"]++;
      });
      const parts = Object.entries(n)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ");
      return `<div class="tl"><b>${esc(pName(p.i))}</b> ${parts || "–"}</div>`;
    })
    .join("");
  return `
  <h2 class="title">${histView ? "Scorecard · " + esc(new Date(G.date).toLocaleDateString()) : G.ended ? "Scorecard · game ended" : "Final scorecard"}</h2>
  <p class="sub">${c ? `${esc(c.name)} · ${esc(courseInfo(c))}` : `${FREE} · ${played.length} hole${played.length === 1 ? "" : "s"}`}</p>
  ${pbHtml}
  ${
    parTot
? `<div class="card wrap"><table>
    <thead><tr><th>Hole</th>${c ? "" : "<th>Yds</th>"}<th>Par</th>${G.players.map((p) => `<th>${esc(pName(p.i))}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td class="hn">Total</td>${c ? "" : `<td class="pr">${r1(played.reduce((a, k) => a + G.holes[k].baseDist, 0))}</td>`}<td class="pr">${parTot}</td>${foot}</tr></tfoot>
  </table></div>
  <div class="card">${tally}</div>
  <div class="card wrap"><table>
    <thead><tr><th>Stats</th>${G.players.map((p) => `<th>${esc(pName(p.i))}</th>`).join("")}</tr></thead>
    <tbody>${srow("Tee shots on fairway", "fw")}${srow("Greens in reg.", "gir")}${srow("Penalties (% of strokes)", "pen")}${srow("Putts per hole", "pt")}${srow("Stableford pts", "pts")}${c && c.courseRating && c.slopeRating ? srow("Paper differential", "diff") : ""}</tbody>
  </table></div>
  <p class="hint">Tee shot on fairway: the first shot of a hole lands within half the max variation (wider is the rough). Green in regulation: on the green in par minus 2 strokes or fewer. Penalties count out of bounds shots. Stableford: 2 pts for par, 3 birdie, 4 eagle, 1 bogey. Paper differential: (strokes minus course rating) x 113 / slope, scaled to the holes played. It assumes full distance, so it is most meaningful at 100%.</p>
  ${dispersionCard()}
  ${shape}`
: `<p class="sub">No holes were completed.</p>`
  }
  <div class="stack">${parTot ? `<button data-act="share">Share score card</button>` : ""}<button class="primary" data-act="menu">${histView ? "Back to Menu" : "New Round"}</button></div>`;
}

function render(toTop) {
  const app = $("#app");
  // Only jump to the top when the screen actually changes. Re-rendering the
  // same screen (e.g. after Take Shot or Undo) keeps the scroll position.
  const sameScreen = screen === lastScreen;
  const y = window.scrollY;
  app.innerHTML = {
    setup: vSetup,
    play: vPlay,
    putt: vPutt,
    result: vResult,
    final: vFinal,
    holeset: vHoleSet,
    builder: vBuilder,
  }[screen]();
  if (screen === "final" && lastScreen !== "final") {
    dispP = 0;
    dispC = "all";
  }
  lastScreen = screen;
  window.scrollTo(0, sameScreen && !toTop ? y : 0);
  if (dlg) app.insertAdjacentHTML("beforeend", modalHtml());
  if (screen === "final") {
    if (!histView) finishRound();
  } else save();
}

// ---------- dialogs + toast ----------
function modalHtml() {
  let h, p, no, yes;
  if (dlg === "delcourse") {
    const c = UC[cfg.course];
    h = "Delete course?";
    p = `“${esc(c ? c.name : "")}” will be removed from this device. Rounds you already played on it stay in your history.`;
    no = `<button data-act="dlgno">Cancel</button>`;
    yes = `<button class="danger" data-act="delyes">Delete</button>`;
  } else if (dlg === "clear") {
    h = "Clear saved data?";
    p = "This removes your round history, any round in progress, saved player names, and every course you built on this device. It can’t be undone.";
    no = `<button data-act="dlgno">Cancel</button>`;
    yes = `<button class="danger" data-act="clearyes">Clear everything</button>`;
  } else {
    h = "End game?";
    p = "Are you sure? The round will end and the scores will be shown as they stand.";
    no = `<button data-act="dlgno">Keep playing</button>`;
    yes = `<button class="danger" data-act="exityes">End game</button>`;
  }
  return `<div class="modal" role="dialog" aria-modal="true"><div class="mbox"><h2>${h}</h2><p class="sub">${p}</p><div class="row">${no}${yes}</div></div></div>`;
}
let toastTimer = null;
function toast(msg) {
  const old = $(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}
function clearAll() {
  ["pgs:save", HIST_KEY, DETAILS_KEY, UC_KEY, PLAYERS_KEY].forEach((k) =>
    LS.del(k),
  );
  cfg.players = [{ name: "", factor: 1.0 }];
  UC = {};
  resume = null;
  if (cfg.course !== "custom" && !getCourse(cfg.course))
    cfg.course = "samarahan";
  fitRound();
}

// ---------- local course builder ----------
function openBuilder(id) {
  const c = id ? UC[id] : null;
  B = {
    id: c ? id : null,
    name: c ? c.name : "",
    tee: c && c.teeName !== "Tees" ? c.teeName : "",
    rating: c && c.courseRating ? String(c.courseRating) : "",
    slope: c && c.slopeRating ? String(c.slopeRating) : "",
    dists: c ? c.holes.map((h) => String(h.dist)) : Array(18).fill(""),
    err: "",
  };
  screen = "builder";
  render();
}
function vBuilder() {
  const grid = B.dists
    .map(
      (d, i) =>
        `<div><label for="bd${i}">Hole ${i + 1}</label><input type="number" id="bd${i}" data-k="bd" data-i="${i}" inputmode="numeric" min="1" max="1500" placeholder="yds" value="${esc(d)}"></div>`,
    )
    .join("");
  return `
  <h2 class="title">${B.id ? "Edit course" : "Build a course"}</h2>
  <p class="sub">Saved on this device only. Par is set from each hole’s yardage.</p>
  <div class="card">
    <label for="bname">Course name</label>
    <input type="text" id="bname" placeholder="e.g. Sunset Range" value="${esc(B.name)}" maxlength="40">
    <label for="btee">Tees (optional)</label>
    <input type="text" id="btee" placeholder="e.g. White Tees" value="${esc(B.tee)}" maxlength="30">
    <label for="bn">Number of holes</label>
    <select id="bn">${optList(
      Array.from({ length: 18 }, (_, i) => [i + 1, String(i + 1)]),
      B.dists.length,
    )}</select>
    <div class="row">
      <div><label for="brating">Rating (optional)</label><input type="number" id="brating" inputmode="decimal" step="0.1" placeholder="71.1" value="${esc(B.rating)}"></div>
      <div><label for="bslope">Slope (optional)</label><input type="number" id="bslope" inputmode="numeric" placeholder="133" value="${esc(B.slope)}"></div>
    </div>
    <div class="hint">Rating and slope are only used for the paper differential on the scorecard.</div>
  </div>
  <div class="card">
    <h2 class="h3">Hole yardages</h2>
    <div class="hgrid">${grid}</div>
  </div>
  ${B.err ? `<div class="msg bad" role="alert">${esc(B.err)}</div>` : ""}
  <div class="stack"><button class="primary" data-act="bsave">Save course</button><button data-act="bcancel">Cancel</button></div>`;
}
function saveBuilder() {
  const name = B.name.trim();
  if (!name) {
    B.err = "Give the course a name.";
    return render(true);
  }
  const dists = B.dists.map((x) => Math.round(+x));
  const bad = dists.findIndex((d) => !(d >= 1 && d <= 1500));
  if (bad >= 0) {
    B.err = `Enter a yardage for hole ${bad + 1} (1 to 1500).`;
    return render();
  }
  const course = {
    name,
    teeName: B.tee.trim() || "Tees",
    totalYardage: dists.reduce((a, d) => a + d, 0),
    holes: dists.map((dist, i) => ({ num: i + 1, dist })),
    user: true,
  };
  const rating = parseFloat(B.rating),
    slope = parseFloat(B.slope);
  if (rating > 0 && slope > 0) {
    course.courseRating = rating;
    course.slopeRating = Math.round(slope);
  }
  const id = B.id || "u" + Date.now();
  UC[id] = course;
  if (!LS.set(UC_KEY, UC)) {
    B.err = "Couldn’t save. Browser storage may be full or blocked.";
    return render();
  }
  cfg.course = id;
  B = null;
  fitRound();
  screen = "setup";
  render(true);
}

// ---------- shot dispersion map ----------
function allShots(i) {
  const a = [];
  G.stats[i].forEach((x) => {
    if (x && x.shots) a.push(...x.shots);
  });
  return a;
}
const tidy = (n) => fmt1(n).replace(/\.0$/, "");
function dispMap(shots) {
  const W = 320,
    H = 300,
    L = 40,
    R = 12,
    Tp = 12,
    Bt = 30,
    pw = W - L - R,
    ph = H - Tp - Bt;
  const xm = Math.ceil(Math.max(5, ...shots.map((s) => Math.abs(s.v))) / 5) * 5;
  const maxD = Math.max(10, ...shots.map((s) => s.d));
  const step = maxD > 400 ? 100 : maxD > 150 ? 50 : maxD > 60 ? 20 : 10;
  const ym = Math.ceil(maxD / step) * step;
  const X = (v) => L + ((v + xm) / (2 * xm)) * pw;
  const Y = (d) => Tp + ph - (d / ym) * ph;
  let g = "";
  for (let t = 0; t <= ym; t += step)
    g += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(t) + 3.5}" text-anchor="end" font-size="10" fill="var(--mute)">${t}</text>`;
  [-xm, -xm / 2, 0, xm / 2, xm].forEach((v) => {
    g += `<line x1="${X(v)}" x2="${X(v)}" y1="${Tp}" y2="${Tp + ph}" stroke="${v === 0 ? "var(--mute)" : "var(--line)"}" ${v === 0 ? 'stroke-dasharray="4 4"' : ""}/><text x="${X(v)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="var(--mute)">${v === 0 ? "0" : (v < 0 ? "L " : "R ") + tidy(Math.abs(v))}</text>`;
  });
  const ib = shots.filter((s) => !s.ob),
    ob = shots.filter((s) => s.ob);
  if (ib.length >= 3) {
    const mx = ib.reduce((t, s) => t + s.v, 0) / ib.length,
      my = ib.reduce((t, s) => t + s.d, 0) / ib.length;
    const sx = Math.sqrt(ib.reduce((t, s) => t + (s.v - mx) ** 2, 0) / ib.length),
      sy = Math.sqrt(ib.reduce((t, s) => t + (s.d - my) ** 2, 0) / ib.length);
    g += `<ellipse cx="${X(mx)}" cy="${Y(my)}" rx="${Math.max(2, (sx / (2 * xm)) * pw)}" ry="${Math.max(2, (sy / ym) * ph)}" fill="var(--gold)" fill-opacity=".12" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
  }
  ib.forEach((s) => {
    g += `<circle cx="${X(s.v)}" cy="${Y(s.d)}" r="4.5" fill="var(--green)" fill-opacity=".55" stroke="var(--green)"/>`;
  });
  ob.forEach((s) => {
    const x = X(s.v),
      y = Y(s.d);
    g += `<path d="M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}" stroke="var(--red)" stroke-width="2" stroke-linecap="round"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Shot dispersion map: distance hit versus yards left or right of the line" style="display:block;max-width:420px;margin:var(--s2) auto 0">${g}</svg>`;
}
function dispersionCard() {
  if (!G.players.some((p, i) => allShots(i).length)) return "";
  if (dispP >= G.players.length) dispP = 0;
  const mine = allShots(dispP);
  const used = CLUBS.filter((c) => mine.some((s) => s.club === c));
  const hasNA = mine.some((s) => !s.club);
  const opts = [["all", "All"]]
    .concat(used.map((c) => [c, c]))
    .concat(used.length && hasNA ? [[NA_KEY, "NA"]] : []);
  if (!opts.some(([k]) => k === dispC)) dispC = "all";
  const shots =
    dispC === "all"
      ? mine
      : mine.filter((s) => (dispC === NA_KEY ? !s.club : s.club === dispC));
  const chip = (act, attr, label, on) =>
    `<button class="chip${on ? " on" : ""}" data-act="${act}" ${attr} aria-pressed="${on}">${esc(label)}</button>`;
  const who =
    G.players.length > 1
      ? `<div class="chips">${G.players.map((p, i) => chip("dp", `data-v="${i}"`, pName(p.i), i === dispP)).join("")}</div>`
      : "";
  const clubs =
    used.length > 0
      ? `<div class="chips">${opts.map(([k, l]) => chip("dc", `data-club="${esc(k)}"`, l, k === dispC)).join("")}</div>`
      : "";
  const ib = shots.filter((s) => !s.ob),
    nOb = shots.length - ib.length;
  let line = "No shots for this filter.";
  if (shots.length) {
    const aD = ib.length ? ib.reduce((t, s) => t + s.d, 0) / ib.length : 0,
      aM = ib.length ? ib.reduce((t, s) => t + Math.abs(s.v), 0) / ib.length : 0,
      bias = ib.length ? ib.reduce((t, s) => t + s.v, 0) / ib.length : 0;
    line = `<b>${shots.length}</b> shot${shots.length === 1 ? "" : "s"}${ib.length ? ` · avg ${fmt1(aD)} yds · avg miss ${fmt1(aM)} yds` : ""}${Math.abs(bias) >= 0.5 ? ` · leans ${bias > 0 ? "right" : "left"} ${fmt1(Math.abs(bias))}` : ""}${nOb ? ` · <span class="over">${nOb} out of bounds</span>` : ""}`;
  }
  return `<div class="card"><h2 class="h3">Shot dispersion</h2>${who}${clubs}${shots.length ? dispMap(shots) : ""}<div class="tl center">${line}</div><div class="hint">Each dot is a swing: how far you hit it (up) and how far left or right it missed (across). The dashed ring is one standard deviation around your average. Red crosses are out of bounds.</div></div>`;
}

// ---------- shareable score card ----------
function shareData() {
  const played = G.holes
    .map((h, k) => k)
    .filter((k) => G.scores.some((sc) => sc[k] !== null));
  return { played, date: G.date || Date.now() };
}
function shareText() {
  const { date } = shareData();
  const course = G.course ? G.course.name : FREE;
  return (
    `Napkin Golf · ${course} · ${new Date(date).toLocaleDateString()}\n` +
    G.players
      .map((p, i) => {
        const t = totals(i);
        return `${pName(p.i)}: ${fmtPar(t.toPar)} (${t.strokes} strokes)`;
      })
      .join("\n")
  );
}
function drawShareCanvas() {
  const { played, date } = shareData();
  const SERIF = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const SANS = SERIF; // one typeface throughout
  const W = 1080,
    M = 56,
    PAD = 36,
    COLS = 9;
  const cell = (W - 2 * M - 2 * PAD) / COLS;
  const rowsN = Math.max(1, Math.ceil(played.length / COLS));
  const blockH = 190 + rowsN * 112 + 76;
  const HEAD = 250,
    FOOT = 96;
  const H = HEAD + G.players.length * (blockH + 28) + FOOT;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  const rr = (px, py, w, h, r) => {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  };
  const txt = (t, px, py, font, color, align) => {
    x.font = font;
    x.fillStyle = color;
    x.textAlign = align || "left";
    x.textBaseline = "alphabetic";
    x.fillText(String(t), px, py);
  };
  const INK = "#1a2420",
    MUTE = "#66726b",
    GREEN = "#2f6b4f",
    RED = "#b3372c",
    GOLD = "#d99a2b";

  x.fillStyle = "#f1f4ef";
  x.fillRect(0, 0, W, H);
  // header band
  x.fillStyle = GREEN;
  x.fillRect(0, 0, W, HEAD - 30);
  x.fillStyle = GOLD;
  x.fillRect(0, HEAD - 36, W, 6);
  txt("NAPKIN GOLF", M, 78, `700 28px ${SANS}`, "#f1d9a0");
  txt(G.course ? G.course.name : FREE, M, 150, `800 62px ${SERIF}`, "#ffffff");
  const sub = [
    new Date(date).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    G.course ? G.course.teeName : "",
    `${played.length} hole${played.length === 1 ? "" : "s"}`,
    G.ended ? "ended early" : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  txt(sub, M, 198, `500 30px ${SANS}`, "#d6e6dc");

  let y = HEAD;
  G.players.forEach((p, i) => {
    const t = totals(i),
      st = pstats(i);
    rr(M, y, W - 2 * M, blockH, 28);
    x.fillStyle = "#fbfcfa";
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = "#d8ded6";
    x.stroke();
    const px = M + PAD;
    txt(pName(p.i), px, y + 72, `800 46px ${SERIF}`, INK);
    const meta = [`${t.strokes} strokes`, `${t.pts} pts`]
      .concat(p.factor !== 1 ? [`${Math.round(p.factor * 100)}% distance`] : [])
      .join("  ·  ");
    txt(meta, px, y + 116, `500 28px ${SANS}`, MUTE);
    txt(
      fmtPar(t.toPar),
      W - M - PAD,
      y + 118,
      `800 104px ${SERIF}`,
      t.toPar < 0 ? GREEN : t.toPar > 0 ? RED : INK,
      "right",
    );
    // hole grid
    const gy = y + 178;
    played.forEach((k, j) => {
      const col = j % COLS,
        row = Math.floor(j / COLS);
      const cx = px + col * cell + cell / 2,
        cy = gy + row * 112;
      const h = G.holes[k],
        sc = G.scores[i][k];
      txt(h.label, cx, cy + 22, `600 22px ${SANS}`, MUTE, "center");
      const bw = cell - 12,
        bh = 62,
        bx = cx - bw / 2,
        by = cy + 34;
      let fill = "#ecefe9",
        ink = MUTE,
        label = "–";
      if (sc !== null) {
        const d = sc - h.par;
        label = sc;
        if (sc === 1 || d <= -2) (fill = GOLD), (ink = INK);
        else if (d === -1) (fill = GREEN), (ink = "#fff");
        else if (d === 0) (fill = "#e3e8e1"), (ink = INK);
        else if (d === 1) (fill = "#f6d5d0"), (ink = RED);
        else (fill = RED), (ink = "#fff");
      }
      rr(bx, by, bw, bh, 14);
      x.fillStyle = fill;
      x.fill();
      txt(label, cx, by + 43, `800 34px ${SERIF}`, ink, "center");
    });
    const pct = st.fwN ? `${st.fwH}/${st.fwN}` : "–";
    const stats = [
      `Fairways ${pct}`,
      `GIR ${st.n ? st.gir + "/" + st.n : "–"}`,
      `Putts ${st.n ? (st.putts / st.n).toFixed(1) : "–"}/hole`,
      `Penalties ${st.pens}`,
    ].join("   ·   ");
    txt(stats, px, y + blockH - 30, `500 26px ${SANS}`, MUTE);
    y += blockH + 28;
  });
  txt("Scored with Napkin Golf", W / 2, H - 40, `500 26px ${SANS}`, MUTE, "center");
  return cv;
}
async function shareCard() {
  let blob;
  try {
    blob = await new Promise((res) => drawShareCanvas().toBlob(res, "image/png"));
  } catch (e) {}
  if (!blob) return toast("Couldn’t make the score card");
  const file = new File([blob], "napkin-golf-scorecard.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Napkin Golf", text: shareText() });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // person closed the share sheet
  }
  // no file sharing here (most desktops): download the image instead
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast("Score card saved as an image");
}

// ---------- events ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  e.preventDefault();
  const a = b.dataset.act,
    v = +b.dataset.v;
  if (a === "start") startRound();
  else if (a === "d") {
    // update in place (no re-render) so the page never moves
    T.shot = r1(clamp(T.shot + v, 0, smax()));
    syncShot();
    save();
  } else if (a === "v") {
    T.vari = r1(clamp(T.vari + v, -100, 100));
    if (T.vari) T.side = T.vari < 0 ? -1 : 1;
    syncVar();
    save();
  } else if (a === "view-history") {
    const d = (LS.get(DETAILS_KEY) || []).find(
      (x) => String(x.id) === b.dataset.id,
    );
    if (!d) return;
    G = d;
    G.saved = true;
    histView = true;
    dlg = null;
    screen = "final";
    render();
  } else if (a === "shot") takeShot();
  else if (a === "undo") undoShot();
  else if (a === "reset") {
    resetInputs();
    T.msg = null;
    render();
  } else if (a === "putt") {
    T.putts = suggestPutts();
    screen = "putt";
    render();
  } else if (a === "pm") {
    T.putts = clamp(T.putts + v, T.strokes ? 0 : 1, 9);
    render();
  } else if (a === "finish") finishHole();
  else if (a === "keep") {
    screen = "play";
    T.msg = null;
    render();
  } else if (a === "next") advance();
  else if (a === "add") {
    cfg.players.push({ name: "", factor: 1.0 });
    savePlayers();
    render();
  } else if (a === "rm") {
    if (cfg.players.length > 1) {
      cfg.players.splice(v, 1);
      savePlayers();
      render();
    }
  } else if (a === "fix") {
    T.strokes -= T.putts;
    G.scores[G.pi][G.hi] = null;
    G.stats[G.pi][G.hi] = null;
    screen = "putt";
    render();
  } else if (a === "resume") {
    G = resume.G;
    T = resume.T;
    if (!T.shots) T.shots = [];
    if (T.club === undefined) T.club = "";
    screen = resume.screen;
    resume = null;
    keepAwake();
    render();
  } else if (a === "discard") {
    LS.del("pgs:save");
    resume = null;
    render();
  } else if (a === "hs") {
    G.hsd = clamp((+G.hsd || 0) + v, 1, 2000);
    render();
  } else if (a === "hsstart") {
    const d = Math.round(+G.hsd);
    if (!(d > 0)) return;
    G.holes[G.hi] = makeHole(G.hi + 1, clamp(d, 1, 2000));
    G.players.forEach((_, i) => {
      G.scores[i][G.hi] = null;
      G.stats[i][G.hi] = null;
    });
    startTurn();
    screen = "play";
    render();
  } else if (a === "side") {
    T.side = v;
    T.vari = Math.abs(T.vari) * v;
    syncVar();
    save();
  } else if (a === "exit") {
    dlg = "exit";
    render();
  } else if (a === "dlgno") {
    dlg = null;
    render();
  } else if (a === "exityes") {
    dlg = null;
    G.ended = true;
    screen = "final";
    render();
  } else if (a === "newcourse") {
    openBuilder(null);
  } else if (a === "editcourse") {
    openBuilder(cfg.course);
  } else if (a === "bsave") saveBuilder();
  else if (a === "bcancel") {
    B = null;
    screen = "setup";
    render();
  } else if (a === "delask") {
    dlg = "delcourse";
    render();
  } else if (a === "delyes") {
    delete UC[cfg.course];
    LS.set(UC_KEY, UC);
    cfg.course = "samarahan";
    fitRound();
    dlg = null;
    render();
  } else if (a === "clearask") {
    dlg = "clear";
    render();
  } else if (a === "clearyes") {
    clearAll();
    dlg = null;
    render();
    toast("Saved data cleared");
  } else if (a === "dp") {
    dispP = v;
    dispC = "all";
    render();
  } else if (a === "dc") {
    dispC = b.dataset.club;
    render();
  } else if (a === "share") shareCard();
  else if (a === "install") {
    const p = deferredInstall;
    deferredInstall = null;
    if (p) {
      p.prompt();
      p.userChoice.finally(() => render());
    }
  } else if (a === "menu") {
    dlg = null;
    histView = false;
    screen = "setup";
    render();
  }
});
document.addEventListener("input", (e) => {
  const t = e.target,
    id = t.id;
  if (id === "slider") {
    T.shot = +t.value;
    $("#shotNum").value = fmt1(T.shot);
    save();
  } else if (id === "shotNum") {
    const n = parseFloat(t.value);
    if (!isNaN(n)) {
      T.shot = r1(clamp(n, 0, smax()));
      $("#slider").value = T.shot;
    }
  } else if (id === "varNum") {
    const n = parseFloat(t.value);
    if (!isNaN(n)) {
      T.vari = r1(clamp(Math.abs(n), 0, 100)) * T.side;
      $("#vslider").value = T.vari;
    }
  } else if (id === "vslider") {
    T.vari = +t.value;
    if (T.vari) T.side = T.vari < 0 ? -1 : 1;
    syncVar();
  } else if (id === "bname") B.name = t.value;
  else if (id === "btee") B.tee = t.value;
  else if (id === "brating") B.rating = t.value;
  else if (id === "bslope") B.slope = t.value;
  else if (t.dataset.k === "bd") B.dists[+t.dataset.i] = t.value;
  else if (t.dataset.k === "name") {
    cfg.players[+t.dataset.i].name = t.value;
    savePlayers();
  }
  else if (t.dataset.k === "factor") {
    const f = parseFloat(t.value) / 100;
    if (f >= 0.1 && f <= 1.5) {
      cfg.players[+t.dataset.i].factor = Math.round(f * 100) / 100;
      const o = $("#fo" + t.dataset.i);
      if (o) o.textContent = Math.round(f * 100) + "%";
      savePlayers();
    }
  } else if (id === "cdist") {
    cfg.customDist = t.value;
    cfg.err = "";
  } else if (id === "hsd") {
    G.hsd = +t.value;
    $("#hsPrev").textContent = holePrev(G.hsd);
    $("#hsDiff").textContent = holeDiff(G.hsd);
  }
});
document.addEventListener("change", (e) => {
  const t = e.target,
    id = t.id,
    v = t.value;
  if (id === "club") {
    T.club = v;
    save();
  } else if (id === "bn") {
    const n = +v;
    while (B.dists.length < n) B.dists.push("");
    B.dists.length = n;
    render();
  } else if (id === "course") {
    cfg.course = v;
    cfg.err = "";
    fitRound();
    render();
  } else if (id === "round") {
    cfg.round = v;
    if (ROUNDS[v].start) cfg.start = ROUNDS[v].start;
    render();
  } else if (id === "start") {
    cfg.start = +v;
    render();
  } else if (id === "shotNum") t.value = fmt1(T.shot);
  else if (id === "varNum") t.value = fmt1(Math.abs(T.vari));
  else if (t.dataset.k === "factor") {
    const f = parseFloat(v) / 100;
    cfg.players[+t.dataset.i].factor = isNaN(f)
      ? 1
      : clamp(Math.round(f * 100) / 100, 0.1, 1.5);
    savePlayers();
    // the slider updates live on "input", so no re-render is needed
  }
});
// Tap a number field and the whole value is selected, so typing replaces it.
let selTarget = null;
document.addEventListener("focusin", (e) => {
  const t = e.target;
  if (t && t.matches && t.matches('input[type="number"]')) {
    selTarget = t;
    // setTimeout: iOS Safari ignores select() inside the focus event itself
    setTimeout(() => {
      try {
        t.select();
      } catch (err) {}
    }, 0);
  }
});
// stop the mouse-up from collapsing the selection on desktop browsers
document.addEventListener("mouseup", (e) => {
  if (selTarget && e.target === selTarget) e.preventDefault();
  selTarget = null;
});
document.addEventListener("touchend", () => {
  selTarget = null;
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (screen === "setup") render();
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  if (screen === "setup") render();
});
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}


render();
