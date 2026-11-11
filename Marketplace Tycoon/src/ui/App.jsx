import React, { Suspense, lazy, useEffect, useId, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  SCENARIOS, SCMAP, SC, FULFILMENT, fulfilOf, CRO_LEVERS, CMAP, botCro, croConvOf,
  PLATFORMS, PMAP, DEFAULT_CFG, eventFor, PLAYER_COLOR, gbp, gbp2, makeRng,
  getPlatform, initialStores, maturityOf, botDecide, resolveRound, leaderDecisionOf,
  unitEconomics, CRO_TEST_FRACTION, buildCSV, buildMarkdown, downloadFile,
} from "../engine/engine.js";
import { evaluatePlatforms, rationaleFor, fitOf, CRITERIA } from "../engine/platformfit.js";
import { debriefCards } from "../engine/debrief.js";
import { T, PLAYER, GLOBAL_CSS, card, btn, ghostBtn, gatedBtn, pickCard, croBtn, tipStyle, backBtn } from "./theme.js";
import {
  PlainModeProvider, PT, Term, TermsHint, LOS, Eyebrow, Frame, InstructorButton, Chart,
  SectionTitle, SubHead, ChoiceGroup, Slider, MiniStat, Banner,
} from "./shared.jsx";
import { useSessionState } from "./session.js";
import { loadProgress, loadSkills, saveSkills, recordGame } from "./progress.js";
import { runRecord } from "./cohort.js";
import { OUTCOMES } from "./outcomesModel.js";
import { WhatThisDevelops, SkillsPractised } from "./Outcomes.jsx";
import SkillsRating from "./SkillsRating.jsx";
import Recommendation from "./Recommendation.jsx";
import DecisionLog from "./DecisionLog.jsx";
import { instructorMode } from "./urlConfig.js";
import InstructorPanel from "./InstructorPanel.jsx";
// staff pages: loaded only when an instructor opens them
const InstructorTally = lazy(() => import("./InstructorTally.jsx"));
const TutorGuide = lazy(() => import("./TutorGuide.jsx"));

/* Root: which screen is on show and the game behind it, mirrored to the
   tab's session so a refresh resumes where the student was. `nav` counts
   screen changes, so focus moves to each new screen's heading (not on
   first load). The instructor panel exists only for staff (?instructor).
   `back` is the screen a page (the decision log, the tally, the tutor's
   guide) was opened from. A refresh never lands a student on a staff page. */
const VERSION = 2;
const START = { v: VERSION, phase: "intro", name: "", selScenario: "fashion", selPlatform: "shopify", selFulfil: "inhouse",
  stores: null, round: 1, log: [], prediction: null, predictionLog: [], nav: 0, back: null };
const STAFF_PAGES = ["tally", "guide"], PAGES = ["log", ...STAFF_PAGES];
const pct0 = (v) => `${Math.round(v * 100)}%`;
const units = (n) => Math.round(n).toLocaleString("en-GB");

