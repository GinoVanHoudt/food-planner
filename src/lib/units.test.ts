import { describe, expect, it } from "vite-plus/test";
import {
  addAmounts,
  capitalize,
  cleanName,
  formatAmount,
  formatAmounts,
  formatQuantity,
  ingredientKey,
  isCountable,
  normalizeUnit,
  parseAmounts,
  parseIngredientLine,
  parseQuantity,
  scaleAmount,
  subtractAmounts,
  toAmounts,
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

  it.each([
    [" 2 ", 2],
    ["  1,5\t", 1.5],
    ["1 ½", 1.5],
    ["0", 0],
  ])("ignores surrounding whitespace in %j", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(["-1", "-1/2", "   ", "1.2.3", "2 3", "1/2/3", "1 1/0", "Infinity", "2 kg"])(
    "rejects %j",
    (text) => {
      expect(parseQuantity(text)).toBeNull();
    },
  );
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

  it("saves the name in lower case", () => {
    expect(parseIngredientLine("2 L Milk").name).toBe("milk");
    expect(parseIngredientLine("Olive  Oil").name).toBe("olive oil");
  });

  it.each([
    ["1/2 onion", { name: "onion", quantity: 0.5, unit: "" }],
    ["½ lemon", { name: "lemon", quantity: 0.5, unit: "" }],
    ["1½ cups milk", { name: "milk", quantity: 1.5, unit: "cups" }],
    ["1 1/2 tsp salt", { name: "salt", quantity: 1.5, unit: "tsp" }],
    ["1,5 l milk", { name: "milk", quantity: 1.5, unit: "l" }],
    ["2 tbsp. sugar", { name: "sugar", quantity: 2, unit: "tbsp" }],
    ["500g flour", { name: "flour", quantity: 500, unit: "g" }],
    ["  2 eggs", { name: "eggs", quantity: 2, unit: "" }],
    ["2 tins tomatoes", { name: "tomatoes", quantity: 2, unit: "cans" }],
  ])("reads %j", (line, expected) => {
    expect(parseIngredientLine(line)).toEqual(expected);
  });

  it("keeps an unknown unit word in the name", () => {
    expect(parseIngredientLine("2 handfuls spinach")).toEqual({
      name: "handfuls spinach",
      quantity: 2,
      unit: "",
    });
  });

  it("returns an empty name for a line that is only a number", () => {
    expect(parseIngredientLine("3")).toEqual({ name: "", quantity: 3, unit: "" });
  });
});

describe("normalizeUnit", () => {
  it("maps aliases and keeps unknown units in lower case", () => {
    expect(normalizeUnit("Grams")).toBe("g");
    expect(normalizeUnit("tsp.")).toBe("tsp");
    expect(normalizeUnit("Handful")).toBe("handful");
  });

  it.each([
    ["gr", "g"],
    ["Kilo", "kg"],
    ["millilitres", "ml"],
    ["CL", "cl"],
    ["dl", "dl"],
    ["Litre", "l"],
    ["ltr", "l"],
    ["teaspoons", "tsp"],
    ["tbs", "tbsp"],
    ["Tablespoon.", "tbsp"],
    ["piece", "pcs"],
    ["pc", "pcs"],
    ["clove", "cloves"],
    ["tin", "cans"],
    ["packets", "pack"],
    ["jars", "jar"],
    ["bunches", "bunch"],
    ["slice", "slices"],
    ["pinches", "pinch"],
    ["cup", "cups"],
    ["portion", "portions"],
    [" kg ", "kg"],
    ["", ""],
  ])("normalises %j to %j", (unit, expected) => {
    expect(normalizeUnit(unit)).toBe(expected);
  });
});

describe("isCountable", () => {
  it.each(["", "pcs", "piece", "tins", "cloves", "pack", "jar", "bunch", "portions"])(
    "counts %j",
    (unit) => {
      expect(isCountable(unit)).toBe(true);
    },
  );

  it.each(["g", "kg", "ml", "l", "tbsp", "tsp", "pinch", "cups"])("does not count %j", (unit) => {
    expect(isCountable(unit)).toBe(false);
  });
});

