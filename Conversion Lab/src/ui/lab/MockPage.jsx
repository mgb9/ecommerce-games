import React from "react";
import { T } from "../theme.js";

/* ---- MOCK CHRICHTON PAGES ----------------------------------- */
export default function MockPage({ kind, variant, label }) {
  const isB = variant === "B";
  const frame = { background: "#FAFAFB", color: "#26242B", borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", fontFamily: T.body, position: "relative" };
  const priceRow = <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 14px" }}><span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20 }}>£24.99</span><span style={{ color: "#85838C", fontSize: 13.5, textDecoration: "line-through" }}>£32.00</span></div>;
  const title = <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, padding: "10px 14px 4px" }}>Heritage Terracotta Planter</div>;
  const banner = (text, bg) => <div style={{ background: bg, color: "#211F25", fontSize: 13, fontWeight: 700, textAlign: "center", padding: "6px 0", letterSpacing: 0.2 }}>{text}</div>;

  const heroBox = (label, bg) => <div style={{ height: 120, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{label}</div>;
  const cta = (color, textColor) => <div style={{ margin: "10px 14px 14px", background: color, color: textColor, textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: 15.5 }}>Add to cart</div>;

  let body;
  if (kind === "cta") {
    body = <>{title}{priceRow}{heroBox("🪴", "#ECEBEE")}{isB ? cta("#2E9E5B", "#fff") : cta("#C7C6CC", "#46444C")}</>;
  } else if (kind === "imgbg") {
    body = <>{title}{priceRow}{heroBox("🪴", isB ? "#F1EFF3" : "#FFFFFF")}<div style={{ color: "#85838C", fontSize: 12, padding: "0 14px 2px", textAlign: "center" }}>{isB ? "warm off-white" : "white"} background</div>{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "scarcity") {
    body = <>{title}{priceRow}{isB && <div style={{ margin: "8px 14px 0", display: "inline-block", background: "#F3D9CE", color: "#9c3a1c", fontSize: 13, fontWeight: 700, padding: "4px 9px", borderRadius: 6 }}>🔥 Only 3 left in stock</div>}{heroBox("🪴", "#ECEBEE")}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "social") {
    body = <>{title}{priceRow}{isB && <div style={{ padding: "6px 14px 0", color: "#3a7d4f", fontSize: 13.5, fontWeight: 600 }}>👥 327 gardeners bought this</div>}{heroBox("🪴", "#ECEBEE")}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "shipping") {
    body = <>{isB && banner("🚚 FREE shipping on all orders", "#F6C667")}{title}{priceRow}{heroBox("🪴", "#ECEBEE")}{!isB && <div style={{ color: "#85838C", fontSize: 13, padding: "0 14px" }}>+ £3.50 shipping</div>}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "checkout") {
    const steps = isB
      ? <div style={{ padding: "12px 14px", fontSize: 13.5, color: "#46444C" }}><b>One-page checkout</b><div style={{ marginTop: 6, display: "grid", gap: 5 }}>{["Email & delivery", "Payment", "Place order"].map((s) => <div key={s} style={{ background: "#ECEBEE", borderRadius: 6, padding: "6px 8px" }}>{s}</div>)}</div></div>
      : <div style={{ padding: "12px 14px", fontSize: 13.5, color: "#46444C" }}><b>Step 1 of 3</b><div style={{ marginTop: 6, display: "flex", gap: 5 }}>{[1, 2, 3].map((s) => <div key={s} style={{ flex: 1, background: s === 1 ? "#C7C6CC" : "#ECEBEE", borderRadius: 6, padding: "10px 0", textAlign: "center" }}>{s}</div>)}</div><div style={{ marginTop: 8, background: "#ECEBEE", borderRadius: 6, padding: "8px" }}>Your details</div></div>;
    body = <>{title}{priceRow}{steps}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "promo") {
    body = isB
      ? <>{banner("🔥 SPRING SALE — up to 30% OFF", "#F6C667")}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px 14px" }}>{["🪴", "🌷", "🌿"].map((e, i) => <div key={i} style={{ background: "#ECEBEE", borderRadius: 6, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{e}</div>)}</div>{cta("#2E9E5B", "#fff")}</>
      : <>{heroBox("🌿", "#E7EFE0")}<div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, padding: "10px 14px 0" }}>Heritage plants, grown with care since 1962</div>{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "subject") {
    const subj = isB ? "You won't believe what's inside… 😱" : "Your spring planting guide + 10% off";
    body = <div style={{ padding: "12px 14px" }}><div style={{ fontSize: 12.5, color: "#85838C", marginBottom: 6 }}>Inbox · Chrichton</div><div style={{ background: "#FFFFFF", border: "1px solid #E3E1E7", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>Chrichton Garden Co.</div><div style={{ fontSize: 14, color: "#26242B" }}>{subj}</div><div style={{ fontSize: 12.5, color: "#85838C", marginTop: 4 }}>Spring is here — time to plant…</div></div></div>;
  }
  return (
    <div style={frame} role="img" aria-label={`${label || (isB ? "Variant B" : "Control A")}: page mock-up`}>
      <div style={{ background: "#2E5A3E", color: "#EAF3E6", fontSize: 12.5, fontWeight: 700, padding: "5px 12px", display: "flex", justifyContent: "space-between" }}><span>chrichton</span><span style={{ opacity: 0.7 }}>{kind === "subject" ? "✉️" : "🛒"}</span></div>
      {body}
    </div>
  );
}