export default function App() {
  const [saved, setG] = useSessionState("game", START);
  const [savedCfg, setSavedCfg] = useSessionState("cfg", { v: VERSION, cfg: DEFAULT_CFG });
  const [instructor] = useState(() => instructorMode());
  const [showInstructor, setShowInstructor] = useState(false);
  const live = saved?.v === VERSION ? saved : START;
  // a game screen with no game behind it (a stale or partial save) falls back to the start
  const held = ["play", "result", "end"].includes(live.phase) && !live.stores ? START : live;
  const g = STAFF_PAGES.includes(held.phase) && !instructor ? { ...held, phase: held.back && !PAGES.includes(held.back) ? held.back : "intro" } : held;
  const [progress, setProgress] = useState(loadProgress);
  const cfg = savedCfg?.v === VERSION ? savedCfg.cfg : DEFAULT_CFG;
  const setCfg = (fn) => setSavedCfg((s) => ({ v: VERSION, cfg: typeof fn === "function" ? fn(s?.v === VERSION ? s.cfg : DEFAULT_CFG) : fn }));
  const base = (a) => (a?.v === VERSION ? a : START);
  const go = (patch) => setG((a) => ({ ...base(a), ...patch, nav: (base(a).nav || 0) + 1 }));
  const upd = (patch) => setG((a) => ({ ...base(a), ...patch }));
  const updPlayer = (fn) => setG((a) => ({ ...base(a), stores: base(a).stores.map((s) => (s.isPlayer ? fn(s) : s)) }));

  const { phase, name, selScenario, selPlatform, selFulfil, stores, round, log, prediction, predictionLog, nav, back } = g;
  const activeCfg = { ...cfg, scenarioId: selScenario };
  const player = stores ? stores.find((s) => s.isPlayer) : null;
  const ranked = stores ? [...stores].sort((a, b) => b.cumProfit - a.cumProfit) : [];
  const rank = ranked.findIndex((s) => s.isPlayer) + 1;

  // a finished game goes on the record (the first on each brief is kept) and marks the hub
  useEffect(() => { if (phase === "end" && player) setProgress(recordGame(runRecord(stores, player, activeCfg, predictionLog), cfg.seed)); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps -- once, on reaching the end
  const openPage = (page) => { setShowInstructor(false); setProgress(loadProgress()); /* picks up a recommendation just written */ go({ phase: page, back: PAGES.includes(phase) ? back : phase }); };
  const closePage = () => go({ phase: back && !PAGES.includes(back) ? back : "intro", back: null });
  // before the first game, ask for the skills self-rating once (it can be skipped)
  const toBriefs = () => go({ phase: loadSkills().before === undefined ? "rate" : "scenario" });

  function start() {
    go({ phase: "play", stores: initialStores(name, selPlatform, selFulfil, cfg.startingCash, SCMAP[selScenario], cfg.seed), round: 1, log: [], prediction: null, predictionLog: [] });
  }
  const restart = () => { setProgress(loadProgress()); go({ phase: "intro", stores: null, round: 1, log: [], prediction: null, predictionLog: [] }); };
  const setPlayerDecision = (patch) => updPlayer((s) => ({ ...s, decision: { ...s.decision, ...patch } }));
  function croDeploy(leverId) {
    updPlayer((s) => {
      const tier = s.cro[leverId] || 0; if (tier >= 3) return s;
      const cost = CMAP[leverId].cost[tier];
      if ((s.croSpendThisWeek || 0) + cost > s.cash) return s;
      return { ...s, cro: { ...s.cro, [leverId]: tier + 1 }, croSpendThisWeek: (s.croSpendThisWeek || 0) + cost };
    });
  }
  function croTest(leverId) {
    updPlayer((s) => {
      const tier = s.cro[leverId] || 0; if (tier >= 3) return s;
      const key = leverId + ":" + (tier + 1); if (s.croTested[key]) return s;
      const cost = Math.round(CMAP[leverId].cost[tier] * CRO_TEST_FRACTION);
      if ((s.croSpendThisWeek || 0) + cost > s.cash) return s;
      return { ...s, croTested: { ...s.croTested, [key]: true }, croSpendThisWeek: (s.croSpendThisWeek || 0) + cost };
    });
  }
  function sellWeek() {
    const rng = makeRng(cfg.seed + ":" + round);
    const sc = SCMAP[selScenario];
    const lastTotalDemand = stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
    const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(stores) };
    const withBots = stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, activeCfg, rng, sc) }));
    const { stores: resolved, log: lines } = resolveRound(withBots, round, activeCfg, rng);
    const actual = [...resolved].sort((a, b) => b.cumProfit - a.cumProfit).findIndex((s) => s.isPlayer) + 1;
    go({ phase: "result", stores: resolved, log: lines, predictionLog: [...predictionLog, { round, predicted: prediction, actual, hit: prediction === actual }] });
  }
  function nextWeek() {
    if (round >= cfg.maxRounds) { go({ phase: "end", prediction: null }); return; }
    go({ phase: "play", round: round + 1, prediction: null });
  }

  const inGame = !!player && ["play", "result", "end"].includes(phase);
  const feeRaised = cfg.commissionRate > DEFAULT_CFG.commissionRate + 1e-6;
  const stats = inGame ? [
    ["WEEK", `${round}/${cfg.maxRounds}`],
    ["PROFIT", gbp(player.cumProfit), player.cumProfit >= 0 ? T.hdrPos : T.hdrPlayer],
    ["CASH", gbp(player.cash), player.cash < 0 ? T.hdrPlayer : player.cash < cfg.startingCash * 0.3 ? T.hdrAmber : T.hdrPos],
    ["PLACE", `${rank} of ${stores.length}`, PLAYER_COLOR],
    ["FEE", pct0(cfg.commissionRate), feeRaised ? T.hdrPlayer : T.hdrPlatform],
  ] : [];
  const last = inGame && phase === "result" ? player.last : null;

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        <Frame screenKey={`${phase}:${round}`} autoFocus={nav > 0} stats={stats}
          subtitle={phase === "log" ? "Decision log" : phase === "tally" ? "Instructor · cohort tally" : phase === "guide" ? "Instructor · tutor's guide" : inGame ? `${SC(activeCfg).icon} ${SC(activeCfg).short}` : "e-commerce strategy lab"}
          actions={instructor && <InstructorButton onClick={() => setShowInstructor(true)} />}>
          {phase === "intro" && <Intro name={name} setName={(v) => upd({ name: v })} onNext={toBriefs} progress={progress} onLog={() => openPage("log")} />}
          {phase === "rate" && <RateFirst onSave={(r) => { saveSkills({ before: r, beforeAt: new Date().toISOString().slice(0, 10) }); go({ phase: "scenario" }); }} onSkip={() => { saveSkills({ before: null }); go({ phase: "scenario" }); }} onBack={() => go({ phase: "intro" })} />}
          {phase === "scenario" && <ScenarioSelect selected={selScenario} setSelected={(v) => upd({ selScenario: v })} onNext={() => go({ phase: "platform" })} onBack={() => go({ phase: "intro" })} />}
          {phase === "platform" && <SetupSelect scenario={SCMAP[selScenario]} platform={selPlatform} setPlatform={(v) => upd({ selPlatform: v })} fulfil={selFulfil} setFulfil={(v) => upd({ selFulfil: v })} cfg={activeCfg} onLaunch={start} onBack={() => go({ phase: "scenario" })} />}
          {phase === "play" && player && <PlayBoard stores={stores} ranked={ranked} round={round} cfg={activeCfg} player={player} setPlayerDecision={setPlayerDecision} croDeploy={croDeploy} croTest={croTest} sellWeek={sellWeek} prediction={prediction} setPrediction={(v) => upd({ prediction: v })} />}
          {phase === "result" && player && <ResultView ranked={ranked} log={log} round={round} nextWeek={nextWeek} player={player} cfg={activeCfg} predictionLog={predictionLog} />}
          {phase === "end" && player && <EndView stores={stores} ranked={ranked} restart={restart} player={player} cfg={activeCfg} predictionLog={predictionLog} onLog={() => openPage("log")} />}
          {phase === "log" && <DecisionLog progress={progress} cfg={cfg} onBack={closePage} onProgress={() => setProgress(loadProgress())} />}
          {phase === "tally" && instructor && <Suspense fallback={<Loading what="Opening the tally…" />}><InstructorTally onBack={closePage} /></Suspense>}
          {phase === "guide" && instructor && <Suspense fallback={<Loading what="Opening the tutor's guide…" />}><TutorGuide cfg={cfg} onBack={closePage} /></Suspense>}
        </Frame>
        {/* spoken once when a week resolves; the figures are on screen too */}
        <div role="status" aria-live="polite" className="sr-only">
          {last ? `Week ${round} resolved. Weekly profit ${gbp(last.profit)}. You are ${rank} of ${stores.length} on the leaderboard.` : ""}
        </div>
        {showInstructor && instructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} onOpenPage={openPage} />}
      </div>
    </PlainModeProvider>
  );
}

function PlatformPill({ id }) {
  const p = PMAP[id]; if (!p) return null;
  return <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}><span className="sr-only">on </span>{p.short}</span>;
}
const h1Style = { fontFamily: T.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.5, margin: 0 };

/* ---- INTRO -------------------------------------------------- */
function Loading({ what }) { return <p role="status" style={{ margin: "40px auto", textAlign: "center", color: T.body2 }}>{what}</p>; }

