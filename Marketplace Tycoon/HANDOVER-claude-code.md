# Marketplace Tycoon — Engineering Handover (for Claude Code)

**From:** Mark Bonnett (WMG, University of Warwick) · **Module:** WM956-15 Enterprise eCommerce Solutions
**You are taking over:** a working single-file React teaching game, to turn it into a deployable **multiplayer** web app for seminar use.

---

## 1. What this is

Marketplace Tycoon is an e-commerce strategy simulation for MSc students. A player runs an online store against four AI competitors over ten weeks; highest cumulative profit wins. It teaches platform build-vs-buy, conversion optimisation (CRO), operations/returns, retention/LTV, working capital, and platform economics — all mapped to the module's learning outcomes.

It currently exists as **one self-contained file**: `marketplace-tycoon.jsx` (~1090 lines, React + `recharts`, no other runtime deps). It runs today as a Claude artifact / single component. The single-player game is complete and verified.

## 2. The job, in priority order

1. **Extract the artifact into a real repo** (Vite + React), cleanly splitting the **pure game engine** from the React UI.
2. **Build the multiplayer port** on **PartyKit** so a cohort plays the same market in real time — this is the headline goal. It unlocks the module's LO4 ("collaboratively analyse…") and the 30%-weighted group presentation.
3. **Formalise the verification** I've been doing by hand into a proper test suite (Vitest).
4. **Deploy**: static client on **GitHub Pages**, authoritative room server on **PartyKit**.

> Context that matters: Mark has already shipped a PartyKit + GitHub Pages multiplayer app before (**WMG Quiz**, a Kahoot-style classroom quiz). Assume familiarity with the PartyKit room model, the GitHub Pages deploy flow, and a host/instructor + players topology. Reuse that mental model.

## 3. The engine was built for this — respect the contract

The whole architecture anticipates multiplayer. The core is **one pure, deterministic function** that resolves a week for *all* stores at once — it is effectively a server tick:

```js
// pure: no I/O, no Date.now, no Math.random — all randomness comes from `rng`
resolveRound(stores, round, cfg, rng) -> { stores: nextStores, log: string[] }
```

Key invariants you must preserve when moving it server-side:

- **Determinism is load-bearing.** All randomness flows through a seeded PRNG (`mulberry32` + `makeRng(str)`). The weekly tick uses `makeRng(cfg.seed + ":" + round)`. The player's CRO A/B lift values are pre-rolled once from `makeRng(seed + ":cro")` via `rollCroLifts(seed)`. **Given the same seed and the same decisions, every client must compute the identical result.** In multiplayer, run `resolveRound` **once on the PartyKit server** and broadcast the resulting state — do not resolve per-client.
- **`cfg`** holds the shared market rules: `commissionRate`, search-ranking `weights`, `platforms` (per-platform live `fixedCost` overrides), `txnAddon`, `seed`, `eventsOn`, `startingCash`, `scenarioId`, `demandMult`, `holdingMult`. This is the **instructor/host-owned** object — the host edits it (the ⚙ Instructor panel) and it must be the single source of truth broadcast to all players.
- **Scenario economics** come from the `SCENARIOS` table via `SC(cfg)` (unit cost, price range, demand, volatility, holding, returns, mobile share, ad-responsiveness, digital flag). `cfg.demandMult` / `cfg.holdingMult` are host multipliers layered on top. Don't reintroduce absolute economic values into `cfg`.
- **Per-store decision** each week is `{ price, ad, stock }` plus a persistent `cro` object `{ speed, trust, checkout, mobile }` (tier 0–3) and a per-week `croSpendThisWeek`. CRO is an upgrade, not a slider — it persists across weeks.
- **Bots** are deterministic given `rng`: `botDecide(store, stats, round, cfg, rng, sc)` and `botCro(id, round)`. In multiplayer you can keep some bots to backfill small cohorts, or drop them when enough humans join — but if you keep them, resolve them on the server with the room's seeded rng.

The clean module boundary already exists in the file: everything from the `COMPETITORS` constant down through `leaderDecisionOf` and the export helpers (`buildCSV` / `buildMarkdown`) is **engine + data + pure helpers**; everything from the `FONT_IMPORT` / `T` style object onward is **React UI**. Cut there.

## 4. Suggested repo shape

```
/src
  /engine
    engine.js          // resolveRound, botDecide, makeStore, initialStores, SC, scenarios,
                       // fulfilment, CRO tables, mulberry32/makeRng, getPlatform — NO React
    engine.test.js     // Vitest (see §6)
  /ui                  // the React components, importing from /engine
  /party
    server.ts          // PartyKit room: authoritative state + tick
/index.html
partykit.json
```

Keep the engine **dependency-free and isomorphic** so it runs identically in the browser (single-player) and on the PartyKit server (multiplayer). Single-player should keep working by calling the same engine locally.

## 5. Multiplayer model (PartyKit)

A room = one market (one cohort or one breakout group). Proposed design — adjust to taste:

