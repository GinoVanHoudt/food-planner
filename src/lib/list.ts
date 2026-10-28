/** The list with the item at `index` swapped with its neighbour `offset` away; unchanged at an end. */
export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** The list with `item` added before the one with id `beforeId`, or at the end if there is none. */
export function insertBefore<T extends { id: string }>(items: T[], item: T, beforeId: string): T[] {
  const index = items.findIndex(({ id }) => id === beforeId);
  const at = index === -1 ? items.length : index;
  return [...items.slice(0, at), item, ...items.slice(at)];
}
