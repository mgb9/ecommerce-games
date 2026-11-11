import React, { useId, useMemo, useState } from "react";
import { T, card } from "./theme.js";
import { PrintBar, Section, articleStyle, useDocumentTitle, useFocusOnMount } from "./report.jsx";
import { parseResultCode, tally, CODE_VERSION } from "./cohort.js";

/* Instructor only (see App): the cohort tally. Students copy a result code
   from their diagnosis log; the tutor pastes the batch here, one per line,
   and gets what a seminar debrief needs — quarter by quarter, how often the
   cohort called the biggest money leak and the best-returning purchase;
   their profit against an untouched funnel; who wrote a recommendation; the
   skills self-ratings before and after. Nothing is sent anywhere: the codes
   are read in this browser. */
export default function InstructorTally({ onBack }) {
  const headRef = useFocusOnMount();
  useDocumentTitle("Funnel Fixer – Cohort tally");
  const [text, setText] = useState("");
  const id = useId();
  const results = useMemo(() => text.split(/\r?\n/).map(parseResultCode).filter(Boolean), [text]);
  const t = useMemo(() => tally(results), [results]);
  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const rate = (yes, of) => (of ? `${Math.round((100 * yes) / of)}% (${yes} of ${of})` : "—");
  const one = (x) => (x == null ? "—" : x.toFixed(1));
  const k = (x) => (x == null ? "—" : `${x < 0 ? "−" : "+"}£${Math.abs(Math.round(x))}k`);
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <div className="ff-noprint" style={{ ...card(), maxWidth: 900, margin: "0 auto 18px" }}>
        <label htmlFor={id} style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Paste the cohort's result codes, one per line</label>
        <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={`${CODE_VERSION}|FNL-2026|L:0110|B:1011|P:+14|R:3|S:342534/443544`} spellCheck={false}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text, resize: "vertical" }} />
        <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>Each student copies their code from their diagnosis log (“Share your results with your tutor”). A code describes their first finished run: which calls were right each quarter, profit against an untouched funnel, whether a recommendation was written, and the skills ratings — no names, none of their writing. Nothing leaves this browser.</p>
      </div>
      <article className="ff-report" aria-labelledby="ff-tally-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Funnel Fixer · Cohort tally</div>
          <h1 id="ff-tally-title" ref={headRef} tabIndex={-1} style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>{t.students} student{t.students === 1 ? "" : "s"}{t.seeds.length ? ` · seed${t.seeds.length === 1 ? "" : "s"} ${t.seeds.join(", ")}` : ""}</h1>
          {t.errors.length > 0 && <p role="alert" style={{ margin: "6px 0 0", color: T.neg, fontSize: 14 }}>{t.errors.length} line{t.errors.length === 1 ? "" : "s"} couldn't be read: {t.errors.map((e) => e.error).join("; ")}.</p>}
          {t.seeds.length > 1 && <p style={{ margin: "6px 0 0", color: T.amber, fontSize: 14 }}>More than one seed: students saw different funnels, so compare with care.</p>}
        </header>
        {t.students === 0 ? <Section title="Nothing to tally yet"><p style={{ margin: 0, color: T.body2 }}>Paste codes above.</p></Section> : (
          <>
            <Section title="Quarter by quarter (first runs)">
              {t.quarters.length === 0 ? <p style={{ margin: 0, color: T.body2 }}>No finished runs in these codes.</p> : (
                <div role="region" aria-label="Quarter by quarter (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480, fontSize: 14.5 }}>
                    <thead><tr>{["Quarter", "Biggest money leak called", "Best-returning purchase called"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {t.quarters.map((q) => (
                        <tr key={q.quarter}><th scope="row" style={{ ...cell, fontWeight: 600 }}>Q{q.quarter}</th><td style={cell}>{rate(q.leak, q.of)}</td><td style={cell}>{rate(q.bet, q.of)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>A low first quarter that rises is the lesson landing: students stop reading the percentage-point gap and start sizing in pounds. A leak call that stays low after the first quarter is worth asking about — the bottleneck moves once it is fixed.</p>
            </Section>
            <Section title="Profit and recommendations">
              <ul style={{ margin: 0, paddingLeft: 22 }}>
                <li>Profit after spend against an untouched funnel: {t.profit.n ? `mean ${k(t.profit.meanK)}, from ${k(t.profit.worstK)} to ${k(t.profit.bestK)}; ${t.profit.beat} of ${t.profit.n} beat doing nothing.` : "no results yet."}</li>
                <li>Recommendations written: {t.recommendations.written} of {t.students}{t.recommendations.meanChecks != null ? ` · mean ${one(t.recommendations.meanChecks)} of 4 self-checks ticked` : ""}.</li>
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
