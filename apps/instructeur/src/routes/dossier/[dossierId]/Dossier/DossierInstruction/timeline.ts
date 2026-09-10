import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
import { orderedPhases } from "@pitchou/common/phases.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

type PhaseEvent = { phase: DossierPhase; timestamp: Date | string };

export type TimelineStep = {
  label: string;
  state: "done" | "current" | "future";
  /** Date lines shown under the step: deposit date, phase periods, "Depuis le …". */
  detail: string[];
};

function formatDay(date: Date | string): string {
  return formatDateAbsolute(date, "dd/MM/yyyy");
}

/**
 * Builds the « Avancement du dossier » timeline: a Dépôt step followed by the five
 * phases. Phases before the current one show as done even when they were skipped
 * (e.g. dossiers created directly in « Étude recevabilité »). A dossier
 * « classé sans suite » shows every phase it went through as done, none current.
 */
export function timelineSteps(
  events: readonly PhaseEvent[],
  depotDate: Date | string | null | undefined,
): TimelineStep[] {
  const ascending = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  // No event records the initial default phase. Actual returns keep their event dates.
  if (depotDate && ascending[0]?.phase !== "Accompagnement amont") {
    ascending.unshift({ phase: "Accompagnement amont", timestamp: depotDate });
  }
  const currentPhase = ascending.at(-1)?.phase ?? "Accompagnement amont";
  const currentIndex =
    currentPhase === "Classé sans suite"
      ? orderedPhases.length
      : orderedPhases.indexOf(currentPhase);

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

  const steps: TimelineStep[] = [
    { label: "Dépôt", state: "done", detail: depotDate ? [`Le ${formatDay(depotDate)}`] : [] },
  ];
  for (const [index, phase] of orderedPhases.entries()) {
    steps.push({
      label: phase,
      state: index < currentIndex ? "done" : index === currentIndex ? "current" : "future",
      detail: periodsByPhase.get(phase) ?? [],
    });
  }
  return steps;
}
