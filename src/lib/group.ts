/**
 * Puts items into groups, in the order of `groups`. Items whose group is unknown go into the
 * `fallbackId` group; empty groups are left out.
 */
export function groupInOrder<T, G extends { id: string }>(
  items: T[],
  groups: G[],
  groupOf: (item: T) => string,
  fallbackId: string,
): { group: G; items: T[] }[] {
  const known = new Set(groups.map((group) => group.id));
  const byGroup = new Map<string, T[]>();
  for (const item of items) {
    const id = groupOf(item);
    const groupId = known.has(id) ? id : fallbackId;
    const groupItems = byGroup.get(groupId);
    if (groupItems) groupItems.push(item);
    else byGroup.set(groupId, [item]);
  }
  return groups.flatMap((group) => {
    const groupItems = byGroup.get(group.id);
    return groupItems ? [{ group, items: groupItems }] : [];
  });
}
