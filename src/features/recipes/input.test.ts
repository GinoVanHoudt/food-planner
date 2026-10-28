import { describe, expect, it } from "vite-plus/test";
import { MAX_NAME_LENGTH } from "../../lib/units";
import { hostname, normalizeUrl, parseIngredientList, toIngredients, webUrl } from "./input";

describe("toIngredients", () => {
  it("cleans names, parses quantities and normalises units", () => {
    expect(
      toIngredients([
        { quantity: "1,5", unit: "Kilo", name: " Red  Onions" },
        { quantity: "½", unit: "tsp.", name: "Salt" },
        { quantity: "", unit: " ", name: "pepper" },
        { quantity: "a bit", unit: "Handful", name: "basil" },
      ]),
    ).toEqual([
      { name: "red onions", quantity: 1.5, unit: "kg" },
      { name: "salt", quantity: 0.5, unit: "tsp" },
      { name: "pepper", quantity: null, unit: "" },
      { name: "basil", quantity: null, unit: "handful" },
    ]);
  });

  it("leaves out rows without a name", () => {
    expect(
      toIngredients([
        { quantity: "2", unit: "g", name: "  " },
        { quantity: "", unit: "", name: "" },
      ]),
    ).toEqual([]);
  });
});

describe("parseIngredientList", () => {
  it("reads one ingredient per line, without bullets or empty lines", () => {
    expect(parseIngredientList("- 200 g onions\n\n• 2 cloves garlic\r\n  * Salt\n   ")).toEqual([
      { name: "onions", quantity: 200, unit: "g" },
      { name: "garlic", quantity: 2, unit: "cloves" },
      { name: "salt", quantity: null, unit: "" },
    ]);
  });

  it("shortens names to what the rules accept", () => {
    const [ingredient] = parseIngredientList(`1 ${"a".repeat(MAX_NAME_LENGTH + 50)}`);
    expect(ingredient.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it("is empty for blank text", () => {
    expect(parseIngredientList(" \n - \n")).toEqual([]);
  });
});

describe("normalizeUrl", () => {
  it("adds https:// to links without a scheme", () => {
    expect(normalizeUrl(" example.com/chili ")).toBe("https://example.com/chili");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("HTTPS://example.com")).toBe("HTTPS://example.com");
  });

  it("keeps an empty link empty", () => {
    expect(normalizeUrl("  ")).toBe("");
  });
});

describe("webUrl", () => {
  it("only lets web links through", () => {
    expect(webUrl("https://example.com/chili")).toBe("https://example.com/chili");
    expect(webUrl("HTTP://example.com")).toBe("HTTP://example.com");
    expect(webUrl("javascript:alert(1)")).toBe("");
    expect(webUrl("example.com")).toBe("");
    expect(webUrl("")).toBe("");
  });

  it("lets every saved link through", () => {
    for (const typed of ["example.com", "https://example.com", "javascript:alert(1)"]) {
      expect(webUrl(normalizeUrl(typed))).toBe(normalizeUrl(typed));
    }
  });
});

describe("hostname", () => {
  it("shows the site without www", () => {
    expect(hostname("https://www.example.com/chili?x=1")).toBe("example.com");
    expect(hostname("https://cooking.example.org/")).toBe("cooking.example.org");
  });

  it("falls back to the text when it is not a URL", () => {
    expect(hostname("not a link")).toBe("not a link");
  });
});
