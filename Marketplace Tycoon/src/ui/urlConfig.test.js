import { describe, it, expect, beforeEach } from "vitest";
import { instructorMode } from "./urlConfig.js";

describe("instructor tools are staff-only", () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  });
  it("is off for a plain link", () => { expect(instructorMode("")).toBe(false); });
  it("?instructor turns it on and it is remembered; ?instructor=off forgets", () => {
    expect(instructorMode("?instructor")).toBe(true);
    expect(instructorMode("")).toBe(true);
    expect(instructorMode("?instructor=off")).toBe(false);
    expect(instructorMode("")).toBe(false);
  });
});
