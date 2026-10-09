import React, { useId } from "react";
import { T, card } from "./theme.js";
import { MODULE, losOf, losLabel, skillsOf, skillNamesOf } from "./outcomesModel.js";

/* "What this develops", on screen: the module's learning outcomes in the
   specification's words (visible text, not a tooltip), the syllabus topic
   and the skills — and, on the verdict, what practising each skill looked
   like. The experiment log prints the same content. */
const subHead = { fontSize: 13, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: T.body2, margin: "0 0 8px" };
const loTag = { flexShrink: 0, fontFamily: T.mono, fontWeight: 700, fontSize: 13, padding: "2px 7px", borderRadius: 6, background: T.panel2, border: `1px solid ${T.border}`, color: T.text, whiteSpace: "nowrap" };

// A link to the module's page in Warwick's catalogue. It opens in a new tab, and says so.
export function ModuleLink({ children = "All the module's learning outcomes" }) {
  return (
    <a href={MODULE.url} target="_blank" rel="noopener" style={{ color: T.text, fontWeight: 700 }}>
      {children} — {MODULE.code} in the Warwick module catalogue<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function LOList({ outcomes, size = 15 }) {
  return (
    <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {losOf(outcomes).map((lo) => (
        <li key={lo.code} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: size, lineHeight: 1.5 }}>
          <span style={loTag}>{lo.code}{lo.partly && <span style={{ fontWeight: 500, color: T.body2 }}> · partly</span>}</span>
          <span style={{ color: lo.partly ? T.body2 : T.text }}>{lo.text}</span>
        </li>
      ))}
    </ul>
  );
}

// The bench (and the quiz and studio intros): what working this develops.
export function WhatThisDevelops({ outcomes, title = "What this experiment develops", style }) {
  const id = useId();
  return (
    <section aria-labelledby={id} style={{ ...card(), padding: "16px 18px", ...style }}>
      <h2 id={id} style={subHead}>{title}</h2>
      <LOList outcomes={outcomes} size={14.5} />
      <p style={{ margin: "12px 0 0", fontSize: 14.5, color: T.body2, lineHeight: 1.55 }}>
        <b style={{ color: T.text }}>Syllabus:</b> {outcomes.syllabus.join("; ")}.{" "}
        <b style={{ color: T.text }}>Skills:</b> {skillNamesOf(outcomes).join(" · ")}.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
    </section>
  );
}

// The verdict: each skill, and what practising it looked like here.
export function SkillsPractised({ outcomes, style }) {
  return (
    <section aria-labelledby="cl-skills-practised" style={{ ...card(), ...style }}>
      <h2 id="cl-skills-practised" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 10px" }}>Skills you practised</h2>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {skillsOf(outcomes).map((s) => (
          <li key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 15, lineHeight: 1.5 }}>
            <b>{s.name}</b> <span style={{ color: T.body2, fontSize: 13.5 }}>({s.kind.toLowerCase()})</span>
            <div style={{ color: T.body2 }}>{s.did}</div>
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>
        Learning outcomes: <b style={{ color: T.text }}>{losLabel(outcomes)}</b>. Your experiment log records these skills, with a line you can use on a CV.
      </p>
    </section>
  );
}
