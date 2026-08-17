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

function toIntegerOrNull(valeur: number | undefined): number | null {
  return valeur === undefined || valeur === null || !Number.isFinite(valeur)
    ? null
    : Math.round(valeur);
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