/* ---- THE SELF-RATING, BEFORE THE FIRST GAME ------------------ */
export function RateFirst({ onSave, onSkip, onBack }) {
  return (
    <div className="rise" style={{ maxWidth: 820, margin: "32px auto 0" }}>
      <ScreenHead title="Before you start: where are you now?" onBack={onBack} />
      <p style={{ color: T.muted, fontSize: 16.5, lineHeight: 1.55, margin: "8px 0 16px" }}>One minute, once. You will rate yourself again after playing, and your decision log sets the two side by side.</p>
      <SkillsRating title="Rate yourself" saveLabel="Save and choose a client brief →" onSave={onSave} onSkip={onSkip}
        intro="There are no right answers, and nobody sees this unless you choose to share your result code." />
    </div>
  );
}

export function Intro({ name, setName, onNext, progress = {}, onLog }) {
  const played = SCENARIOS.filter((s) => progress[s.id]);
  const nameId = useId();
  return (
    <div className="rise" style={{ maxWidth: 820, margin: "48px auto 0" }}>
      <Eyebrow>Strategy simulation · LO1 · LO3</Eyebrow>
      <h1 className="mt-h1" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 50, lineHeight: 1.04, letterSpacing: -1.2, margin: "16px 0 0" }}>
        <PT rich={<>Pick a client. Build the store.<br /><span style={{ color: PLAYER }}>Ten weeks to win.</span></>}
            plain={<>Choose a client. Set up the store.<br /><span style={{ color: PLAYER }}>Run it for ten weeks.</span></>} />
      </h1>
      <p style={{ color: T.body2, fontSize: 19, lineHeight: 1.6, marginTop: 18 }}>
        Choose a <b style={{ color: T.text }}>client brief</b>, a <b style={{ color: T.text }}>storefront platform</b> and a{" "}
        <b style={{ color: T.text }}>fulfilment model</b>, then run the store: set price, ad spend and stock, and invest in{" "}
        <Term term="cro">conversion optimisation</Term> each week. Win loyal regulars, manage cash and returns, survive
        seasonal shocks, and out-earn four rivals. The right strategy depends on the brief.
      </p>
      <div style={{ marginTop: 22 }}>
        <label htmlFor={nameId} style={{ display: "block", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Store name (optional)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Store" maxLength={40} style={{ flex: 1, minWidth: 220, background: T.panel, border: `1.5px solid ${T.muted}`, color: T.text, borderRadius: 12, padding: "14px 16px", fontSize: 17.5, fontFamily: T.body }} />
          <button onClick={onNext} style={btn(T.playerBtn)}>Choose your client brief →</button>
        </div>
      </div>
      <section aria-labelledby="mt-develops" style={{ ...card(), marginTop: 26, padding: "16px 18px" }}>
        <h2 id="mt-develops" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>What this develops</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: T.body2, fontSize: 15, lineHeight: 1.55 }}>
          <li><b style={{ color: T.text }}>LO1.</b> {LOS.LO1} <span style={{ color: T.muted }}>— you choose and justify a platform for a client brief.</span></li>
          <li><b style={{ color: T.text }}>LO3.</b> {LOS.LO3} <span style={{ color: T.muted }}>— you decide which conversion, fulfilment and retention work is worth its cost.</span></li>
        </ul>
        <p style={{ margin: "10px 0 0", color: T.body2, fontSize: 15, lineHeight: 1.55 }}>Each game ends with a short recommendation to your client. Your <b style={{ color: T.text }}>decision log</b> keeps a record of the skills you practised, with lines you can use on a CV.</p>
      </section>
      {onLog && (
        <section aria-labelledby="mt-sofar" style={{ ...card(), marginTop: 14, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2 id="mt-sofar" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Your decision log</h2>
            <p style={{ margin: 0, color: T.body2, fontSize: 15, lineHeight: 1.5 }}>{played.length ? `In this browser you have finished a game on ${played.length} of ${SCENARIOS.length} client briefs: ${played.map((s) => s.short).join(", ")}.` : "Nothing in it yet — it fills in when you finish a game."}</p>
          </div>
          <button type="button" onClick={onLog} style={{ ...ghostBtn, border: `1.5px solid ${T.muted}`, padding: "11px 20px", fontSize: 15.5 }}>Open your decision log</button>
        </section>
      )}
      <TermsHint />
    </div>
  );
}

/* ---- CLIENT BRIEF ------------------------------------------- */
const volWord = (v) => (v >= 0.2 ? "high" : v >= 0.12 ? "medium" : "low");
function ScreenHead({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <h1 style={h1Style}>{title}</h1>
      {onBack && <button onClick={onBack} style={backBtn}>← Back</button>}
    </div>
  );
}
function SpecRow({ label, value, mono }) {
  return <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, marginBottom: 4 }}><span style={{ color: T.muted }}>{label}</span><span style={{ fontFamily: mono ? T.mono : T.body, fontWeight: 600, color: T.text, textAlign: "right" }}>{value}</span></span>;
}
const cardHead = (title, on) => (
  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
    <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17.5 }}>{title}</span>
    {on && <span style={{ color: T.selText, fontWeight: 700, fontSize: 14 }}><span aria-hidden="true">✓ </span>chosen</span>}
  </span>
);
const cardText = { display: "block", color: T.muted, fontSize: 14, lineHeight: 1.45, margin: "5px 0 9px" };

