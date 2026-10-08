import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { GLOSSARY } from "../engine/engine.js";
import { T, PLAYER, card, btn, pickRow, selStyle } from "./theme.js";
import { pct } from "./format.js";

/* Building blocks shared by the generated cases (1–4) and the field-data
   case (5): plain-language mode, glossary terms, the header band, the
   GA-style dashboard frame, diagnosis pickers and the reveal atoms. */

export const addOnce = (x) => (list) => (list.includes(x) ? list : [...list, x]);

// Narrow viewports (phones, or a desktop zoomed to 400%): the dashboard
// nav and two-column screens collapse to one column. Assumes wide where
// matchMedia is missing (server render, tests).
const NARROW = "(max-width: 860px)";
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW);
    if (!mq) return;
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

// Charts are SVG pictures: give each a text alternative (WCAG 1.1.1). The
// label summarises what the chart shows; the exact numbers are always on
// screen as text or in a table nearby. Decorative sparklines use aria-hidden.
export function Chart({ label, children }) {
  return <div role="img" aria-label={label}>{children}</div>;
}

/* ---- plain-language mode ----------------------------------------
   A "Simpler English" toggle that swaps stylised flavour strings for
   literal ones — helps the ESL portion of the cohort without flattening
   the tone for everyone. <PT rich plain/> picks per string. The
   localStorage key and the button's "Simpler English" label are also
   relied on by the WMG-shell bridge script in index.html. */
