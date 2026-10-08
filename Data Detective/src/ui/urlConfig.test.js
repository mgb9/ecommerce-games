import { describe, it, expect } from "vitest";
import { readUrlConfig, caseLink, DEFAULT_CFG } from "./urlConfig.js";

describe("cohort links", () => {
  it("no parameters → case 1 with the default seed and noise", () => {
    expect(readUrlConfig("")).toEqual({ caseIndex: 0, cfg: DEFAULT_CFG });
  });
  it("reads case, seed and noise; case 5 is the field case (index 4)", () => {
    expect(readUrlConfig("?case=3&seed=WM956-B&noise=0.6")).toEqual({ caseIndex: 2, cfg: { seed: "WM956-B", noise: 0.6 } });
    expect(readUrlConfig("?case=5").caseIndex).toBe(4);
  });
  it("ignores anything out of range or malformed", () => {
    expect(readUrlConfig("?case=9&noise=7&seed=%20%20")).toEqual({ caseIndex: 0, cfg: DEFAULT_CFG });
    expect(readUrlConfig("?case=abc&noise=-1")).toEqual({ caseIndex: 0, cfg: DEFAULT_CFG });
  });
  it("a generated link round-trips", () => {
    const link = caseLink({ caseN: 2, seed: "A B&C", noise: 1.25 }, "https://example.test/dd/");
    expect(link).toBe("https://example.test/dd/?case=2&seed=A+B%26C&noise=1.3");
    expect(readUrlConfig(link.slice(link.indexOf("?")))).toEqual({ caseIndex: 1, cfg: { seed: "A B&C", noise: 1.3 } });
  });
});