export function ScenarioSelect({ selected, setSelected, onNext, onBack }) {
  const sel = SCMAP[selected];
  return (
    <div className="rise" style={{ maxWidth: 980, margin: "32px auto 0" }}>
      <ScreenHead title="Choose your client brief" onBack={onBack} />
      <p style={{ color: T.muted, fontSize: 16.5, lineHeight: 1.55, marginTop: 8 }}>
        Each industry has a different shape — margins, demand volatility, return rates, how mobile its shoppers are, and
        whether ads or trust win. The same levers reward very different strategies. Your rivals face the same brief.
      </p>
      <ChoiceGroup label="Client brief" options={SCENARIOS} value={selected} onChange={setSelected}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 18 }}
        btnStyle={(on) => ({ ...pickCard(on), borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 2 })}
        render={(s, on) => (
          <>
            {cardHead(<><span aria-hidden="true">{s.icon} </span>{s.name}</>, on)}
            <span style={cardText}>{s.brief}</span>
            <SpecRow label="Price range" value={`${gbp(s.priceMin)}–${gbp(s.priceMax)}`} />
            <SpecRow label="Unit cost (before fulfilment)" value={gbp(s.unitCost)} />
            <SpecRow label="New buyers / week (whole market)" value={`about ${s.demandBase.toLocaleString("en-GB")}`} />
            <SpecRow label="Demand volatility" value={volWord(s.volatility)} />
            <SpecRow label="Return rate" value={pct0(s.returnRate)} />
            <SpecRow label="Mobile traffic" value={pct0(s.mobileShare)} />
            <span style={{ display: "block", fontSize: 13.5, color: T.platform, lineHeight: 1.4, marginTop: 8 }}>{s.teach}</span>
          </>
        )} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ color: T.muted, fontSize: 15 }}>Briefing the team on <b style={{ color: T.text }}>{sel.name}</b>.</div>
        <button onClick={onNext} style={btn(T.playerBtn)}>Set up your store →</button>
      </div>
      <WhatThisDevelops outcomes={OUTCOMES[sel.id]} title={`What the ${sel.short} brief develops`} style={{ marginTop: 20 }} />
    </div>
  );
}

/* ---- PLATFORM-FIT EVALUATION (LO1) -------------------------- */
const VERDICT_COL = { "Strong fit": [T.pos, T.posTint], "Workable": [T.amber, T.amberTint], "Poor fit": [T.neg, T.negTint] };
function FitChip({ verdict, fit }) {
  const [c, bg] = VERDICT_COL[verdict] || [T.muted, T.panel2];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${c}`, color: c, borderRadius: 6, padding: "1px 7px", fontSize: 13, fontWeight: 700 }}>{verdict} · fit {Math.round(fit * 100)}/100</span>;
}
function PlatformFitPanel({ scenario, evalr, platform }) {
  const topNeeds = [...CRITERIA].map((c) => ({ ...c, w: evalr.weights[c.key] })).sort((a, b) => b.w - a.w);
  const recRow = evalr.rows.find((r) => r.id === evalr.recommended);
  const f = fitOf(scenario, platform);
  const matched = platform === evalr.recommended;
  return (
    <section aria-labelledby="mt-fit" style={{ marginTop: 16, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
      <h3 id="mt-fit" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, margin: "0 0 4px" }}><span aria-hidden="true">🧭 </span>Which stack fits a {scenario.short} store?</h3>
      <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.5, margin: "0 0 12px" }}>{scenario.brief} The fit score weighs each platform's attributes by what this brief needs. It is a requirements argument, not a forecast. In this simulation a well-run store tends to earn most on the top-fit platform, but only by a few per cent: your pricing, stock, advertising and conversion work move profit far more.</p>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(220px,1.3fr)", gap: 18 }}>
        <div>
          <h4 style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: 1, color: T.muted, margin: "0 0 8px", fontWeight: 700 }}>WHAT THIS BRIEF NEEDS MOST</h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {topNeeds.map((n) => (
              <li key={n.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, color: T.text, width: 150, flexShrink: 0 }}>{n.label}</span>
                <span aria-hidden="true" style={{ flex: 1, height: 6, background: T.track, borderRadius: 6, overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${Math.round((n.w / (topNeeds[0].w || 1)) * 100)}%`, height: "100%", background: T.platformFill }} />
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted, width: 38, textAlign: "right" }}>{pct0(n.w)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: 1, color: T.muted, margin: "0 0 8px", fontWeight: 700 }}>THE EVALUATION</h4>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.text, margin: "0 0 8px" }}>
            <b style={{ color: T.youText }}>{recRow.name}</b> scores highest against these needs. {rationaleFor(recRow, scenario)}
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: T.text, borderTop: `1px solid ${T.border}`, paddingTop: 8, margin: 0 }}>
            {matched
              ? <>Your pick is the highest-scoring fit for this brief.</>
              : <>Your pick — <b>{f.row.name}</b> ({f.row.verdict.toLowerCase()}, {f.rank} of {f.total}) — is not the highest-scoring fit. There is no single right answer, but be ready to justify it.</>}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SetupSelect({ scenario, platform, setPlatform, fulfil, setFulfil, onLaunch, onBack, cfg }) {
  const evalr = evaluatePlatforms(scenario);
  const fitById = Object.fromEntries(evalr.rows.map((r) => [r.id, r]));
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 };
  return (
    <div className="rise" style={{ maxWidth: 980, margin: "32px auto 0" }}>
      <ScreenHead title={<>Set up your store — <span aria-hidden="true">{scenario.icon} </span>{scenario.short}</>} onBack={onBack} />
      <SubHead id="mt-plat">1 · Storefront platform</SubHead>
      <ChoiceGroup labelId="mt-plat" options={PLATFORMS} value={platform} onChange={setPlatform} style={grid}
        btnStyle={(on) => ({ ...pickCard(on), borderRadius: 14, padding: 15 })}
        render={(base, on) => {
          const p = getPlatform(cfg, base.id); const f = fitById[base.id];
          return (
            <>
              {cardHead(base.name, on)}
              <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "6px 0 2px" }}>
                <FitChip verdict={f.verdict} fit={f.fit} />
                {base.id === evalr.recommended && <span style={{ fontFamily: T.mono, fontSize: 13, color: T.youText, border: `1px solid ${T.youText}`, borderRadius: 5, padding: "1px 5px" }}><span aria-hidden="true">★ </span>TOP FIT</span>}
              </span>
              <span style={cardText}>{base.blurb}</span>
              <SpecRow label="Cost / week" value={gbp(p.fixedCost) + (p.txnFee ? ` + ${(p.txnFee * 100).toFixed((p.txnFee * 100) % 1 ? 1 : 0)}% of sales` : "")} />
              <SpecRow label="Time to full power" value={base.rampWeeks <= 1 ? "Instant" : `${base.rampWeeks} weeks`} />
              <SpecRow label="Performance ceiling" value={`${base.ceiling} of 4`} mono />
            </>
          );
        }} />

      <PlatformFitPanel scenario={scenario} evalr={evalr} platform={platform} />

      {!scenario.digital ? (
        <>
          <SubHead id="mt-ful">2 · Fulfilment model</SubHead>
          <ChoiceGroup labelId="mt-ful" options={FULFILMENT} value={fulfil} onChange={setFulfil} style={grid}
            btnStyle={(on) => ({ ...pickCard(on), borderRadius: 14, padding: 15 })}
            render={(f, on) => (
              <>
                {cardHead(<><span aria-hidden="true">{f.icon} </span>{f.short}</>, on)}
                <span style={cardText}>{f.blurb}</span>
                <SpecRow label="Cost / unit shipped" value={f.perUnitCost ? gbp2(f.perUnitCost) : f.marginCut ? `${pct0(f.marginCut)} of sales` : gbp2(0)} />
                <SpecRow label="Weekly fee" value={f.fixed ? gbp(f.fixed) : "none"} />
                <SpecRow label="Stock risk" value={f.infiniteStock ? "none (unlimited)" : f.stockMult > 1 ? "cushioned" : "you carry it"} />
              </>
            )} />
        </>
      ) : (
        <div style={{ marginTop: 22, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, color: T.muted, fontSize: 15 }}>
          <span aria-hidden="true">⬇️ </span><b style={{ color: T.text }}>Digital delivery</b> — this brief ships electronically. No fulfilment choice, no stock limit, no shipping cost. Checkout UX and pricing are everything.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
        <button onClick={onLaunch} style={btn(T.playerBtn)}>Launch store →</button>
      </div>
    </div>
  );
}