describe("formatQuantity", () => {
  it.each([
    [2, "2"],
    [2.5, "2.5"],
    [1.234, "1.23"],
    [1.235001, "1.24"],
    [1 / 3, "0.33"],
    [1.999, "2"],
    [0.1 + 0.2, "0.3"],
  ])("formats %j as %j", (quantity, expected) => {
    expect(formatQuantity(quantity)).toBe(expected);
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

  it("returns nothing for no amounts", () => {
    expect(addAmounts([])).toEqual([]);
  });

  it("adds decilitres and centilitres as millilitres", () => {
    expect(
      addAmounts([
        { quantity: 2, unit: "dl" },
        { quantity: 5, unit: "cl" },
      ]),
    ).toEqual([{ quantity: 250, unit: "ml" }]);
  });

  it("merges unit aliases", () => {
    expect(
      addAmounts([
        { quantity: 1, unit: "tins" },
        { quantity: 2, unit: "cans" },
        { quantity: 1, unit: "piece" },
        { quantity: 2, unit: "pcs" },
      ]),
    ).toEqual([
      { quantity: 3, unit: "cans" },
      { quantity: 3, unit: "pcs" },
    ]);
  });
});

describe("subtractAmounts", () => {
  it("subtracts per unit after converting metric units", () => {
    expect(
      subtractAmounts(
        [
          { quantity: 1, unit: "kg" },
          { quantity: 2, unit: "" },
        ],
        [
          { quantity: 250, unit: "g" },
          { quantity: 3, unit: "" },
        ],
      ),
    ).toEqual({
      left: [{ quantity: 750, unit: "g" }],
      taken: [
        { quantity: 250, unit: "g" },
        { quantity: 2, unit: "" },
      ],
      missing: [{ quantity: 1, unit: "" }],
    });
  });

  it("cannot take a unit that is not there", () => {
    expect(subtractAmounts([{ quantity: 500, unit: "g" }], [{ quantity: 2, unit: "pcs" }])).toEqual(
      {
        left: [{ quantity: 500, unit: "g" }],
        taken: [],
        missing: [{ quantity: 2, unit: "pcs" }],
      },
    );
  });

  it("covers a need without a quantity with any amount", () => {
    expect(subtractAmounts([{ quantity: 1, unit: "l" }], [{ quantity: null, unit: "" }])).toEqual({
      left: [{ quantity: 1000, unit: "ml" }],
      taken: [],
      missing: [],
    });
    expect(subtractAmounts([], [{ quantity: null, unit: "" }]).missing).toEqual([
      { quantity: null, unit: "" },
    ]);
  });

  it("leaves nothing when exactly everything is used", () => {
    expect(
      subtractAmounts([{ quantity: 500, unit: "g" }], [{ quantity: 0.5, unit: "kg" }]),
    ).toEqual({
      left: [],
      taken: [{ quantity: 500, unit: "g" }],
      missing: [],
    });
  });

  it("drops floating-point leftovers", () => {
    expect(
      subtractAmounts(
        [
          { quantity: 0.1, unit: "" },
          { quantity: 0.2, unit: "" },
        ],
        [{ quantity: 0.3, unit: "" }],
      ),
    ).toEqual({ left: [], taken: [{ quantity: 0.3, unit: "" }], missing: [] });
    expect(
      subtractAmounts(
        [{ quantity: 0.3, unit: "" }],
        [
          { quantity: 0.1, unit: "" },
          { quantity: 0.2, unit: "" },
        ],
      ),
    ).toEqual({ left: [], taken: [{ quantity: 0.3, unit: "" }], missing: [] });
  });

  it("handles several units at once", () => {
    expect(
      subtractAmounts(
        [
          { quantity: 1, unit: "kg" },
          { quantity: 1, unit: "l" },
          { quantity: 2, unit: "tins" },
          { quantity: 3, unit: "" },
        ],
        [
          { quantity: 200, unit: "g" },
          { quantity: 3, unit: "dl" },
          { quantity: 3, unit: "cans" },
          { quantity: 1, unit: "tbsp" },
        ],
      ),
    ).toEqual({
      left: [
        { quantity: 800, unit: "g" },
        { quantity: 700, unit: "ml" },
        { quantity: 3, unit: "" },
      ],
      taken: [
        { quantity: 200, unit: "g" },
        { quantity: 300, unit: "ml" },
        { quantity: 2, unit: "cans" },
      ],
      missing: [
        { quantity: 1, unit: "cans" },
        { quantity: 1, unit: "tbsp" },
      ],
    });
  });
});

describe("parseAmounts", () => {
  it("reads amounts in the format formatAmounts writes", () => {
    expect(parseAmounts("1.5 kg")).toEqual([{ quantity: 1500, unit: "g" }]);
    expect(parseAmounts("3")).toEqual([{ quantity: 3, unit: "" }]);
    expect(parseAmounts("2 + 100 g")).toEqual([
      { quantity: 2, unit: "" },
      { quantity: 100, unit: "g" },
    ]);
    expect(parseAmounts("1½ tins")).toEqual([{ quantity: 1.5, unit: "cans" }]);
  });

  it("returns nothing for empty text and null for text that is not an amount", () => {
    expect(parseAmounts("  ")).toEqual([]);
    expect(parseAmounts("some rice")).toBeNull();
    expect(parseAmounts("2 +")).toBeNull();
  });

  it.each([
    [[{ quantity: 500, unit: "g" }]],
    [[{ quantity: 1500, unit: "g" }]],
    [[{ quantity: 2500, unit: "ml" }]],
    [[{ quantity: 0.5, unit: "kg" }]],
    [[{ quantity: 3, unit: "" }]],
    [[{ quantity: 1.5, unit: "tbsp" }]],
    [[{ quantity: 2, unit: "tins" }]],
    [[{ quantity: 1, unit: "handful" }]],
    [
      [
        { quantity: 2, unit: "" },
        { quantity: 100, unit: "g" },
        { quantity: 0.25, unit: "l" },
      ],
    ],
    [
      [
        { quantity: 200, unit: "g" },
        { quantity: 0.5, unit: "kg" },
        { quantity: 3, unit: "cloves" },
      ],
    ],
  ])("reads back what formatAmounts writes for %j", (amounts) => {
    expect(parseAmounts(formatAmounts(amounts))).toEqual(addAmounts(amounts));
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

  it("switches an alias unit to kg for large amounts", () => {
    expect(formatAmount({ quantity: 1500, unit: "grams" })).toBe("1.5 kg");
    expect(formatAmount({ quantity: 1000, unit: "milliliters" })).toBe("1 l");
  });

  it("joins several amounts", () => {
    expect(
      formatAmounts([
        { quantity: 2, unit: "" },
        { quantity: 100, unit: "g" },
      ]),
    ).toBe("2 + 100 g");
  });

  it("skips empty parts", () => {
    expect(
      formatAmounts([
        { quantity: null, unit: "" },
        { quantity: 2, unit: "" },
      ]),
    ).toBe("2");
    expect(formatAmounts([{ quantity: null, unit: "" }])).toBe("");
    expect(formatAmounts([])).toBe("");
  });
});

describe("toAmounts", () => {
  it("gives a typed line's amount in base units, or none without a quantity", () => {
    expect(toAmounts(parseIngredientLine("2 l milk"))).toEqual([{ quantity: 2000, unit: "ml" }]);
    expect(toAmounts(parseIngredientLine("6 eggs"))).toEqual([{ quantity: 6, unit: "" }]);
    expect(toAmounts(parseIngredientLine("3 tins tomatoes"))).toEqual([
      { quantity: 3, unit: "cans" },
    ]);
    expect(toAmounts(parseIngredientLine("milk"))).toEqual([]);
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

describe("cleanName", () => {
  it("trims, collapses spaces and lowercases", () => {
    expect(cleanName("  Chili Sin   Carne ")).toBe("chili sin carne");
  });

  it("treats tabs and newlines as spaces", () => {
    expect(cleanName("\tRed\nOnion \r\n")).toBe("red onion");
    expect(cleanName("crème\t\tfraîche")).toBe("crème fraîche");
  });
});

describe("capitalize", () => {
  it("capitalises only the first letter", () => {
    expect(capitalize("chili sin carne")).toBe("Chili sin carne");
    expect(capitalize("")).toBe("");
  });

  it("capitalises an accented first letter", () => {
    expect(capitalize("éclair")).toBe("Éclair");
  });

  it("shows a cleaned name with a capital first letter", () => {
    expect(capitalize(cleanName("  CHILI sin carne"))).toBe("Chili sin carne");
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

  it("equals the cleaned name for names without slashes", () => {
    expect(ingredientKey("Crème\tFraîche ")).toBe(cleanName("Crème\tFraîche "));
  });

  it.each([
    ["Red Onion", "red onion", "  RED\tonion\n"],
    ["Olive Oil", "olive  oil", "olive oil "],
  ])("gives names that clean to the same string the same key", (...names) => {
    expect(new Set(names.map(cleanName)).size).toBe(1);
    expect(new Set(names.map(ingredientKey)).size).toBe(1);
  });
});
