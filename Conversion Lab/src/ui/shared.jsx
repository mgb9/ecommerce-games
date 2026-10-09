import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { GLOSSARY } from "../engine/engine.js";
import { T, PLAYER } from "./theme.js";

/* Building blocks shared by every screen: plain-language mode, glossary
   terms, the header band (with focus management), labelled choice
   groups, sliders, the instructor controls' atoms. Same patterns as Data
   Detective, so the suite behaves the same way for keyboard and
   screen-reader users. */

/* ---- plain-language mode ----------------------------------------
   "Simpler English" swaps stylised flavour strings for literal ones.
   Inside the WMG shell (the live site) the shell bar's switch is the ONE
   control: the game reads the shell's stored choice, follows its
   "wmg:simplerchange" event and hides its own button. Running on its own
   (the dev server) the game keeps its own button and remembers the
   choice under its own key. */
const PLAIN_KEY = "cl-plain", SHELL_KEY = "wmg-simpler";
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
export const usePlain = () => useContext(PlainCtx).plain;
function PlainToggle() {
  const { plain, toggle, shell } = useContext(PlainCtx);
  if (shell) return null; // the shell bar's switch drives the game
  return (
    <button onClick={toggle} aria-pressed={plain} title="Switch to simpler English" style={{ background: plain ? T.playerBtn : "transparent", border: `1px solid ${plain ? T.playerBtn : T.hdrBorder}`, color: plain ? T.onAccent : T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
      <span aria-hidden="true" style={{ fontSize: 15.5 }}>🗣️</span> Simpler English
    </button>
  );
}

/* ---- glossary terms ------------------------------------------------
   A disclosure: the dotted-underline word is a real <button> (Tab reaches
   it, Enter/Space toggle it) that reports aria-expanded and points at the
   definition while it's open; Escape closes it. Restyled to read as
   inline text (lineHeight "normal" keeps the dotted underline hugging
   the glyphs rather than the paragraph's taller line box). */
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
      {open && <span id={defId} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 240, maxWidth: "80vw", fontWeight: 400, background: T.hdrBg, border: `1px solid ${T.hdrBorder}`, borderRadius: 8, padding: "9px 11px", fontSize: 13.5, color: T.hdrText, lineHeight: 1.5, boxShadow: "0 10px 28px #0005", fontFamily: T.body, textAlign: "left" }}>{def}</span>}
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

/* ---- learning outcomes ---------------------------------------------
   The 2026/27 module specification's wording (as Data Detective's
   engine/outcomes.js). Conversion Lab serves LO2 (the Wireframe Studio's
   design work) and LO3 (judging changes by experiment). */
export const LOS = {
  LO2: "Develop a comprehensive understanding of design patterns and best practices and their practical implementation.",
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

/* ---- page frame: header band + width-constrained body --------------
   The band is NOT sticky: the WMG shell's bar above it already is, and
   two stacked sticky bars overlapped and ate a phone's screen.
   Each screen is a new "page": when `screenKey` changes (or on mount,
   when `autoFocus` — the student just arrived here), the view scrolls to
   the top and focus moves to the screen's heading, so keyboard and
   screen-reader users land on — and hear — the new screen instead of a
   button that no longer exists. */
export function Frame({ screenKey, autoFocus, subtitle, stats = [], actions, children }) {
  const bodyRef = useRef(null);
  // the key last focused for: on first load nothing moves (unless autoFocus);
  // comparing keys (not a "first run" flag) also survives StrictMode's double effects
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
      <div className="cl-noprint" style={{ background: T.hdrBg, color: T.hdrText }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>Conversion <span style={{ color: PLAYER }}>Lab</span></span>
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
// Values sit on the dark band, so accents use the brightened header palette.
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.hdrMuted, fontSize: 12, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.hdrText, fontWeight: 700, fontSize: 16.5 }}>{value}</div></div>;
}
// Staff only (see App): opens the instructor dialog.
export function InstructorButton({ onClick }) {
  return (
    <button onClick={onClick} title="Instructor controls" aria-haspopup="dialog" style={{ background: "transparent", border: `1px solid ${T.hdrBorder}`, color: T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ fontSize: 16.5 }}>⚙</span> Instructor</button>
  );
}

