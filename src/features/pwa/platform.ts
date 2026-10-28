export type Platform = "ios" | "android" | "macSafari" | "desktop";

/** Where the app runs, which decides how it can be installed. */
export function detectPlatform(userAgent: string, maxTouchPoints: number): Platform {
  // iPadOS reports itself as a Mac, but with touch support.
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1))
    return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (
    /macintosh/i.test(userAgent) &&
    /safari/i.test(userAgent) &&
    !/chrome|chromium|edg|firefox/i.test(userAgent)
  )
    return "macSafari";
  return "desktop";
}
