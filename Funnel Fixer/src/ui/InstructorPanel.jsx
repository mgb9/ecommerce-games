import React, { useEffect, useId, useRef } from "react";
import { STAGES, gbp, pct } from "../engine/engine.js";
import { T, presetBtn } from "./theme.js";

/* Staff only (see App: it opens only after ?instructor). A modal dialog:
   focus moves in on open, Tab cycles inside, Escape or the backdrop closes
   it, and focus returns to whatever opened it. The debrief is written from
   each run's own numbers, so it stays true under any of these settings. */
export default function InstructorPanel({ cfg, setCfg, defaults, onClose }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setRate = (k, v) => setCfg((c) => ({ ...c, rates: { ...c.rates, [k]: v } }));
  const A = T.instructor;
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const seedId = useId();

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

  const preset = (label, patch) => <button key={label} type="button" onClick={() => set(patch)} style={presetBtn}>{label}</button>;
  const shareLink = typeof location === "undefined" ? "" : `${location.origin}${location.pathname}?seed=${encodeURIComponent(cfg.seed)}`;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ff-instructor-title"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 350, maxWidth: "92vw", background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 70, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #00000030" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 id="ff-instructor-title" style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 19, color: A }}><span aria-hidden="true">⚙ </span>Instructor</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px", minWidth: 32, minHeight: 32 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.5, marginTop: 0 }}>Budget and unit economics apply from the <b style={{ color: T.text }}>next quarter resolved</b>; the seed, the number of quarters and the starting rates apply to a <b style={{ color: T.text }}>new game</b>. A shared seed gives the whole cohort the same funnel and outcomes, so the debrief is about decisions.</p>

          <PanelGroup title="Classroom">
            <div style={{ marginBottom: 12 }}>
              <label htmlFor={seedId} style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 6 }}>Seed</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input id={seedId} value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, minWidth: 0, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 14.5 }} />
                <button type="button" aria-label="Random seed" title="Random seed" onClick={() => set({ seed: "FNL-" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}><span aria-hidden="true">🎲</span></button>
              </div>
              <p style={{ fontSize: 13.5, color: T.muted, margin: "7px 0 0", lineHeight: 1.45, overflowWrap: "anywhere" }}>Link for students (opens on this seed, without these controls): <span style={{ fontFamily: T.mono, color: T.text }}>{shareLink}</span></p>
            </div>
            <InstructorSlider label="Budget per quarter" accent={A} value={cfg.budget} min={4000} max={40000} step={1000} fmt={gbp} onChange={(v) => set({ budget: v })} changed={cfg.budget !== defaults.budget} />
            <InstructorSlider label="Quarters" accent={A} value={cfg.quarters} min={2} max={8} step={1} fmt={(v) => String(v)} valueText={(v) => `${v} quarters`} onChange={(v) => set({ quarters: v })} changed={cfg.quarters !== defaults.quarters} />
          </PanelGroup>

          <PanelGroup title="Unit economics">
            <InstructorSlider label="Sessions per quarter" accent={A} value={cfg.sessions} min={20000} max={200000} step={5000} fmt={(v) => v / 1000 + "k"} valueText={(v) => `${v.toLocaleString("en-GB")} sessions`} onChange={(v) => set({ sessions: v })} changed={cfg.sessions !== defaults.sessions} />
            <InstructorSlider label="Average order value" accent={A} value={cfg.aov} min={15} max={120} step={1} fmt={gbp} onChange={(v) => set({ aov: v })} changed={cfg.aov !== defaults.aov} />
            <InstructorSlider label="Gross margin" accent={A} value={cfg.margin} min={0.15} max={0.8} step={0.01} fmt={(v) => pct(v, 0)} onChange={(v) => set({ margin: v })} changed={cfg.margin !== defaults.margin} />
            <InstructorSlider label="Repeat factor (LTV)" accent={A} value={cfg.repeat} min={0} max={2} step={0.1} fmt={(v) => v.toFixed(1) + "×"} valueText={(v) => `${v.toFixed(1)} times`} onChange={(v) => set({ repeat: v })} changed={cfg.repeat !== defaults.repeat} />
            <InstructorSlider label="Mobile share" accent={A} value={cfg.mobileShare} min={0.2} max={0.9} step={0.05} fmt={(v) => pct(v, 0)} onChange={(v) => set({ mobileShare: v })} changed={cfg.mobileShare !== defaults.mobileShare} />
          </PanelGroup>

          <PanelGroup title="Starting funnel rates" note="Apply to a new game. Benchmarks and best-in-class stay fixed.">
            {STAGES.map((s) => <InstructorSlider key={s.key} label={s.label} accent={A} value={cfg.rates[s.key]} min={0.03} max={cfg.benchmarks[s.key]} step={0.01} fmt={(v) => pct(v, 0)} onChange={(v) => setRate(s.key, v)} changed={cfg.rates[s.key] !== defaults.rates[s.key]} />)}
          </PanelGroup>

          <PanelGroup title="Teaching presets — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {preset("Top-heavy leak", { rates: { ...defaults.rates, view: 0.42, atc: 0.06 } })}
              {preset("Abandonment crisis (the biggest gap is the biggest leak)", { rates: { ...defaults.rates, checkout: 0.36, purchase: 0.42 } })}
              {preset("Tight budget (£8k)", { budget: 8000 })}
              {preset("Cheap-traffic temptation (high order value and margin)", { aov: 70, margin: 0.58 })}
              {preset("Low noise (clean signal)", { noise: 0.02 })}
              {preset("Reset funnel and economics", { rates: { ...defaults.rates }, budget: defaults.budget, aov: defaults.aov, margin: defaults.margin, sessions: defaults.sessions, noise: defaults.noise })}
            </div>
          </PanelGroup>

          <button type="button" onClick={() => setCfg(defaults)} style={{ width: "100%", marginTop: 12, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5 }}>↺ Reset all to defaults</button>
        </div>
      </div>
    </>
  );
}

function PanelGroup({ title, note, children }) {
  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14.5, letterSpacing: 0.3, textTransform: "uppercase", color: T.muted, margin: "0 0 10px" }}>{title}</h3>
      {note && <p style={{ fontSize: 13.5, color: T.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.4 }}>{note}</p>}
      {children}
    </section>
  );
}
function InstructorSlider({ label, value, min, max, step, fmt, valueText, onChange, accent, changed }) {
  const id = useId();
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label htmlFor={id} style={{ fontSize: 14.5, fontWeight: 500 }}>{label}{changed && <span style={{ color: T.text, marginLeft: 5 }}> (changed)</span>}</label>
        <span aria-hidden="true" style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14.5, color: T.text }}>{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={valueText ? valueText(value) : fmt(value)} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 7, "--accent": accent, "--accent-soft": accent + "30" }} />
    </div>
  );
}