// The WMG shell's bar (in its open shadow root) is sticky. Publish its live
// height as --cl-shell-h so the game's own sticky panel sits just below it
// rather than underneath. No shell (dev server, tests) → 0.
export function useShellBarOffset() {
  useEffect(() => {
    const bar = document.querySelector("wmg-shell")?.shadowRoot?.querySelector(".bar");
    if (!bar || typeof ResizeObserver === "undefined") return;
    const publish = () => document.documentElement.style.setProperty("--cl-shell-h", `${bar.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
}

// Prefers reduced motion: the run's animation jumps straight to the end.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const sync = () => setReduced(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

// Charts are SVG pictures: give each a text alternative (WCAG 1.1.1). The
// label says what the chart shows now; the exact numbers are on screen too.
export function Chart({ label, children }) {
  return <div role="img" aria-label={label}>{children}</div>;
}

/* ---- headings ------------------------------------------------------
   Each screen has one <h1>; a card's title is a real <h2> under it (and a
   scorecard inside a card an <h3>), so screen-reader users can move
   between sections (WCAG 1.3.1). */
export function SectionTitle({ children, id, level = 2 }) { const H = `h${level}`; return <H id={id} style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, margin: "0 0 13px", letterSpacing: -0.2 }}>{children}</H>; }
export function Chip({ children }) { return <span style={{ fontFamily: T.mono, fontSize: 13, color: T.instructor, border: `1px solid ${T.instructor}55`, borderRadius: 6, padding: "2px 8px" }}>{children}</span>; }

/* ---- choices -------------------------------------------------------
   A labelled group of toggle buttons: the group's name is its question,
   each option says "selected" (aria-pressed) when chosen. `render` draws
   an option's content; layout comes from `style`. */
export function ChoiceGroup({ label, labelId, options, value, onChange, render, btnStyle, style }) {
  const autoId = useId();
  const id = labelId || autoId;
  return (
    <div role="group" aria-labelledby={id} style={style}>
      {!labelId && <span id={id} className="sr-only">{label}</span>}
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} style={btnStyle(value === o.id, o)}>{render ? render(o) : o.label}</button>
      ))}
    </div>
  );
}
// A visible question label for a ChoiceGroup (pass its id as labelId).
export function QuestionLabel({ id, children, style }) {
  return <div id={id} style={{ fontSize: 14.5, fontWeight: 600, margin: "10px 0 7px", ...style }}>{children}</div>;
}

/* ---- inputs --------------------------------------------------------- */
export function Slider({ label, value, min, max, step, onChange, fmt, valueText, hint, accent }) {
  const id = useId();
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <label htmlFor={id} style={{ fontSize: 15, fontWeight: 600 }}>{label}</label>
        <span aria-hidden="true" style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}>{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={valueText ? valueText(value) : fmt(value)} aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", margin: "8px 0 5px", "--accent": accent, "--accent-soft": accent + "30" }} />
      {hint && <div id={`${id}-hint`} style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
// A stepper: − value +. The value is announced through the buttons' labels
// and the group's name, so it isn't a bare number.
export function NumRow({ label, name, value, suffix, unit, step, onChange }) {
  const id = useId();
  const stepBtn = { width: 32, height: 32, borderRadius: 7, background: T.panel2, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", fontSize: 17.5, fontWeight: 700, lineHeight: 1 };
  return (
    <div role="group" aria-labelledby={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      <span id={id} style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" aria-label={`Decrease ${name} (now ${value} ${unit})`} onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))} style={stepBtn}>−</button>
        <span aria-live="polite" style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 15.5, minWidth: 60, textAlign: "center" }}>{value}{suffix}</span>
        <button type="button" aria-label={`Increase ${name} (now ${value} ${unit})`} onClick={() => onChange(+(value + step).toFixed(2))} style={stepBtn}>+</button>
      </span>
    </div>
  );
}
// An on/off switch: a real button with role="switch", so it is reachable by
// keyboard and announced as on or off.
export function ToggleRow({ label, on, onToggle, accent }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 13, fontSize: 15, fontWeight: 500, background: "none", border: "none", padding: "4px 0", color: T.text, fontFamily: T.body, textAlign: "left" }}>
      <span>{label}</span>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 22, background: on ? accent : T.track, border: `1px solid ${on ? accent : T.muted}`, position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 1, left: on ? 17 : 1, width: 18, height: 18, borderRadius: 18, background: "#FFFFFF", boxShadow: "0 1px 3px #00000040", transition: "left .15s" }} /></span>
    </button>
  );
}

/* ---- small display atoms ------------------------------------------- */
export function MiniStat({ label, value, accent }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ color: T.muted, fontSize: 13, letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ color: accent, fontFamily: T.mono, fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  );
}
export function MiniTag({ label }) {
  return <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 7px" }}>{label}</span>;
}
/* A scorecard: right, wrong or not scored — said in words, not only
   colour or a tick. */
export function ScoreCard({ ok, title, you, truth, note }) {
  const state = ok == null ? "none" : ok ? "ok" : "off";
  const c = { ok: T.pos, off: T.neg, none: T.muted }[state];
  const bg = { ok: T.posTint, off: T.negTint, none: T.panel2 }[state];
  return (
    <div style={{ background: bg, border: `1px solid ${c}55`, borderRadius: 11, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{title}</h3>
        <span style={{ color: c, fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap" }}><span aria-hidden="true">{state === "ok" ? "✓ " : state === "off" ? "✗ " : "• "}</span>{state === "ok" ? "right" : state === "off" ? "off" : "not scored"}</span>
      </div>
      {you !== undefined && <div style={{ fontSize: 14.5 }}>You: <b>{you || "—"}</b></div>}
      {truth && <div style={{ fontSize: 14, color: T.body2, marginTop: 3 }}>{truth}</div>}
      {note && <div style={{ fontSize: 14, color: T.body2, marginTop: 4, lineHeight: 1.45 }}>{note}</div>}
    </div>
  );
}
