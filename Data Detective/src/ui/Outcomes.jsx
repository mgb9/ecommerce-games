import React from "react";
import { T, card } from "./theme.js";
import { pad2 } from "./format.js";
import { SectionTitle } from "./shared.jsx";
import { MODULE, losLabel, losOf, skillNamesOf, skillsOf, suiteCoverage } from "./outcomesModel.js";
import { ALL_CASES } from "./caseList.js";

/* "What this develops", on screen: the module's learning outcomes (in the
   specification's words, as visible text — not hidden in a tooltip), the
   syllabus topic and the skills a case practises; and, after the reveal,
   what practising each skill looked like. The case report and case file
   print the same content. */

const subHead = { fontSize: 13, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: T.muted, margin: "0 0 8px" };
const loTag = { flexShrink: 0, fontFamily: T.mono, fontWeight: 700, fontSize: 12.5, padding: "2px 7px", borderRadius: 6, background: T.panel2, border: `1px solid ${T.border}`, color: T.text, whiteSpace: "nowrap" };

// A link to the module's page in Warwick's catalogue, where the learning
// outcomes are published. It opens in a new tab, and says so.
export function ModuleLink({ children = "All the module's learning outcomes" }) {
  return (
    <a href={MODULE.url} target="_blank" rel="noopener" style={{ color: T.text, fontWeight: 700 }}>
      {children} — {MODULE.code} in the Warwick module catalogue<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function LOList({ outcomes }) {
  return (
    <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {losOf(outcomes).map((lo) => (
        <li key={lo.code} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 15, lineHeight: 1.5 }}>
          <span style={loTag}>{lo.code}{lo.partly && <span style={{ fontWeight: 500, color: T.muted }}> · partly</span>}</span>
          <span style={{ color: lo.partly ? T.body2 : T.text }}>{lo.text}</span>
        </li>
      ))}
    </ul>
  );
}

// The case intro: what working this case develops.
export function CaseOutcomes({ outcomes, style }) {
  return (
    <section aria-labelledby="dd-develops" style={{ ...card(), padding: "16px 18px", ...style }}>
      <h2 id="dd-develops" style={subHead}>What this case develops</h2>
      <LOList outcomes={outcomes} />
      <p style={{ margin: "12px 0 0", fontSize: 14.5, color: T.body2, lineHeight: 1.55 }}>
        <b style={{ color: T.text }}>Syllabus:</b> {outcomes.syllabus.join("; ")}.{" "}
        <b style={{ color: T.text }}>Skills:</b> {skillNamesOf(outcomes).join(" · ")}.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
    </section>
  );
}

// The reveal: each skill, and what practising it looked like in this case.
export function SkillsPractised({ outcomes, replyTo, confidence, style }) {
  return (
    <div style={{ ...card(), ...style }}>
      <SectionTitle>Skills you practised</SectionTitle>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {skillsOf(outcomes, { replyTo, confidence }).map((s) => (
          <li key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 14.5, lineHeight: 1.5 }}>
            <b>{s.name}</b> <span style={{ color: T.muted, fontSize: 13 }}>({s.kind.toLowerCase()})</span>
            <div style={{ color: T.body2 }}>{s.did}</div>
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
        Learning outcomes: <b style={{ color: T.text }}>{losLabel(outcomes)}</b>. Your case report records these skills, with a line you can use on a CV — and asks you to write the reply to {replyTo || "the ticket"}.
      </p>
    </div>
  );
}

// The inbox: what the game as a whole develops, and what it doesn't.
export function SuiteOutcomes({ style }) {
  const { los, skills } = suiteCoverage();
  const nums = (cs) => cs.map((c) => pad2(c.n)).join(", ");
  return (
    <section aria-labelledby="dd-suite-develops" style={{ ...card(), padding: "16px 18px", ...style }}>
      <h2 id="dd-suite-develops" style={subHead}>What these cases develop</h2>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {los.map((lo) => (
          <li key={lo.code} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 14.5, lineHeight: 1.5 }}>
            <span style={loTag}>{lo.code}</span>
            <span>
              <span style={{ color: lo.cases.length || lo.partlyIn.length ? T.text : T.body2 }}>{lo.text}</span>{" "}
              <b style={{ color: T.text }}>
                {lo.cases.length === ALL_CASES.length ? "Every case." : lo.partlyIn.length ? `Partly, in cases ${nums(lo.partlyIn)}.` : lo.code === "LO4" ? "Assessed through the group Website Build, not this game." : "Not covered by this game."}
              </b>
            </span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "12px 0 0", fontSize: 14.5, color: T.body2, lineHeight: 1.55 }}>
        <b style={{ color: T.text }}>Skills you'll practise:</b> {skills.filter((s) => s.cases.length).map((s) => s.name).join(" · ")}. Each case report records what you did, with a line you can use on a CV or in an interview; your case file collects them.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
    </section>
  );
}
