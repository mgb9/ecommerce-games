import { describe, it, expect } from "vitest";
import { readUrlConfig, caseLink, DEFAULT_CFG } from "./urlConfig.js";

describe("cohort links", () => {
  it("no parameters → the inbox (no case) with the default seed and noise", () => {
    expect(readUrlConfig("")).toEqual({ caseIndex: null, cfg: DEFAULT_CFG });
  });
  it("reads case, seed and noise; cases 9 and 10 are the field cases; 12 is the last", () => {
    expect(readUrlConfig("?case=3&seed=WM956-B&noise=0.6")).toEqual({ caseIndex: 2, cfg: { seed: "WM956-B", noise: 0.6 } });
    expect(readUrlConfig("?case=9").caseIndex).toBe(8);
    expect(readUrlConfig("?case=10").caseIndex).toBe(9);
    expect(readUrlConfig("?case=12").caseIndex).toBe(11);
  });
  it("ignores anything out of range or malformed (an unknown case opens the inbox)", () => {
    expect(readUrlConfig("?case=13&noise=7&seed=%20%20")).toEqual({ caseIndex: null, cfg: DEFAULT_CFG });
    expect(readUrlConfig("?case=abc&noise=-1")).toEqual({ caseIndex: null, cfg: DEFAULT_CFG });
  });
  it("a generated link round-trips", () => {
    const link = caseLink({ caseN: 2, seed: "A B&C", noise: 1.25 }, "https://example.test/dd/");
    expect(link).toBe("https://example.test/dd/?case=2&seed=A+B%26C&noise=1.3");
    expect(readUrlConfig(link.slice(link.indexOf("?")))).toEqual({ caseIndex: 1, cfg: { seed: "A B&C", noise: 1.3 } });
  });
  it("a link without a case opens the inbox with those settings", () => {
    const link = caseLink({ seed: "S1", noise: 0.8 }, "https://example.test/dd/");
    expect(link).toBe("https://example.test/dd/?seed=S1&noise=0.8");
    expect(readUrlConfig(link.slice(link.indexOf("?")))).toEqual({ caseIndex: null, cfg: { seed: "S1", noise: 0.8 } });
  });
});
