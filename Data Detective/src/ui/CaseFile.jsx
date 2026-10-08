import React, { useState } from "react";
import { T, PLAYER } from "./theme.js";
import { pad2 } from "./format.js";
import { CaseFrame } from "./shared.jsx";
import { PrintBar, ReportArticle, Section, Tag, subHead, useDocumentTitle, useStudentName } from "./report/ReportView.jsx";
import { calibrationShort, longDate } from "./report/labels.js";
import { ALL_CASES, isPlayed } from "./caseList.js";
import { CONFIDENCE, loadProgress } from "./progress.js";
import { MODULE, suiteCoverage } from "./outcomesModel.js";

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
        <ReportArticle kicker="Data Detective · Case file" tag={`${MODULE.code} · LO3 · LO1 (partly)`} title="Your case file" meta={[longDate(), `${played.length} of ${ALL_CASES.length} cases played`, "First attempts only"]} name={name} setName={setName}>
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
              <SkillsRecord played={played} />
              <Section title="For your CV or an interview">
                <p style={{ margin: "0 0 10px" }}>One line per case you've played. Pick one and tell it as situation, task, action and result — and say it was a simulation (Case 09 used real data): the method is what counts.</p>
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                  {played.map((c) => <li key={c.id} style={{ marginBottom: 6, breakInside: "avoid" }}>{c.outcomes.cv} <span style={{ color: T.muted }}>(Case {pad2(c.n)})</span></li>)}
                </ul>
              </Section>
              <Section title="Learning outcomes">
                <LearningOutcomes played={played} />
              </Section>
              <Section title="Using this in your assessment">
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                  <li style={{ marginBottom: 6 }}><b>Business Report (70%)</b> — a report on an eCommerce transformation in a given industry. The method in these cases is the analysis such a report needs: split the headline number into its parts, segment the part that moved, and check that the measurement can be trusted before you act on it.</li>
                  <li><b>Website Build presentation (30%, LO4)</b> — when you set up your site's analytics, use what Cases 06 and 09 showed: make sure purchases are recorded on every device and browser, exclude your payment provider as a referrer, and keep test orders out of the live data.</li>
                </ul>
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

/* The skills record: each skill the module names, the cases this student
   has practised it in, and — for the ones they haven't yet — which cases
   would. Communication and self-assessment are practised in every case. */
function SkillsRecord({ played }) {
  const { skills } = suiteCoverage();
  const ids = new Set(played.map((c) => c.id));
  const nums = (cs) => cs.map((c) => pad2(c.n)).join(", ");
  const rows = skills.map((s) => ({ ...s, done: s.cases.filter((c) => ids.has(c.id)), todo: s.cases.filter((c) => !ids.has(c.id)) }));
  return (
    <Section title="Skills record">
      <div role="region" aria-label="Skills record (table)" tabIndex={0} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
          <thead><tr>{["Skill", "What it means here", "Practised in"].map((h) => <th key={h} scope="col" style={{ ...th, whiteSpace: "normal" }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={{ breakInside: "avoid" }}>
                <th scope="row" style={{ ...cell, textAlign: "left" }}>{s.name}<span style={{ display: "block", fontWeight: 400, fontSize: 13, color: T.muted }}>{s.kind}</span></th>
                <td style={{ ...cell, color: T.body2 }}>{s.how}</td>
                <td style={{ ...cell, minWidth: 110 }}>
                  {s.done.length ? <><b>{s.done.length}</b> case{s.done.length === 1 ? "" : "s"} <span style={{ color: T.muted }}>({nums(s.done)})</span></> : <span style={{ color: T.muted }}>Not yet</span>}
                  {s.todo.length > 0 && <span style={{ display: "block", fontSize: 13, color: T.muted }}>Next: case{s.todo.length === 1 ? "" : "s"} {nums(s.todo.slice(0, 3))}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// The module's four learning outcomes, and how far this game serves each.
function LearningOutcomes({ played }) {
  const { los } = suiteCoverage();
  const ids = new Set(played.map((c) => c.id));
  const count = (cs) => cs.filter((c) => ids.has(c.id)).length;
  return (
    <>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {los.map((lo) => (
          <li key={lo.code} style={{ marginBottom: 10, breakInside: "avoid" }}>
            <b>{lo.code}</b> — {lo.text}
            <span style={{ display: "block", fontSize: 14, color: T.muted }}>
              {lo.cases.length ? `Every case. You've played ${count(lo.cases)} of ${lo.cases.length}.`
                : lo.partlyIn.length ? `Partly, in cases ${lo.partlyIn.map((c) => pad2(c.n)).join(", ")}. You've played ${count(lo.partlyIn)} of them.`
                : lo.code === "LO4" ? "Assessed through the group Website Build, not this game."
                : "Not covered by this game."}
            </span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "4px 0 0", fontSize: 14, color: T.muted }}>All the module's learning outcomes: <a href={MODULE.url} style={{ color: T.text, overflowWrap: "anywhere" }}>{MODULE.url.replace(/^https:\/\//, "")}</a></p>
    </>
  );
}
