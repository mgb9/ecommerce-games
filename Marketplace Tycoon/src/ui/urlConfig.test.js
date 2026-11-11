import { describe, it, expect, beforeEach } from "vitest";
import { instructorMode, urlSeed, cohortLink } from "./urlConfig.js";

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

describe("cohort link", () => {
  it("reads a seed from the link, and nothing else", () => {
    expect(urlSeed("?seed=WMG-2026")).toBe("WMG-2026");
    expect(urlSeed("?seed=%20Group_A.1%20")).toBe("Group_A.1");
    expect(urlSeed("")).toBeNull();
    expect(urlSeed("?seed=")).toBeNull();
    expect(urlSeed("?seed=<script>")).toBeNull();
    expect(urlSeed("?seed=" + "x".repeat(60))).toHaveLength(40);
  });
  it("builds a link that carries the seed and no instructor flag, and reads back", () => {
    const link = cohortLink("M7K2Q", { origin: "https://example.test", pathname: "/ecommerce-games/marketplace-tycoon/" });
    expect(link).toBe("https://example.test/ecommerce-games/marketplace-tycoon/?seed=M7K2Q");
    expect(link).not.toMatch(/instructor/);
    expect(urlSeed(new URL(link).search)).toBe("M7K2Q");
  });
});
