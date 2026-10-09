import React, { useEffect, useId, useMemo } from "react";
import { BANDS, trueBand, requiredSampleSize, runTest, pct, pp, pEq, fmtN, NULL_ZONE } from "../../engine/engine.js";
import { PALETTE, PMAP, BRIEFS, BMAP, LOAD_BUDGET, CONTROL_LAYOUT, reviewLayout, layoutToExperiment } from "../../engine/wireframe.js";
import { T, card, btn, ghostBtn, smallGhost, pillBtn, gatedBtn } from "../theme.js";
import { PT, ChoiceGroup, QuestionLabel, MiniStat, MiniTag, ScoreCard } from "../shared.jsx";
import { useSessionState } from "../session.js";
import { markHubPlayed } from "../progress.js";

/* ---- WIREFRAME STUDIO (LO2 — context → design → hypothesis → test) ----
   Four steps, each its own screen: pick a brief, build a page, commit a
   hypothesis (metric, effect size, sample size), then the A/B verdict.
   The predicted rate stays hidden until the test runs. The studio's
   state survives a refresh; the run is recomputed from the seed. */
const ROLE_TAG = {
  essential: { t: "essential", c: T.playerText }, trust: { t: "trust", c: T.armB },
  social: { t: "social proof", c: T.armB }, urgency: { t: "urgency", c: T.amber },
  info: { t: "info", c: T.muted }, crosssell: { t: "cross-sell", c: T.muted }, media: { t: "media", c: T.muted },
};
const CHECK = { pass: { icon: "✓", word: "passes", c: T.pos }, partial: { icon: "~", word: "partly", c: T.amber }, fail: { icon: "✕", word: "fails", c: T.neg } };
const GRADE_COL = { A: T.pos, B: T.pos, C: T.amber, D: T.neg, E: T.neg };
// which primary metric each brief really wants, and why
const BRIEF_METRIC = { flash: "conv", b2b: "rev", returning: "rev" };
const METRIC_WHY = {
  flash: "it's a low-value impulse sale with fairly uniform order values, so conversion rate captures what matters — revenue per visitor would mostly add noise",
  b2b: "order values are high and vary a lot between buyers, so revenue per visitor captures what conversion alone misses",
  returning: "cross-sells and reorders change what each order is worth, so revenue per visitor captures what conversion alone misses",
};
const METRICS = [
  { id: "conv", label: "Conversion rate", hint: "Share of visitors who buy. Right when order value is uniform." },
  { id: "rev", label: "Revenue per visitor", hint: "Conversion × order value — captures AOV, upsell and mix, not just count." },
];
const N_OPTIONS = [1000, 3000, 8000, 20000].map((n) => ({ id: n, label: fmtN(n) }));
const START = { briefId: null, layout: ["image", "title", "price", "atc"], step: "brief", hypo: { metric: null, band: null, plannedN: 3000 } };

