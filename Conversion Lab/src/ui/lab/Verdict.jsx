import React, { useMemo, useState } from "react";
import {
  EXPERIMENTS, trueBand, truthWinner, statAt, soundReason, lessonContext, replicate, guardrailAt,
  profitPerThousand, pct, pp, gbp, pEq, ciLevel, fmtN, NULL_ZONE,
} from "../../engine/engine.js";
import { T, card, btn } from "../theme.js";
import { Term, SectionTitle, ScoreCard, PT } from "../shared.jsx";
import { CALLS, metricOf } from "./Running.jsx";
import Recommendation, { TEAM } from "./Recommendation.jsx";
import { SkillsPractised } from "../Outcomes.jsx";
import { OUTCOMES } from "../outcomesModel.js";

const winnerWord = (w) => ({ a: "A wins", b: "B wins", none: "No real difference" }[w]);
const callWord = (c) => CALLS.find((x) => x.id === c)?.label || "—";

/* The verdict: what the run showed, the hidden truth, and four separate
   judgements — the prediction (winner, size) against the truth, the call
   against the EVIDENCE (sound?) and against the TRUTH (matched?). A
   sound call can still miss the truth (a false positive, an unlucky
   run), and a lucky guess can match it unsoundly; keeping the two apart
   is the point. The lesson is written for this run and these settings. */
