import { isDeepStrictEqual } from "node:util";
export function comparable(value, key) {
  if (value === null || value === undefined) return value ?? null;
  if (key.endsWith("_date"))
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return value;
}
// Only fields changed in the proposal are candidates for an update.
export function mergeFields(previous, current, proposed) {
  const updates = {},
    conflicts = [],
    preserved = [];
  for (const key of Object.keys(previous)) {
    if (!Object.hasOwn(proposed, key))
      throw new Error(`Managed field ${key} disappeared; use an explicit null to clear it.`);
  }
  for (const [key, value] of Object.entries(proposed)) {
    const old = comparable(previous[key], key),
      live = comparable(current[key], key),
      next = comparable(value, key);
    const had = Object.hasOwn(previous, key);
    if (had && isDeepStrictEqual(old, next)) {
      if (!isDeepStrictEqual(live, next)) preserved.push(key);
    } else if (isDeepStrictEqual(live, next)) {
      continue;
    } else if ((had && isDeepStrictEqual(live, old)) || (!had && live === null)) {
      updates[key] = value;
    } else conflicts.push(key);
  }
  return { updates, conflicts, preserved };
}