export default function WireframeStudio({ cfg, onExit, onScreen }) {
  const [st, setSt] = useSessionState("wireframe", START);
  const { briefId, layout, step, hypo } = st;
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));
  const brief = briefId ? BMAP[briefId] : null;
  const review = useMemo(() => (brief ? reviewLayout(layout, brief) : null), [layout, brief]);
  useEffect(() => { onScreen?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // every update works from the latest state, so quick successive edits never undo each other
  const setLayout = (fn) => setSt((s) => ({ ...s, layout: fn(s.layout) }));
  const add = (id) => setLayout((l) => (l.includes(id) ? l : [...l, id]));
  const remove = (id) => setLayout((l) => l.filter((x) => x !== id));
  const swap = (i, j) => setLayout((l) => { if (j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const backBtn = <button type="button" onClick={onExit} style={smallGhost}>← Back to the lab</button>;

  if (step === "brief" || !brief) {
    return (
      <div className="rise" style={{ maxWidth: 900, margin: "26px auto 0" }}>
        {backBtn}
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 34, letterSpacing: -0.7, margin: "14px 0 4px" }}>
          <PT rich={<>Design for the <span style={{ color: T.playerText }}>context</span>, not the template.</>}
              plain={<>Design for the <span style={{ color: T.playerText }}>audience</span>, not a fixed template.</>} />
        </h1>
        <p style={{ color: T.body2, fontSize: 16, lineHeight: 1.55, margin: "0 0 20px", maxWidth: 720 }}>
          There is no universal “best” product page. Pick the brief you're designing for — the audience, device mix and
          buying mindset change which components help, which hurt, and how much a slow page costs you.
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 250px),1fr))", gap: 12 }}>
          {BRIEFS.map((b) => (
            <li key={b.id} style={{ display: "flex" }}>
              <button type="button" onClick={() => set({ briefId: b.id, step: "build" })}
                style={{ width: "100%", textAlign: "left", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: "pointer", color: T.text, fontFamily: T.body }}>
                <span aria-hidden="true" style={{ display: "block", fontSize: 26 }}>{b.icon}</span>
                <span style={{ display: "block", fontFamily: T.display, fontWeight: 700, fontSize: 17.5, margin: "6px 0 5px" }}>{b.name}</span>
                <span style={{ display: "block", color: T.body2, fontSize: 14.5, lineHeight: 1.45 }}>{b.audience}</span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <MiniTag label={`${Math.round(b.mobileShare * 100)}% mobile`} />
                  <MiniTag label={`current page converts at ${pct(b.base)}`} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "test") return <WireframeVerdict layout={layout} brief={brief} review={review} hypo={hypo} cfg={cfg} onRefine={() => set({ step: "build" })} onNewBrief={() => set({ step: "brief", briefId: null })} onExit={onExit} />;

  if (step === "hypothesis") return <Hypothesis brief={brief} hypo={hypo} cfg={cfg} setHypo={(h) => setSt((s) => ({ ...s, hypo: { ...s.hypo, ...h } }))} onBack={() => set({ step: "build" })} onRun={() => set({ step: "test" })} />;

  /* ---- STEP 2: build ---- */
  return (
    <div className="rise" style={{ maxWidth: 1080, margin: "22px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={() => set({ step: "brief", briefId: null })} style={smallGhost}>← Change brief</button>
        <div style={{ fontSize: 14.5, color: T.body2 }}>Designing: <b style={{ color: T.text }}>{brief.name}</b> · {Math.round(brief.mobileShare * 100)}% mobile</div>
      </div>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 28, letterSpacing: -0.5, margin: "14px 0 4px" }}>Build the page</h1>
      <p style={{ color: T.body2, fontSize: 15.5, lineHeight: 1.5, margin: "0 0 16px", maxWidth: 780 }}>
        {brief.audience} Only the first <b style={{ color: T.text }}>{review.fold} blocks</b> are seen before scrolling here, and this
        audience is {brief.speedSens >= 1.4 ? "unforgiving about slow pages" : brief.speedSens <= 1 ? "fairly patient with load time" : "moderately sensitive to load time"}.
      </p>

      <ControlPageRef brief={brief} compact />

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(210px,1fr) minmax(230px,1.05fr) minmax(250px,1.25fr)", gap: 16, alignItems: "start" }}>
        <section aria-labelledby="wf-palette" style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
          <h2 id="wf-palette" style={panelHead}>Components · weight in ms</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {PALETTE.map((c) => {
              const used = layout.includes(c.id);
              return (
                <li key={c.id}>
                  <button type="button" aria-pressed={used} onClick={() => (used ? remove(c.id) : add(c.id))} title={c.desc}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: used ? T.sel : "transparent", border: `1px solid ${used ? T.player : T.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, fontFamily: T.body }}>
                    <span aria-hidden="true" style={{ fontSize: 18.5 }}>{c.icon}</span>
                    <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.2 }}>{c.label}<span className="sr-only">, {c.wt} milliseconds{used ? ", on your page" : ""}</span></span>
                    <span aria-hidden="true" style={{ fontFamily: T.mono, fontSize: 13, color: c.wt >= 200 ? T.amber : T.muted }}>{c.wt}</span>
                    <span aria-hidden="true" style={{ color: used ? T.selText : T.muted, fontSize: 16.5, fontWeight: 700 }}>{used ? "−" : "+"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="wf-canvas" style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
          <h2 id="wf-canvas" style={panelHead}>Your page (top → bottom)</h2>
          {layout.length === 0 && <p style={{ color: T.muted, fontSize: 14.5, padding: "20px 4px", margin: 0 }}>Add components from the list to start building.</p>}
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {layout.map((id, i) => (
              <li key={id}>
                <WFBlock c={PMAP[id]} pos={i + 1} onUp={() => swap(i, i - 1)} onDown={() => swap(i, i + 1)} onRemove={() => remove(id)} canUp={i > 0} canDown={i < layout.length - 1} aboveFold={i < review.fold} />
                {i === review.fold - 1 && i < layout.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 1px" }}>
                    <div style={{ flex: 1, borderTop: `1px dashed ${T.faint}` }} />
                    <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, letterSpacing: 1 }}>FOLD</span>
                    <div style={{ flex: 1, borderTop: `1px dashed ${T.faint}` }} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="wf-review" className="cl-sticky" style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 id="wf-review" style={{ ...panelHead, margin: 0 }}>Design review</h2>
            <span role="img" aria-label={`Grade ${review.grade}`} style={{ width: 30, height: 30, borderRadius: 8, background: GRADE_COL[review.grade], color: T.onAccent, fontFamily: T.display, fontWeight: 700, fontSize: 18.5, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{review.grade}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
            <span style={{ color: T.body2 }}>Est. load time</span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, color: review.loadMs <= LOAD_BUDGET ? T.pos : review.loadMs <= LOAD_BUDGET + 800 ? T.amber : T.neg }}>{review.loadMs}ms{review.loadMs > LOAD_BUDGET ? " — over budget" : ""}</span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {review.checks.map((c) => (
              <li key={c.id} style={{ display: "flex", gap: 8 }}>
                <span aria-hidden="true" style={{ color: CHECK[c.state].c, fontWeight: 800, fontSize: 14.5, minWidth: 14, flexShrink: 0 }}>{CHECK[c.state].icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, color: T.text, fontWeight: c.state === "fail" ? 700 : 400 }}>{c.label}<span className="sr-only"> — {CHECK[c.state].word}</span></div>
                  <div style={{ fontSize: 13.5, color: T.body2, lineHeight: 1.4 }}>{c.tip}</div>
                </div>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 13.5, color: T.muted, textAlign: "center", margin: "10px 0 6px" }}>Predicted conversion is hidden — you'll commit your own estimate next.</p>
          <button type="button" onClick={() => set({ step: "hypothesis" })} disabled={!review.buyable} style={{ ...gatedBtn(review.buyable), width: "100%", padding: "12px 0" }}>
            {review.buyable ? "Set your hypothesis →" : "Add the missing essentials first"}
          </button>
        </section>
      </div>
    </div>
  );
}
const panelHead = { fontFamily: T.mono, fontSize: 13, letterSpacing: 1.2, color: T.body2, margin: "0 0 10px", fontWeight: 700, textTransform: "uppercase" };

function WFBlock({ c, pos, onUp, onDown, onRemove, canUp, canDown, aboveFold }) {
  const r = ROLE_TAG[c.role];
  const arrow = (on) => ({ background: "transparent", border: `1px solid ${T.border}`, color: on ? T.text : T.muted, opacity: on ? 1 : 0.5, borderRadius: 7, width: 30, height: 30, cursor: on ? "pointer" : "default", fontSize: 14.5, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px" }}>
      <span aria-hidden="true" style={{ fontSize: 19.5 }}>{c.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{c.label}<span className="sr-only">, position {pos}{aboveFold ? ", above the fold" : ", below the fold"}</span></div>
        <div style={{ fontSize: 13, color: r.c, fontFamily: T.mono, letterSpacing: 0.5 }}>{r.t} · {c.wt}ms</div>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <button type="button" onClick={onUp} disabled={!canUp} aria-label={`Move ${c.label} up`} style={arrow(canUp)}>↑</button>
        <button type="button" onClick={onDown} disabled={!canDown} aria-label={`Move ${c.label} down`} style={arrow(canDown)}>↓</button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${c.label}`} style={{ ...arrow(true), color: T.neg }}>✕</button>
      </div>
    </div>
  );
}

// The control the student's design is A/B-tested against — shown so a
// relative effect prediction isn't a blind guess.
function ControlPageRef({ brief, compact }) {
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 11, padding: compact ? "10px 12px" : "12px 14px", marginBottom: compact ? 12 : 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: 1, color: T.body2 }}>THE CURRENT PAGE · your control</span>
        <span style={{ fontSize: 14, color: T.body2 }}>converts at <b style={{ color: T.text, fontFamily: T.mono }}>{pct(brief.base)}</b> on this brief</span>
      </div>
      <ul aria-label="The current page's components, top to bottom" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CONTROL_LAYOUT.map((id) => (
          <li key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 8px", fontSize: 13.5 }}>
            <span aria-hidden="true">{PMAP[id].icon}</span><span style={{ color: T.body2 }}>{PMAP[id].label}</span>
          </li>
        ))}
      </ul>
      {!compact && <p style={{ fontSize: 13.5, color: T.body2, margin: "8px 0 0", lineHeight: 1.4 }}>Your predicted effect is your design vs this page. Its rate is known; only your design's rate is hidden until you test. Submitting this page unchanged would be a 0pp design.</p>}
    </div>
  );
}

function Hypothesis({ brief, hypo, cfg, setHypo, onBack, onRun }) {
  const reqN = requiredSampleSize(brief.base, 0.01, cfg.alpha, cfg.power);
  const ready = hypo.metric && hypo.band;
  const ids = { metric: useId(), band: useId(), n: useId() };
  return (
    <div className="rise" style={{ maxWidth: 760, margin: "26px auto 0" }}>
      <button type="button" onClick={onBack} style={smallGhost}>← Edit the design</button>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 30, letterSpacing: -0.6, margin: "14px 0 4px" }}>Commit your hypothesis</h1>
      <p style={{ color: T.body2, fontSize: 15.5, lineHeight: 1.55, margin: "0 0 18px" }}>
        A design is a hypothesis. Before you see any data, commit what you're measuring, how big an effect you expect,
        and how much traffic you'll spend — then the test is an honest verdict, not a fishing trip. <b style={{ color: T.text }}>The predicted rate stays hidden until you run it.</b>
      </p>
      <ControlPageRef brief={brief} />
      <section style={{ ...card(), padding: 15, marginBottom: 14 }}>
        <QuestionLabel id={ids.metric} style={{ marginTop: 0 }}>1 · Primary metric — what will you judge the winner on?</QuestionLabel>
        <ChoiceGroup labelId={ids.metric} options={METRICS} value={hypo.metric} onChange={(id) => setHypo({ metric: id })}
          render={(m) => <><span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{m.label}</span><span style={{ display: "block", fontSize: 13.5, lineHeight: 1.35, marginTop: 3, fontWeight: 400 }}>{m.hint}</span></>}
          btnStyle={(on) => ({ ...pillBtn(on), textAlign: "left", padding: "10px 12px" })} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px),1fr))", gap: 8 }} />
      </section>
      <section style={{ ...card(), padding: 15, marginBottom: 14 }}>
        <QuestionLabel id={ids.band} style={{ marginTop: 0 }}>2 · Predicted effect — where does your design land vs the current page?</QuestionLabel>
        <ChoiceGroup labelId={ids.band} options={BANDS} value={hypo.band} onChange={(id) => setHypo({ band: id })} btnStyle={(on) => ({ ...pillBtn(on), textAlign: "left", padding: "9px 12px" })} style={{ display: "flex", flexDirection: "column", gap: 6 }} />
      </section>
      <section style={{ ...card(), padding: 15, marginBottom: 16 }}>
        <QuestionLabel id={ids.n} style={{ marginTop: 0 }}>3 · Sample size — visitors per arm</QuestionLabel>
        <p style={{ fontSize: 14, color: T.body2, margin: "0 0 9px" }}>
          At this brief's {pct(brief.base)} base, detecting a <b style={{ color: T.text }}>+1pp</b> lift at {Math.round(cfg.power * 100)}% power needs about <b style={{ color: T.amber }}>{fmtN(reqN)}</b> per arm. Under-power it and a real win won't reach significance.
        </p>
        <ChoiceGroup labelId={ids.n} options={N_OPTIONS} value={hypo.plannedN} onChange={(n) => setHypo({ plannedN: n })} btnStyle={(on) => ({ ...pillBtn(on), flex: "1 1 auto", padding: "8px 14px", fontFamily: T.mono })} style={{ display: "flex", gap: 8, flexWrap: "wrap" }} />
      </section>
      <button type="button" onClick={onRun} disabled={!ready} style={gatedBtn(ready)}>{ready ? "Run the A/B test →" : "Choose a metric and a predicted effect"}</button>
    </div>
  );
}

