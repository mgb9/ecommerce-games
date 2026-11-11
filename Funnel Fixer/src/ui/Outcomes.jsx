import React, { useId } from "react";
import { T, card } from "./theme.js";
import { MODULE, OUTCOMES, losOf, skillsOf } from "../engine/outcomes.js";

/* "What this develops", on screen: the module's learning outcome in the
   specification's words (visible text, not a tooltip), the syllabus topics
   and the skills — and, on the debrief, what practising each skill looked
   like. The diagnosis log prints the same content. */
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

// The intro: what playing develops.
export function WhatThisDevelops({ style }) {
  const id = useId();
  return (
    <section aria-labelledby={id} style={{ ...card(), padding: "16px 18px", ...style }}>
      <h2 id={id} style={subHead}>What this develops</h2>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {losOf().map((lo) => (
          <li key={lo.code} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 15, lineHeight: 1.5 }}>
            <span style={loTag}>{lo.code}</span><span>{lo.text}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", fontSize: 15, color: T.body2, lineHeight: 1.55 }}>Here that means judging which store improvements are worth their cost — in profit, over a stated period — rather than by how large a conversion gap looks.</p>
      <p style={{ margin: "10px 0 0", fontSize: 14.5, color: T.body2, lineHeight: 1.55 }}>
        <b style={{ color: T.text }}>Syllabus:</b> {OUTCOMES.syllabus.join("; ")}.{" "}
        <b style={{ color: T.text }}>Skills:</b> {skillsOf().map((s) => s.name).join(" · ")}.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14 }}><ModuleLink /></p>
    </section>
  );
}

// The debrief: each skill, and what practising it looked like here.
export function SkillsPractised({ wrote, style }) {
  return (
    <section aria-labelledby="ff-skills-practised" style={{ ...card(), ...style }}>
      <h2 id="ff-skills-practised" style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 10px" }}>Skills you practised</h2>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {skillsOf().filter((s) => s.id !== "communication" || wrote).map((s) => (
          <li key={s.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 15, lineHeight: 1.5 }}>
            <b>{s.name}</b> <span style={{ color: T.body2, fontSize: 13.5 }}>({s.kind.toLowerCase()})</span>
            <div style={{ color: T.body2 }}>{s.how}</div>
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: T.body2, lineHeight: 1.5 }}>
        Learning outcome: <b style={{ color: T.text }}>{OUTCOMES.los.join(" · ")}</b>. {wrote ? "" : "Write the recommendation above and Communication joins this list. "}Your diagnosis log records these skills, with a line you can use on a CV.
      </p>
    </section>
  );
}
