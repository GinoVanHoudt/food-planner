/** How a card's value is drawn: a QR code, or an EAN-13 barcode (which also covers UPC-A). */
export type CardFormat = "qr" | "ean13";

// Each digit is 7 modules (1 = bar). Left-half digits use L or G codes, right-half digits R codes.
const L_CODES = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const R_CODES = L_CODES.map((code) => code.replace(/[01]/g, (bit) => (bit === "1" ? "0" : "1")));
const G_CODES = R_CODES.map((code) => code.split("").reverse().join(""));

/** The first digit is not drawn; it picks L or G for each of the next six digits. */
const PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

/** Removes the spaces people type between digit groups. */
export function cleanDigits(value: string): string {
  return value.replace(/\s/g, "");
}

/**
 * Returns the 13 EAN digits for a 13-digit EAN or 12-digit UPC-A number (a UPC-A is an EAN-13
 * starting with 0), or null when the value has another length or a wrong check digit.
 */
export function toEan13(value: string): string | null {
  const digits = cleanDigits(value);
  if (!/^\d{12,13}$/.test(digits)) return null;
  const code = digits.padStart(13, "0");
  const sum = code
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code[12]) ? code : null;
}

/**
 * A card value as typed: cleaned for saving (barcode digits without spaces, QR text trimmed),
 * whether it can be saved, and whether to say it is wrong, which for a barcode is only once all
 * its digits could have been typed.
 */
export function checkCardValue(format: CardFormat, text: string) {
  const isBarcode = format === "ean13";
  const value = isBarcode ? cleanDigits(text) : text.trim();
  const valid = isBarcode ? toEan13(value) !== null : value !== "";
  const showError = isBarcode && !valid && (value.length >= 12 || /\D/.test(value));
  return { value, valid, showError };
}

/** The 95 modules of an EAN-13 barcode, from a valid 13-digit code. */
export function ean13Modules(code: string): string {
  const digits = code.split("").map(Number);
  const parity = PARITY[digits[0]];
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity[index] === "L" ? L_CODES : G_CODES)[digit])
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => R_CODES[digit])
    .join("");
  return `101${left}01010${right}101`;
}

/** An SVG path that draws every dark module as a 1×1 square, one horizontal run at a time. */
export function modulesPath(rows: boolean[][]): string {
  let path = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (row[x]) x++;
      path += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return path;
}
