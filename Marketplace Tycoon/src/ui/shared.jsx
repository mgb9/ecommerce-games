import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { GLOSSARY } from "../engine/engine.js";
import { T, PLAYER } from "./theme.js";

/* Building blocks shared by every screen — the same patterns as Data
   Detective and Conversion Lab, so the suite behaves the same way for
   keyboard and screen-reader users. */

/* ---- plain-language mode ----------------------------------------
   Inside the WMG shell (the live site) the shell bar's switch is the ONE
   control: the game reads the shell's stored choice, follows its
   "wmg:simplerchange" event and hides its own button. Running on its own
   (the dev server) the game keeps its own button. */
const PLAIN_KEY = "mt-plain", SHELL_KEY = "wmg-simpler";
const PlainCtx = createContext({ plain: false, toggle: () => {}, shell: false });
export function PlainModeProvider({ children }) {
  const [shell] = useState(() => typeof document !== "undefined" && !!document.querySelector("wmg-shell"));
  const [plain, setPlain] = useState(() => { try { return localStorage.getItem(shell ? SHELL_KEY : PLAIN_KEY) === "1"; } catch { return false; } });
  useEffect(() => {
    if (!shell) return;
    const follow = (e) => setPlain(!!e.detail?.simpler);
    document.addEventListener("wmg:simplerchange", follow);
    return () => document.removeEventListener("wmg:simplerchange", follow);
  }, [shell]);
  const toggle = () => setPlain((v) => { const nv = !v; try { localStorage.setItem(PLAIN_KEY, nv ? "1" : "0"); } catch {} return nv; });
  return <PlainCtx.Provider value={{ plain, toggle, shell }}>{children}</PlainCtx.Provider>;
}
export function PT({ rich, plain }) { return useContext(PlainCtx).plain ? plain : rich; }
function PlainToggle() {
  const { plain, toggle, shell } = useContext(PlainCtx);
  if (shell) return null; // the shell bar's switch drives the game
  return (
    <button onClick={toggle} aria-pressed={plain} title="Switch to simpler English" style={{ background: plain ? T.playerBtn : "transparent", border: `1px solid ${plain ? T.playerBtn : T.hdrBorder}`, color: plain ? T.onAccent : T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>
      <span aria-hidden="true" style={{ fontSize: 16.5 }}>🗣️</span> Simpler English
    </button>
  );
}

/* ---- glossary terms: a disclosure. The dotted-underline word is a real
   <button> (Tab reaches it, Enter/Space toggle it) that reports
   aria-expanded and points at the definition while open; Escape closes. */
const termBtn = {
  background: "none", margin: 0, padding: 0, font: "inherit", lineHeight: "normal", color: "inherit", letterSpacing: "inherit", textAlign: "inherit",
  borderStyle: "none none dotted", borderWidth: "0 0 1px", borderColor: T.muted, borderRadius: 0, cursor: "help",
};
export function Term({ term, children }) {
  const [open, setOpen] = useState(false);
  const defId = useId();
  const def = GLOSSARY[term];
  if (!def) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button type="button" aria-expanded={open} aria-controls={open ? defId : undefined} style={termBtn}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>{children}</button>
      {open && <span id={defId} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 240, maxWidth: "80vw", fontWeight: 400, background: T.hdrBg, border: `1px solid ${T.hdrBorder}`, borderRadius: 8, padding: "9px 11px", fontSize: 13.5, color: T.hdrText, lineHeight: 1.5, boxShadow: "0 10px 28px #0005", fontFamily: T.body, textAlign: "left", letterSpacing: 0, textTransform: "none" }}>{def}</span>}
    </span>
  );
}
export function TermsHint() {
  return (
    <p style={{ margin: "16px 0 0", fontSize: 14, color: T.muted, display: "flex", alignItems: "center", gap: 7 }}>
      <span aria-hidden="true" style={{ fontSize: 15.5 }}>💡</span>
      <span>Tip: a word with a <span style={{ borderBottom: `1px dotted ${T.muted}` }}>dotted underline</span> is a button — select it for a plain-English definition.</span>
    </p>
  );
}

/* ---- learning outcomes: the 2026/27 module specification's wording (as
   Data Detective's engine/outcomes.js). Tycoon serves LO1 (choosing the
   platform for a brief) and LO3 (conversion, operations and retention
   decisions). It is a single-player simulation: no LO4 claim. */
