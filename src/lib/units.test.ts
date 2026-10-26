import { describe, expect, it } from "vite-plus/test";
import {
  addAmounts,
  formatAmount,
  formatAmounts,
  ingredientKey,
  normalizeUnit,
  parseIngredientLine,
  parseQuantity,
  scaleAmount,
} from "./units";

describe("parseQuantity", () => {
  it.each([
    ["2", 2],
    ["1,5", 1.5],
    ["0.25", 0.25],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["", null],
    ["abc", null],
    ["1/0", null],
    ["0/0", null],
  ])("parses %j", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });
});

describe("parseIngredientLine", () => {
  it("reads quantity, unit and name", () => {
    expect(parseIngredientLine("200 g onions")).toEqual({
      name: "onions",
      quantity: 200,
      unit: "g",
    });
  });

  it("accepts a unit glued to the number and unit aliases", () => {
    expect(parseIngredientLine("2kg potatoes")).toEqual({
      name: "potatoes",
      quantity: 2,
      unit: "kg",
    });
    expect(parseIngredientLine("2 cloves garlic")).toEqual({
      name: "garlic",
      quantity: 2,
      unit: "cloves",
    });
    expect(parseIngredientLine("1 tablespoon oil")).toEqual({
      name: "oil",
      quantity: 1,
      unit: "tbsp",
    });
  });

  it("treats a non-unit word as part of the name", () => {
    expect(parseIngredientLine("3 large eggs")).toEqual({
      name: "large eggs",
      quantity: 3,
      unit: "",
    });
  });

  it("handles lines without a quantity", () => {
    expect(parseIngredientLine("salt")).toEqual({ name: "salt", quantity: null, unit: "" });
  });
});

describe("normalizeUnit", () => {
  it("maps aliases and keeps unknown units in lower case", () => {
    expect(normalizeUnit("Grams")).toBe("g");
    expect(normalizeUnit("tsp.")).toBe("tsp");
    expect(normalizeUnit("Handful")).toBe("handful");
  });
});

describe("addAmounts", () => {
  it("adds metric amounts across units", () => {
    expect(
      addAmounts([
        { quantity: 200, unit: "g" },
        { quantity: 0.5, unit: "kg" },
      ]),
    ).toEqual([{ quantity: 700, unit: "g" }]);
    expect(
      addAmounts([
        { quantity: 1, unit: "l" },
        { quantity: 25, unit: "cl" },
      ]),
    ).toEqual([{ quantity: 1250, unit: "ml" }]);
  });

  it("keeps different units apart, in order of appearance", () => {
    expect(
      addAmounts([
        { quantity: 2, unit: "" },
        { quantity: 100, unit: "g" },
        { quantity: 1, unit: "" },
      ]),
    ).toEqual([
      { quantity: 3, unit: "" },
      { quantity: 100, unit: "g" },
    ]);
  });

  it("ignores missing quantities when others are known", () => {
    expect(
      addAmounts([
        { quantity: null, unit: "pinch" },
        { quantity: null, unit: "pinch" },
      ]),
    ).toEqual([{ quantity: null, unit: "pinch" }]);
    expect(
      addAmounts([
        { quantity: null, unit: "g" },
        { quantity: 50, unit: "g" },
      ]),
    ).toEqual([{ quantity: 50, unit: "g" }]);
  });
});

describe("formatAmount", () => {
  it("switches to kg / l for large amounts", () => {
    expect(formatAmount({ quantity: 1500, unit: "g" })).toBe("1.5 kg");
    expect(formatAmount({ quantity: 750, unit: "ml" })).toBe("750 ml");
    expect(formatAmount({ quantity: 2000, unit: "ml" })).toBe("2 l");
  });

  it("formats unitless and quantity-less amounts", () => {
    expect(formatAmount({ quantity: 2, unit: "" })).toBe("2");
    expect(formatAmount({ quantity: null, unit: "pinch" })).toBe("pinch");
    expect(formatAmount({ quantity: 1 / 3, unit: "tbsp" })).toBe("0.33 tbsp");
  });

  it("joins several amounts", () => {
    expect(
      formatAmounts([
        { quantity: 2, unit: "" },
        { quantity: 100, unit: "g" },
      ]),
    ).toBe("2 + 100 g");
  });
});

describe("scaleAmount", () => {
  it("scales known quantities only", () => {
    expect(scaleAmount({ quantity: 200, unit: "g" }, 0.5)).toEqual({ quantity: 100, unit: "g" });
    expect(scaleAmount({ quantity: null, unit: "pinch" }, 2)).toEqual({
      quantity: null,
      unit: "pinch",
    });
  });
});

describe("ingredientKey", () => {
  it("normalises case, whitespace and slashes", () => {
    expect(ingredientKey("  Red   Onion ")).toBe("red onion");
    expect(ingredientKey("salt/pepper")).toBe("salt-pepper");
  });

  it("never produces an id Firestore rejects", () => {
    expect(ingredientKey("..")).toBe("~..");
    expect(ingredientKey("__x__")).toBe("~__x__");
  });
});
