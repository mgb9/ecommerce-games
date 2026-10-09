import React, { useId, useMemo, useState } from "react";
import { T, card } from "./theme.js";
import { PrintBar, Section, articleStyle, useDocumentTitle } from "./report.jsx";
import { parseResultCode, tally, CODE_VERSION } from "./cohort.js";

/* Instructor only (see App): the cohort tally. Students copy a result code
   from their experiment log; the tutor pastes the batch here, one per line,
   and gets what a seminar debrief needs — per experiment: how often the
   cohort predicted the winner and the size, made a sound call, and matched
   the truth; who wrote a recommendation; the quiz and the wireframe; the
   skills self-ratings before and after. Nothing is sent anywhere: the codes
   are read in this browser. */
export default function InstructorTally({ onBack }) {
  useDocumentTitle("Conversion Lab – Cohort tally");
  const [text, setText] = useState("");
  const id = useId();
  const results = useMemo(() => text.split(/\r?\n/).map(parseResultCode).filter(Boolean), [text]);
  const t = useMemo(() => tally(results), [results]);
  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const rate = ({ yes, of }) => (of ? `${Math.round((100 * yes) / of)}%` : "—");
  const one = (x) => (x == null ? "—" : x.toFixed(1));
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <div className="cl-noprint" style={{ ...card(), maxWidth: 900, margin: "0 auto 18px" }}>
        <label htmlFor={id} style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Paste the cohort's result codes, one per line</label>
        <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={`${CODE_VERSION}|LAB-2026-24|1:1111:r3,2:11n1|Q:18/55|W:b2b:111|S:342534/443544`} spellCheck={false}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text, resize: "vertical" }} />
        <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>Each student copies their code from their experiment log (“Share your results with your tutor”). A code holds which judgements were right, whether recommendations were written, the quiz and wireframe results and the skills ratings — no names, none of their writing. Nothing leaves this browser.</p>
      </div>
      <article className="cl-report" aria-labelledby="cl-tally-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Conversion Lab · Cohort tally</div>
          <h1 id="cl-tally-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>{t.students} student{t.students === 1 ? "" : "s"}{t.seeds.length ? ` · seed${t.seeds.length === 1 ? "" : "s"} ${t.seeds.join(", ")}` : ""}</h1>
          {t.errors.length > 0 && <p role="alert" style={{ margin: "6px 0 0", color: T.neg, fontSize: 14 }}>{t.errors.length} line{t.errors.length === 1 ? "" : "s"} couldn't be read: {t.errors.map((e) => e.error).join("; ")}.</p>}
          {t.seeds.length > 1 && <p style={{ margin: "6px 0 0", color: T.amber, fontSize: 14 }}>More than one seed: students saw different runs, so compare with care.</p>}
        </header>
        {t.students === 0 ? <Section title="Nothing to tally yet"><p style={{ margin: 0, color: T.body2 }}>Paste codes above.</p></Section> : (
          <>
            <Section title="Experiment by experiment (first attempts)">
              <div role="region" aria-label="Experiment by experiment (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 14.5 }}>
                  <thead><tr>{["Experiment", "Played", "Winner predicted", "Size predicted", "Sound call", "Matched truth", "Recommendation"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {t.experiments.map((e) => (
                      <tr key={e.id}>
                        <th scope="row" style={{ ...cell, fontWeight: 600 }}>{e.n} · {e.title}<div style={{ fontWeight: 400, color: T.body2, fontSize: 13.5 }}>{e.concept}</div></th>
                        <td style={cell}>{e.played}</td>
                        <td style={cell}>{rate(e.prediction)}</td>
                        <td style={cell}>{rate(e.band)}</td>
                        <td style={cell}>{rate(e.sound)}</td>
                        <td style={cell}>{rate(e.matched)}{e.noClaim ? <div style={{ color: T.body2, fontSize: 13.5 }}>{e.noClaim} said “need more data”</div> : null}</td>
                        <td style={cell}>{e.played ? `${e.recommendations.written} of ${e.played}${e.recommendations.meanChecks != null ? ` · ${one(e.recommendations.meanChecks)} of 4 checks` : ""}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>Where “sound call” and “matched truth” part company is the debrief: {t.experiments.filter((e) => e.soundButMissed || e.luckyUnsound).map((e) => `Experiment ${e.n} — ${e.soundButMissed} sound but wrong about the truth, ${e.luckyUnsound} right but not on the evidence`).join("; ") || "none yet"}.</p>
            </Section>
            <Section title="Which Test Won? and the Wireframe Studio">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li>Quiz: {t.quiz.played ? `${t.quiz.played} played; mean ${one(t.quiz.meanPoints)} of ${t.quiz.max} points on the first round.` : "no results yet."}</li>
                <li>Wireframe: {t.wireframe.played ? `${t.wireframe.played} tested a design; effect size right ${rate(t.wireframe.band)}, primary metric right ${rate(t.wireframe.metric)}, adequately powered ${rate(t.wireframe.power)} (of those with a real effect to find).` : "no results yet."}</li>
              </ul>
            </Section>
            <Section title="Skills self-ratings (1–5)">
              <div role="region" aria-label="Skills self-ratings (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
                  <thead><tr>{["How confident I am that I can…", "Before", "After"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {t.skills.map((s) => (
                      <tr key={s.id}><th scope="row" style={{ ...cell, fontWeight: 400 }}>…{s.text}</th><td style={cell}>{s.beforeN ? `${one(s.before)} (n=${s.beforeN})` : "—"}</td><td style={cell}>{s.afterN ? `${one(s.after)} (n=${s.afterN})` : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}
      </article>
    </div>
  );
}
