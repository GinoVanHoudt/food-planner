/** Case- and accent-insensitive alphabetical order. */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function byName(a: { name: string }, b: { name: string }): number {
  return compareNames(a.name, b.name);
}
