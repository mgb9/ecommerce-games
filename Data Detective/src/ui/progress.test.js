import { describe, it, expect, beforeEach } from "vitest";
import { loadProgress, recordFirstAttempt, calibration } from "./progress.js";

// a minimal localStorage for node
beforeEach(() => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
});

describe("progress", () => {
  it("records only the first attempt — a retry after the reveal can't overwrite it", () => {
    recordFirstAttempt("paypal-gateway", 2, 4, 90);
    recordFirstAttempt("paypal-gateway", 4, 4, 90);
    expect(loadProgress()["paypal-gateway"]).toMatchObject({ first: 2, outOf: 4, confidence: 90 });
  });
  it("a first attempt of 0 still counts as recorded", () => {
    recordFirstAttempt("traffic-mix", 0, 4, 50);
    recordFirstAttempt("traffic-mix", 4, 4, 50);
    expect(loadProgress()["traffic-mix"].first).toBe(0);
  });
  it("sets the hub's played flag", () => {
    recordFirstAttempt("normal-week", 1, 4, 70);
    expect(JSON.parse(localStorage.getItem("wmg-games-progress"))).toEqual({ dd: true });
  });
  it("calibration groups first attempts by stated confidence", () => {
    recordFirstAttempt("a", 4, 4, 90); recordFirstAttempt("b", 2, 4, 90); recordFirstAttempt("c", 3, 3, 50);
    expect(calibration(loadProgress()).map(({ id, cases, right }) => ({ id, cases, right }))).toEqual([{ id: 50, cases: 1, right: 1 }, { id: 90, cases: 2, right: 1 }]);
  });
});