/* ---- PLAY BOARD --------------------------------------------- */
export function PlayBoard({ stores, ranked, round, setPlayerDecision, croDeploy, croTest, sellWeek, player, cfg, prediction, setPrediction }) {
  const sc = SC(cfg);
  const d = player.decision;
  const platform = getPlatform(cfg, player.platformId);
  const ful = fulfilOf(player, sc);
  const mat = maturityOf(platform, round);
  const ev = eventFor(round, cfg);
  const croConv = croConvOf(player.cro, true, player.croLifts, sc);
  const committed = player.croSpendThisWeek || 0;
  const availCash = player.cash - committed;
  const ue = unitEconomics(player, round, cfg);
  const hiked = platform.fixedCost !== PMAP[player.platformId].fixedCost || platform.txnFee !== PMAP[player.platformId].txnFee;
  const wentNegative = player.history.find((h) => h.cash < 0);
  const predId = useId();

  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <h1 style={{ ...h1Style, fontSize: 26 }}>Week {round} of {cfg.maxRounds} — your move</h1>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <SectionTitle>Your decisions</SectionTitle>
            <span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.platform }}>{platform.short} · {ful.short}</span>
          </div>
          <div style={{ background: T.panel2, borderRadius: 9, padding: "8px 11px", marginBottom: 14, fontSize: 14, color: T.muted, lineHeight: 1.45 }}>
            <span aria-hidden="true">{sc.icon} </span><b style={{ color: T.text }}>{sc.name}:</b> {sc.teach}
          </div>

          {ev && <Banner><b><span aria-hidden="true">{ev.icon} </span>This week: {ev.title}</b><div style={{ fontSize: 14, color: T.body2, marginTop: 3, lineHeight: 1.45 }}>{ev.desc}</div></Banner>}
          {player.cash < 0
            ? <Banner tone="bad"><span aria-hidden="true">💀 </span>You're <Term term="insolvent">insolvent</Term> — {gbp(-player.cash)} overdrawn. The game lets you keep trading; a real store would be closing. Cut spend and rebuild margin.</Banner>
            : wentNegative && <Banner tone="bad">You ran out of cash in week {wentNegative.round} and have traded back to {gbp(player.cash)}. That week still counts against you in the final result.</Banner>}
          {mat < 1 && <Banner><span aria-hidden="true">🏗 </span>{platform.short} is {pct0(mat)} built — you pay {gbp(platform.fixedCost)} a week in full while it converts and advertises below its finished level (full power by week {platform.rampWeeks}).</Banner>}
          {hiked && <Banner tone="bad"><span aria-hidden="true">⚡ </span>Platform pricing changed — now {gbp(platform.fixedCost)} a week{platform.txnFee ? ` + ${(platform.txnFee * 100).toFixed(1)}% of sales` : ""}. You're locked in.</Banner>}

          <Slider label="Price" accent={PLAYER} value={d.price} min={sc.priceMin} max={sc.priceMax} step={1} fmt={gbp} hint="A lower price wins a bigger share of new buyers, but every £1 off comes out of the contribution on every unit you ship." onChange={(v) => setPlayerDecision({ price: v })} />
          <Slider label="Ad spend" accent={PLAYER} value={d.ad} min={0} max={2500} step={50} fmt={gbp} hint={`Buys visibility relative to your rivals' spend. This brief is ${sc.adResponse >= 1.1 ? "ad-responsive" : sc.adResponse <= 0.8 ? "research-led — ads do less" : "moderately ad-responsive"}.`} onChange={(v) => setPlayerDecision({ ad: v })} />
          {ful.infiniteStock ? (
            <div style={{ marginBottom: 16, fontSize: 14.5, color: T.muted, background: T.panel2, borderRadius: 9, padding: "10px 12px" }}>
              <b style={{ color: T.text }}>Unlimited inventory</b> — {sc.digital ? "digital goods never stock out." : "your dropship supplier holds the stock."} No stocking decision this week.
            </div>
          ) : (
            <Slider label="Units stocked" accent={PLAYER} value={d.stock} min={0} max={Math.round(sc.demandBase * 1.4)} step={25} fmt={(n) => n.toLocaleString("en-GB")} valueText={(n) => `${n.toLocaleString("en-GB")} units`}
              hint={<>{sc.holdingPerUnit >= 1.5 ? "Unsold units spoil, so ordering too much is very costly here. Match your stock to expected demand." : "Too few and you stock out; too many and you pay to hold what is left."} This is the <Term term="newsvendor">stocking trade-off</Term>.</>} onChange={(v) => setPlayerDecision({ stock: v })} />
          )}

          <CROPanel player={player} sc={sc} croConv={croConv} availCash={availCash} onDeploy={croDeploy} onTest={croTest} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 16 }}>
            <MiniStat label={<><Term term="contribution">Contribution</Term> / unit shipped</>} value={gbp2(ue.contribution)} sub={<>after {pct0(ue.returnRate)} returns, {pct0(ue.feeRate)} fees and {gbp2(ue.unitCost)} <Term term="cogs">COGS</Term></>} accent={ue.contribution > 0 ? T.pos : T.neg} />
            <MiniStat label="Break-even volume" value={isFinite(ue.breakEvenUnits) ? `${units(Math.ceil(ue.breakEvenUnits))} units` : "none"} sub={isFinite(ue.breakEvenUnits) ? <>to cover {gbp(ue.fixedWeek)} of ads, <Term term="cro">CRO</Term> and platform fees</> : "every unit shipped loses money at this price"} accent={T.platform} />
            <MiniStat label={<Term term="regulars">Returning regulars</Term>} value={units(player.loyalBase)} sub="buy again without new ad spend" accent={T.youText} />
            <MiniStat label={<Term term="workingcapital">Cash available</Term>} value={gbp(availCash)} sub={committed > 0 ? `${gbp(committed)} committed to CRO this week` : "what you can spend on CRO"} accent={availCash < 0 ? T.neg : availCash < cfg.startingCash * 0.3 ? T.amber : T.pos} />
          </div>

          <div style={{ marginTop: 16, background: T.panel2, borderRadius: 10, padding: "12px 14px" }}>
            <div id={predId} style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 9 }}>Before you sell — where will you stand on the leaderboard (cumulative profit) after this week?</div>
            <ChoiceGroup labelId={predId} options={stores.map((_, i) => ({ id: i + 1, label: `#${i + 1}` }))} value={prediction} onChange={setPrediction} style={{ display: "flex", gap: 6 }}
              btnStyle={(on) => ({ flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontFamily: T.mono, fontWeight: 700, fontSize: 15, border: `1px solid ${on ? T.playerBtn : T.muted}`, background: on ? T.playerBtn : T.panel, color: on ? T.onAccent : T.text })} />
          </div>

          <button onClick={sellWeek} disabled={prediction == null} style={{ ...gatedBtn(prediction != null), width: "100%", marginTop: 16 }}>{prediction == null ? "Predict your position to continue" : "Run the week ▸"}</button>
        </div>

        <div style={card()}>
          <SectionTitle>The marketplace</SectionTitle>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>{ranked.map((s, i) => <StoreRow key={s.id} s={s} pos={i + 1} firstRound={round === 1} />)}</ol>
          <p style={{ color: T.muted, fontSize: 14, marginTop: 14, lineHeight: 1.5 }}>Ranked by cumulative profit. Each row shows the store's platform, review rating, returning regulars and its share of last week's new buyers.</p>
        </div>
      </div>
    </div>
  );
}