const PLAIN_KEY = "dd-plain";
const PlainCtx = createContext({ plain: false, toggle: () => {} });
export function PlainModeProvider({ children }) {
  const [plain, setPlain] = useState(() => { try { return localStorage.getItem(PLAIN_KEY) === "1"; } catch { return false; } });
  const toggle = () => setPlain((v) => { const nv = !v; try { localStorage.setItem(PLAIN_KEY, nv ? "1" : "0"); } catch {} return nv; });
  return <PlainCtx.Provider value={{ plain, toggle }}>{children}</PlainCtx.Provider>;
}
export function PT({ rich, plain }) { return useContext(PlainCtx).plain ? plain : rich; }
function PlainToggle() {
  const { plain, toggle } = useContext(PlainCtx);
  return (
    <button onClick={toggle} aria-pressed={plain} title="Switch to simpler English" style={{ background: plain ? T.playerBtn : "transparent", border: `1px solid ${plain ? T.playerBtn : T.hdrBorder}`, color: plain ? T.onAccent : T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
      <span aria-hidden="true" style={{ fontSize: 15.5 }}>🗣️</span> Simpler English
    </button>
  );
}

/* ---- glossary terms ------------------------------------------------
   A disclosure: the dotted-underline word is a real <button> (so Tab
   reaches it and Enter/Space toggle it) that reports aria-expanded and
   points at the definition while it's open. Escape closes it. The button
   is restyled to read as inline text, exactly like the old span: a button
   lays out as an inline-block, so lineHeight "normal" keeps its box (and
   the dotted underline) hugging the glyphs instead of the paragraph's
   taller line-height — which would also push lines apart. */
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
      {open && <span id={defId} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 240, fontWeight: 400, background: T.hdrBg, border: `1px solid ${T.hdrBorder}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, color: T.hdrText, lineHeight: 1.5, boxShadow: "0 10px 28px #0005", fontFamily: T.body }}>{def}</span>}
    </span>
  );
}
// Signals that dotted-underline words are clickable — the tooltips are the
// best ESL feature but nothing otherwise says they can be tapped.
export function TermsHint() {
  return (
    <div style={{ marginTop: 14, fontSize: 14, color: T.muted, display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 15.5 }}>💡</span>
      <span>Tip: any word with a <span style={{ borderBottom: `1px dotted ${T.muted}` }}>dotted underline</span> is clickable — tap it for a plain-English definition.</span>
    </div>
  );
}

/* ---- learning outcomes -------------------------------------------- */
export const LOS = {
  LO1: { title: "Technology → solution", full: "LO1 — Select appropriate technologies and turn them into a solution for specific e-commerce use-cases." },
  LO2: { title: "Design patterns & implementation", full: "LO2 — Apply design patterns and best practice, and implement the solution." },
  LO3: { title: "Enhance UX & conversion", full: "LO3 — Evaluate functionalities to enhance user experience and conversions." },
  LO4: { title: "Collaborative analysis & build", full: "LO4 — Collaboratively analyse, and build a live e-commerce site." },
};
export function LOBadges({ los }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 18 }}>
      <span style={{ fontSize: 12.5, color: T.muted, fontFamily: T.mono, letterSpacing: 1 }}>🎓 WM956-15</span>
      {los.map((k) => (
        <span key={k} title={LOS[k].full}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 999, padding: "3px 10px 3px 8px", fontSize: 13.5, cursor: "help", whiteSpace: "nowrap" }}>
          <b style={{ color: T.amber, fontFamily: T.mono, fontWeight: 700 }}>{k}</b>
          <span style={{ color: T.muted }}>{LOS[k].title}</span>
        </span>
      ))}
    </div>
  );
}
export function Eyebrow({ children, title }) {
  return (
    <div title={title} style={{ display: "flex", alignItems: "center", gap: 10, cursor: title ? "help" : "default" }}>
      <span aria-hidden="true" style={{ width: 26, height: 3, background: PLAYER, borderRadius: 3 }} />
      <span style={{ color: T.playerText, fontSize: 14.5, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

/* ---- page frame: header band + width-constrained body --------------
   The investigate phase runs wider to fit the nav + report side by side.
   Counters (reports opened, pivots/flags) show while the case is being
   worked; `actions` sit after the plain-language toggle. The band is NOT
   sticky: the WMG shell's bar above it already is, and two stacked sticky
   bars overlapped (WCAG 2.5.8) and ate a phone's screen.

   Each phase is a new "page", so on a phase change (or on mount, when
   `autoFocus` — i.e. the student just switched or restarted a case) the
   view scrolls to the top and focus moves to the screen's heading:
   keyboard and screen-reader users land on — and hear — the new screen
   instead of being stranded on a button that no longer exists. */
export function CaseFrame({ subtitle, phase, caseN, counters, actions, autoFocus, children }) {
  const maxWidth = phase === "investigate" ? 1380 : 1180;
  const working = phase === "investigate" || phase === "diagnose";
  const bodyRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (first && !autoFocus) return;
    window.scrollTo(0, 0);
    const heading = bodyRef.current?.querySelector("h1, h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps -- autoFocus only matters on mount
  return (
    <>
      <div style={{ background: T.hdrBg, color: T.hdrText }}>
        <div style={{ maxWidth, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>Data <span style={{ color: PLAYER }}>Detective</span></span>
            <span style={{ color: T.hdrMuted, fontSize: 14.5, fontFamily: T.mono }}>{subtitle}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontFamily: T.mono, fontSize: 14.5 }}>
            {phase !== "intro" && <Stat label="CASE" value={caseN} accent={T.hdrPlayer} />}
            {working && counters.map(([label, value]) => <Stat key={label} label={label} value={value} accent={T.hdrInstructor} />)}
            <PlainToggle />
            {actions}
          </div>
        </div>
      </div>
      <div ref={bodyRef} style={{ maxWidth, margin: "0 auto", padding: "0 20px 64px" }}>{children}</div>
    </>
  );
}
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.hdrMuted, fontSize: 11.5, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.hdrText, fontWeight: 700, fontSize: 16.5 }}>{value}</div></div>;
}

export function TicketCard({ ticket, style }) {
  return (
    <div style={{ background: T.panel, borderLeft: `6px solid ${PLAYER}`, borderRadius: 16, padding: "18px 20px", boxShadow: T.shadow, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: T.muted, fontSize: 13.5, fontFamily: T.mono, marginBottom: 8 }}>
        <span>{ticket.channel}</span><span>{ticket.from}</span>
      </div>
      <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18.5, marginBottom: 6 }}>{ticket.subject}</div>
      <div style={{ color: T.text, fontSize: 15.5, lineHeight: 1.55 }}>{ticket.body}</div>
    </div>
  );
}

// A card's title is a real <h3> (under the screen's h1/h2) so screen-reader
// users can jump between sections — WCAG 1.3.1.
export function SectionTitle({ children }) { return <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17.5, margin: "0 0 12px", letterSpacing: -0.2 }}>{children}</h3>; }
export function ScreenTitle({ title, size = 24, children }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: size, letterSpacing: -0.5, margin: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

/* ---- GA-style dashboard: title row, optional toolbar, nav + report -- */
export function Dashboard({ title, meta, toolbar, nav, children }) {
  const narrow = useNarrow();
  return (
    <div style={{ marginTop: 18 }}>
      <ScreenTitle title={title}><div style={{ fontSize: 13.5, color: T.muted, fontFamily: T.mono }}>{meta}</div></ScreenTitle>
      {toolbar && <div style={{ marginTop: 12 }}>{toolbar}</div>}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "210px minmax(0,1fr)", gap: 20, marginTop: 14, alignItems: "start" }}>
        {nav}
        <div>{children}</div>
      </div>
    </div>
  );
}
// Left nav: top-level entries ([key, label]), grouped reports ({group,
// items: [{key, label}]}), a ✓ on every report already opened, and the
// case's call-to-action at the foot. `children` render under the CTA.
// Wide: a sticky column that clears the WMG shell's sticky bar (App
// publishes its height as --dd-shell-h). Narrow: a native picker with the
// groups as optgroups — compact, and the phone's own menu UI.
export function SideNav({ top, groups, active, viewed, onOpen, cta, onCta, children }) {
  const narrow = useNarrow();
  const ctaBtn = <button onClick={onCta} style={{ ...btn(T.playerBtn), width: "100%", marginTop: narrow ? 0 : 18, padding: "11px 14px", fontSize: 15 }}>{cta}</button>;
  if (narrow) {
    const opt = (key, label) => <option key={key} value={key}>{label}{viewed.includes(key) ? " ✓" : ""}</option>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, fontWeight: 600 }}>
          Report
          <select value={active} onChange={(e) => onOpen(e.target.value)} style={{ ...selStyle(false), flex: 1, minWidth: 0, padding: "10px 11px", fontSize: 15 }}>
            {top.map(([key, label]) => opt(key, label))}
            {groups.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((it) => opt(it.key, it.label))}</optgroup>)}
          </select>
        </label>
        {ctaBtn}
        {children}
      </div>
    );
  }
  const item = (key, label, indent) => {
    const on = active === key;
    return (
      <button key={key} onClick={() => onOpen(key)} aria-current={on ? "page" : undefined} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: indent ? "7px 10px 7px 22px" : "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.body, fontSize: 14.5, fontWeight: on ? 700 : 500, background: on ? T.sel : "transparent", color: on ? T.selText : T.text }}>
        <span style={{ flex: 1 }}>{label}</span>
        {viewed.includes(key) && <span style={{ color: on ? T.text : T.pos, fontSize: 12.5 }}><span aria-hidden="true">✓</span><span className="sr-only">(opened)</span></span>}
      </button>
    );
  };
  return (
    <nav aria-label="Reports" style={{ position: "sticky", top: "calc(var(--dd-shell-h, 0px) + 12px)", alignSelf: "start", display: "flex", flexDirection: "column", gap: 2 }}>
      {top.map(([key, label]) => item(key, label))}
      {groups.map((g) => (
        <div key={g.group} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: T.muted, padding: "2px 10px 4px" }}>{g.group}</div>
          {g.items.map((it) => item(it.key, it.label, true))}
        </div>
      ))}
      {ctaBtn}
      {children}
    </nav>
  );
}

export function KpiTile({ label, value, children }) {
  return (
    <div style={{ ...card(), padding: "14px 16px" }}>
      <div style={{ color: T.muted, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 21, margin: "3px 0 3px" }}>{value}</div>
      {children}
    </div>
  );
}

/* ---- sortable report tables ---------------------------------------
   Unsorted until the student picks a column (the given row order is the
   report's default); first click sorts descending, the next flips it. */
export function useSortable(rows, valueOf) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = valueOf(a, sortKey), bv = valueOf(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, valueOf, sortKey, sortDir]);
  function onSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  return { rows: sorted, sortKey, sortDir, onSort };
}
// The header's whole cell is a <button>, so it's keyboard-operable; the
// sort state is exposed via aria-sort, so the ▲/▼ glyph is decorative.
// Active colour is playerText: this is small text, where #EE3124 is <4.5:1.
export function SortTh({ sort, colKey, label, align = "right" }) {
  const on = sort.sortKey === colKey;
  return (
    <th aria-sort={on ? (sort.sortDir === "asc" ? "ascending" : "descending") : undefined}
      style={{ textAlign: align, padding: 0, borderBottom: `1px solid ${T.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>
      <button type="button" onClick={() => sort.onSort(colKey)}
        style={{ display: "block", width: "100%", margin: 0, padding: "4px 8px", background: "none", border: "none", font: "inherit", textAlign: align, color: on ? T.playerText : T.muted, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
        {label}{on && <span aria-hidden="true">{sort.sortDir === "asc" ? " ▲" : " ▼"}</span>}
      </button>
    </th>
  );
}
export function ShareBar({ share }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 30, height: 5, borderRadius: 5, background: T.track, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.round(share * 100))}%`, height: "100%", background: T.instructor }} />
      </div>
      <span>{pct(share, 0)}</span>
    </div>
  );
}

/* ---- diagnosis form ------------------------------------------------
   `long` is for options that are whole sentences rather than names. */
// A labelled group of toggle buttons; the chosen one is aria-pressed, so
// the selection isn't conveyed by colour alone (WCAG 1.4.1 / 4.1.2).
export function PickGroup({ title, options, value, onChange, empty, long }) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} style={{ marginBottom: 18 }}>
      <div id={titleId} style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {options.length === 0 ? <div style={{ color: T.muted, fontSize: 14, padding: "8px 0" }}>{empty}</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {options.map((o) => (
            <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={value === o.id} style={{ ...pickRow(value === o.id), textAlign: "left", ...(long && { lineHeight: 1.45, fontWeight: 500 }) }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
export function SubmitBar({ ready, onSubmit, label, notReadyLabel }) {
  return (
    <div style={{ textAlign: "center", marginTop: 18 }}>
      <button onClick={onSubmit} disabled={!ready} style={{ ...btn(T.playerBtn), opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? label : notReadyLabel}</button>
    </div>
  );
}

/* ---- reveal --------------------------------------------------------- */
export function RevealHeadline({ kicker, title, children }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 13.5, letterSpacing: 2 }}>{kicker}</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>{title}</h1>
      {children}
    </div>
  );
}
// One "you said X · actually Y" line. `long` answers get a smaller, airier line.
export function ResultRow({ ok, label, you, truth, long }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: T.muted, fontSize: 14 }}>{label}</span>
        <span style={{ color: ok ? T.pos : T.neg, fontWeight: 700, fontSize: 14.5 }}>{ok ? "✓" : "✗"}</span>
      </div>
      <div style={{ fontSize: long ? 14.5 : 15, marginTop: 2, ...(long && { lineHeight: 1.5 }) }}>You said <b>{you}</b>{!ok && <span style={{ color: T.muted }}> · actually <b style={{ color: T.text }}>{truth}</b></span>}</div>
    </div>
  );
}
const TAG_TONES = { pos: [T.posTint, T.pos], neg: [T.negTint, T.neg], amber: [T.amberTint, T.amber] };
export function Tag({ tone, style, children }) {
  const [background, color] = TAG_TONES[tone];
  return <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background, color, whiteSpace: "nowrap", ...style }}>{children}</span>;
}
