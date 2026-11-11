import React, { useId, useMemo, useState } from "react";
import { T, card } from "./theme.js";
import { PrintBar, Section, articleStyle, useFocusOnMount, useDocumentTitle } from "./report.jsx";
import { parseResultCode, tally, CODE_VERSION } from "./cohort.js";
import { evaluatePlatforms } from "../engine/platformfit.js";
import { PMAP } from "../engine/engine.js";

/* Instructor only (see App): the cohort tally. Students copy a result code
   from their decision log; the tutor pastes the batch here, one per line,
   and gets what a seminar debrief needs — per brief: which platforms the
   cohort chose and how many chose the top fit, where they finished, how
   many ran out of cash, how often they predicted their place, who wrote a
   recommendation; and the skills self-ratings before and after. Nothing is
   sent anywhere: the codes are read in this browser. */
export default function InstructorTally({ onBack }) {
  useDocumentTitle("Marketplace Tycoon – Cohort tally");
  const headRef = useFocusOnMount();
  const [text, setText] = useState("");
  const id = useId();
  const results = useMemo(() => text.split(/\r?\n/).map(parseResultCode).filter(Boolean), [text]);
  const t = useMemo(() => tally(results), [results]);
  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top", textAlign: "left" };
  const rate = ({ yes, of }) => (of ? `${Math.round((100 * yes) / of)}%` : "—");
  const one = (x) => (x == null ? "—" : x.toFixed(1));
  const topFitOf = (briefId) => PMAP[evaluatePlatforms(briefId).recommended].short;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <PrintBar onBack={onBack} />
      <div className="mt-noprint" style={{ ...card(), maxWidth: 900, margin: "0 auto 18px" }}>
        <label htmlFor={id} style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Paste the cohort's result codes, one per line</label>
        <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={`${CODE_VERSION}|WMG-2026|fashion:shopify:1:2:4/10:s:r3,grocer:woo:3:4:2/10:i|S:342534/443544`} spellCheck={false}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.muted}`, borderRadius: 8, background: T.panel2, font: `13.5px ${T.mono}`, color: T.text, resize: "vertical" }} />
        <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>Each student copies their code from their decision log (“Share your results with your tutor”). A code holds, for the first game on each brief, the platform chosen, the final place, the predictions that were right, whether the store ran out of cash and whether a recommendation was written, plus the skills ratings — no names, none of their writing. Nothing leaves this browser.</p>
      </div>
      <article className="mt-report" aria-labelledby="mt-tally-title" style={articleStyle}>
        <header style={{ borderBottom: `3px solid ${T.player}`, paddingBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: T.playerText }}>Marketplace Tycoon · Cohort tally</div>
          <h1 id="mt-tally-title" ref={headRef} tabIndex={-1} style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(24px, 4.4vw, 30px)", margin: "10px 0 4px" }}>{t.students} student{t.students === 1 ? "" : "s"}{t.seeds.length ? ` · seed${t.seeds.length === 1 ? "" : "s"} ${t.seeds.join(", ")}` : ""}</h1>
          {t.errors.length > 0 && <p role="alert" style={{ margin: "6px 0 0", color: T.neg, fontSize: 14 }}>{t.errors.length} line{t.errors.length === 1 ? "" : "s"} couldn't be read: {t.errors.map((e) => e.error).join("; ")}.</p>}
          {t.seeds.length > 1 && <p style={{ margin: "6px 0 0", color: T.amber, fontSize: 14 }}>More than one seed: students faced different markets, so compare with care.</p>}
        </header>
        {t.students === 0 ? <Section title="Nothing to tally yet"><p style={{ margin: 0, color: T.body2 }}>Paste codes above.</p></Section> : (
          <>
            <Section title="Brief by brief (first completed games)">
              <div role="region" aria-label="Brief by brief (table)" tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 14.5 }}>
                  <thead><tr>{["Client brief", "Played", "Platforms chosen", "Chose the top fit", "Mean final place", "Ran out of cash", "Place predicted", "Recommendation"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {t.briefs.map((b) => (
                      <tr key={b.id}>
                        <th scope="row" style={{ ...cell, fontWeight: 600 }}>{b.name}<div style={{ fontWeight: 400, color: T.body2, fontSize: 13.5 }}>top fit: {topFitOf(b.id)}</div></th>
                        <td style={cell}>{b.played}</td>
                        <td style={cell}>{b.played ? b.picks.filter((p) => p.n).map((p) => `${p.short} ${p.n}`).join(", ") : "—"}</td>
                        <td style={cell}>{b.played ? `${b.topFit} of ${b.played}` : "—"}</td>
                        <td style={cell}>{one(b.meanRank)}</td>
                        <td style={cell}>{b.played ? `${b.insolvent} of ${b.played}` : "—"}</td>
                        <td style={cell}>{rate(b.predictions)}{b.predictions.of ? <div style={{ color: T.body2, fontSize: 13.5 }}>of {b.predictions.of} weeks</div> : null}</td>
                        <td style={cell}>{b.played ? `${b.recommendations.written} of ${b.played}${b.recommendations.meanChecks != null ? ` · ${one(b.recommendations.meanChecks)} of 4 checks` : ""}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: T.body2 }}>For the debrief: where the cohort split between platforms on one brief, ask each side for its argument before showing who finished where. A place of 1 is the top of a five-store leaderboard; guessing a place at random is right about one week in five.</p>
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
