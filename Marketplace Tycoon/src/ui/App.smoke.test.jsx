import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App.jsx";

// The build can't catch an engine symbol the UI references but forgot to
// import — that's a runtime ReferenceError. Rendering the app exercises the
// import wiring end-to-end.
describe("App renders", () => {
  it("mounts the intro screen without a missing-symbol error", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Marketplace");
    expect(html).toContain("Ten weeks to win");
  });
});