export default function Verdict({ exp, base, cfg, result, record, onNext, isLast }) {
  const s = statAt(result, record.actualN);
  const truthDiff = exp.truth.pB - exp.truth.pA;
  const tBand = trueBand(truthDiff);
  const [showStats, setShowStats] = useState(false);
  const ctx = lessonContext(exp, cfg, { s, result, n: record.actualN, plannedN: record.plannedN, stoppedEarly: record.stoppedEarly });
  const lesson = base.lesson(ctx);
  const rep = useMemo(() => (base.replicate ? replicate(exp, { nPerArm: record.plannedN, alpha: cfg.alpha, seed: `${cfg.seed}:${exp.id}`, k: 200 }) : null), [exp, record.plannedN, cfg.alpha, cfg.seed, base.replicate]);
  const metric = metricOf(exp);
  const falsePositive = s.significant && Math.abs(truthDiff) <= NULL_ZONE;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: T.playerText, fontSize: 14.5, fontWeight: 700 }}>VERDICT · EXPERIMENT {base.n}</span>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>{base.title}</h1>
      </div>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 14 }}>
        <section style={card()}>
          <SectionTitle>What you observed · {metric} at {fmtN(s.n)} per arm{record.stoppedEarly ? " (stopped early)" : ""}</SectionTitle>
          <RevealRow label="Observed difference (B − A)" value={pp(s.diff)} color={s.diff >= 0 ? T.pos : T.neg} />
          <RevealRow label={<Term term="pvalue">p-value</Term>} value={`${s.pValue < 0.001 ? "< 0.001" : s.pValue.toFixed(4)} · ${s.significant ? "significant" : "not significant"}`} color={s.significant ? T.pos : T.amber} />
          <p style={{ margin: "12px 0 0", background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 14.5, lineHeight: 1.5 }}>{plainLanguage(s, cfg)}</p>
          <button type="button" aria-expanded={showStats} onClick={() => setShowStats((v) => !v)} style={{ marginTop: 12, background: "transparent", border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 14.5, fontWeight: 600 }}>
            <span aria-hidden="true">{showStats ? "▲ " : "▼ "}</span>{showStats ? "Hide the full statistics" : "Show the full statistics"}
          </button>
          {showStats && (
            <div className="rise" style={{ marginTop: 10 }}>
              <RevealRow label="Control (A) rate" value={pct(s.rA, 2)} color={T.armA} />
              <RevealRow label="Variant (B) rate" value={pct(s.rB, 2)} color={T.armB} />
              <RevealRow label={<>{ciLevel(cfg.alpha)} <Term term="ci">confidence interval</Term></>} value={`[${pp(s.ciLow)}, ${pp(s.ciHigh)}]`} color={T.text} />
              <RevealRow label={<Term term="zscore">z-score</Term>} value={s.z.toFixed(2)} color={T.text} />
            </div>
          )}
        </section>

        <section style={card()}>
          <SectionTitle>The hidden truth</SectionTitle>
          <RevealRow label="True control rate" value={pct(exp.truth.pA, 2)} color={T.armA} />
          <RevealRow label="True variant rate" value={pct(exp.truth.pB, 2)} color={T.armB} />
          <RevealRow label="True effect" value={pp(truthDiff)} color={truthDiff > NULL_ZONE ? T.pos : truthDiff < -NULL_ZONE ? T.neg : T.muted} />
          <RevealRow label="True band" value={tBand.label} color={T.text} />
          {exp.segments && <SegmentTable result={result} />}
          {exp.profit && <ProfitNote exp={exp} s={s} />}
          {exp.guardrail && <GuardrailNote exp={exp} s={s} />}
        </section>
      </div>

      <section style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>Your scorecard</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 220px),1fr))", gap: 12 }}>
          <ScoreCard ok={record.predictionCorrect} title="Predicted winner" you={winnerWord(record.predictedWinner)} truth={`Truth: ${winnerWord(truthWinner(truthDiff))}.`} />
          <ScoreCard ok={record.bandCorrect} title="Effect-size band" you={record.predictedBand} truth={`Truth: ${tBand.label}.`} />
          <ScoreCard ok={record.soundCall} title="Sound call — on the evidence" you={callWord(record.call)} note={soundReason(record.call, s, { stoppedEarly: record.stoppedEarly, mde: record.mde, alpha: cfg.alpha })} />
          <ScoreCard ok={record.matchedTruth} title="Matched the truth" you={callWord(record.call)}
            note={record.matchedTruth == null ? `“Need more data” makes no claim, so it can't match or miss. The truth: ${winnerWord(truthWinner(truthDiff))} (${pp(truthDiff)}).` : `The truth: ${winnerWord(truthWinner(truthDiff))} (${pp(truthDiff)}).${record.soundCall && !record.matchedTruth ? " A sound call can still miss: that is what α and power are about." : ""}${!record.soundCall && record.matchedTruth ? " Right — but not on this evidence: luck, not method." : ""}`} />
        </div>

        <div style={{ marginTop: 14, background: falsePositive ? T.negTint : T.panel2, border: `1px solid ${falsePositive ? T.negFill : T.border}`, borderRadius: 11, padding: "14px 16px" }}>
          <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16, color: T.playerText, margin: "0 0 6px" }}><span aria-hidden="true">🎓 </span><Term term={base.term}>{base.concept}</Term></h3>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0 }}>{lesson.general}</p>
          {lesson.run && <p style={{ fontSize: 15, lineHeight: 1.55, margin: "8px 0 0" }}>{lesson.run}</p>}
          {rep && <Replication rep={rep} base={base} truthDiff={truthDiff} n={record.plannedN} alpha={cfg.alpha} />}
        </div>
      </section>

      <Recommendation key={exp.id} expId={exp.id} teamName={TEAM[exp.id]} />
      <SkillsPractised outcomes={OUTCOMES[exp.id]} style={{ marginTop: 16 }} />

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button type="button" onClick={onNext} style={btn(T.playerBtn)}>{isLast ? "See your calibration report →" : `Next experiment → ${EXPERIMENTS[base.n] ? EXPERIMENTS[base.n].title : ""}`}</button>
      </div>
    </div>
  );
}

/* What 200 reruns of the same plan look like (Experiments 2 and 4): the
   long-run behaviour behind this one run's luck. */
function Replication({ rep, base, truthDiff, n, alpha }) {
  const pctOf = (x) => `${Math.round((100 * x) / rep.k)}%`;
  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
      <h4 style={{ margin: "0 0 6px", fontSize: 14.5 }}>If {rep.k} teams ran this exact test ({fmtN(n)} per arm, α = {alpha})</h4>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, lineHeight: 1.55 }}>
        <li><b>{rep.endSig}</b> ({pctOf(rep.endSig)}) would end significant.{Math.abs(truthDiff) <= NULL_ZONE ? ` With no real effect, that is the false-positive rate — about α.` : ""}</li>
        <li><b>{rep.everSig}</b> ({pctOf(rep.everSig)}) would read p &lt; α at some point along the way — every one of them a “winner” for a team that stopped at the first p &lt; α.</li>
        {base.id === "social" && rep.meanDiffAtFirstSig != null && <li>Those early stops would claim an average lift of <b>{pp(rep.meanDiffAtFirstSig)}</b>, against a true <b>{pp(truthDiff)}</b>: stopping early overstates a real effect.</li>}
      </ul>
    </div>
  );
}

