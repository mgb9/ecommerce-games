import { describe, it, expect, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App.jsx";

// A build won't catch an engine symbol the UI references but forgot to
// import — that's a runtime ReferenceError. Rendering the app exercises the
// import wiring end-to-end.
const at = (search) => { globalThis.location = { search, origin: "https://example.test", pathname: "/dd/" }; return renderToStaticMarkup(<App />); };
afterEach(() => { delete globalThis.location; });

describe("App renders", () => {
  it("a plain link opens the case inbox", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Data");
    expect(html).toContain("Chrichton · case inbox");
    expect(html).toContain("Open case 01");
    expect(html).toContain("Open case 09");
    expect(html).toContain("Open case 12");
  });
  it("?case=1 opens case 1's ticket, with a way back to the inbox", () => {
    const html = at("?case=1");
    expect(html).toContain("Find out what");
    expect(html).toContain("Case 01 of 12");
    expect(html).toContain("← All cases");
  });
  it("a refresh never reopens an instructor page: a saved guide, answer sheet or tally view resumes on the inbox", () => {
    const store = {};
    globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    try {
      for (const view of ["guide", "answers", "tally"]) {
        store["dd-session:app"] = JSON.stringify({ v: 3, view, caseIndex: null, cfg: { seed: "DD-2026", noise: 1.4 }, run: 0, attempts: {}, nav: 0, search: "" });
        const html = at("");
        expect(html, view).toContain("Chrichton · case inbox");
        expect(html, view).not.toContain("Tutor's guide");
      }
    } finally { delete globalThis.sessionStorage; }
  });
  it("?case=8 is the order-value case; ?case=9 and ?case=10 the field cases; ?case=11 the enterprise case", () => {
    expect(at("?case=8&seed=DD-2026")).toMatch(/Orders up, revenue down|More orders, less money/);
    expect(at("?case=9")).toContain("Opening the 2015 archive");
    expect(at("?case=10")).toContain("Opening the 2015 archive");
    expect(at("?case=11&seed=DD-2026")).toMatch(/Germany had its worst week|France fell off a cliff/);
  });
});
