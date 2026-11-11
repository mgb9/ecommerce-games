import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  INTERVENTIONS, IMAP, STAGES, NONE, volumes, actsOn, quartersLeft, biggestGapOf, purchasesFor,
  stageLabel, fixLabel, buildDebrief, buildCSV, buildMarkdown, downloadFile, gbp, gbpK, pct, pp,
} from "../engine/engine.js";
import { T, PLAYER, card, btn, ghostBtn, gatedBtn, tipStyle, td } from "./theme.js";
import { PT, Term, TermsHint, Eyebrow, LOS, SectionTitle, ChoiceGroup, QuestionLabel, ScoreCard, Chart, useReducedMotion } from "./shared.jsx";

const times = (n) => (n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "×";
const signed = (n) => (n < 0 ? "−" : "+") + gbp(Math.abs(n));
const quartersWord = (n) => (n === 1 ? "this quarter only" : `this quarter and ${n - 1} more`);
const pickRow = (on) => ({ textAlign: "left", cursor: "pointer", color: on ? T.selText : T.text, fontFamily: T.body, background: on ? T.sel : T.panel2, border: `1.5px solid ${on ? T.playerBtn : T.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 600, width: "100%" });
const tag = { fontFamily: T.mono, fontSize: 12.5, color: T.body2, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" };

function ScreenHead({ kicker, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontFamily: T.mono, color: T.playerText, fontSize: 14.5, fontWeight: 700, letterSpacing: 1 }}>{kicker}</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.5, margin: "2px 0 0", lineHeight: 1.15 }}>{children}</h1>
    </div>
  );
}
// What a fix acts on — the stage and how much of its headroom it closes.
function ActsOn({ intv, cfg }) {
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
      <span className="sr-only">Acts on: </span>
      {actsOn(intv, cfg).map((a) => <span key={a.stage} style={tag}>{a.label} · {a.strength}</span>)}
      {intv.type === "acq" && <span style={{ ...tag, color: T.amber }}>re-bought each quarter</span>}
      {intv.type === "rate" && !intv.marginCut && <span style={tag}>one-off, stays</span>}
      {intv.marginCut && <span style={{ ...tag, color: T.neg }}>cuts margin {Math.round(cfg.shippingMarginCut * 100)} points, for good</span>}
    </span>
  );
}

/* ---- INTRO --------------------------------------------------- */
export function Intro({ onStart, cfg, progress }) {
  const steps = [
    ["01", "Diagnose", <>Read the funnel and call the biggest <b>money</b> leak before the £ sizing is shown.</>],
    ["02", "Back a fix", <>Say which purchase will return most per £ by the end of the plan — or that none will pay back.</>],
    ["03", "Allocate", <>Spend the quarter's budget. You can't afford everything, and you don't have to spend at all.</>],
    ["04", "Re-diagnose", <>See what each purchase returned, <Term term="cac">CAC</Term> against <Term term="ltv">LTV</Term>, and where the leak moved.</>],
  ];
  return (
    <div className="rise" style={{ maxWidth: 840, margin: "48px auto 0" }}>
      <Eyebrow>Funnel economics · LO3</Eyebrow>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(34px, 7vw, 50px)", lineHeight: 1.04, letterSpacing: -1.2, margin: "16px 0 0" }}>
        <PT rich={<>The funnel is leaking.<br /><span style={{ color: PLAYER }}>Where do you spend?</span></>}
            plain={<>The shop loses customers at every step.<br /><span style={{ color: PLAYER }}>Choose where to invest.</span></>} />
      </h1>
      <p style={{ color: T.body2, fontSize: 19, lineHeight: 1.6, marginTop: 18 }}>
        Chrichton's e-commerce <Term term="funnel">funnel</Term> loses people at every step. Each quarter you have a fixed budget and a menu of fixes.{" "}
        <PT rich={<>The stage furthest below its <Term term="benchmark">benchmark</Term> in percentage points is often not the one losing the most money.</>}
            plain={<>The step with the biggest percentage gap is often NOT the step that loses the most money.</>} />{" "}
        Size each leak in pounds (<Term term="opportunitysizing">opportunity sizing</Term>), judge each purchase by what it returns over the time left, and re-diagnose as the <Term term="bottleneck">bottleneck</Term> moves.
      </p>
      <ol style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14, margin: "26px 0 0" }}>
        {steps.map(([n, t, d]) => (
          <li key={t} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 17px", boxShadow: T.shadow }}>
            <div aria-hidden="true" style={{ color: T.second, fontFamily: T.mono, fontSize: 14.5, fontWeight: 700 }}>{n}</div>
            <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 19, margin: "4px 0 5px" }}>{t}</h2>
            <div style={{ color: T.body2, fontSize: 15, lineHeight: 1.5 }}>{d}</div>
          </li>
        ))}
      </ol>
      <div style={{ ...card(), marginTop: 20, padding: "15px 18px" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, letterSpacing: 0.4 }}>What this develops</h2>
        <p style={{ margin: "6px 0 0", color: T.body2, fontSize: 15.5, lineHeight: 1.55 }}><b style={{ color: T.text }}>Learning outcome 3.</b> {LOS.LO3} Here that means judging which store improvements are worth their cost — in profit, over a stated period — rather than by how large a conversion gap looks.</p>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 26, flexWrap: "wrap" }}>
        <button type="button" onClick={onStart} style={btn(T.playerBtn)}>Open the dashboard <span aria-hidden="true">→</span></button>
        <span style={{ color: T.muted, fontSize: 15.5 }}>{cfg.quarters} quarters · {gbp(cfg.budget)} a quarter · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
      {progress?.first && (
        <p style={{ margin: "14px 0 0", color: T.body2, fontSize: 15 }}>
          Your first run made <b style={{ color: T.text }}>{gbp(progress.first.profit)}</b> (biggest leak called {progress.first.leakHits}/{progress.first.quarters}, best bet {progress.first.betHits}/{progress.first.quarters}).
          {progress.runs > 1 && <> Best of {progress.runs} runs: <b style={{ color: T.text }}>{gbp(progress.best.profit)}</b>.</>}
        </p>
      )}
      <TermsHint />
    </div>
  );
}

/* ---- THE FUNNEL ----------------------------------------------
   Each band's width is its volume. Above each stage: the rate into it,
   the benchmark and best-in-class (the headroom a fix can close). The
   picture is decoration for a screen reader: every stage also carries
   one plain sentence with the same numbers. */
export function FunnelViz({ rates, sessions, leaksArr, cfg, bottleneckKey, showLeaks, predKey, compact }) {
  const vols = volumes(rates, sessions);
  const max = vols[0].count;
  const widthPct = (c) => Math.max(8, Math.sqrt(c / max) * 100);
  const leakByStage = Object.fromEntries(leaksArr.map((l) => [l.stage, l]));
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: compact ? 3 : 5 }}>
      {vols.map((v, i) => {
        const leak = i > 0 ? leakByStage[v.key] : null;
        const isBott = leak && leak.stage === bottleneckKey;
        const isPred = leak && leak.stage === predKey;
        const count = Math.round(v.count).toLocaleString("en-GB");
        return (
          <li key={v.key}>
            <span className="sr-only">
              {leak
                ? `${v.label}: ${count} people, ${pct(leak.rate)} of the stage before. Benchmark ${pct(leak.bench, 0)}, best-in-class ${pct(cfg.ceilings[v.key], 0)}.` +
                  (showLeaks ? (leak.leak >= 1 ? ` Money leak ${gbpK(leak.leak)} a quarter.` : " No leak against benchmark.") : "") + (isBott ? " This is the biggest money leak." : "") + (isPred ? " Your pick." : "")
                : `${v.label}: ${count}.`}
            </span>
            <div aria-hidden="true">
              {leak && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "0 9px", fontSize: 13, color: T.muted, fontFamily: T.mono, padding: "1px 0" }}>
                  <span style={{ color: leak.gap > 0 ? T.amber : T.pos, fontWeight: 700 }}>↓ {pct(leak.rate)}</span>
                  <span>benchmark {pct(leak.bench, 0)} ({pp(leak.rate - leak.bench)})</span>
                  <span>best {pct(cfg.ceilings[v.key], 0)}</span>
                  {showLeaks && <span style={{ color: isBott ? T.neg : T.muted, fontWeight: 700 }}>{leak.leak >= 1 ? `${gbpK(leak.leak)} leak/qtr` : "no leak"}</span>}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className="fbar" style={{ width: `${widthPct(v.count)}%`, minWidth: "max-content", maxWidth: "100%", background: i === 0 ? "#ECEBEE" : isBott ? T.negTint : isPred ? T.sel : T.panel2, border: `1.5px solid ${isBott ? T.neg : isPred ? T.playerBtn : T.border}`, borderRadius: 10, padding: compact ? "7px 14px" : "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: compact ? 14 : 15 }}>{v.label}{isBott && <span style={{ color: T.neg, fontSize: 13, marginLeft: 6 }}>● biggest leak</span>}{isPred && !isBott && <span style={{ color: T.selText, fontSize: 13, marginLeft: 6 }}>● your pick</span>}</span>
                  <span style={{ fontFamily: T.mono, fontSize: compact ? 13.5 : 14.5, color: T.text }}>{count}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
// The figures a sizing needs, stated once.
function Economics({ cfg, state }) {
  const margin = cfg.margin - state.marginCut;
  return (
    <p style={{ color: T.body2, fontSize: 14.5, margin: "12px 0 0", lineHeight: 1.55 }}>
      <Term term="aov">Average order</Term> {gbp(cfg.aov)} · <Term term="grossmargin">margin</Term> {pct(margin, 0)} = <b style={{ color: T.text }}>£{(cfg.aov * margin).toFixed(2)} profit per order</b> · {Math.round(cfg.mobileShare * 100)}% of sessions on mobile · <Term term="repeatfactor">repeat factor</Term> {cfg.repeat.toFixed(1)}×
    </p>
  );
}

/* ---- DIAGNOSE (two predictions) ------------------------------ */
export function Diagnose({ state, cfg, leaksArr, singles, predLeak, setPredLeak, predBest, setPredBest, onNext }) {
  const ready = predLeak != null && predBest != null;
  const qLeft = quartersLeft(state, cfg);
  const leakOptions = [...STAGES.map((s) => ({ id: s.key, label: s.label, l: leaksArr.find((x) => x.stage === s.key) })), { id: NONE, label: "None — every stage is at or above its benchmark" }];
  const betOptions = [...singles.map((p) => ({ id: p.id, intv: IMAP[p.id] })).sort((a, b) => INTERVENTIONS.indexOf(a.intv) - INTERVENTIONS.indexOf(b.intv)), { id: NONE }];
  return (
    <div className="rise">
      <ScreenHead kicker={`QUARTER ${state.quarter} OF ${cfg.quarters}`}>Diagnose the funnel</ScreenHead>
      <p style={{ color: T.body2, fontSize: 16.5, lineHeight: 1.55, marginTop: 8, maxWidth: 860 }}>
        Here is where Chrichton stands. Before the £ sizing is shown, make two calls: which stage is the biggest <b style={{ color: T.text }}>money</b> leak against its <Term term="benchmark">benchmark</Term>, and which single purchase would give the best <Term term="planreturn">return per £ by the end of the plan</Term>. A fix bought now is in place for {quartersWord(qLeft)}.
      </p>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 18, marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={card()}>
            <SectionTitle>Chrichton's funnel this quarter</SectionTitle>
            <FunnelViz rates={state.rates} sessions={cfg.sessions} leaksArr={leaksArr} cfg={cfg} bottleneckKey={null} predKey={predLeak} showLeaks={false} />
            <Economics cfg={cfg} state={state} />
            <p style={{ color: T.muted, fontSize: 14, margin: "8px 0 0", lineHeight: 1.5 }}>Each band's width shows its volume. A fix closes part of the headroom between a stage's rate and <Term term="ceiling">best-in-class</Term>. The £ value of each leak is hidden until you have made your calls.</p>
          </section>
          <section style={card()}>
            <SectionTitle id="q-leak">1 · Which stage is the biggest money leak?</SectionTitle>
            <ChoiceGroup labelId="q-leak" options={leakOptions} value={predLeak} onChange={setPredLeak} style={{ display: "flex", flexDirection: "column", gap: 7 }}
              btnStyle={(on) => ({ ...pickRow(on), display: "flex", justifyContent: "space-between", gap: 8 })}
              render={(o) => <><span>{o.label}</span>{o.l && <span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.body2, fontWeight: 500, whiteSpace: "nowrap" }}>{pct(o.l.rate)} vs {pct(o.l.bench, 0)}</span>}</>} />
          </section>
        </div>
        <section style={card()}>
          <SectionTitle id="q-bet">2 · Which single purchase returns most per £ by the end of the plan?</SectionTitle>
          <ChoiceGroup labelId="q-bet" options={betOptions} value={predBest} onChange={setPredBest} style={{ display: "flex", flexDirection: "column", gap: 7 }}
            btnStyle={(on) => pickRow(on)}
            render={(o) => o.id === NONE ? <span>None — not one of them would earn back its cost</span> : (
              <>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span><span aria-hidden="true">{o.intv.icon} </span>{o.intv.name}</span><span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.body2, fontWeight: 500 }}>{gbp(o.intv.cost)}</span></span>
                <ActsOn intv={o.intv} cfg={cfg} />
              </>
            )} />
          <p style={{ color: T.muted, fontSize: 14, margin: "10px 0 0", lineHeight: 1.5 }}>Strong, moderate and light say how much of a stage's remaining headroom a fix closes. Outcomes vary a little from quarter to quarter, so a pick within 5% of the best counts as right.</p>
        </section>
      </div>
      <div style={{ textAlign: "right", marginTop: 18 }}>
        <button type="button" onClick={() => ready && onNext()} aria-disabled={!ready} style={gatedBtn(ready)}>{ready ? <>Show the money leaks and allocate <span aria-hidden="true">→</span></> : "Make both calls to continue"}</button>
      </div>
    </div>
  );
}

/* ---- ALLOCATE ------------------------------------------------ */
export function Allocate({ state, cfg, leaksArr, bottleneck, predLeak, chosen, toggleChoice, onRun }) {
  const spent = chosen.reduce((a, id) => a + IMAP[id].cost, 0);
  const remaining = cfg.budget - spent;
  const actual = bottleneck ? bottleneck.stage : NONE;
  const hit = predLeak === actual;
  const gap = biggestGapOf(leaksArr);
  return (
    <div className="rise">
      <ScreenHead kicker={`QUARTER ${state.quarter} OF ${cfg.quarters}`}>Allocate the budget</ScreenHead>
      <div style={{ marginTop: 12, background: hit ? T.posTint : T.amberTint, border: `1px solid ${hit ? T.pos : T.amber}55`, borderRadius: 11, padding: "12px 15px", fontSize: 15.5, lineHeight: 1.55 }}>
        <b style={{ color: hit ? T.pos : T.amber }}>{hit ? "Right." : "Not this time."}</b>{" "}
        {bottleneck
          ? <>The biggest <Term term="opportunitysizing">money leak</Term> is <b>{bottleneck.label}</b>, worth {gbpK(bottleneck.leak)} a quarter{hit ? "" : <> — you called <b>{stageLabel(predLeak)}</b></>}. </>
          : <>No stage is below its benchmark, so nothing is leaking against it{hit ? "" : <> — you called <b>{stageLabel(predLeak)}</b></>}. What is left is headroom to best-in-class. </>}
        {bottleneck && gap && (gap.stage === bottleneck.stage
          ? <>This quarter it is also the stage furthest below benchmark in points ({pp(-gap.gap)}).</>
          : <>The stage furthest below benchmark in points is {gap.label} ({pp(-gap.gap)}), but that gap is worth only {gbpK(gap.leak)}.</>)}
      </div>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 18, marginTop: 14 }}>
        <section style={card()}>
          <SectionTitle>The money leak at each stage</SectionTitle>
          <FunnelViz rates={state.rates} sessions={cfg.sessions} leaksArr={leaksArr} cfg={cfg} bottleneckKey={bottleneck?.stage} showLeaks={true} />
          <p style={{ color: T.muted, fontSize: 14, margin: "12px 0 0", lineHeight: 1.5 }}>Leak = people entering the stage × the gap to benchmark × the conversion still to come × £{(cfg.aov * (cfg.margin - state.marginCut)).toFixed(2)} profit per order.</p>
        </section>
        <section style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SectionTitle id="q-fixes">Choose what to buy</SectionTitle>
            <div role="status" style={{ textAlign: "right" }}><div style={{ fontSize: 13, color: T.muted }}>budget left</div><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 18.5, color: remaining < cfg.budget * 0.2 ? T.amber : T.pos }}>{gbp(remaining)}</div></div>
          </div>
          <div aria-hidden="true" style={{ height: 7, background: T.track, borderRadius: 7, overflow: "hidden", marginBottom: 14 }}><div style={{ width: `${Math.min(100, (spent / cfg.budget) * 100)}%`, height: "100%", background: PLAYER, transition: "width .3s" }} /></div>
          <div role="group" aria-labelledby="q-fixes" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {INTERVENTIONS.map((iv) => {
              const deployed = iv.type === "rate" && state.deployed.includes(iv.id);
              const on = chosen.includes(iv.id);
              const afford = on || spent + iv.cost <= cfg.budget;
              const off = deployed || !afford;
              return (
                <button key={iv.id} type="button" aria-pressed={on} aria-disabled={off} onClick={() => !off && toggleChoice(iv.id)}
                  style={{ textAlign: "left", fontFamily: T.body, color: T.text, cursor: off ? "not-allowed" : "pointer", background: on ? T.sel : off ? T.ink : T.panel2, border: `1.5px solid ${on ? T.playerBtn : T.border}`, borderRadius: 12, padding: "11px 13px" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15.5, color: off ? T.muted : on ? T.selText : T.text }}><span aria-hidden="true">{iv.icon} </span>{iv.name}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 14.5, color: on ? T.selText : T.body2 }}>{gbp(iv.cost)}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 14, color: off ? T.muted : T.body2, marginTop: 3, lineHeight: 1.4 }}>{deployed ? "Already in place." : !afford ? `Not affordable with ${gbp(remaining)} left.` : iv.blurb}</span>
                  {!deployed && <ActsOn intv={iv} cfg={cfg} />}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={onRun} style={{ ...btn(T.playerBtn), width: "100%", marginTop: 14 }}>{chosen.length ? `Run quarter ${state.quarter}` : `Spend nothing and run quarter ${state.quarter}`} <span aria-hidden="true">▸</span></button>
          <p style={{ color: T.muted, fontSize: 14, margin: "9px 0 0", lineHeight: 1.5 }}>Budget you don't spend is not carried over — and not spent either: profit is what the funnel earns minus what you buy.</p>
        </section>
      </div>
    </div>
  );
}

/* ---- RESULT -------------------------------------------------- */
export function ResultView({ result: r, cfg, record, singles, onNext, lastQuarter }) {
  const dPurch = Math.round(r.purchases - r.purchasesBefore);
  const bought = [...r.perInterventionROI].sort((a, b) => b.planRoi - a.planRoi);
  const best = singles[0];
  const bets = record.bestBets;
  const leakTruth = record.actualLeak === NONE ? "No stage was below its benchmark." : `Biggest leak: ${stageLabel(record.actualLeak)} (${gbpK(record.leakValue)} a quarter).`;
  const betTruth = bets[0] === NONE
    ? `Nothing would have earned back its cost — the best, ${best ? best.name : "—"}, returned ${best ? times(best.planRoi) : "—"}.`
    : `Best alone: ${bets.map(fixLabel).join(" or ")} (${times(best.planRoi)} by the end of the plan).`;
  return (
    <div className="rise">
      <ScreenHead kicker={`QUARTER ${record.quarter} RESULT`}>{bought.length === 0 ? "You spent nothing this quarter" : `${dPurch >= 0 ? "+" : "−"}${Math.abs(dPurch).toLocaleString("en-GB")} purchases against an untouched funnel`}</ScreenHead>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={card()}>
            <SectionTitle>The funnel after this quarter</SectionTitle>
            <FunnelViz rates={r.afterRates} sessions={r.sessions} leaksArr={r.leaks} cfg={cfg} bottleneckKey={r.bottleneck?.stage} showLeaks={true} compact />
            <p style={{ margin: "12px 0 0", background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 15, lineHeight: 1.5 }}>
              {r.bottleneck
                ? record.nextLeak === record.actualLeak
                  ? <>The biggest leak is still <b>{r.bottleneck.label}</b> ({gbpK(r.bottleneck.leak)} a quarter).</>
                  : <>The biggest leak is now <b>{r.bottleneck.label}</b> ({gbpK(r.bottleneck.leak)} a quarter) — <Term term="theoryofconstraints">the constraint has moved</Term>.</>
                : <>No stage is below its benchmark now. What is left is headroom to best-in-class.</>}
            </p>
          </section>
          <section style={card()}>
            <SectionTitle>Your two calls</SectionTitle>
            <div style={{ display: "grid", gap: 10 }}>
              <ScoreCard ok={record.leakCorrect} title="Biggest money leak" you={stageLabel(record.predLeak)} truth={leakTruth} />
              <ScoreCard ok={record.roiCorrect} title="Best return per £ by the end of the plan" you={fixLabel(record.predBest)} truth={betTruth} />
            </div>
          </section>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={card()}>
            <SectionTitle>The quarter in money</SectionTitle>
            <dl style={{ margin: 0 }}>
              {[["Purchases", Math.round(r.purchases).toLocaleString("en-GB")],
                ["Revenue", gbp(r.revenue)],
                [`Margin on revenue (${pct(r.effMargin, 0)}${r.effMargin < cfg.margin ? ", cut by free shipping" : ""})`, gbp(r.revenue * r.effMargin)],
                ["Spent this quarter", "−" + gbp(r.spend)]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 15.5 }}><dt style={{ color: T.body2 }}>{k}</dt><dd style={{ margin: 0, fontFamily: T.mono }}>{v}</dd></div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "11px 0 2px", fontSize: 17.5, fontWeight: 700 }}><dt>Profit after spend</dt><dd style={{ margin: 0, fontFamily: T.mono, color: r.grossProfit >= 0 ? T.pos : T.neg }}>{gbp(r.grossProfit)}</dd></div>
            </dl>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, color: T.body2 }}>
              {r.ltvCac != null
                ? <>Bought traffic cost <b style={{ color: T.text }}>{gbp(r.cac)}</b> per extra customer (<Term term="cac">CAC</Term>) against a lifetime value of {gbp(r.ltv)} (<Term term="ltv">LTV</Term>): <b style={{ color: r.ltvCac >= 3 ? T.pos : r.ltvCac >= 1 ? T.amber : T.neg }}><Term term="ltvcac">LTV/CAC</Term> {r.ltvCac.toFixed(1)}×</b> — {r.ltvCac >= 3 ? "above the 3× rule of thumb." : r.ltvCac >= 1 ? "it pays back in the end, but below the 3× rule of thumb." : "each bought customer costs more than they return."}</>
                : <>No traffic was bought this quarter, so there is no <Term term="cac">CAC</Term> to report.</>}
            </p>
          </section>
          <section style={card()}>
            <SectionTitle>What each purchase returned</SectionTitle>
            {bought.length === 0 ? <p style={{ margin: 0, color: T.body2, fontSize: 15 }}>Nothing bought. {best ? <>The best single purchase on offer, {best.name}, would have returned {times(best.planRoi)} by the end of the plan.</> : null}</p> : (
              <div role="region" tabIndex={0} aria-label="Return on each purchase" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 430, borderCollapse: "collapse", fontSize: 14.5 }}>
                  <thead><tr>{["Purchase", "Cost", "This quarter", record.quartersLeft > 1 ? `By the end of the plan (${record.quartersLeft} quarters)` : "By the end of the plan"].map((h) => <th key={h} scope="col" style={{ ...td(), color: T.body2, fontWeight: 700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {bought.map((x) => (
                      <tr key={x.id}>
                        <th scope="row" style={{ ...td(), fontWeight: 600 }}>{x.name}</th>
                        <td style={{ ...td(), fontFamily: T.mono }}>{gbp(x.cost)}</td>
                        <td style={{ ...td(), fontFamily: T.mono, whiteSpace: "nowrap" }}>{signed(x.incrProfit)} · {times(x.roi)}</td>
                        <td style={{ ...td(), fontFamily: T.mono }}><span style={{ whiteSpace: "nowrap" }}>{signed(x.planProfit)} · </span><b style={{ color: x.planRoi >= 1 ? T.pos : T.neg }}>{times(x.planRoi)}</b> <span style={{ fontFamily: T.body, color: x.planRoi >= 1 ? T.pos : T.neg }}>{x.planRoi >= 1 ? "pays back" : "does not pay back"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ color: T.muted, fontSize: 14, margin: "10px 0 0", lineHeight: 1.5 }}>Each row is the extra profit from that purchase with the others held fixed, so rows do not add up to the total. A one-off fix keeps earning in later quarters (at the base level of traffic, everything else as it is now); bought traffic earns only this quarter.</p>
          </section>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button type="button" onClick={onNext} style={btn(T.playerBtn)}>{lastQuarter ? "See the debrief" : `Plan quarter ${record.quarter + 1}`} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}

/* ---- END / DEBRIEF ------------------------------------------- */
export function EndView({ records, state, cfg, restart, progress }) {
  const reduced = useReducedMotion();
  const N = records.length;
  const leakHits = records.filter((r) => r.leakCorrect).length;
  const betHits = records.filter((r) => r.roiCorrect).length;
  const untouched = purchasesFor(cfg.rates, cfg.sessions) * cfg.aov * cfg.margin * N;
  const chartData = records.map((r) => ({ q: "Q" + r.quarter, profit: Math.round(r.grossProfit), ltvCac: r.ltvCac != null ? +r.ltvCac.toFixed(2) : null }));
  const boughtTraffic = records.some((r) => r.ltvCac != null);
  const cards = buildDebrief(records, cfg);
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 14, letterSpacing: 2 }}>CHRICHTON · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(28px, 6vw, 38px)", margin: "6px 0", letterSpacing: -0.5 }}>{gbp(state.cumProfit)} profit after spend</h1>
        <p style={{ color: T.body2, margin: 0, fontSize: 16, lineHeight: 1.55 }}>
          Over {N} quarters — {state.cumProfit >= untouched ? gbp(state.cumProfit - untouched) + " more" : gbp(untouched - state.cumProfit) + " less"} than the {gbp(untouched)} an untouched funnel would have made.
          Biggest money leak called <b style={{ color: T.text }}>{leakHits} of {N}</b>; best bet called <b style={{ color: T.text }}>{betHits} of {N}</b>.
          {progress?.runs > 1 && progress.first && <> Your first run made {gbp(progress.first.profit)}.</>}
        </p>
      </div>
      <div className="cols2" style={{ display: "grid", gridTemplateColumns: boughtTraffic ? "minmax(0,1.3fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 18 }}>
        <section style={card()}>
          <SectionTitle>Profit after spend, by quarter</SectionTitle>
          <Chart label={`Line chart of profit after spend by quarter: ${records.map((r) => `quarter ${r.quarter} ${gbp(r.grossProfit)}`).join(", ")}.`}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="q" tickLine={false} /><YAxis tickFormatter={(v) => gbpK(v)} tickLine={false} width={50} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => gbp(v)} /><ReferenceLine y={0} stroke={T.faint} />
                <Line type="monotone" dataKey="profit" name="Profit after spend" stroke={PLAYER} strokeWidth={3} dot={{ r: 4 }} isAnimationActive={!reduced} />
              </LineChart>
            </ResponsiveContainer>
          </Chart>
        </section>
        {boughtTraffic && (
          <section style={card()}>
            <SectionTitle>LTV / CAC in the quarters you bought traffic</SectionTitle>
            <Chart label={`Chart of lifetime value divided by acquisition cost: ${records.filter((r) => r.ltvCac != null).map((r) => `quarter ${r.quarter} ${r.ltvCac.toFixed(1)} times`).join(", ")}. The rule of thumb is 3 times or more.`}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="q" tickLine={false} /><YAxis tickLine={false} width={40} allowDecimals={false} tickFormatter={(v) => v + "×"} domain={[0, (max) => Math.max(4, Math.ceil(max))]} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => v + "×"} /><ReferenceLine y={3} stroke={T.pos} strokeDasharray="5 4" label={{ value: "rule of thumb 3×", fill: T.pos, fontSize: 12.5, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="ltvCac" name="LTV / CAC" stroke={T.instructor} strokeWidth={3} dot={{ r: 4 }} connectNulls isAnimationActive={!reduced} />
                </LineChart>
              </ResponsiveContainer>
            </Chart>
          </section>
        )}
      </div>

      <section style={{ ...card(), marginTop: 18 }}>
        <SectionTitle>What your run showed</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12 }}>
          {cards.map((c) => <div key={c.id} style={{ background: T.panel2, borderRadius: 11, padding: "14px 15px", border: `1px solid ${T.border}` }}><h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, margin: "0 0 6px", color: T.selText }}>{c.title}</h3><p style={{ margin: 0, fontSize: 15, color: T.text, lineHeight: 1.55 }}>{c.body}</p></div>)}
        </div>
      </section>

      <section style={{ ...card(), marginTop: 18, textAlign: "center" }}>
        <SectionTitle>Take your diagnosis log into class</SectionTitle>
        <p style={{ color: T.body2, fontSize: 15, lineHeight: 1.5, maxWidth: 600, margin: "0 auto 16px" }}>Each quarter's calls, what you bought, purchases, revenue, profit, CAC, LTV/CAC and the spend that had not paid back — with the notes above and reflection prompts in the Markdown file.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => downloadFile(`funnel-fixer-${cfg.seed}.csv`, buildCSV(records, cfg), "text/csv")} style={ghostBtn}><span aria-hidden="true">⬇ </span>Download CSV</button>
          <button type="button" onClick={() => downloadFile(`funnel-fixer-${cfg.seed}.md`, buildMarkdown(records, cfg, state.cumProfit), "text/markdown")} style={ghostBtn}><span aria-hidden="true">⬇ </span>Download Markdown</button>
        </div>
      </section>
      <div style={{ textAlign: "center", marginTop: 22 }}><button type="button" onClick={restart} style={btn(T.playerBtn)}>Run it again <span aria-hidden="true">↺</span></button></div>
    </div>
  );
}
