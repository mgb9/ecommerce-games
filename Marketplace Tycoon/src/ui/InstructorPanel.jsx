import React, { useEffect, useId, useRef } from "react";
import { PLATFORMS, PMAP, gbp } from "../engine/engine.js";
import { T, presetBtn } from "./theme.js";
import { ToggleRow } from "./shared.jsx";

/* Staff only (see App: it opens only after ?instructor). A modal dialog:
   focus moves in on open, Tab cycles inside, Escape or the backdrop closes
   it, and focus returns to whatever opened it. */
export default function InstructorPanel({ cfg, setCfg, defaults, onClose, onOpenPage }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setWeight = (k, v) => setCfg((c) => ({ ...c, weights: { ...c.weights, [k]: v } }));
  const setPlatCost = (id, v) => setCfg((c) => ({ ...c, platforms: { ...c.platforms, [id]: { ...c.platforms[id], fixedCost: v } } }));
  const A = T.platformFill;
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
  const platShock = (label, build) => <button key={label} type="button" onClick={() => setCfg((c) => build(c))} style={presetBtn}>{label}</button>;
  const hikeFixed = (c, ids, mult) => { const platforms = { ...c.platforms }; ids.forEach((id) => { platforms[id] = { ...platforms[id], fixedCost: Math.round(PMAP[id].fixedCost * mult) }; }); return { ...c, platforms }; };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="mt-instructor-title"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 350, maxWidth: "92vw", background: T.panel, borderLeft: `1px solid ${T.border}`, zIndex: 70, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #00000030" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 id="mt-instructor-title" style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 19, color: T.platform }}><span aria-hidden="true">⚙ </span>Instructor</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px", minWidth: 32, minHeight: 32 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.5, marginTop: 0 }}>Changes apply to the <b style={{ color: T.text }}>next week resolved</b>. The brief sets base economics; these tune the market around it. Students see this panel only if their link has <code>?instructor</code>.</p>

          <PanelGroup title="Classroom" note="A shared seed gives the whole cohort the same market — then debrief why results differed.">
            <div style={{ marginBottom: 12 }}>
              <label htmlFor={seedId} style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 6 }}>Market seed</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input id={seedId} value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, minWidth: 0, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 14.5 }} />
                <button type="button" aria-label="Random seed" title="Random seed" onClick={() => set({ seed: "M" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}><span aria-hidden="true">🎲</span></button>
              </div>
              <div style={{ fontSize: 13.5, color: T.muted, marginTop: 5 }}>Set before launch; also controls which CRO bets pay off.</div>
            </div>
            <ToggleRow label="Seasonal events on" on={cfg.eventsOn} accent={A} onToggle={() => set({ eventsOn: !cfg.eventsOn })} />
            <InstructorSlider label="Starting cash (new game)" accent={A} value={cfg.startingCash} min={0} max={12000} step={250} fmt={(v) => gbp(v)} onChange={(v) => set({ startingCash: v })} changed={cfg.startingCash !== defaults.startingCash} />
          </PanelGroup>

          <PanelGroup title="Marketplace economics">
            <InstructorSlider label="Commission (the take)" accent={A} value={cfg.commissionRate} min={0} max={0.4} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ commissionRate: v })} changed={cfg.commissionRate !== defaults.commissionRate} />
            <InstructorSlider label="Demand multiplier" accent={A} value={cfg.demandMult} min={0.3} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} valueText={(v) => `${v.toFixed(2)} times`} onChange={(v) => set({ demandMult: v })} changed={cfg.demandMult !== defaults.demandMult} />
            <InstructorSlider label="Holding / spoilage ×" accent={A} value={cfg.holdingMult} min={0.3} max={2.5} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} valueText={(v) => `${v.toFixed(1)} times`} onChange={(v) => set({ holdingMult: v })} changed={cfg.holdingMult !== defaults.holdingMult} />
          </PanelGroup>

          <PanelGroup title="Platform rent — fixed cost / week" note="Raise mid-game to demonstrate platform pricing power; hits every store on that platform.">
            {PLATFORMS.map((p) => <InstructorSlider key={p.id} label={p.short} accent={A} value={cfg.platforms[p.id].fixedCost} min={0} max={1500} step={10} fmt={(v) => `£${v}/wk`} valueText={(v) => `£${v} a week`} onChange={(v) => setPlatCost(p.id, v)} changed={cfg.platforms[p.id].fixedCost !== defaults.platforms[p.id].fixedCost} />)}
          </PanelGroup>

          <PanelGroup title="Platform rent — transaction fee">
            <InstructorSlider label="Transaction fee add-on (all)" accent={A} value={cfg.txnAddon} min={0} max={0.06} step={0.005} fmt={(v) => `+${(v * 100).toFixed(1)}%`} onChange={(v) => set({ txnAddon: v })} changed={cfg.txnAddon !== defaults.txnAddon} />
          </PanelGroup>

          <PanelGroup title="Search-ranking weights" note="Relative pull of each factor. They needn't sum to 1.">
            <InstructorSlider label="Price sensitivity" accent={A} value={cfg.weights.price} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("price", v)} changed={cfg.weights.price !== defaults.weights.price} />
            <InstructorSlider label="Review weight" accent={A} value={cfg.weights.review} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("review", v)} changed={cfg.weights.review !== defaults.weights.review} />
            <InstructorSlider label="Ad visibility weight" accent={A} value={cfg.weights.ad} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("ad", v)} changed={cfg.weights.ad !== defaults.weights.ad} />
          </PanelGroup>

          <PanelGroup title="Teaching shocks — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {platShock("🏢 SaaS price hike — Wix & Shopify +50%", (c) => hikeFixed(c, ["wix", "shopify"], 1.5))}
              {platShock("💳 Transaction fees jump — +3% for everyone", (c) => ({ ...c, txnAddon: 0.03 }))}
              {platShock("🖥 Headless infra spike — +60%", (c) => hikeFixed(c, ["headless"], 1.6))}
              {platShock("🔌 Reset platform pricing only", (c) => ({ ...c, txnAddon: 0, platforms: defaults.platforms }))}
              {preset("📈 Raise the take → 30%", { commissionRate: 0.30 })}
              {preset("💸 Ad-driven market", { weights: { price: 0.25, review: 0.20, ad: 0.55 } })}
              {preset("⭐ Quality-driven market", { weights: { price: 0.25, review: 0.55, ad: 0.20 } })}
              {preset("🩸 Price war", { weights: { price: 0.70, review: 0.15, ad: 0.15 } })}
              {preset("📉 Demand crunch (×0.5)", { demandMult: 0.5 })}
            </div>
          </PanelGroup>

          {onOpenPage && (
            <PanelGroup title="For the seminar">
              <div style={{ display: "grid", gap: 8 }}>
                <button type="button" onClick={() => onOpenPage("tally")} style={presetBtn}>Cohort tally — paste students' result codes</button>
                <button type="button" onClick={() => onOpenPage("guide")} style={presetBtn}>Tutor's guide — running and debriefing the simulation</button>
              </div>
            </PanelGroup>
          )}

          <button type="button" onClick={() => setCfg((c) => ({ ...defaults, scenarioId: c.scenarioId }))} style={{ width: "100%", marginTop: 12, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5 }}>↺ Reset all to defaults</button>
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
