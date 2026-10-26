import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
import { orderedPhases, comparePhaseEventsNewestFirst } from "@pitchou/common/phases.ts";
import type { DossierSource } from "@pitchou/types/dossierSource.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

type PhaseEvent = { phase: DossierPhase; timestamp: Date | string };

export type TimelineStep = {
  label: string;
  state: "done" | "current" | "future" | "not_reached";
  /** Date lines shown under the step: deposit date, phase periods, "Depuis le …". */
  detail: string[];
};

function formatDay(date: Date | string): string {
  return formatDateAbsolute(date, "dd/MM/yyyy");
}

/**
 * Builds the « Avancement du dossier » timeline with known deposit milestones and
 * phases. Phases before the current one show as done even when they were skipped
 * (e.g. dossiers created directly in « Étude recevabilité »). A dossier
 * « classé sans suite » completes phases only up to the furthest one reached,
 * with none current and the remaining phases marked as not reached.
 */
export function timelineSteps(
  events: readonly PhaseEvent[],
  depotDate: Date | string | null | undefined,
  ddepDepotDate?: Date | string | null,
  source?: DossierSource,
): TimelineStep[] {
  const ascending = [...events].sort(comparePhaseEventsNewestFirst).reverse();
  // No event records the initial default phase. Actual returns keep their event dates.
  if (source !== "onagre" && depotDate && ascending[0]?.phase !== "Accompagnement amont") {
    ascending.unshift({ phase: "Accompagnement amont", timestamp: depotDate });
  }
  const currentPhase =
    ascending.at(-1)?.phase ?? (source === "onagre" ? undefined : "Accompagnement amont");
  const classified = currentPhase === "Classé sans suite";
  const currentIndex = currentPhase ? orderedPhases.indexOf(currentPhase) : -1;
  const furthestIndex = Math.max(-1, ...ascending.map(({ phase }) => orderedPhases.indexOf(phase)));

  // Periods spent in each phase: from each event to the next one, the latest
  // being open-ended. A phase visited twice gets two lines.
  const periodsByPhase = new Map<string, string[]>();
  ascending.forEach((event, index) => {
    const next = ascending[index + 1];
    const period = next
      ? `${formatDay(event.timestamp)} → ${formatDay(next.timestamp)}`
      : `Depuis le ${formatDay(event.timestamp)}`;
    periodsByPhase.set(event.phase, [...(periodsByPhase.get(event.phase) ?? []), period]);
  });

  const steps: TimelineStep[] = depotDate
    ? [{ label: "Création", state: "done", detail: [`Le ${formatDay(depotDate)}`] }]
    : [];
  for (const [index, phase] of orderedPhases.entries()) {
    if (phase === "Étude recevabilité" && source === "onagre" && ddepDepotDate) {
      steps.push({
        label: "Dépôt du DDEP",
        state: "done",
        detail: [`Le ${formatDay(ddepDepotDate)}`],
      });
    }
    // Onagre did not record these preliminary phases. Keep them only when an event exists.
    if (source === "onagre" && index < 2 && !periodsByPhase.has(phase)) continue;
    steps.push({
      label: phase,
      state: classified
        ? index <= furthestIndex
          ? "done"
          : "not_reached"
        : index < currentIndex
          ? "done"
          : index === currentIndex
            ? "current"
            : "future",
      detail: periodsByPhase.get(phase) ?? [],
    });
  }
  return steps;
}