- **Roles:** one **host** (instructor, or a nominated student) owns `cfg` and advances weeks; **players** each own one store and submit weekly decisions. Optionally a **team mode** where 3–4 students co-own one store with split roles (platform/CTO, marketing/CMO, ops/COO, pricing-cash/CFO) — this maps directly onto the existing levers and is the cleanest route to the LO4 "collaboratively" requirement.
- **Lockstep weekly resolution:** players lock in `{price, ad, stock, cro deploys/tests}` for the week. When all locked (or the host forces resolve / a timer expires), the **server** fills any empty bot slots, calls `resolveRound` once with `makeRng(seed + ":" + round)`, and broadcasts the new authoritative `stores` + `cfg` + `round`.
- **Server is authoritative.** Clients render state and collect intents; they never compute the canonical result. This also stops cheating and keeps everyone's market identical.
- **State to persist in the room:** `cfg`, `round`, `stores` (with each store's `cro`, `croLifts`, `loyalBase`, `cash`, `cumProfit`, `history`), per-player `locked` flags and pending decisions, and the prediction log. Use PartyKit storage so a refresh/reconnect rehydrates.
- **Reconnection:** a player rejoining gets a full state snapshot for their store + the public leaderboard. Pre-roll each human player's `croLifts` server-side at join (from `makeRng(seed + ":cro:" + storeId)`) so their A/B outcomes are fixed and fair.
- **Predict-then-reveal** stays per-player and is collected before the lock; calibration is tallied in the debrief/export.

Edge cases to handle: late joiners (assign a fresh store or a spectator view), a player who never locks (host force-resolves; treat as "hold previous decision"), host disconnect (promote another host or pause).

## 6. Tests to port (these are known-good — I ran them by hand)

Turn the manual checks into Vitest. The engine passed all of these after extraction-equivalent bundling:

- **Finiteness & sanity** across all 4 scenarios × 3 fulfilment models, 10 weeks: every `cumProfit / cash / loyalBase / review / profit / revenue / share / keptSales / croConv` must be `Number.isFinite`; `review ∈ [1,5]`; `share ∈ [0,1]`; `loyalBase >= 0`.
- **Determinism:** same seed → identical final `cumProfit`; different seed → different. (Verified: `7050 === 7050`, `7050 !== 5892`.)
- **CRO lift rolls** are seeded and vary by seed (`rollCroLifts("A") !== rollCroLifts("B")`), and `croConvOf` for a deployed tier equals the pre-rolled value (what the A/B test reveals must equal what deploy applies).
- **Mobile CRO scales with `scenario.mobileShare`** (tier-3 mobile: fashion ×1.18 vs B2B ×1.07 — confirmed).
- **Digital scenario invariants:** zero holding cost, never stocks out, fulfilment choice has no effect (all three fulfilment ids give identical results).

A representative harness (mirror this in `engine.test.js`):

```js
import { resolveRound, initialStores, SCMAP, makeRng, botDecide, leaderDecisionOf, DEFAULT_CFG } from "./engine.js";

function playGame(scenarioId, fulfilId, platformId, seed) {
  const cfg = { ...DEFAULT_CFG, scenarioId, seed };
  const sc = SCMAP[scenarioId];
  let stores = initialStores("Tester", platformId, fulfilId, cfg.startingCash, sc, seed);
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(seed + ":" + round);
    stores = stores.map(s => s.isPlayer
      ? { ...s, decision: { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 500, stock: Math.round(sc.demandBase / 3) } }
      : s);
    const lastTotalDemand = stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
    const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(stores) };
    const withBots = stores.map(s => s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) });
    stores = resolveRound(withBots, round, cfg, rng).stores;
  }
  return stores.find(s => s.isPlayer);
}
// assert finiteness, range, determinism as above.
```

> Watch-out from the build: there was a **temporal-dead-zone trap** — `DEFAULT_CFG` initialises from `PLATFORMS`, so `PLATFORMS`/`PMAP` must be declared **above** `DEFAULT_CFG`. Keep that ordering when you split files (or just `import` them — once modularised it's a non-issue). `esbuild`/`vite` won't catch a TDZ; only executing the module does, so the load-time test above is your guard.

## 7. Don't break these

- Single-player mode and the four bot archetypes (Carl/Aisha/Quinn/Bailey) stay.
- The **⚙ Instructor panel** and its one-tap "teaching shock" presets stay (in multiplayer they become **host** controls editing the shared `cfg`).
- The **CSV / Markdown decision-log export** stays — it's an assessable artifact students hand in. In multiplayer, each player exports their own store's log.
- UK English, £ currency, the ESL glossary tooltips, and the predict-then-reveal beat are pedagogical features, not decoration.

## 8. First three moves

1. Scaffold Vite + React; cut the engine out of `marketplace-tycoon.jsx` into `/engine/engine.js`; get the single-player UI running against the imported engine.
2. Stand up `engine.test.js` and make the §6 suite green — that proves the engine is portable and correct before any netcode.
3. Spike a minimal PartyKit room: host sets seed/scenario, two players join, lock decisions, server resolves one week and broadcasts. Grow from there.

The current artifact (`marketplace-tycoon.jsx`) is the source of truth for engine behaviour — when in doubt, match it.
