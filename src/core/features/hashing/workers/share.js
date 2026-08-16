/** Shares `algos` out over `count` groups of about equal cost (longest first, each to the group
 *  with the least so far), as a file's time is that of the slowest group. `costOf(algo)` is its
 *  relative time per byte. Returns the groups' algorithm ids, leaving out any group left empty. */
export function share(algos, count, costOf) {
  const groups = Array.from({ length: count }, () => ({ ids: [], cost: 0 }));
  const byCost = [...algos].sort((a, b) => costOf(b) - costOf(a));
  for (const algo of byCost) {
    const lightest = groups.reduce((min, group) => (group.cost < min.cost ? group : min));
    lightest.ids.push(algo.id);
    lightest.cost += costOf(algo);
  }
  return groups.map((group) => group.ids).filter((ids) => ids.length);
}
