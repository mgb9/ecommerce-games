import React, { useId, useMemo, useState } from "react";
import { T, btn, card } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame } from "./shared.jsx";
import { PrintBar, Section, useDocumentTitle } from "./report/ReportView.jsx";
import { parseResultCode, tally } from "./cohort.js";

/* Instructor only (see App): the cohort tally. Students copy a result code
   from their case file; the tutor pastes the batch here, one per line, and
   gets what a seminar debrief needs — per case: who played, scores, the
   call missed most; stated confidence against results; the skills
   self-ratings before and after; the reply self-check. Nothing is sent
   anywhere: the codes are read in this browser. */
export default function InstructorTally({ autoFocus, onBack }) {
  useDocumentTitle("Data Detective – Cohort tally", "");
  const [text, setText] = useState("");
  const id = useId();
  const results = useMemo(() => text.split(/\r?\n/).map(parseResultCode).filter(Boolean), [text]);
  const t = useMemo(() => tally(results), [results]);
  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top" };
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "—");
  const one = (x) => (x == null ? "—" : x.toFixed(1));
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Instructor · cohort tally" phase="tally">
      <div className="rise" style={{ marginTop: 22 }}>
        <PrintBar onBack={onBack} backLabel="← back" />
        <div className="dd-noprint" style={{ ...card(), maxWidth: 900, margin: "0 auto 18px" }}>
          <label htmlFor={id} style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Paste the cohort's result codes, one per line</label>
          <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="DD3|DD-2026|1:4/4@90:1111:r3,2:2/4@90:1010|S:342534/443544" spellCheck={false}
            style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: `13px ${T.mono}`, color: T.text, resize: "vertical" }} />
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: T.muted, lineHeight: 1.5 }}>Each student copies their code from the case file ("Share your results with your tutor"). A code holds scores, stated confidence, which calls were right, the reply self-check and the skills ratings — no names. Nothing leaves this browser.</p>
        </div>
        <article className="dd-report" aria-labelledby="dd-tally-title" style={{ background: "#FFFFFF", color: T.text, maxWidth: 900, margin: "0 auto", padding: "clamp(22px, 5vw, 46px) clamp(18px, 5vw, 50px)", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 14.5, lineHeight: 1.5 }}>
          <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Data Detective · Cohort tally</div>
            <h1 id="dd-tally-title" style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>{t.students} student{t.students === 1 ? "" : "s"}{t.seeds.length ? ` · seed${t.seeds.length === 1 ? "" : "s"} ${t.seeds.join(", ")}` : ""}</h1>
            {t.errors.length > 0 && <p role="alert" style={{ margin: "6px 0 0", color: T.neg, fontSize: 13.5 }}>{t.errors.length} line{t.errors.length === 1 ? "" : "s"} couldn't be read: {t.errors.map((e) => e.error).join("; ")}.</p>}
            {t.seeds.length > 1 && <p style={{ margin: "6px 0 0", color: T.amber, fontSize: 13.5 }}>More than one seed: students got different variants of each case, so compare scores with care.</p>}
          </header>
          {t.students === 0 ? <Section title="Nothing to tally yet"><p style={{ margin: 0, color: T.muted }}>Paste codes above.</p></Section> : (
            <>
              <Section title="Case by case (first attempts)">
                <div role="region" aria-label="Case by case (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                    <thead><tr>{["Case", "Played", "Mean score", "Fully right", "Call missed most", "Reply written"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {t.cases.map((c) => (
                        <tr key={c.id}>
                          <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}><b style={{ fontFamily: T.mono }}>{pad2(c.n)}</b> {c.title}</th>
                          <td style={cell}>{c.played}</td>
                          <td style={cell}>{c.played ? `${one(c.meanScore)} / ${c.outOf}` : "—"}</td>
                          <td style={cell}>{c.played ? pct(c.fullyRight, c.played) : "—"}</td>
                          <td style={cell}>{c.hardestCall ? `${c.hardestCall.label} (${pct(c.hardestCall.missed, c.hardestCall.of)} missed)` : "—"}</td>
                          <td style={cell}>{c.replies.of ? `${pct(c.replies.written, c.replies.of)}${c.replies.meanChecks != null ? ` · ${one(c.replies.meanChecks)} of 4 checks` : ""}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
              <Section title="Confidence against results">
                <div role="region" aria-label="Confidence against results (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", maxWidth: 520 }}>
                  <thead><tr>{["Students said", "Attempts", "Fully right"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {t.confidence.map((c) => (
                      <tr key={c.level}><th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}>About {c.level}% sure</th><td style={cell}>{c.cases}</td><td style={cell}>{c.cases ? `${c.right} (${pct(c.right, c.cases)})` : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: T.muted }}>Well calibrated: about 50 / 70 / 90% fully right at each level. Lower = overconfident.</p>
              </Section>
              <Section title="Skills self-ratings (1–5)">
                <div role="region" aria-label="Skills self-ratings (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["How confident I am that I can…", "Before", "After"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {t.skills.map((s) => (
                      <tr key={s.id}><th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}>…{s.text}</th><td style={cell}>{s.beforeN ? `${one(s.before)} (n=${s.beforeN})` : "—"}</td><td style={cell}>{s.afterN ? `${one(s.after)} (n=${s.afterN})` : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </Section>
            </>
          )}
        </article>
        <div className="dd-noprint" style={{ textAlign: "center", marginTop: 18 }}><button onClick={onBack} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}` }}>← back</button></div>
      </div>
    </CaseFrame>
  );
}
