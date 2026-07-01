import { describe, it, expect } from "vitest";
import {
  createRoom, setHostCfg, joinPlayer, startGame, setDecision,
  lockPlayer, advance, allLocked, publicState, ROSTER_SIZE,
} from "./room.js";
import { SCMAP } from "../src/engine/engine.js";

function lobbyWithTwo(seed = "ROOM-1", scenarioId = "fashion") {
  let s = createRoom();
  s = setHostCfg(s, { seed, scenarioId });
  s = joinPlayer(s, "conn-a", { name: "Alice", platformId: "shopify", fulfilId: "inhouse" });
  s = joinPlayer(s, "conn-b", { name: "Bob", platformId: "woo", fulfilId: "3pl" });
  return startGame(s);
}

// Drive a full 10-week game with fixed per-player decisions.
function runGame(seed) {
  let s = lobbyWithTwo(seed);
  const sc = SCMAP[s.cfg.scenarioId];
  const dec = { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 500, stock: Math.round(sc.demandBase / 3) };
  let guard = 0;
  while (s.phase === "play" && guard++ < 50) {
    s = setDecision(s, "conn-a", dec);
    s = setDecision(s, "conn-b", dec);
    s = lockPlayer(s, "conn-a");
    s = lockPlayer(s, "conn-b");
    s = advance(s, false).state;
  }
  return s;
}

describe("room setup", () => {
  it("backfills the roster to ROSTER_SIZE with bots", () => {
    const s = lobbyWithTwo();
    expect(s.stores).toHaveLength(ROSTER_SIZE);
    expect(s.stores.filter((x) => x.isPlayer)).toHaveLength(2);
    expect(s.stores.filter((x) => !x.isPlayer).length).toBe(ROSTER_SIZE - 2);
    expect(s.phase).toBe("play");
    expect(s.round).toBe(1);
  });

  it("pre-rolls distinct CRO lifts per human store", () => {
    const s = lobbyWithTwo();
    const [a, b] = s.stores.filter((x) => x.isPlayer);
    expect(a.croLifts).toBeTruthy();
    expect(a.croLifts).not.toEqual(b.croLifts);
  });
});

describe("lockstep resolution", () => {
  it("does not resolve until every human has locked", () => {
    let s = lobbyWithTwo();
    s = lockPlayer(s, "conn-a");
    expect(allLocked(s)).toBe(false);
    let r = advance(s, false);
    expect(r.resolved).toBe(false);
    expect(r.state.round).toBe(1);

    s = lockPlayer(s, "conn-b");
    expect(allLocked(s)).toBe(true);
    r = advance(s, false);
    expect(r.resolved).toBe(true);
    expect(r.state.round).toBe(2);
  });

  it("the host can force-resolve before all are locked", () => {
    let s = lobbyWithTwo();
    s = lockPlayer(s, "conn-a"); // Bob never locks
    const r = advance(s, true);
    expect(r.resolved).toBe(true);
    expect(r.state.round).toBe(2);
  });

  it("resolves exactly once per week and ends after maxRounds", () => {
    const s = runGame("ROOM-1");
    expect(s.phase).toBe("ended");
    expect(s.round).toBe(s.cfg.maxRounds);
    for (const store of s.stores) expect(store.history).toHaveLength(s.cfg.maxRounds);
  });
});

describe("server determinism", () => {
  it("same seed + same decisions → identical authoritative result", () => {
    const a = runGame("ROOM-DET");
    const b = runGame("ROOM-DET");
    const profit = (st) => st.stores.map((x) => Math.round(x.cumProfit));
    expect(profit(a)).toEqual(profit(b));
  });

  it("different seed → different market", () => {
    const a = runGame("ROOM-DET");
    const b = runGame("ROOM-OTHER");
    const aP = a.stores.find((x) => x.id === "p1").cumProfit;
    const bP = b.stores.find((x) => x.id === "p1").cumProfit;
    expect(aP).not.toBe(bP);
  });

  it("every authoritative value stays finite over the game", () => {
    const s = runGame("ROOM-1");
    for (const store of s.stores) {
      for (const h of store.history) {
        for (const k of ["cumProfit", "cash", "profit", "review", "share", "loyalBase"]) {
          expect(Number.isFinite(h[k]), `${store.id}.${k}`).toBe(true);
        }
      }
    }
  });
});

describe("public broadcast", () => {
  it("strips private CRO lifts but keeps the leaderboard", () => {
    const s = lobbyWithTwo();
    const pub = publicState(s);
    expect(pub.stores).toHaveLength(ROSTER_SIZE);
    for (const store of pub.stores) expect(store.croLifts).toBeUndefined();
    expect(pub.cfg.seed).toBe("ROOM-1");
    expect(pub.locked).toHaveProperty("p1");
  });
});
