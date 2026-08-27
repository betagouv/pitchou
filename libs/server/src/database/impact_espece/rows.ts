import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { ImpactEspeceInitializer } from "@pitchou/types/database/public/ImpactEspece.ts";
import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import type {
  DescriptionImpact,
  DescriptionMenacesEspeces,
  EtreVivantAtteint,
} from "@pitchou/types/especesImpact.d.ts";

const CLASSIFICATIONS: ClassificationEtreVivant[] = ["oiseau", "faune non-oiseau", "flore"];

/**
 * A hand-edited spreadsheet holds a number as often as it holds the text of one, and the parser
 * passes the cell through as it found it — so `"4000"` has to reach the column as 4000 rather than
 * be dropped as unreadable.
 */
function toIntegerOrNull(valeur: number | string | undefined): number | null {
  if (valeur === undefined || valeur === null || valeur === "") return null;

  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.round(nombre) : null;
}

export function fromFileToDatabaseImpactEspeceRow(
  impactEspece: DescriptionMenacesEspeces,
  dossier: Dossier["id"],
  source_file: FileId,
): ImpactEspeceInitializer[] {
  return CLASSIFICATIONS.flatMap((classification) =>
    (impactEspece[classification] ?? []).map((impact: EtreVivantAtteint & DescriptionImpact) => ({
      dossier,
      source_file,
      cd_ref: impact.espèce.CD_REF,
      classification,
      impact_type: impact.activité?.["Identifiant Pitchou"] ?? null,
      impact_methode: impact.méthode?.Code ?? null,
      impact_moyen_de_poursuite: impact.moyenDePoursuite?.Code ?? null,
      // A range such as '11-100', never a number, but a hand-edited file can hold `5`.
      nombre_individus:
        impact.nombreIndividus === undefined || impact.nombreIndividus === null
          ? null
          : String(impact.nombreIndividus),
      nids: toIntegerOrNull(impact.nombreNids),
      oeufs: toIntegerOrNull(impact.nombreOeufs),
      surface_habitat_detruit: toIntegerOrNull(impact.surfaceHabitatDétruit),
    })),
  ) as ImpactEspeceInitializer[];
}
