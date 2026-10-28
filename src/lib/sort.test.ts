import { describe, expect, it } from "vite-plus/test";
import { byName, compareNames } from "./sort";

describe("compareNames", () => {
  it("ignores case and accents", () => {
    expect(compareNames("apple", "Apple")).toBe(0);
    expect(compareNames("eclair", "Éclair")).toBe(0);
    expect(compareNames("creme fraiche", "crème fraîche")).toBe(0);
  });

  it("orders alphabetically", () => {
    expect(compareNames("apple", "Banana")).toBeLessThan(0);
    expect(compareNames("Éclair", "dill")).toBeGreaterThan(0);
  });
});

describe("byName", () => {
  it("sorts objects by name", () => {
    const items = [{ name: "éclair" }, { name: "Banana" }, { name: "dill" }, { name: "apple" }];
    expect([...items].sort(byName).map(({ name }) => name)).toEqual([
      "apple",
      "Banana",
      "dill",
      "éclair",
    ]);
  });
});
