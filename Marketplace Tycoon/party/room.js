/* ============================================================
   MARKETPLACE TYCOON — authoritative room state machine (pure).
   The PartyKit server (server.ts) is a thin transport shell over
   these functions. Keeping the room logic pure means it runs and
   is unit-tested in plain Node — no Cloudflare/PartyKit runtime
   needed — and the *server* stays the single source of truth: it
   calls resolveRound() once per week and broadcasts the result.
   ============================================================ */
import {
  resolveRound, makeRng, makeStore, botDecide, leaderDecisionOf,
  rollCroLifts, SCMAP, COMPETITORS, DEFAULT_CFG, PLAYER_COLOR,
} from "../src/engine/engine.js";

export const ROSTER_SIZE = 5; // total stores in a market (humans + bot backfill)
const HUMAN_COLORS = [PLAYER_COLOR, "#5BC0EB", "#F4845F", "#7FB069", "#C792EA"];

// Bots take the engine's archetypes; platform/fulfilment mirror initialStores().
const BOT_PLATFORM = { carl: "woo", aisha: "shopify", quinn: "headless", bailey: "wix" };
const botFulfilFor = (sc) => ({
  carl: sc.id === "grocer" ? "inhouse" : "dropship", aisha: "3pl", quinn: "inhouse", bailey: "3pl",
});

export function createRoom(cfg) {
  return { cfg: { ...DEFAULT_CFG, ...(cfg || {}) }, round: 0, phase: "lobby", players: {}, stores: [], log: [] };
}

// Host owns cfg (seed, scenario, economics). Editable only in the lobby
// for fields that reshape the roster (seed/scenario); economics can move live.
export function setHostCfg(state, patch) {
  return { ...state, cfg: { ...state.cfg, ...patch } };
}

export function joinPlayer(state, connId, { name, platformId, fulfilId, role } = {}) {
  if (state.players[connId]) return state; // idempotent reconnect
  const n = Object.keys(state.players).length;
  const storeId = "p" + (n + 1);
  const player = {
    storeId,
    name: name || "Player " + (n + 1),
    platformId: platformId || "shopify",
    fulfilId: fulfilId || "inhouse",
    role: role || (n === 0 ? "host" : "player"),
    decision: null,
    locked: false,
  };
  return { ...state, players: { ...state.players, [connId]: player } };
}

// Build the authoritative stores array: one store per human (CRO lifts
// pre-rolled per-store so each player's A/B outcomes are fixed and fair),
// then bot archetypes backfill the remaining slots.
export function startGame(state) {
  const cfg = state.cfg;
  const sc = SCMAP[cfg.scenarioId];
  const humans = Object.values(state.players);
  const stores = humans.map((p, i) => {
    const lifts = rollCroLifts(cfg.seed + ":cro:" + p.storeId);
    return makeStore(p.storeId, p.name, HUMAN_COLORS[i % HUMAN_COLORS.length], true, p.platformId, p.fulfilId, cfg.startingCash, sc, lifts);
  });
  const botFulfil = botFulfilFor(sc);
  for (const c of COMPETITORS) {
    if (stores.length >= ROSTER_SIZE) break;
    stores.push(makeStore(c.id, c.name, c.color, false, BOT_PLATFORM[c.id], botFulfil[c.id], cfg.startingCash, sc, null));
  }
  const players = {};
  for (const [id, p] of Object.entries(state.players)) players[id] = { ...p, locked: false };
  return { ...state, stores, players, round: 1, phase: "play", log: [] };
}

export function setDecision(state, connId, decision) {
  const p = state.players[connId];
  if (!p || state.phase !== "play") return state;
  return { ...state, players: { ...state.players, [connId]: { ...p, decision: { ...(p.decision || {}), ...decision } } } };
}

export function lockPlayer(state, connId) {
  const p = state.players[connId];
  if (!p || state.phase !== "play") return state;
  return { ...state, players: { ...state.players, [connId]: { ...p, locked: true } } };
}

export function allLocked(state) {
  const humans = Object.values(state.players);
  return humans.length > 0 && humans.every((p) => p.locked);
}

// Lockstep weekly resolution. Resolves only when every human has locked,
// or the host forces it. Fills bot decisions, calls resolveRound ONCE with
// the week's seeded rng, advances the round, and clears locks.
export function advance(state, force = false) {
  if (state.phase !== "play") return { state, resolved: false };
  if (!force && !allLocked(state)) return { state, resolved: false };

  const cfg = state.cfg;
  const sc = SCMAP[cfg.scenarioId];
  const round = state.round;
  const rng = makeRng(cfg.seed + ":" + round);

  const decByStore = {};
  for (const p of Object.values(state.players)) decByStore[p.storeId] = p.decision;

  const lastTotalDemand = state.stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
  const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(state.stores) };

  const withDecisions = state.stores.map((s) => {
    if (s.isPlayer) {
      const d = decByStore[s.id];
      return d ? { ...s, decision: { ...s.decision, ...d } } : s; // hold previous if never submitted
    }
    return { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) };
  });

  const { stores: next, log } = resolveRound(withDecisions, round, cfg, rng);
  const ended = round >= cfg.maxRounds;
  const players = {};
  for (const [id, p] of Object.entries(state.players)) players[id] = { ...p, locked: false };

  return {
    state: { ...state, stores: next, log, round: ended ? round : round + 1, phase: ended ? "ended" : "play", players },
    resolved: true,
  };
}

// What clients receive: the leaderboard plus each store's public fields.
// Private per-player CRO lift rolls are stripped from the broadcast.
export function publicState(state) {
  return {
    round: state.round,
    phase: state.phase,
    cfg: state.cfg,
    log: state.log,
    locked: Object.fromEntries(Object.values(state.players).map((p) => [p.storeId, p.locked])),
    stores: state.stores.map(({ croLifts, ...rest }) => rest),
  };
}
