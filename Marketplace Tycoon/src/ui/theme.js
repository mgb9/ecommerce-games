/* Light WMG redesign: page #F5F5F6, white cards, shared red primary
   #EE3124, dark #211F25 header band.

   AA contrast (the Data Detective / Conversion Lab standard): the brand
   red #EE3124 is only 4.1:1 against white, so it is kept for graphics,
   borders and large headline text. Small red text uses playerText; filled
   red buttons and pills carrying white text use playerBtn (5.1:1); red text
   on the pale `sel` tint uses selText. `platform` (the brown used for
   platform and fee figures) and `amber` are dark enough on white, panel2
   and their tints; *Fill tokens are for bars, dots and lines only.
   `faint` is for rules and decorative marks — never text. The player's
   STORE identity stays MT blue: #009DDC for lines (PLAYER_COLOR in the
   engine), youText where it colours text. */
export const T = {
  ink: "#F5F5F6", panel: "#FFFFFF", panel2: "#F4F3F5", border: "#E4E4E7",
  text: "#211F25", body2: "#454B50", muted: "#616265", faint: "#8A8A8E",
  pos: "#2F7D33", neg: "#B3271E", amber: "#85600F", platform: "#765B36",
  posFill: "#3A9E3A", negFill: "#E2654E", amberFill: "#FBB034", platformFill: "#8A6D45",
  posTint: "#EAF4E5", negTint: "#FBE9E7", amberTint: "#FBF3DF", platformTint: "#F5EFE3", youTint: "#E7F4FB",
  player: "#EE3124", playerText: "#D6261B", playerBtn: "#D6261B", selText: "#B3271E", youText: "#0272A0",
  sel: "#FDEBE9", track: "#E7E6E9", onAccent: "#FFFFFF",
  hdrBg: "#211F25", hdrText: "#F5F4F6", hdrMuted: "#9A9A9E", hdrBorder: "#3B3843",
  hdrPlayer: "#FF5A4A", hdrPos: "#7DCB6A", hdrAmber: "#FBB034", hdrPlatform: "#C4A578",
  shadow: "0 12px 30px -26px rgba(0,0,0,0.5)",
  display: "'Fraunces', 'Lato', serif", body: "'Lato', 'Helvetica Neue', sans-serif", mono: "'JetBrains Mono', monospace",
};
export const PLAYER = T.player;

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@500;700&display=swap');
`;
export const GLOBAL_CSS = FONT_IMPORT + `
  * { box-sizing: border-box; }
  input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:${T.track}; }
  input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%;
    cursor:pointer; background:var(--accent); border:2px solid #FFFFFF; box-shadow:0 0 0 3px var(--accent-soft); }
  input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #FFFFFF; }
  @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
  .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
  .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:12.5px; }
  h1[tabindex="-1"]:focus, h2[tabindex="-1"]:focus{ outline:none !important; box-shadow:none !important; }
  /* two-column screens stack on phones (and at 400% zoom) */
  @media (max-width:720px){ .cols2{ grid-template-columns:minmax(0,1fr) !important; } .mt-h1{ font-size:36px !important; } }
  @media (prefers-reduced-motion: reduce){ .rise{ animation:none; } *{ transition:none !important; animation:none !important; } }
  /* printable pages (the decision log, the cohort tally, the tutor's guide):
     print only the document, as A4. The game's header band and toolbars are
     .mt-noprint; the WMG shell hides its own bar in print. */
  .mt-print-only{ display:none; }
  @page{ size:A4; margin:14mm 14mm 16mm; }
  @media print{
    html, body{ background:#FFFFFF !important; }
    body *{ visibility:hidden !important; }
    .mt-report, .mt-report *{ visibility:visible !important; }
    .mt-noprint, body > footer{ display:none !important; }
    .mt-report{ max-width:none !important; margin:0 !important; padding:0 !important; border:none !important; box-shadow:none !important; font-size:12.5pt !important; }
    .mt-report .mt-print-only{ display:block; }
    .mt-report *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .mt-report h2, .mt-report h3{ break-after:avoid; }
    .mt-report [role=region]{ overflow:visible !important; }
  }
  .sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
`;

export const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadow });
export const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : T.onAccent, border: "none", borderRadius: 999, padding: "14px 24px", fontFamily: T.body, fontWeight: 900, fontSize: 17, cursor: "pointer", letterSpacing: 0.2 });
export const ghostBtn = { ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` };
// A primary action that stays disabled until its step is complete.
export const gatedBtn = (ready) => ({ ...btn(ready ? T.playerBtn : T.panel2), cursor: ready ? "pointer" : "not-allowed", color: ready ? T.onAccent : T.muted, border: `1px solid ${ready ? T.playerBtn : T.border}` });
export const pickCard = (on) => ({ textAlign: "left", cursor: "pointer", color: T.text, fontFamily: T.body, background: on ? T.sel : T.panel, border: `1.5px solid ${on ? T.playerBtn : T.border}` });
export const croBtn = (disabled, primary) => ({
  background: disabled ? T.panel2 : primary ? T.playerBtn : T.panel, color: disabled ? T.muted : primary ? T.onAccent : T.text,
  border: `1px solid ${primary && !disabled ? T.playerBtn : T.border}`, borderRadius: 8, padding: "7px 10px",
  fontFamily: T.body, fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
});
export const tipStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 13.5, boxShadow: T.shadow };
export const presetBtn = { textAlign: "left", background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 14, lineHeight: 1.3 };
export const backBtn = { background: "none", border: "none", color: T.body2, cursor: "pointer", fontSize: 15.5, fontFamily: T.body, padding: "6px 4px" };