function CROPanel({ player, sc, croConv, availCash, onDeploy, onTest }) {
  return (
    <section aria-labelledby="mt-cro" style={{ background: T.panel2, borderRadius: 12, padding: "13px 14px", marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <h3 id="mt-cro" style={{ fontWeight: 700, fontSize: 15.5, margin: 0 }}><Term term="cro">Conversion optimisation</Term></h3>
        <span style={{ fontFamily: T.mono, fontSize: 14, color: T.pos }}>site conversion ×{croConv.toFixed(3)}</span>
      </div>
      <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
        Permanent upgrades, three tiers each. An <Term term="abtest">A/B test</Term> ({pct0(CRO_TEST_FRACTION)} of the deploy price) shows a tier's true lift before you commit.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        {CRO_LEVERS.map((l) => {
          const tier = player.cro[l.id] || 0;
          const maxed = tier >= 3;
          const cost = maxed ? 0 : l.cost[tier];
          const testCost = maxed ? 0 : Math.round(cost * CRO_TEST_FRACTION);
          const tested = !!player.croTested[l.id + ":" + (tier + 1)];
          const scale = l.id === "mobile" ? sc.mobileShare : 1;
          const realised = !maxed && player.croLifts ? player.croLifts[l.id][tier] * scale : 0;
          return (
            <li key={l.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 8px", fontSize: 14.5 }}>
              <span style={{ width: 128, flexShrink: 0 }}>
                <span><span aria-hidden="true">{l.icon} </span>{l.name}</span>
                <span style={{ display: "block", marginTop: 2, color: T.muted, fontSize: 13 }}>tier {tier} of 3</span>
              </span>
              {maxed ? (
                <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 13.5 }}>fully deployed</span>
              ) : (
                <>
                  <span style={{ flex: "1 1 96px", fontFamily: T.mono, fontSize: 13, color: tested ? T.pos : T.muted }}>
                    {tested ? `tested: +${(realised * 100).toFixed(1)}%` : `est. +${(l.loLift * scale * 100).toFixed(1)}% to +${(l.hiLift * scale * 100).toFixed(1)}%`}
                  </span>
                  {!tested && <button onClick={() => onTest(l.id)} disabled={testCost > availCash} aria-label={`Test ${l.name} tier ${tier + 1} for ${gbp(testCost)}`} style={croBtn(testCost > availCash, false)}>test {gbp(testCost)}</button>}
                  <button onClick={() => onDeploy(l.id)} disabled={cost > availCash} aria-label={`Deploy ${l.name} tier ${tier + 1} for ${gbp(cost)}`} style={croBtn(cost > availCash, true)}>deploy {gbp(cost)}</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StoreRow({ s, pos, firstRound }) {
  const share = s.last ? s.last.share : 0;
  return (
    <li style={{ background: s.isPlayer ? T.youTint : T.panel2, border: `1px solid ${s.isPlayer ? PLAYER_COLOR : T.border}`, borderRadius: 11, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.mono, color: T.muted, fontSize: 14, width: 16 }}>{pos}</span>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 9, background: s.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 0 }}>{s.name}{s.isPlayer && <span style={{ color: T.youText }}> (you)</span>}</span>
          <PlatformPill id={s.platformId} />
          {s.cash < 0 && <span style={{ fontSize: 13, color: T.neg, fontWeight: 700 }}>insolvent</span>}
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 14.5, color: s.cumProfit >= 0 ? T.pos : T.neg, fontWeight: 700 }}>{gbp(s.cumProfit)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, flexWrap: "wrap", fontFamily: T.mono, fontSize: 13.5, color: T.muted }}>
        <span><span aria-hidden="true">★ </span><span className="sr-only">rating </span>{s.review.toFixed(1)}</span>
        <span><span aria-hidden="true">♥ </span>{units(s.loyalBase)}<span className="sr-only"> regulars</span></span>
        <span aria-hidden="true" style={{ flex: 1, minWidth: 60, height: 6, background: T.track, borderRadius: 6, overflow: "hidden" }}><span style={{ display: "block", width: `${firstRound ? 0 : Math.round(share * 100)}%`, height: "100%", background: s.color }} /></span>
        <span style={{ minWidth: 34, textAlign: "right" }}>{firstRound ? "no sales yet" : <>{pct0(share)}<span className="sr-only"> of new buyers</span></>}</span>
      </div>
    </li>
  );
}

/* ---- RESULT ------------------------------------------------- */
export function ResultView({ ranked, log, round, nextWeek, player, cfg, predictionLog }) {
  const r = player.last; const sc = SC(cfg); const platform = PMAP[player.platformId]; const ful = fulfilOf(player, sc);
  const pred = predictionLog.find((p) => p.round === round);
  const rows = [
    ["Units kept by buyers", units(r.keptSales), T.text],
    ["Revenue", gbp(r.revenue), T.text],
    [`Cost of goods and fulfilment (${units(r.grossSold)} shipped)`, gbp(-r.cogs), T.muted],
    [`Marketplace fee (${pct0(cfg.commissionRate)})`, gbp(-r.commission), T.platform],
    [`Platform · ${platform.short}`, gbp(-(r.fixed - (ful.fixed || 0) + r.platformTxn)), T.platform],
    ...(sc.digital ? [] : [[`Fulfilment partner · ${ful.short}`, gbp(-((ful.fixed || 0) + r.dropshipCut)), T.platform]]),
    [`Return handling (${units(r.returnedUnits)} units)`, gbp(-r.returnHandling), r.returnHandling > 0 ? T.neg : T.muted],
    ["Ad spend", gbp(-r.ad), T.muted],
    ["CRO investment", gbp(-r.croCost), T.muted],
    ...(ful.infiniteStock ? [] : [[`Holding (${units(r.unsold)} unsold)`, gbp(-r.holding), T.muted]]),
  ];
  const cell = { padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 15 };
  const note = (tone) => ({ marginTop: 10, background: tone === "bad" ? T.negTint : tone === "ok" ? T.posTint : T.panel2, border: `1px solid ${tone === "bad" ? T.negFill : tone === "ok" ? T.posFill : T.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14.5, lineHeight: 1.5 });
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <h1 style={{ ...h1Style, fontSize: 26 }}>Week {round} result — {r.profit >= 0 ? `${gbp(r.profit)} profit` : `${gbp(-r.profit)} loss`}</h1>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <SectionTitle>Your profit and loss</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([k, v, c]) => <tr key={k}><th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400, color: T.muted }}>{k}</th><td style={{ ...cell, textAlign: "right", fontFamily: T.mono, color: c, whiteSpace: "nowrap" }}>{v}</td></tr>)}
              <tr><th scope="row" style={{ padding: "12px 0 2px", textAlign: "left", fontSize: 17.5, fontWeight: 700 }}>Weekly profit</th><td style={{ padding: "12px 0 2px", textAlign: "right", fontSize: 17.5, fontWeight: 700, fontFamily: T.mono, color: r.profit >= 0 ? T.pos : T.neg }}>{gbp(r.profit)}</td></tr>
              <tr><th scope="row" style={{ padding: "4px 0", textAlign: "left", fontSize: 14.5, fontWeight: 400, color: T.muted }}>Cash after the week</th><td style={{ padding: "4px 0", textAlign: "right", fontSize: 14.5, fontFamily: T.mono, color: r.cashAfter < 0 ? T.neg : T.muted }}>{gbp(r.cashAfter)}</td></tr>
            </tbody>
          </table>

          <div style={note()}>Of {units(r.keptSales)} kept sales, <b style={{ color: T.youText }}>{units(r.returningServed)}</b> went to returning regulars. You now hold <b style={{ color: T.youText }}>{units(player.loyalBase)}</b> regulars. Site conversion ran at <b style={{ color: T.pos }}>×{r.croConv.toFixed(3)}</b>.</div>
          {pred && <div style={note(pred.hit ? "ok" : undefined)}><b>{pred.hit ? "Prediction right." : "Prediction off."}</b> You predicted #{pred.predicted}; you are #{pred.actual} on the leaderboard after week {round}.</div>}
          {r.returnedUnits >= 1 && <div style={note("bad")}><Term term="returns">Returns</Term>: {units(r.returnedUnits)} of the {units(r.grossSold)} units you shipped came back — no revenue on those, plus {gbp(r.returnHandling)} handling. Trust and checkout CRO reduce the return rate.</div>}
          {r.lostSales >= 1 && <div style={note("bad")}>Stocked out — <b>{units(r.lostSales)}</b> buyers could not buy. Lost sales now, a lower rating and fewer regulars later.</div>}
        </div>

        <div style={card()}>
          <SectionTitle>Marketplace report</SectionTitle>
          <ol style={{ listStyle: "none", margin: "0 0 14px", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {ranked.map((s, i) => (
              <li key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 15, padding: "3px 0", flexWrap: "wrap" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.mono, color: T.muted, width: 14 }}>{i + 1}</span>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 8, background: s.color }} />
                  <span style={{ minWidth: 0 }}>{s.name}{s.isPlayer && <span style={{ color: T.youText, fontWeight: 700 }}> (you)</span>}</span>
                  <PlatformPill id={s.platformId} />
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 14, color: T.muted, whiteSpace: "nowrap" }}>{units(s.last.keptSales)} sold at {gbp(s.last.price)} · {gbp(s.cumProfit)} total</span>
              </li>
            ))}
          </ol>
          <ul style={{ listStyle: "none", margin: 0, background: T.panel2, borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>{log.map((line, i) => <li key={i} style={{ fontSize: 14.5, color: T.text, lineHeight: 1.45 }}>{line}</li>)}</ul>
          <button onClick={nextWeek} style={{ ...btn(T.playerBtn), width: "100%", marginTop: 16 }}>{round >= cfg.maxRounds ? "See final results →" : `Plan week ${round + 1} →`}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- END + DEBRIEF ------------------------------------------ */
export function EndView({ stores, ranked, restart, player, cfg, predictionLog, onLog }) {
  const winner = ranked[0]; const sc = SC(cfg);
  const playerRank = ranked.findIndex((s) => s.isPlayer) + 1;
  const wentNegative = player.history.find((h) => h.cash < 0);
  const chartData = useMemo(() => {
    const rounds = player.history.length;
    return Array.from({ length: rounds }, (_, i) => { const row = { week: i + 1 }; stores.forEach((s) => { row[s.id] = Math.round(s.history[i] ? s.history[i].cumProfit : 0); }); return row; });
  }, [stores, player]);
  const shareData = ranked.map((s) => ({ name: s.isPlayer ? "You" : s.name.split(" ").slice(-1)[0], value: Math.round(s.cumProfit), color: s.color }));
  const finals = ranked.map((s) => `${s.isPlayer ? "you" : s.name} ${gbp(s.cumProfit)}`).join(", ");
  const kAxis = (v) => (v === 0 ? "£0" : `${v < 0 ? "−" : ""}£${Math.abs(v / 1000).toFixed(Math.abs(v) >= 10000 || v % 1000 === 0 ? 0 : 1)}k`);
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 13.5, letterSpacing: 2 }}><span aria-hidden="true">{sc.icon} </span>{sc.name.toUpperCase()} · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>{winner.isPlayer ? <>You won the marketplace <span aria-hidden="true">🏆</span></> : `${winner.name} took it`}</h1>
        <p style={{ color: T.muted, margin: 0 }}>You finished <b style={{ color: T.youText }}>{playerRank} of {stores.length}</b> on {PMAP[player.platformId].name} with {player.cumProfit >= 0 ? `${gbp(player.cumProfit)} profit` : `a ${gbp(-player.cumProfit)} loss`} and {gbp(player.cash)} cash{wentNegative && <span style={{ color: T.neg }}> — after running out of cash in week {wentNegative.round}</span>}.</p>
      </div>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Cumulative profit over {player.history.length} weeks</SectionTitle>
          <Chart label={`Line chart of each store's cumulative profit by week. After week ${player.history.length}: ${finals}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="week" tickLine={false} /><YAxis tickFormatter={kAxis} tickLine={false} width={52} />
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [gbp(v), stores.find((s) => s.id === n)?.name]} labelFormatter={(l) => `Week ${l}`} />
                {stores.map((s) => <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={s.isPlayer ? 3.5 : 2} strokeDasharray={s.isPlayer ? undefined : "5 3"} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </Chart>
          <p style={{ fontSize: 13.5, color: T.muted, margin: "6px 0 0" }}>Your store is the solid blue line; rivals are dashed.</p>
        </div>
        <div style={card()}>
          <SectionTitle>Final profit by store</SectionTitle>
          <Chart label={`Bar chart of final cumulative profit: ${finals}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={shareData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={kAxis} tickLine={false} width={52} />
                <Tooltip cursor={{ fill: "#00000008" }} contentStyle={tipStyle} formatter={(v) => gbp(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{shareData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Chart>
          <ol style={{ margin: "8px 0 0", paddingLeft: 22, fontSize: 14, color: T.body2, lineHeight: 1.5 }}>
            {ranked.map((s) => <li key={s.id}>{s.name}{s.isPlayer && " (you)"}: <span style={{ fontFamily: T.mono }}>{gbp(s.cumProfit)}</span></li>)}
          </ol>
        </div>
      </div>
      <Debrief stores={stores} player={player} cfg={cfg} predictionLog={predictionLog} />
      <Recommendation brief={sc.id} />
      <SkillsPractised outcomes={OUTCOMES[sc.id]} style={{ marginTop: 18 }} />
      <div style={{ ...card(), marginTop: 18, textAlign: "center" }}>
        <SectionTitle>Take your decision log into class</SectionTitle>
        <p style={{ color: T.muted, fontSize: 14.5, lineHeight: 1.5, maxWidth: 600, margin: "0 auto 16px" }}>Your decision log gathers this game's result, your recommendation, a skills record and lines for your CV, and saves as a PDF. The week-by-week figures — every decision, CRO, returns, cash, leaderboard position and predictions — download as a spreadsheet or as text with reflection prompts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {onLog && <button onClick={onLog} style={btn(T.playerBtn)}>Open your decision log</button>}
          <button onClick={() => downloadFile(`tycoon-log-${cfg.seed}.csv`, buildCSV(stores, player, predictionLog), "text/csv")} style={btn(T.platformFill)}>Download CSV</button>
          <button onClick={() => downloadFile(`tycoon-log-${cfg.seed}.md`, buildMarkdown(stores, player, predictionLog, cfg), "text/markdown")} style={ghostBtn}>Download Markdown</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }}><button onClick={restart} style={btn(T.playerBtn)}>Play again ↺</button></div>
    </div>
  );
}

function Debrief({ stores, player, cfg, predictionLog }) {
  const cards = debriefCards(stores, player, cfg, predictionLog);
  return (
    <div style={{ ...card(), marginTop: 18 }}>
      <SectionTitle>Debrief — what your run showed</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
        {cards.map((c) => <div key={c.t} style={{ background: T.panel2, borderRadius: 11, padding: "14px 15px", border: `1px solid ${T.border}` }}><h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, margin: "0 0 6px", color: T.selText }}>{c.t}</h3><p style={{ fontSize: 14.5, color: T.text, lineHeight: 1.5, margin: 0 }}>{c.b}</p></div>)}
      </div>
    </div>
  );
}
