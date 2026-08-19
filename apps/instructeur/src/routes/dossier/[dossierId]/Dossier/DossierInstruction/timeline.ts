import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";

type PhaseEvent = { phase: string; timestamp: Date | string };

export type TimelineStep = {
  label: string;
  state: "done" | "current" | "future";
  /** Date lines shown under the step: deposit date, phase periods, "Depuis le …". */
  detail: string[];
};

/** The phases a dossier progresses through, « Classé sans suite » ends it early. */
const orderedPhases = [
  "Accompagnement amont",
  "Étude recevabilité DDEP",
  "Instruction",
  "Contrôle",
  "Obligations terminées",
];

function formatDay(date: Date | string): string {
  return formatDateAbsolute(date, "dd/MM/yyyy");
}

/**
 * Builds the « Avancement du dossier » timeline: a Dépôt step followed by the five
 * phases. Phases before the current one show as done even when they were skipped
 * (e.g. dossiers created directly in « Étude recevabilité DDEP »). A dossier
 * « classé sans suite » shows every phase it went through as done, none current.
 */
export function timelineSteps(
  events: readonly PhaseEvent[],
  depotDate: Date | string | null | undefined,
): TimelineStep[] {
  const ascending = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
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
