import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { SortKey } from "./query.ts";

export type DossierSection = {
  /** Stable key for the `{#each}` block; a month may open several sections */
  key: string;
  /** e.g. « Déposés en juillet 2026 », « Échéance en juillet 2026 » */
  title: string;
  dossiers: DossierSummary[];
};

/** Retrieves the last notification update of a dossier, unknown when never notified */
export type LastModifiedDate = (id: DossierSummary["id"]) => Date | string | null;

const WORDING: Record<
  SortKey,
  { monthTitle: (month: string) => string; unknownTitle: string; timelineLabel: string }
> = {
  depositDate: {
    monthTitle: (month) => `Déposés en ${month}`,
    unknownTitle: "Date de dépôt inconnue",
    timelineLabel: "Déposé le",
  },
  lastModified: {
    monthTitle: (month) => `Dernièrement modifiés en ${month}`,
    unknownTitle: "Date de dernière modification inconnue",
    timelineLabel: "Modifié le",
  },
  nextDueDate: {
    monthTitle: (month) => `Échéance en ${month}`,
    unknownTitle: "Date d'échéance inconnue",
    timelineLabel: "Échéance le",
  },
};

/** Screen-reader prefix for the date shown on the vertical timeline, e.g. « Déposé le » */
export function timelineDateLabel(sortKey: SortKey): string {
  return WORDING[sortKey].timelineLabel;
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The date the list is sorted on — the one the sections group by and the vertical
 * timeline displays, so the three always tell the same story.
 */
export function dossierSortDate(
  dossier: DossierSummary,
  sortKey: SortKey,
  lastModifiedDate: LastModifiedDate,
): Date | undefined {
  switch (sortKey) {
    case "lastModified":
      return toDate(lastModifiedDate(dossier.id));
    case "nextDueDate":
      return toDate(dossier.next_due_date);
    case "depositDate":
    default:
      return toDate(dossier.depot_date);
  }
}

/**
 * Splits an already-sorted list into « <tri> en <mois> <année> » sections, following the
 * active sort key's date and wording. Only consecutive dossiers are grouped, so the
 * caller's ordering is never rearranged: a sort that interleaves months simply opens
 * several sections for the same month.
 */
export function groupDossiersByMonth(
  dossiers: DossierSummary[],
  sortKey: SortKey,
  lastModifiedDate: LastModifiedDate,
): DossierSection[] {
  const wording = WORDING[sortKey];
  const sections: DossierSection[] = [];
  let currentMonth: string | undefined;

  for (const dossier of dossiers) {
    const date = dossierSortDate(dossier, sortKey, lastModifiedDate);
    const month = date ? formatDateAbsolute(date, "yyyy-MM") : "inconnu";
    if (month !== currentMonth) {
      currentMonth = month;
      sections.push({
        key: `${month}-${sections.length}`,
        title: date
          ? wording.monthTitle(formatDateAbsolute(date, "MMMM yyyy"))
          : wording.unknownTitle,
        dossiers: [],
      });
    }
    sections[sections.length - 1].dossiers.push(dossier);
  }

  return sections;
}
