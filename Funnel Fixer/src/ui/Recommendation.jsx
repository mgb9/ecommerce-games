import React, { useEffect, useId, useState } from "react";
import { T, card } from "./theme.js";
import { loadProgress, recordRecommendation } from "./progress.js";

/* The writing task: a short spending recommendation to the person who holds
   the budget, and a four-point self-check. It practises the skill the module
   most wants made visible — explaining a decision, with its figures, to
   someone who isn't an analyst. Saved as you type (in this browser only);
   the diagnosis log prints it, and the result code says only whether it was
   written and how many checks were ticked. */
export const REC_READER = "Chrichton's head of e-commerce";
export const REC_CHECKS = [
  "It says where to spend, and sizes the reason in pounds rather than percentage points.",
  "It says what the spend should return, and over what period.",
  "It names something not to fund, or to stop funding, and why.",
  "It's in plain English that someone who isn't an analyst could act on.",
];

export default function Recommendation({ onChange, style }) {
  const [saved] = useState(() => loadProgress().recommendation);
  const [text, setText] = useState(saved?.text || "");
  const [checks, setChecks] = useState(() => REC_CHECKS.map((_, i) => (saved?.ticks ? !!saved.ticks[i] : i < (saved?.checks || 0))));
  const id = useId();
  const count = checks.filter(Boolean).length;
  const wrote = !!text.trim();
  useEffect(() => { recordRecommendation({ text, checks: wrote ? count : 0, ticks: checks }); }, [text, checks, wrote]); // eslint-disable-line react-hooks/exhaustive-deps -- count follows checks
  useEffect(() => { onChange?.(wrote); }, [wrote]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section aria-labelledby={`${id}-h`} style={{ ...card(), ...style }}>
      <h2 id={`${id}-h`} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 6px" }}>Your recommendation to {REC_READER}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 15, color: T.body2, lineHeight: 1.5 }}>In three or four sentences: where should next year's budget go, what should it return and by when, and what would you not fund? Your diagnosis log prints it.</p>
      <label htmlFor={`${id}-t`} className="sr-only">Your recommendation to {REC_READER}</label>
      <textarea id={`${id}-t`} value={text} onChange={(e) => setText(e.target.value)} rows={4}
        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, background: T.panel2, font: `15px/1.5 ${T.body}`, color: T.text, resize: "vertical" }} />
      <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Check your recommendation</legend>
        {REC_CHECKS.map((c, i) => (
          <label key={c} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.45, padding: "4px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((cs) => cs.map((v, j) => (j === i ? e.target.checked : v)))} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
            <span>{c}</span>
          </label>
        ))}
      </fieldset>
      <p role="status" style={{ margin: "8px 0 0", fontSize: 13.5, color: T.body2, minHeight: 18 }}>{wrote ? `Saved in this browser · ${count} of 4 checks ticked.` : ""}</p>
    </section>
  );
}
