import { describe, expect, it } from "vite-plus/test";
import { ingredientKey } from "../../lib/units";
import type { CatalogEntry } from "./catalog";
import { catalogLookup, unknownIngredients } from "./lookup";

const entries: CatalogEntry[] = [
  { id: "red onion", name: "red onion", sectionId: "produce", locationId: "pantry" },
  { id: "pumpkin soup", name: "pumpkin soup", sectionId: "frozen", meal: true },
  { id: "salt-pepper", name: "salt/pepper" },
  { id: "éclair", name: "éclair", sectionId: "bakery" },
];
const catalog = catalogLookup(entries, { sectionId: "other", locationId: "elsewhere" });

describe("catalogLookup", () => {
  it("finds ingredients whatever their case, spacing or slashes", () => {
    expect(catalog.sectionOf("  Red   Onion")).toBe("produce");
    expect(catalog.locationOf("RED ONION")).toBe("pantry");
    expect(catalog.has("Salt/Pepper")).toBe(true);
    expect(catalog.isMeal("Pumpkin Soup")).toBe(true);
  });

  it("falls back for unknown ingredients and missing fields", () => {
    expect(catalog.sectionOf("lasagna")).toBe("other");
    expect(catalog.locationOf("lasagna")).toBe("elsewhere");
    expect(catalog.sectionOf("salt/pepper")).toBe("other");
    expect(catalog.locationOf("pumpkin soup")).toBe("elsewhere");
    expect(catalog.isMeal("red onion")).toBe(false);
    expect(catalog.has("lasagna")).toBe(false);
  });

  it("lists the names alphabetically, ignoring accents", () => {
    expect(catalog.names).toEqual(["éclair", "pumpkin soup", "red onion", "salt/pepper"]);
  });

  it("finds every name it lists", () => {
    for (const name of catalog.names) expect(catalog.has(name)).toBe(true);
    for (const entry of entries) expect(ingredientKey(entry.name)).toBe(entry.id);
  });
});

describe("unknownIngredients", () => {
  it("keeps new names once, cleaned and by key, without empty ones", () => {
    expect(
      unknownIngredients(["Red Onion", "Garlic", " garlic ", "  ", "Salt/Pepper"], catalog.has),
    ).toEqual(new Map([["garlic", "garlic"]]));
  });

  it("is empty when everything is known", () => {
    expect(unknownIngredients(["red onion", "PUMPKIN SOUP"], catalog.has).size).toBe(0);
  });
});