function WireframeVerdict({ layout, brief, review, hypo, cfg, onRefine, onNewBrief, onExit }) {
  const res = useMemo(() => runTest(layoutToExperiment(layout, brief, review), { nPerArm: hypo.plannedN, alpha: cfg.alpha, seed: `${cfg.seed}:wireframe:${brief.id}` }), [layout, brief, review, hypo.plannedN, cfg.alpha, cfg.seed]);
  useEffect(() => { markHubPlayed(); }, []);
  const sig = res.significant;
  const better = res.diff > 0;
  const trueDiff = review.rate - brief.base;
  const real = Math.abs(trueDiff) > NULL_ZONE;
  const tBand = trueBand(trueDiff);
  const right = BRIEF_METRIC[brief.id];
  const metricOk = hypo.metric === right;
  const metricName = (id) => METRICS.find((m) => m.id === id)?.label;
  const need = real ? requiredSampleSize(brief.base, Math.abs(trueDiff), cfg.alpha, cfg.power) : Infinity;
  const headline = !sig ? "Inconclusive" : better ? "Significant win" : "Significant loss";
  const hCol = !sig ? T.amber : better ? T.pos : T.neg;
  const powerOk = !real ? null : sig && Math.sign(res.diff) === Math.sign(trueDiff);
  const powerNote = !real
    ? (sig ? "This came out significant although your design has no real effect: a false positive. There was nothing to find." : "There was no real effect to find: “no difference” — or “need more data” — is the honest verdict, not a hunt for one.")
    : sig ? (Math.sign(res.diff) === Math.sign(trueDiff) ? "You committed enough traffic to resolve the effect from noise." : "Significant in the wrong direction — rare, but chance allows it.")
    : `A real ${{ a: "negative", bsmall: "small", bmod: "moderate", blarge: "large" }[tBand.id]} effect existed, but ${fmtN(hypo.plannedN)} per arm couldn't resolve it from noise (it needed about ${fmtN(need)}). Not significant is not the same as no effect.`;
  return (
    <div className="rise" style={{ maxWidth: 840, margin: "28px auto 0" }}>
      <div style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: 1.5, color: T.body2, marginBottom: 6 }}>WIREFRAME · {brief.name.toUpperCase()}</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 32, letterSpacing: -0.6, margin: "0 0 12px", color: hCol }}>{headline}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 140px),1fr))", gap: 12, marginBottom: 16 }}>
        <MiniStat label="Current page" value={pct(res.arms.A.rate)} accent={T.armA} />
        <MiniStat label="Your design" value={pct(res.arms.B.rate)} accent={T.armB} />
        <MiniStat label="Observed diff" value={pp(res.diff)} accent={better ? T.pos : T.neg} />
        <MiniStat label={`p (n = ${fmtN(hypo.plannedN)})`} value={pEq(res.pValue).replace(/^p = /, "")} accent={sig ? T.pos : T.amber} />
      </div>
      <h2 className="sr-only">Your scorecard</h2>
      <section aria-label="Your scorecard" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px),1fr))", gap: 10, marginBottom: 16 }}>
        <ScoreCard ok={hypo.band === tBand.id} title="Effect-size prediction" you={BANDS.find((b) => b.id === hypo.band)?.label} truth={hypo.band === tBand.id ? null : `Actual: ${tBand.label}`} />
        <ScoreCard ok={metricOk} title="Primary metric" you={metricName(hypo.metric)} truth={metricOk ? null : `Better: ${metricName(right)}`} />
        <ScoreCard ok={powerOk} title="Statistical power" you={`${fmtN(hypo.plannedN)} per arm`} truth={!real ? "No real effect to find" : powerOk ? "Adequate" : "Under-powered"} />
      </section>
      <section style={{ ...card(), padding: "14px 16px", marginBottom: 16, fontSize: 15, color: T.body2, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>The design's true conversion was <b style={{ color: T.text }}>{pct(review.rate)}</b> ({pp(trueDiff)} against the current page's {pct(brief.base)}) — {real ? <>a <b style={{ color: T.text }}>{tBand.label.toLowerCase()}</b> effect</> : <b style={{ color: T.text }}>no real effect</b>}.</p>
        <p style={{ margin: "8px 0 0" }}>{metricOk ? `${metricName(right)} was the right primary metric here: ${METRIC_WHY[brief.id]}.` : `For this brief, ${metricName(right).toLowerCase()} — not ${(metricName(hypo.metric) || "").toLowerCase()} — should decide it: ${METRIC_WHY[brief.id]}.`}</p>
        <p style={{ margin: "8px 0 0" }}>{powerNote}</p>
      </section>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={onRefine} style={btn(T.playerBtn)}>← Refine the design</button>
        <button type="button" onClick={onNewBrief} style={ghostBtn}>Try another brief</button>
        <button type="button" onClick={onExit} style={{ ...ghostBtn, color: T.body2 }}>Back to the lab</button>
      </div>
    </div>
  );
}
