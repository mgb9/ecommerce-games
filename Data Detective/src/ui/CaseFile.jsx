import React, { useState } from "react";
import { T, PLAYER } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame } from "./shared.jsx";
import { PrintBar, ReportArticle, Section, Tag, subHead, useDocumentTitle, useStudentName } from "./report/ReportView.jsx";
import { calibrationShort, longDate } from "./report/labels.js";
import { ALL_CASES, isPlayed } from "./caseList.js";
import { CONFIDENCE, loadProgress } from "./progress.js";

/* The case file: every case this browser has played, on one printable page
   (saved as a PDF like a case report). Each case's FIRST attempt — the only
   one kept — with the confidence the student stated; how that confidence
   held up across cases (calibration); and the principle from each case
   they have played. Unplayed cases' principles stay hidden: they'd give
   the answer away. */
export default function CaseFile({ autoFocus, onBack }) {
  const [progress] = useState(loadProgress);
  const [name, setName] = useStudentName();
  useDocumentTitle("Data Detective – Case file", name);
  const rec = (c) => progress[c.id];
  const right = (c) => rec(c).first === rec(c).outOf;
  const played = ALL_CASES.filter((c) => isPlayed(progress, c.id));
  const perfect = played.filter(right);
  const calls = played.reduce((a, c) => a + rec(c).first, 0), callsOutOf = played.reduce((a, c) => a + rec(c).outOf, 0);

  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · your case file" phase="casefile">
      <div className="rise" style={{ marginTop: 22 }}>
        <PrintBar onBack={onBack} backLabel="← back to the case inbox" />
        <ReportArticle kicker="Data Detective · Case file" title="Your case file" meta={[longDate(), `${played.length} of ${ALL_CASES.length} cases played`, "First attempts only"]} name={name} setName={setName}>
          {played.length === 0 ? (
            <Section title="Nothing here yet">
              <p style={{ margin: 0 }}>Finish a case and its result, how sure you said you were, and the principle it teaches will appear here.</p>
            </Section>
          ) : (
            <>
              <Section title="At a glance">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 14 }}>
                  <Figure label="Cases played" value={played.length} outOf={ALL_CASES.length} />
                  <Figure label="Fully right first time" value={perfect.length} outOf={played.length} />
                  <Figure label="Calls right" value={calls} outOf={callsOutOf} />
                </div>
              </Section>
              <Section title="Case by case">
                <CaseTable progress={progress} />
              </Section>
              <Section title="Calibration — did your confidence match your results?">
                <Calibration cases={played.filter((c) => rec(c).confidence)} progress={progress} />
              </Section>
              <Section title="Principles from the cases you've played">
                <ol role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {played.map((c) => (
                    <li key={c.id} style={{ borderLeft: `4px solid ${PLAYER}`, padding: "2px 0 2px 14px", marginBottom: 14, breakInside: "avoid" }}>
                      <h3 style={subHead}>Case {pad2(c.n)} · {c.title}</h3>
                      <p style={{ margin: 0, fontWeight: 700 }}>{c.lesson}</p>
                    </li>
                  ))}
                </ol>
              </Section>
            </>
          )}
        </ReportArticle>
      </div>
    </CaseFrame>
  );
}

function Figure({ label, value, outOf }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.muted }}>{label}</div>
      <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 32, lineHeight: 1.15, marginTop: 4 }}>{value}<span style={{ color: T.muted, fontSize: 21 }}> / {outOf}</span></div>
    </div>
  );
}

const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" };
const cell = { padding: "8px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top" };

