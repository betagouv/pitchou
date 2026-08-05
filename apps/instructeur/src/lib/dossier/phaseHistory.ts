type PhaseEvent = { phase: string; timestamp: Date | string };

function dateKey(value: Date | string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function withoutRedundantDepositPhase<T extends PhaseEvent>(
  events: readonly T[],
  depotDate: Date | string,
): T[] {
  if (events.length === 0) return [];
  const oldestIndex = events.reduce(
    (oldest, event, index) =>
      new Date(event.timestamp) < new Date(events[oldest].timestamp) ? index : oldest,
    0,
  );
  const oldest = events[oldestIndex];
  const oldestDate = dateKey(oldest.timestamp);
  const depositDate = dateKey(depotDate);
  if (
    oldest.phase !== "Accompagnement amont" ||
    oldestDate === null ||
    depositDate === null ||
    oldestDate !== depositDate
  ) {
    return [...events];
  }
  return events.filter((_, index) => index !== oldestIndex);
}
