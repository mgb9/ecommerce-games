import React from "react";
import { T } from "../theme.js";

/* Compact A/B mocks for the quiz cards. */
export default function QuizMock({ kind, side }) {
  const isB = side === "b";
  const box = (children, h = 96) => <div style={{ height: h, background: "#FAFAFB", borderRadius: 10, color: "#26242B", fontFamily: T.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden", padding: 8 }}>{children}</div>;
  const btnBox = (bg, txt, color = "#fff") => <div style={{ background: bg, color, fontWeight: 700, fontSize: 14.5, padding: "9px 16px", borderRadius: 8 }}>{txt}</div>;
  const bar = (w = "100%") => <div style={{ width: w, height: 9, background: "#E3E8DD", borderRadius: 4 }} />;
  switch (kind) {
    case "guest": return box(isB ? btnBox("#2E9E5B", "Continue as guest") : btnBox("#C7C6CC", "Create an account", "#46444C"));
    case "fields": return box(<div style={{ display: "flex", flexDirection: "column", gap: 5, width: "70%" }}>{Array.from({ length: isB ? 4 : 8 }).map((_, i) => <React.Fragment key={i}>{bar()}</React.Fragment>)}</div>, 110);
    case "guarantee": return box(isB ? <div style={{ background: "#E3F0E4", color: "#2E5A3E", fontWeight: 700, padding: "8px 12px", borderRadius: 8, fontSize: 14 }}>✅ 30-day money-back</div> : <span style={{ color: "#85838C", fontSize: 13.5 }}>no guarantee</span>);
    case "columns": return box(isB
      ? <div style={{ display: "flex", gap: 8, width: "80%" }}>{[0, 1].map((c) => <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>{bar()}{bar()}{bar()}</div>)}</div>
      : <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "55%" }}>{bar()}{bar()}{bar()}</div>, 96);
    case "sticky": return box(<div style={{ position: "relative", width: 64, height: 84, background: "#E3E8DD", borderRadius: 8, overflow: "hidden" }}><div style={{ fontSize: 22, textAlign: "center", marginTop: 16 }}>🪴</div>{isB && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#2E9E5B", color: "#fff", fontSize: 8, fontWeight: 700, textAlign: "center", padding: "4px 0" }}>Add to cart</div>}</div>);
    case "video": return box(<div style={{ fontSize: 34 }}>{isB ? "▶️" : "🖼️"}</div>);
    case "popup": return box(isB ? <div style={{ position: "relative", width: "85%", height: 70, background: "#E3E8DD", borderRadius: 8 }}><div style={{ position: "absolute", inset: "14px 18px", background: "#fff", border: "1px solid #C7C6CC", borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4 }}>✉️ 10% off — before you go!</div></div> : <div style={{ width: "85%", height: 70, background: "#E3E8DD", borderRadius: 8 }} />);
    case "decoy": return box(<div style={{ display: "flex", gap: 5 }}>{Array.from({ length: isB ? 4 : 3 }).map((_, i) => <div key={i} style={{ width: 26, height: 50, background: "#E3E8DD", borderRadius: 5, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4, fontFamily: T.mono, fontSize: 9, fontWeight: 700 }}>£{[9, 19, 29, 39][i]}</div>)}</div>);
    case "personalise": return box(<div style={{ textAlign: "center" }}><div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>{isB ? "✨ Recommended for you" : "Bestsellers"}</div><div style={{ display: "flex", gap: 5, justifyContent: "center" }}>{["🪴", "🌷", "🌿"].map((e, i) => <div key={i} style={{ width: 30, height: 34, background: "#E3E8DD", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16.5 }}>{e}</div>)}</div></div>);
    case "microcopy": return box(<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}><div style={{ width: 54, height: 40, background: "#E3E8DD", borderRadius: 6 }} />{btnBox("#2E9E5B", isB ? "Add to basket" : "Add to cart")}</div>);
    case "coupon": return box(<div style={{ width: "74%", display: "flex", flexDirection: "column", gap: 5 }}>{bar()}{bar()}{isB && <div style={{ display: "flex", alignItems: "center", gap: 5, border: "1px dashed #B2AFB8", borderRadius: 5, padding: "4px 6px", fontSize: 9.5, color: "#6A6872" }}>🎟️ Got a promo code?</div>}{bar()}<div style={{ background: "#2E9E5B", height: 12, borderRadius: 4, marginTop: 2 }} /></div>);
    default: return box(<span style={{ color: "#85838C", fontSize: 13.5 }}>{isB ? "Variant B" : "Variant A"}</span>);
  }
}
