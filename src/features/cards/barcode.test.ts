import { describe, expect, it } from "vite-plus/test";
import { checkCardValue, ean13Modules, modulesPath, toEan13 } from "./barcode";

describe("checkCardValue", () => {
  it("trims QR text and needs some", () => {
    expect(checkCardValue("qr", "  https://example.com/card ")).toEqual({
      value: "https://example.com/card",
      valid: true,
      showError: false,
    });
    expect(checkCardValue("qr", "  ")).toEqual({ value: "", valid: false, showError: false });
  });

  it("saves barcode digits without spaces", () => {
    expect(checkCardValue("ean13", "5 901234 123457")).toEqual({
      value: "5901234123457",
      valid: true,
      showError: false,
    });
    expect(checkCardValue("ean13", "036000291452").valid).toBe(true);
  });

  it("only flags a barcode once all digits could have been typed, or a non-digit was", () => {
    expect(checkCardValue("ean13", "").showError).toBe(false);
    expect(checkCardValue("ean13", "59012341").showError).toBe(false);
    expect(checkCardValue("ean13", "5901234123458").showError).toBe(true);
    expect(checkCardValue("ean13", "59012341234570").showError).toBe(true);
    expect(checkCardValue("ean13", "5901-").showError).toBe(true);
  });
});

describe("toEan13", () => {
  it.each([
    ["5901234123457", "5901234123457"],
    ["036000291452", "0036000291452"],
    ["5 901234 123457", "5901234123457"],
  ])("accepts %j", (value, expected) => {
    expect(toEan13(value)).toBe(expected);
  });

  it.each(["5901234123458", "03600029145", "59012341234570", "abc", ""])("rejects %j", (value) => {
    expect(toEan13(value)).toBeNull();
  });
});

describe("ean13Modules", () => {
  it("draws guards around L codes on the left and R codes on the right", () => {
    expect(ean13Modules("0000000000000")).toBe(
      `101${"0001101".repeat(6)}01010${"1110010".repeat(6)}101`,
    );
  });

  it("uses the first digit to mix in G codes", () => {
    // First digit 1 means LLGLGG; G for 0 is 0100111, R for 9 is 1110100.
    const [L0, G0, R0, R9] = ["0001101", "0100111", "1110010", "1110100"];
    expect(ean13Modules("1000000000009")).toBe(
      `101${L0}${L0}${G0}${L0}${G0}${G0}01010${R0.repeat(5)}${R9}101`,
    );
  });

  it("is always 95 modules wide", () => {
    expect(ean13Modules("5901234123457")).toHaveLength(95);
  });
});

describe("modulesPath", () => {
  it("merges horizontal runs of dark modules", () => {
    expect(
      modulesPath([
        [true, true, false, true],
        [false, false, false, false],
        [false, true, true, true],
      ]),
    ).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z");
  });
});