function CaseTable({ progress }) {
  return (
    <div role="region" aria-label="Case by case (table)" tabIndex={0} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 560 }}>
        <thead><tr>{["Case", "Level", "First attempt", "You said", "Calibration"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {ALL_CASES.map((c) => {
            const p = progress[c.id];
            const done = p?.first !== undefined;
            const said = done && CONFIDENCE.find((x) => x.id === p.confidence);
            const verdict = done && calibrationShort(p.confidence, p.first === p.outOf);
            return (
              <tr key={c.id} style={{ breakInside: "avoid" }}>
                <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}><b style={{ fontFamily: T.mono }}>{pad2(c.n)}</b> {c.title}</th>
                <td style={{ ...cell, color: T.muted, whiteSpace: "nowrap" }}>{c.difficulty}</td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>{done ? <><b>{p.first}</b> / {p.outOf}{p.first === p.outOf && <span style={{ color: T.pos }}> <span aria-hidden="true">✓</span><span className="sr-only">(fully right)</span></span>}</> : <span style={{ color: T.muted }}>Not played</span>}</td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>{said ? said.label : <span style={{ color: T.muted }}>—</span>}</td>
                <td style={cell}>{verdict ? <Tag tone={verdict.tone}>{verdict.text}</Tag> : <span style={{ color: T.muted }}>—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* For each confidence level the student used: how often they were fully
   right, as a bar, against a tick at what that level claims (50/70/90%).
   Then the overall picture: average stated confidence vs overall hit rate.
   With few cases one result moves these a lot, so the page says so. */
function Calibration({ cases, progress }) {
  if (!cases.length) return <p style={{ margin: 0, color: T.muted }}>No stated confidence yet.</p>;
  const fully = (c) => progress[c.id].first === progress[c.id].outOf;
  const levels = CONFIDENCE.map((l) => {
    const at = cases.filter((c) => progress[c.id].confidence === l.id);
    return { ...l, n: at.length, right: at.filter(fully).length };
  }).filter((l) => l.n > 0);
  const stated = Math.round(cases.reduce((a, c) => a + progress[c.id].confidence, 0) / cases.length);
  const hit = Math.round((100 * cases.filter(fully).length) / cases.length);
  const gap = hit - stated;
  const summary = gap < -15 ? { tone: "neg", text: `Overconfident: you were fully right less often than you expected — by ${-gap} points.` }
    : gap > 15 ? { tone: "amber", text: `Underconfident: you were fully right more often than you expected — by ${gap} points. Your evidence was better than you gave it credit for.` }
    : { tone: "pos", text: "Your confidence roughly matched your results." };
  return (
    <>
      <div role="region" aria-label="Calibration (table)" tabIndex={0} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
        <thead><tr>{["You said", "Cases", "Fully right", ""].map((h, i) => <th key={i} scope="col" style={{ ...th, whiteSpace: "normal", ...(i === 3 && { width: "38%", minWidth: 70 }) }}>{h}</th>)}</tr></thead>
        <tbody>
          {levels.map((l) => {
            const share = l.right / l.n;
            return (
              <tr key={l.id}>
                <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 700 }}>{l.label} <span style={{ display: "block", fontWeight: 400, fontSize: 13.5, color: T.muted }}>{l.hint}</span></th>
                <td style={cell}>{l.n}</td>
                <td style={cell}>{l.right} <span style={{ display: "inline-block", color: T.muted }}>({Math.round(share * 100)}%)</span></td>
                <td style={{ ...cell, verticalAlign: "middle" }}>
                  <div aria-hidden="true" style={{ position: "relative", height: 12, background: T.track, borderRadius: 6 }}>
                    <div style={{ width: `${share * 100}%`, height: "100%", background: T.body2, borderRadius: 6 }} />
                    <div title={`${l.id}% claimed`} style={{ position: "absolute", left: `calc(${l.id}% - 1.5px)`, top: -4, width: 3, height: 20, background: PLAYER, borderRadius: 2 }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <p style={{ fontSize: 13, color: T.muted, margin: "6px 0 0" }}>Bars: how often you were fully right at each level. Red tick: what that level claims (a “very sure” call should be right about nine times in ten).</p>
      <p style={{ margin: "12px 0 0", padding: "10px 14px", borderRadius: 10, background: { pos: T.posTint, neg: T.negTint, amber: T.amberTint }[summary.tone] }}>
        On average you said you were <b>{stated}%</b> sure, and you were fully right in <b>{hit}%</b> of cases. {summary.text}
        {" "}With {cases.length} case{cases.length === 1 ? "" : "s"}, treat this as a rough guide: one more result can move it a long way.
      </p>
    </>
  );
}
