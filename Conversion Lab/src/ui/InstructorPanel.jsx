import React, { useEffect, useId, useRef } from "react";
import { T, presetBtn } from "./theme.js";
import { ToggleRow } from "./shared.jsx";

/* Staff only (see App). A modal dialog: focus moves in on open, Tab
   cycles inside, Escape or the backdrop closes it, and focus returns to
   whatever opened it. Changes apply to the next test run; a shared seed
   gives a whole cohort an identical run, so the debrief is about
   decisions, not luck. */
export default function InstructorPanel({ cfg, setCfg, defaults, onClose }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
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
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="cl-instructor-title"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 350, maxWidth: "92vw", background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 70, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #00000030" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 id="cl-instructor-title" style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 19, color: A }}><span aria-hidden="true">⚙ </span>Instructor</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px", minWidth: 32, minHeight: 32 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.5, marginTop: 0 }}>Changes apply to the <b style={{ color: T.text }}>next test run</b>. A shared seed gives the whole cohort an identical run — so the debrief is about <b style={{ color: T.text }}>decisions</b>, not luck. Lesson texts follow these settings.</p>

          <PanelGroup title="Classroom">
            <div style={{ marginBottom: 12 }}>
              <label htmlFor={seedId} style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 6 }}>Run seed</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input id={seedId} value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, minWidth: 0, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 14.5 }} />
                <button type="button" aria-label="Random seed" title="Random seed" onClick={() => set({ seed: "LAB-" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}><span aria-hidden="true">🎲</span></button>
              </div>
            </div>
            <ToggleRow label="Allow peeking (optional stopping)" on={cfg.peeking} accent={A} onToggle={() => set({ peeking: !cfg.peeking })} />
          </PanelGroup>

          <PanelGroup title="Statistical settings" note="α is the false-positive threshold; power sets the sample-size planner's target.">
            <InstructorSlider label="Significance level α" accent={A} value={cfg.alpha} min={0.01} max={0.2} step={0.01} fmt={(v) => v.toFixed(2)} onChange={(v) => set({ alpha: v })} changed={cfg.alpha !== defaults.alpha} />
            <InstructorSlider label="Target power" accent={A} value={cfg.power} min={0.5} max={0.95} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ power: v })} changed={cfg.power !== defaults.power} />
            <InstructorSlider label="Max visitors per arm" accent={A} value={cfg.maxVisitors} min={2000} max={60000} step={1000} fmt={(v) => `${(v / 1000).toFixed(0)}k`} valueText={(v) => `${v.toLocaleString("en-GB")} visitors`} onChange={(v) => set({ maxVisitors: v })} changed={cfg.maxVisitors !== defaults.maxVisitors} />
          </PanelGroup>

          <PanelGroup title="Effect size" note="Scales every variant's true lift. 1.0 = as designed; 0 = the variant truly does nothing.">
            <InstructorSlider label="Effect multiplier" accent={A} value={cfg.effectMult} min={0} max={2} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} valueText={(v) => `${v.toFixed(1)} times`} onChange={(v) => set({ effectMult: v })} changed={cfg.effectMult !== defaults.effectMult} />
          </PanelGroup>

          <PanelGroup title="Teaching presets — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {preset("🫥 Pure noise (kill all effects)", { effectMult: 0 })}
              {preset("🔬 Underpowered (shrink effects ×0.4)", { effectMult: 0.4 })}
              {preset("👀 Peeking enabled", { peeking: true })}
              {preset("📏 Strict α = 0.01", { alpha: 0.01 })}
              {preset("📐 Lenient α = 0.10", { alpha: 0.10 })}
              {preset("💪 Boost effects ×1.5", { effectMult: 1.5 })}
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
