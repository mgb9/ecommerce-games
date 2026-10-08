import React, { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import { caseLink } from "../urlConfig.js";

/* Slide-over for the seed + noise behind cases 1–8. Applying starts the
   case afresh (or, from the inbox, applies to whichever case is opened
   next); a shared seed gives a whole cohort an identical dashboard, and
   the link opens this case — or the inbox — with these settings for everyone.

   A modal dialog: focus moves in on open, Tab cycles inside, Escape or
   the backdrop closes it, and focus returns to whatever opened it. */
export default function InstructorPanel({ cfg, caseN, onApply, onClose, onOpenView }) {
  const [seed, setSeed] = useState(cfg.seed);
  const [noise, setNoise] = useState(cfg.noise);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const A = T.instructor;
  const link = caseLink({ caseN, seed, noise });

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current.querySelector("input").focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const focusable = [...panelRef.current.querySelectorAll("button, input")].filter((el) => !el.disabled);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (opener?.isConnected) opener.focus(); };
  }, []);

  async function copyLink(e) {
    const input = e.currentTarget.previousSibling; // read before the await: React clears currentTarget
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { input.focus(); input.select(); } // no clipboard access: leave it selected to copy by hand
  }

  const field = { flex: 1, minWidth: 0, background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 14.5, outline: "none" };
  const smallBtn = { background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontFamily: T.body, fontSize: 14, fontWeight: 600 };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="dd-instructor-title"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 340, maxWidth: "92vw", background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 70, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #00000030" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 id="dd-instructor-title" style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 19, color: A }}><span aria-hidden="true">⚙ </span>Instructor</h2>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px", minWidth: 32, minHeight: 32 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.5, marginTop: 0 }}>Applies to a <b style={{ color: T.text }}>new case</b> — a shared seed gives a cohort an identical dashboard. The seed also picks which variant of each case (which fault, on which day) everyone gets.</p>
          <div style={{ marginTop: 16, marginBottom: 14 }}>
            <label htmlFor="dd-seed" style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 6 }}>Seed</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input id="dd-seed" value={seed} onChange={(e) => { setSeed(e.target.value); setCopied(false); }} style={field} />
              <button onClick={() => { setSeed("DD-" + Math.random().toString(36).slice(2, 7).toUpperCase()); setCopied(false); }} aria-label="Random seed" title="Random seed" style={smallBtn}><span aria-hidden="true">🎲</span></button>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label htmlFor="dd-noise" style={{ fontSize: 14.5, fontWeight: 500 }}>Noise level</label>
              <span aria-hidden="true" style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14.5, color: A }}>{noise.toFixed(1)}×</span>
            </div>
            <input id="dd-noise" type="range" min={0.2} max={2} step={0.1} value={noise} aria-valuetext={`${noise.toFixed(1)} times`} onChange={(e) => { setNoise(Number(e.target.value)); setCopied(false); }} style={{ width: "100%", marginTop: 7, "--accent": A, "--accent-soft": A + "30" }} />
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 5 }}>Low = obvious signal for a first walkthrough. High = brutal, harder to tell signal from noise. Default 1.4×.</div>
          </div>
          <button onClick={() => onApply({ seed, noise })} style={{ width: "100%", background: A, color: T.onAccent, border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 700, fontSize: 15 }}>{caseN ? "Apply & start this case afresh" : "Apply to every case"}</button>

          {onOpenView && (
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>For the seminar</div>
              <button onClick={() => onOpenView("answers")} style={smallBtn}>Answer sheet for this seed (printable)</button>
              <button onClick={() => onOpenView("tally")} style={smallBtn}>Cohort tally — paste students' result codes</button>
            </div>
          )}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <label htmlFor="dd-link" style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 4 }}>Link for your cohort</label>
            <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 8, lineHeight: 1.45 }}>{caseN ? `Opens Case ${String(caseN).padStart(2, "0")} with this seed and noise level.` : "Opens the case inbox with this seed and noise level."}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input id="dd-link" readOnly value={link} onFocus={(e) => e.target.select()} style={{ ...field, fontSize: 12.5 }} />
              <button onClick={copyLink} style={smallBtn}>Copy</button>
            </div>
            <div role="status" style={{ fontSize: 12.5, color: T.pos, marginTop: 6, minHeight: 18 }}>{copied ? "Link copied." : ""}</div>
          </div>
        </div>
      </div>
    </>
  );
}
