import React from "react";
import { EXPERIMENTS, CRO_STACK, effExperiment, lessonContext, buildCSV, buildMarkdown, downloadFile, pp, ciLevel } from "../../engine/engine.js";
import { T, card, btn, ghostBtn, td } from "../theme.js";
import { Term, SectionTitle } from "../shared.jsx";
import { CALLS } from "./Running.jsx";

const yes = (v) => (v == null ? "no claim" : v ? "yes" : "no");
const mark = (v) => (v == null ? "•" : v ? "✓" : "✗");
const tone = (v) => (v == null ? T.muted : v ? T.pos : T.neg);

/* The calibration report: every experiment's prediction, call and both
   judgements of it, with what each experiment was teaching (worded for
   the current settings) and the exportable experiment log. */
export default function Summary({ records, cfg, restart }) {
  const ordered = EXPERIMENTS.map((e) => records.find((r) => r.id === e.id)).filter(Boolean);
  const hits = (k) => ordered.filter((r) => r[k]).length;
  const claims = ordered.filter((r) => r.matchedTruth != null);
  const th = { padding: "6px 8px", borderBottom: `1px solid ${T.border}`, fontWeight: 600, whiteSpace: "nowrap", textAlign: "left", color: T.body2 };
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 13.5, letterSpacing: 2 }}>CHRICHTON · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 36, margin: "6px 0", letterSpacing: -0.5 }}>Your calibration report</h1>
        <p style={{ color: T.body2, margin: 0 }}>Predicted winner <b style={{ color: T.text }}>{hits("predictionCorrect")}/{ordered.length}</b> · effect-size band <b style={{ color: T.text }}>{hits("bandCorrect")}/{ordered.length}</b> · sound call <b style={{ color: T.text }}>{hits("soundCall")}/{ordered.length}</b> · matched the truth <b style={{ color: T.text }}>{claims.filter((r) => r.matchedTruth).length}/{claims.length}</b> of the calls that named an outcome.</p>
      </div>

      <section style={card()}>
        <SectionTitle>Every experiment, predicted vs actual</SectionTitle>
        <div role="region" aria-label="Experiment results (table)" tabIndex={0} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 760 }}>
            <thead><tr>{["Experiment", "Your band", "Obs diff", `${ciLevel(cfg.alpha)} CI`, "p", "Your call", "Sound?", "Matched truth?"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {ordered.map((r) => (
                <tr key={r.id}>
                  <th scope="row" style={{ ...td(), fontWeight: 600 }}>{r.title}<div style={{ fontWeight: 400, color: T.muted, fontSize: 13.5 }}>{r.concept}</div></th>
                  <td style={td()}>{r.predictedBand}</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: r.obsDiff >= 0 ? T.pos : T.neg, whiteSpace: "nowrap" }}>{pp(r.obsDiff)}</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: T.body2, whiteSpace: "nowrap" }}>[{pp(r.ciLow)}, {pp(r.ciHigh)}]</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: r.significant ? T.pos : T.amber }}>{r.pValue < 0.001 ? "< 0.001" : r.pValue.toFixed(3)}</td>
                  <td style={td()}>{CALLS.find((c) => c.id === r.call)?.label}{r.stoppedEarly ? " (stopped early)" : ""}</td>
                  <td style={{ ...td(), color: tone(r.soundCall), fontWeight: 700 }}><span aria-hidden="true">{mark(r.soundCall)} </span>{yes(r.soundCall)}</td>
                  <td style={{ ...td(), color: tone(r.matchedTruth), fontWeight: 700 }}><span aria-hidden="true">{mark(r.matchedTruth)} </span>{yes(r.matchedTruth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>A <b>sound</b> call is the right reading of the evidence you had; <b>matched the truth</b> asks whether it named the real winner. They can disagree — a sound call on an unlucky run, or a lucky guess on thin evidence. Judge your method by the first.</p>
      </section>

      <section style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>What the lab was teaching</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 250px),1fr))", gap: 12 }}>
          {EXPERIMENTS.map((e) => {
            const x = effExperiment(e, cfg);
            return (
              <div key={e.id} style={{ background: T.panel2, borderRadius: 11, padding: "13px 15px", border: `1px solid ${T.border}` }}>
                <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15.5, color: T.playerText, margin: "0 0 5px" }}>{e.concept}</h3>
                <p style={{ fontSize: 14.5, color: T.text, lineHeight: 1.5, margin: 0 }}>{e.lesson(lessonContext(x, cfg)).general}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>You just did <Term term="cro">CRO</Term></SectionTitle>
        <p style={{ color: T.body2, fontSize: 15, lineHeight: 1.55, marginTop: -6, marginBottom: 14 }}>Every experiment ran the full <Term term="crostack">CRO Stack</Term> — the same loop you'll use on a real site.</p>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 160px),1fr))", gap: 10 }}>
          {CRO_STACK.map((s, i) => (
            <li key={s.k} style={{ background: T.panel2, borderRadius: 11, padding: "13px 14px", border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 22, background: T.instructor, color: T.onAccent, fontFamily: T.mono, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15.5 }}>{s.k}</span>
              </div>
              <div style={{ color: T.body2, fontSize: 14, lineHeight: 1.45 }}>{s.d}</div>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ ...card(), marginTop: 16, textAlign: "center" }}>
        <SectionTitle>Take your experiment log into class</SectionTitle>
        <p style={{ color: T.body2, fontSize: 15, lineHeight: 1.5, maxWidth: 600, margin: "0 auto 16px" }}>Export the full record — prediction, planned and actual sample size, observed difference, interval and p-value, your call and both judgements of it, and the business impact — with reflection prompts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => downloadFile(`conversion-lab-${cfg.seed}.csv`, buildCSV(ordered, cfg), "text/csv")} style={btn(T.instructor)}>⬇ Download CSV</button>
          <button type="button" onClick={() => downloadFile(`conversion-lab-${cfg.seed}.md`, buildMarkdown(ordered, cfg), "text/markdown")} style={ghostBtn}>⬇ Download Markdown</button>
        </div>
      </section>
      <div style={{ textAlign: "center", marginTop: 22 }}><button type="button" onClick={restart} style={btn(T.playerBtn)}>Run the lab again ↺</button></div>
    </div>
  );
}
