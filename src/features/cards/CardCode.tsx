import { useMemo } from "react";
import { encode } from "uqr";
import { cleanDigits, ean13Modules, modulesPath, toEan13, type CardFormat } from "./barcode";
import s from "./CardCode.module.css";

/** Blank modules on each side of a barcode so scanners find where it starts and ends. */
const QUIET_ZONE = 11;

function QrCode({ value }: { value: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 0 });
    return { size: qr.size, path: modulesPath(qr.data) };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={s.qr}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code"
    >
      <path d={path} />
    </svg>
  );
}

function Barcode({ value }: { value: string }) {
  const path = useMemo(() => {
    const code = toEan13(value);
    if (!code) return null;
    const bars = ean13Modules(code)
      .split("")
      .map((bit) => bit === "1");
    return modulesPath([bars]);
  }, [value]);
  if (!path) return null;

  // One row of modules, stretched to the bar height.
  return (
    <>
      <svg
        viewBox={`${-QUIET_ZONE} 0 ${95 + 2 * QUIET_ZONE} 1`}
        preserveAspectRatio="none"
        className={s.barcode}
        role="img"
        aria-label="Barcode"
      >
        <path d={path} />
      </svg>
      <span className={s.digits}>{cleanDigits(value)}</span>
    </>
  );
}

/** A card's value as a QR code or barcode, always dark on white so scanners can read it. */
export function CardCode({ format, value }: { format: CardFormat; value: string }) {
  return (
    <div className={s.code}>
      {format === "qr" ? <QrCode value={value} /> : <Barcode value={value} />}
    </div>
  );
}
