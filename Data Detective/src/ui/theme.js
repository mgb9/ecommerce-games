/* Light WMG redesign (2026-07): page #F5F5F6, white cards, shared red
   primary #EE3124, dark #211F25 header band. Text tokens are AA on light
   surfaces; *Fill tokens are for bars/dots/lines only, never small text.
   *Tint tokens are the pale backgrounds behind pos/amber/neg status tags.
   SEG_COLORS are darkened for white charts — slot 0 stays gold-family
   (NOT orange/red) so the broken-segment red line keeps its salience.

   AA contrast (release pass, 2026-10): the brand red #EE3124 is only
   4.1:1 against white, so it is kept for graphics, borders and large
   headline text. Small red text uses playerText (5.1:1); filled red
   buttons/pills carrying white text use playerBtn (same hex, 5.1:1);
   red text on the pale `sel` tint uses selText (5.7:1). amber is dark
   enough for its tint and panel2 (≥5:1); hdrInstructor is the
   instructor gold brightened for the dark header band (7:1). */
export const T = {
  ink: "#F5F5F6", panel: "#FFFFFF", panel2: "#F4F3F5", border: "#E4E4E7",
  text: "#211F25", body2: "#454B50", muted: "#616265",
  pos: "#2F7D33", neg: "#B3271E", amber: "#85600F",
  posFill: "#3A9E3A", negFill: "#E2654E", amberFill: "#FBB034",
  posTint: "#EAF4E5", negTint: "#FBE9E7", amberTint: "#FBF3DF",
  player: "#EE3124", playerText: "#D6261B", playerBtn: "#D6261B", selText: "#B3271E",
  instructor: "#8A6D45", sel: "#FDEBE9", track: "#E7E6E9", onAccent: "#FFFFFF",
  // Header band: values sit on the dark band, so its accents are brightened.
  hdrBg: "#211F25", hdrText: "#F5F4F6", hdrMuted: "#9A9A9E", hdrBorder: "#3B3843", hdrPlayer: "#FF5A4A", hdrInstructor: "#C4A578",
  shadow: "0 12px 30px -26px rgba(0,0,0,0.5)",
  display: "'Fraunces', 'Lato', serif", body: "'Lato', 'Helvetica Neue', sans-serif", mono: "'JetBrains Mono', monospace",
};
export const PLAYER = T.player;
export const SEG_COLORS = ["#C8860D", "#2E8C81", "#E2654E", "#7D6F98", "#3A9E3A", "#A07B4F"];
export const segColor = (i) => SEG_COLORS[i % SEG_COLORS.length];

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@500;700&display=swap');
`;
export const GLOBAL_CSS = FONT_IMPORT + `
  * { box-sizing: border-box; }
  input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:${T.track}; outline:none; }
  input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #FFFFFF; box-shadow:0 0 0 3px var(--accent-soft); }
  input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #FFFFFF; }
  @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
  .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
  .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:12.5px; }
  h1[tabindex="-1"]:focus, h2[tabindex="-1"]:focus{ outline:none !important; box-shadow:none !important; }
  /* the case report (ReportView): print only the report, as an A4 document. The game's
     header band and toolbars are .dd-noprint; the WMG shell hides its own bar in print. */
  .dd-print-only{ display:none; }
  @page{ size:A4; margin:14mm 14mm 16mm; }
  @media print{
    html, body{ background:#FFFFFF !important; }
    body *{ visibility:hidden !important; }
    .dd-report, .dd-report *{ visibility:visible !important; }
    .dd-noprint, body > p{ display:none !important; }
    .dd-report{ max-width:none !important; margin:0 !important; padding:0 !important; border:none !important; box-shadow:none !important; font-size:12.5pt !important; }
    .dd-report .dd-print-only{ display:block; }
    .dd-report *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .dd-report h2, .dd-report h3{ break-after:avoid; }
    .dd-report [role=region]{ overflow:visible !important; }
  }
  .sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
`;

/* ---- style helpers (same idiom as the rest of the suite) ---------- */
export const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow });
export const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : T.onAccent, border: "none", borderRadius: 999, padding: "14px 24px", fontFamily: T.body, fontWeight: 900, fontSize: 17, cursor: "pointer", letterSpacing: 0.2 });
export const pillBtn = (on) => ({ padding: "8px 13px", borderRadius: 9, cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14, border: `1.5px solid ${on ? T.playerBtn : T.border}`, background: on ? T.playerBtn : "transparent", color: on ? T.onAccent : T.text });
export const pickRow = (on) => ({ cursor: "pointer", color: T.text, background: on ? T.sel : T.panel2, border: `1.5px solid ${on ? PLAYER : T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14.5, fontWeight: 600 });
export const selStyle = (filled) => ({ background: T.panel2, color: filled ? T.playerText : T.text, border: `1px solid ${filled ? PLAYER : T.border}`, borderRadius: 8, padding: "6px 9px", fontFamily: T.body, fontSize: 14, fontWeight: 600, cursor: "pointer", outline: "none" });
export const linkBtn = { background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 15.5 };
export const tipStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 13.5, boxShadow: T.shadow };
