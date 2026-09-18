import { differenceInCalendarDays } from "date-fns";

/**
 * Urgency of an échéance, mapped to the DSFR badge colours: `info` is blue, `warning`
 * orange and `error` red.
 */
export type EcheanceUrgency = "info" | "warning" | "error";

export type Echeance = {
  /** Days between today and the échéance: positive ahead of it, negative once overdue */
  daysLeft: number;
  label: string;
  urgency: EcheanceUrgency;
};

/** At or below this many days left, the échéance turns orange rather than blue. */
const WARNING_THRESHOLD = 8;

/**
 * Describes an échéance as the tag shown on a dossier: « Échéance J-X » (blue from
 * {@link WARNING_THRESHOLD} + 1 days away, orange once it gets closer), « Échéance jour J »
 * on the day itself, then « Retard J+X » once it has passed.
 */
export function describeEcheance(
  dueDate: Date | string | null | undefined,
  today: Date = new Date(),
): Echeance | undefined {
  if (!dueDate) return undefined;

  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(date.getTime())) return undefined;

  const daysLeft = differenceInCalendarDays(date, today);

  if (daysLeft < 0) {
    return { daysLeft, label: `Retard J+${-daysLeft}`, urgency: "error" };
  }
  if (daysLeft === 0) {
    return { daysLeft, label: "Échéance jour J", urgency: "error" };
  }
  return {
    daysLeft,
    label: `Échéance J-${daysLeft}`,
    urgency: daysLeft <= WARNING_THRESHOLD ? "warning" : "info",
  };
}
