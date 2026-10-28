import { describe, expect, it } from "vite-plus/test";
import { detectPlatform } from "./platform";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const MAC_EDGE = `${MAC_CHROME} Edg/130.0.0.0`;
const MAC_FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("detectPlatform", () => {
  it.each([
    ["an iPhone", IPHONE, 5, "ios"],
    ["an iPad that reports itself as a Mac", IPAD_AS_MAC, 5, "ios"],
    ["Android", ANDROID_CHROME, 5, "android"],
    ["Safari on a Mac", IPAD_AS_MAC, 0, "macSafari"],
    ["Chrome on a Mac", MAC_CHROME, 0, "desktop"],
    ["Edge on a Mac", MAC_EDGE, 0, "desktop"],
    ["Firefox on a Mac", MAC_FIREFOX, 0, "desktop"],
    ["Chrome on Windows", WINDOWS_CHROME, 0, "desktop"],
  ])("recognises %s", (_, userAgent, maxTouchPoints, platform) => {
    expect(detectPlatform(userAgent, maxTouchPoints)).toBe(platform);
  });
});