function RevealRow({ label, value, color }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 15 }}><span style={{ color: T.body2 }}>{label}</span><span style={{ fontFamily: T.mono, fontWeight: 700, color, textAlign: "right" }}>{value}</span></div>;
}
function SegmentTable({ result }) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 7px", color: T.amber }}><span aria-hidden="true">↘ </span>Cut by <Term term="segment">segment</Term> — what the total hides</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
        <thead><tr>{["Segment", "A", "B", "B − A"].map((h) => <th key={h} scope="col" style={{ textAlign: "left", padding: "4px 6px", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
        <tbody>
          {result.segments.map((sg) => (
            <tr key={sg.id}>
              <th scope="row" style={{ textAlign: "left", padding: "6px", fontWeight: 600 }}>{sg.name}</th>
              <td style={{ padding: "6px", fontFamily: T.mono, color: T.body2 }}>{pct(sg.rA, 1)}</td>
              <td style={{ padding: "6px", fontFamily: T.mono, color: T.body2 }}>{pct(sg.rB, 1)}</td>
              <td style={{ padding: "6px", fontFamily: T.mono, fontWeight: 700, color: sg.diff > 0 ? T.pos : T.neg }}>{pp(sg.diff, 1)} <span style={{ fontWeight: 400, color: T.body2, fontFamily: T.body, fontSize: 13.5 }}>{sg.significant ? "significant" : "not significant"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ProfitNote({ exp, s }) {
  const pa = profitPerThousand(exp, s.rA, "A");
  const pb = profitPerThousand(exp, s.rB, "B");
  const bWorse = pb < pa;
  return (
    <p style={{ margin: "12px 0 0", background: bWorse ? T.negTint : T.posTint, border: `1px solid ${bWorse ? T.negFill : T.posFill}`, borderRadius: 10, padding: "11px 13px", fontSize: 14.5, lineHeight: 1.5 }}>
      <span aria-hidden="true">💷 </span><b>Business impact per 1,000 visitors (your run):</b> A makes <b>{gbp(pa)}</b>, B makes <b style={{ color: bWorse ? T.neg : T.pos }}>{gbp(pb)}</b>.
      {bWorse ? " B converts more, but the free shipping makes it LESS profitable — a test that wins on conversion but loses money." : " B wins on both conversion and profit here."}
    </p>
  );
}
// The guardrail as measured in this run — with its own significance test.
function GuardrailNote({ exp, s }) {
  const g = guardrailAt(s);
  const ga = g.rA * 1000, gb = g.rB * 1000;
  const bWorse = gb < ga;
  return (
    <p style={{ margin: "12px 0 0", background: bWorse ? T.negTint : T.posTint, border: `1px solid ${bWorse ? T.negFill : T.posFill}`, borderRadius: 10, padding: "11px 13px", fontSize: 14.5, lineHeight: 1.5 }}>
      <span aria-hidden="true">🚧 </span><b><Term term="guardrail">Guardrail</Term> — {exp.guardrail.label} (your run):</b> A {ga.toFixed(1)}, B <b style={{ color: bWorse ? T.neg : T.pos }}>{gb.toFixed(1)}</b> ({pEq(g.pValue)}{g.significant ? ", significant" : ", not significant"}).
      {bWorse ? ` B won the tested metric but the guardrail moved the wrong way. ` : " B held up on the guardrail too. "}
      <span style={{ color: T.body2 }}>{exp.guardrail.note}</span>
    </p>
  );
}

function plainLanguage(s, cfg) {
  if (s.significant) {
    return <>With {pEq(s.pValue)} (below α = {cfg.alpha}), the difference is <b style={{ color: T.pos }}>statistically significant</b>: a gap this large would be unlikely if there were no real effect. The <Term term="ci">confidence interval</Term> excludes zero.</>;
  }
  const crosses = s.ciLow < 0 && s.ciHigh > 0;
  return <>With {pEq(s.pValue)} (not below α = {cfg.alpha}), the result is <b style={{ color: T.amber }}>not significant</b>. {crosses ? "The confidence interval still includes zero, so you cannot rule out ‘no real difference’ — nor the effects inside the interval." : "Treat it as inconclusive."} <PT rich="Absence of evidence isn't evidence of absence." plain="Not finding a difference does not prove there is none." /></>;
}

