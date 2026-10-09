import React, { useEffect, useState } from "react";
import { T, btn } from "./theme.js";

/* Printable pages (the experiment log, the tutor's guide) are saved as PDFs
   with the browser's own "Save as PDF" — in Chrome a tagged, screen-reader-
   friendly PDF — rather than a library-drawn one. On screen they read as a
   paper document; in print (GLOBAL_CSS) the game around them disappears.
   While one is open, the page title is the document's name, which browsers
   use as the saved PDF's file name. */
const NAME_KEY = "cl-student-name";

export function useStudentName() {
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; } });
  useEffect(() => { try { localStorage.setItem(NAME_KEY, name); } catch {} }, [name]);
  return [name, setName];
}
export function useDocumentTitle(title, name = "") {
  useEffect(() => {
    const previous = document.title;
    document.title = title + (name.trim() ? ` – ${name.trim()}` : "");
    return () => { document.title = previous; };
  }, [title, name]);
}
// The screen-only bar above a printable page: a way back, and Save as PDF.
export function PrintBar({ onBack, backLabel = "← back" }) {
  return (
    <div className="cl-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, maxWidth: 900, margin: "0 auto 14px" }}>
      <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: T.body2, cursor: "pointer", fontSize: 15.5, fontFamily: T.body }}>{backLabel}</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: T.body2, maxWidth: 330, lineHeight: 1.45 }}>Opens your browser's print window — choose <b style={{ color: T.text }}>Save as PDF</b> as the destination.</span>
        <button type="button" onClick={() => window.print()} style={{ ...btn(T.playerBtn), padding: "12px 22px", fontSize: 16 }}>Save as PDF</button>
      </div>
    </div>
  );
}
export const subHead = { fontSize: 13, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: T.body2, margin: "0 0 6px" };
export function Section({ title, children }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, margin: "0 0 10px", letterSpacing: -0.2, breakAfter: "avoid" }}>{title}</h2>
      {children}
    </section>
  );
}
export const articleStyle = { background: "#FFFFFF", color: T.text, maxWidth: 900, margin: "0 auto", padding: "clamp(22px, 5vw, 46px) clamp(18px, 5vw, 50px)", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 15, lineHeight: 1.55 };
