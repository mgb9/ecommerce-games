import React, { useEffect, useId, useState } from "react";
import { T, card } from "./theme.js";
import { loadProgress, recordRecommendation } from "./progress.js";
import { OUTCOMES } from "./outcomesModel.js";
import { usePlain } from "./shared.jsx";

/* The writing task: a short platform-and-strategy recommendation to the
   client whose brief was just run, and a four-point self-check. It
   practises the skill the module most wants made visible — explaining a
   technology choice and its evidence to someone who isn't a technologist.
   Saved as you type (in this browser only); the decision log prints it,
   and the result code says only whether it was written and how many
   checks were ticked. */
export const REC_CHECKS = [
  "It names a platform and a fulfilment model, and ties each to what this client needs.",
  "It uses evidence from the ten weeks — profit, cash, returns or regulars — and says what a simulation can't show.",
  "It names the trade-off being accepted (cost, build time, running the site yourself, or a low ceiling) and what would change the advice.",
  "It's in plain English that a client who isn't a technologist could act on.",
];
// The same four checks in Simpler English, in the same order (ticks are stored by position).
export const REC_CHECKS_PLAIN = [
  "It names a platform and a fulfilment model, and says why each one fits this client.",
  "It uses facts from the ten weeks (profit, cash, returns or regulars), and says what a simulation cannot show.",
  "It says what the client gives up with this choice (cost, build time, running the site yourself, or a low performance limit), and what would change your advice.",
  "It uses simple words, so a client who is not a technology expert can act on it.",
];
export const clientOf = (brief) => OUTCOMES[brief]?.client || "the client";

export default function Recommendation({ brief }) {
  const client = clientOf(brief);
  const saved = loadProgress()[brief]?.recommendation;
  const [text, setText] = useState(saved?.text || "");
  const [checks, setChecks] = useState(() => REC_CHECKS.map((_, i) => (saved?.ticks ? !!saved.ticks[i] : i < (saved?.checks || 0))));
  const id = useId();
  const count = checks.filter(Boolean).length;
  const plain = usePlain();
  useEffect(() => { recordRecommendation(brief, { text, checks: text.trim() ? count : 0, ticks: checks }); }, [brief, text, checks]); // eslint-disable-line react-hooks/exhaustive-deps -- count follows checks
  return (
    <section aria-labelledby={`${id}-h`} style={{ ...card(), marginTop: 18 }}>
      <h2 id={`${id}-h`} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18.5, margin: "0 0 6px" }}>Your recommendation to {client}</h2>
      <p style={{ margin: "0 0 10px", fontSize: 15, color: T.body2, lineHeight: 1.5 }}>{plain ? "Write three or four sentences. Which platform and fulfilment model should this client use? What did your ten weeks show? What would you change next time? Your decision log will include this text." : "In three or four sentences: which platform and fulfilment model should this client use, what did your ten weeks show, and what would you do differently? Your decision log prints it."}</p>
      <label htmlFor={`${id}-t`} className="sr-only">Your recommendation to {client}</label>
      <textarea id={`${id}-t`} value={text} onChange={(e) => setText(e.target.value)} rows={4}
        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.muted}`, borderRadius: 10, background: T.panel2, font: `15px/1.5 ${T.body}`, color: T.text, resize: "vertical" }} />
      <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Check your recommendation</legend>
        {(plain ? REC_CHECKS_PLAIN : REC_CHECKS).map((c, i) => (
          <label key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.45, padding: "4px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((cs) => cs.map((v, j) => (j === i ? e.target.checked : v)))} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
            <span>{c}</span>
          </label>
        ))}
      </fieldset>
      <p role="status" style={{ margin: "8px 0 0", fontSize: 13.5, color: T.body2, minHeight: 18 }}>{text.trim() ? (plain ? `Saved in this browser. You ticked ${count} of 4 checks.` : `Saved in this browser · ${count} of 4 checks ticked.`) : ""}</p>
    </section>
  );
}
