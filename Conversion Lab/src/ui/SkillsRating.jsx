import React, { useId, useState } from "react";
import { T, btn, card } from "./theme.js";
const linkBtn = { background: "none", border: "none", color: T.body2, cursor: "pointer", fontSize: 15.5, fontFamily: T.body, textDecoration: "underline" };
import { RATING_LABELS, SKILL_STATEMENTS } from "./cohort.js";

/* The skills self-rating: six statements, each rated 1–5 ("How confident
   are you that you can…"). Asked once before the first experiment and again
   from the experiment log, so a student can see their own confidence move
   against the evidence of what they did (the same form as Data Detective's). Each statement is a radio group with a
   visible legend; the scale's ends are labelled in words. */
export default function SkillsRating({ title, intro, initial = null, saveLabel = "Save my rating", onSave, onSkip, style }) {
  const [ratings, setRatings] = useState(() => initial || {});
  const complete = SKILL_STATEMENTS.every((s) => ratings[s.id]);
  const headId = useId();
  return (
    <section aria-labelledby={headId} style={{ ...card(), ...style }}>
      <h2 id={headId} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 6px", letterSpacing: -0.2 }}>{title}</h2>
      <p style={{ margin: "0 0 14px", fontSize: 14.5, color: T.body2, lineHeight: 1.55 }}>{intro}</p>
      <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>How confident are you that you can…</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SKILL_STATEMENTS.map((s) => <Statement key={s.id} statement={s} value={ratings[s.id]} onChange={(v) => setRatings((r) => ({ ...r, [s.id]: v }))} />)}
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onSave(ratings)} disabled={!complete} style={{ ...btn(T.playerBtn), padding: "11px 20px", fontSize: 15.5, opacity: complete ? 1 : 0.45, cursor: complete ? "pointer" : "not-allowed" }}>{complete ? saveLabel : "Rate all six to save"}</button>
        {onSkip && <button type="button" onClick={onSkip} style={linkBtn}>Skip for now</button>}
        <span style={{ fontSize: 13.5, color: T.body2 }}>Saved only in this browser. It appears in your experiment log and in your result code — never with your name.</span>
      </div>
    </section>
  );
}

function Statement({ statement, value, onChange }) {
  const name = useId();
  return (
    <fieldset style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px 12px", margin: 0 }}>
      <legend style={{ fontSize: 14.5, fontWeight: 600, padding: "0 6px" }}>…{statement.text}</legend>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: T.body2, minWidth: 64 }}>{RATING_LABELS[0]}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = value === n;
            return (
              <label key={n} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 9, cursor: "pointer", border: `1.5px solid ${on ? T.playerBtn : T.border}`, background: on ? T.playerBtn : T.panel2, color: on ? T.onAccent : T.text, fontWeight: 700, fontSize: 15 }}>
                <input type="radio" name={name} value={n} checked={on} onChange={() => onChange(n)} aria-label={`${n} of 5, ${RATING_LABELS[n - 1]}`} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
                <span aria-hidden="true">{n}</span>
              </label>
            );
          })}
        </div>
        <span style={{ fontSize: 13, color: T.body2, minWidth: 64 }}>{RATING_LABELS[4]}</span>
      </div>
    </fieldset>
  );
}

// The table of a student's ratings, before and (if rated again) now.
export function RatingsTable({ before, after }) {
  const cell = { padding: "7px 10px", borderBottom: `1px solid ${T.border}`, verticalAlign: "top" };
  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${T.text}`, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
      <thead><tr><th scope="col" style={th}>How confident I am that I can…</th>{before && <th scope="col" style={{ ...th, textAlign: "center" }}>Before</th>}{after && <th scope="col" style={{ ...th, textAlign: "center" }}>Now</th>}</tr></thead>
      <tbody>
        {SKILL_STATEMENTS.map((s) => {
          const b = before?.[s.id], a = after?.[s.id];
          const moved = b && a ? a - b : 0;
          return (
            <tr key={s.id}>
              <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}>…{s.text}</th>
              {before && <td style={{ ...cell, textAlign: "center", fontFamily: T.mono }}>{b ?? "—"}<span className="sr-only"> of 5</span></td>}
              {after && <td style={{ ...cell, textAlign: "center", fontFamily: T.mono, fontWeight: 700, color: moved > 0 ? T.pos : moved < 0 ? T.neg : T.text }}>{a ?? "—"}<span className="sr-only"> of 5</span>{moved !== 0 && <span style={{ fontSize: 13, marginLeft: 4 }}>{moved > 0 ? `+${moved}` : moved}</span>}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