export const LOS = {
  LO1: "Demonstrate a comprehensive understanding of the key eCommerce technologies to determine an appropriate solution for given use-cases.",
  LO3: "Critically evaluate advanced eCommerce functionalities to enhance user experience and increase conversions.",
};
export function Eyebrow({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden="true" style={{ width: 26, height: 3, background: PLAYER, borderRadius: 3 }} />
      <span style={{ color: T.playerText, fontSize: 14.5, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

/* ---- page frame: header band + width-constrained body. The band is NOT
   sticky (the WMG shell's bar above it already is). When `screenKey`
   changes, the view scrolls to the top and focus moves to the screen's
   heading, so keyboard and screen-reader users land on the new screen. */
export function Frame({ screenKey, autoFocus, subtitle, stats = [], actions, children }) {
  const bodyRef = useRef(null);
  const focusedFor = useRef(autoFocus ? null : screenKey);
  useEffect(() => {
    if (focusedFor.current === screenKey) return;
    focusedFor.current = screenKey;
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    const heading = bodyRef.current?.querySelector("h1, h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
  }, [screenKey]); // eslint-disable-line react-hooks/exhaustive-deps -- autoFocus only matters on mount
  return (
    <>
      <div className="mt-noprint" style={{ background: T.hdrBg, color: T.hdrText }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>Marketplace <span style={{ color: PLAYER }}>Tycoon</span></span>
            <span style={{ color: T.hdrMuted, fontSize: 14.5, fontFamily: T.mono }}>{subtitle}</span>
          </div>
          <div style={{ display: "flex", gap: "10px 16px", alignItems: "center", flexWrap: "wrap", fontFamily: T.mono, fontSize: 14.5 }}>
            {stats.map(([label, value, accent]) => <Stat key={label} label={label} value={value} accent={accent} />)}
            <PlainToggle />
            {actions}
          </div>
        </div>
      </div>
      <div ref={bodyRef} style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 64px" }}>{children}</div>
    </>
  );
}
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.hdrMuted, fontSize: 12, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.hdrText, fontWeight: 700, fontSize: 16.5 }}>{value}</div></div>;
}
// Staff only (see App): opens the instructor dialog.
export function InstructorButton({ onClick }) {
  return (
    <button onClick={onClick} title="Instructor controls" aria-haspopup="dialog" style={{ background: "transparent", border: `1px solid ${T.hdrBorder}`, color: T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ fontSize: 16.5 }}>⚙</span> Instructor</button>
  );
}

// Charts are SVG pictures: give each a text alternative (WCAG 1.1.1).
export function Chart({ label, children }) {
  return <div role="img" aria-label={label}>{children}</div>;
}

/* ---- headings: one <h1> per screen; a card's title is a real <h2>. */
export function SectionTitle({ children, id, level = 2 }) { const H = `h${level}`; return <H id={id} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18.5, margin: "0 0 14px", letterSpacing: -0.2 }}>{children}</H>; }
export function SubHead({ children, id }) { return <h2 id={id} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "22px 0 10px" }}>{children}</h2>; }

/* ---- choices: a labelled group of toggle buttons (aria-pressed). */
export function ChoiceGroup({ label, labelId, options, value, onChange, render, btnStyle, style }) {
  const autoId = useId();
  const id = labelId || autoId;
  return (
    <div role="group" aria-labelledby={id} style={style}>
      {!labelId && <span id={id} className="sr-only">{label}</span>}
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} style={btnStyle(value === o.id, o)}>{render ? render(o, value === o.id) : o.label}</button>
      ))}
    </div>
  );
}

/* ---- inputs --------------------------------------------------------- */
export function Slider({ label, value, min, max, step, onChange, fmt, valueText, hint, accent }) {
  const id = useId();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <label htmlFor={id} style={{ fontSize: 15.5, fontWeight: 600 }}>{label}</label>
        <span aria-hidden="true" style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}>{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={valueText ? valueText(value) : fmt(value)} aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", margin: "8px 0 5px", "--accent": accent, "--accent-soft": accent + "30" }} />
      {hint && <div id={`${id}-hint`} style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
// An on/off switch: a real button with role="switch".
export function ToggleRow({ label, on, onToggle, accent }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 13, fontSize: 15, fontWeight: 500, background: "none", border: "none", padding: "4px 0", color: T.text, fontFamily: T.body, textAlign: "left" }}>
      <span>{label}</span>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 22, background: on ? accent : T.track, border: `1px solid ${on ? accent : T.muted}`, position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 1, left: on ? 17 : 1, width: 18, height: 18, borderRadius: 18, background: "#FFFFFF", boxShadow: "0 1px 3px #00000040", transition: "left .15s" }} /></span>
    </button>
  );
}

export function MiniStat({ label, value, sub, accent }) {
  return <div style={{ background: T.panel2, borderRadius: 10, padding: "11px 12px" }}><div style={{ color: T.muted, fontSize: 13.5 }}>{label}</div><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 19.5, color: accent, margin: "2px 0" }}>{value}</div><div style={{ color: T.muted, fontSize: 13, lineHeight: 1.3 }}>{sub}</div></div>;
}
export function Banner({ tone = "platform", children }) {
  const c = { platform: [T.platformTint, T.platformFill], bad: [T.negTint, T.negFill], ok: [T.posTint, T.posFill] }[tone];
  return <div style={{ background: c[0], border: `1px solid ${c[1]}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 14.5, lineHeight: 1.45 }}>{children}</div>;
}
