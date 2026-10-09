import React, { useEffect, useId, useState } from "react";
import { T, card } from "../theme.js";
import { loadProgress, recordRecommendation } from "../progress.js";

/* The writing task: a short recommendation to the team that asked for the
   test, and a four-point self-check. It practises the skill the module most
   wants made visible — explaining a result, with its uncertainty, to someone
   who isn't an analyst. Saved as you type (in this browser only); the
   experiment log prints it, and the result code says only whether it was
   written and how many checks were ticked. */
// Who asked for each test, and so who the recommendation is for.
export const TEAM = { cta: "the design team", imgbg: "the design team", scarcity: "the product team", social: "the product team", shipping: "the trading team", checkout: "the checkout team", promo: "marketing", subject: "the email team" };

export const REC_CHECKS = [
  "It says what the test found, and how sure we can be (significant or not, and the likely range).",
  "It recommends an action — ship it, don't, or keep testing — and says who should act.",
  "It names what was measured, and anything the test didn't capture (profit, a segment, a guardrail).",
  "It's in plain English that someone who isn't an analyst could act on.",
];

export default function Recommendation({ expId, teamName = "the design team" }) {
  const saved = loadProgress()[expId]?.recommendation;
  const [text, setText] = useState(saved?.text || "");
  const [checks, setChecks] = useState(() => REC_CHECKS.map((_, i) => i < (saved?.checks || 0)));
  const id = useId();
  const count = checks.filter(Boolean).length;
  useEffect(() => { recordRecommendation(expId, { text, checks: text.trim() ? count : 0 }); }, [expId, text, count]);
  return (
    <section aria-labelledby={`${id}-h`} style={{ ...card(), marginTop: 16 }}>
      <h2 id={`${id}-h`} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 6px" }}>Your recommendation to {teamName}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 15, color: T.body2, lineHeight: 1.5 }}>In three or four sentences: what did the test show, how sure can we be, and what should happen next? Your experiment log prints it.</p>
      <label htmlFor={`${id}-t`} className="sr-only">Your recommendation to {teamName}</label>
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
      <p role="status" style={{ margin: "8px 0 0", fontSize: 13.5, color: T.body2, minHeight: 18 }}>{text.trim() ? `Saved in this browser · ${count} of 4 checks ticked.` : ""}</p>
    </section>
  );
}
