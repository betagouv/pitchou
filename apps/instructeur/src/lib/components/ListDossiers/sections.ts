import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

export type DossierSection = {
  /** Stable key for the `{#each}` block; a month may open several sections */
  key: string;
  /** e.g. « Déposés en juillet 2026 » */
  title: string;
  dossiers: DossierSummary[];
};

function depotMonth(dossier: DossierSummary): string {
  return dossier.depot_date ? formatDateAbsolute(dossier.depot_date, "yyyy-MM") : "inconnu";
}

function sectionTitle(dossier: DossierSummary): string {
  return dossier.depot_date
    ? `Déposés en ${formatDateAbsolute(dossier.depot_date, "MMMM yyyy")}`
    : "Date de dépôt inconnue";
}

/**
 * Splits an already-sorted list into « Déposés en <mois> <année> » sections. Only consecutive
 * dossiers are grouped, so the caller's ordering is never rearranged: a sort that interleaves
 * months simply opens several sections for the same month.
 */
export function groupDossiersByDepotMonth(dossiers: DossierSummary[]): DossierSection[] {
  const sections: DossierSection[] = [];
  let currentMonth: string | undefined;

  for (const dossier of dossiers) {
    const month = depotMonth(dossier);
    if (month !== currentMonth) {
      currentMonth = month;
      sections.push({
        key: `${month}-${sections.length}`,
        title: sectionTitle(dossier),
        dossiers: [],
      });
    }
    sections[sections.length - 1].dossiers.push(dossier);
  }

  return sections;
}
