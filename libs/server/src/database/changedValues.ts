/** Compare only submitted values; database dates and numeric columns have distinct JS representations. */
export function hasChangedValues(
  before: Record<string, unknown> | undefined,
  update: object,
): boolean {
  if (!before) return true;
  return Object.entries(update).some(([key, value]) => {
    if (value === undefined || key === "id" || key === "evenementsPhase") return false;
    const old = before[key];
    if (value instanceof Date || old instanceof Date) {
      const day = (item: unknown) => {
        if (item == null) return null;
        if (!(item instanceof Date)) return String(item).slice(0, 10);
        return `${item.getFullYear()}-${String(item.getMonth() + 1).padStart(2, "0")}-${String(item.getDate()).padStart(2, "0")}`;
      };
      return day(value) !== day(old);
    }
    if (typeof value === "number" && typeof old === "string") return value !== Number(old);
    return JSON.stringify(value ?? null) !== JSON.stringify(old ?? null);
  });
}
