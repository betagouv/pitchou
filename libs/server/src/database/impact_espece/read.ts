import type { Knex } from "knex";

import { CRITERES_QUANTIFIES } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

import { directDatabaseConnection } from "../../database.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FrontEndImpactEspece } from "@pitchou/types/API_Pitchou.ts";
import type { QuantifiedImpact } from "@pitchou/types/especesImpact.d.ts";

type CriteriaColumns = { [K in (typeof CRITERES_QUANTIFIES)[number][0]]: boolean | null };

type JoinedRow = CriteriaColumns & {
  cd_ref: string;
  noms_vernaculaires: string[] | null;
  noms_scientifiques: string[] | null;
  espece_cnpn: boolean | null;
  espece_ministerielle: boolean | null;
  identifiant_pitchou: string | null;
  type_impact_libelle: string | null;
  methode_libelle: string | null;
  moyen_de_poursuite_libelle: string | null;
  nombre_individus: string | null;
  nids: number | null;
  oeufs: number | null;
  surface_habitat_detruit: number | null;
};

function criteriaAllowedOf(row: JoinedRow): QuantifiedImpact[] {
  return CRITERES_QUANTIFIES.filter(([criterion]) => row[criterion]).map(
    ([, _criterion]) => _criterion,
  );
}

function toImpactEspece(row: JoinedRow): FrontEndImpactEspece {
  return {
    espece: {
      CD_REF: row.cd_ref,
      // The référentiel holds the names; an espèce that has left it keeps its CD_REF for a label.
      nomVernaculaire: row.noms_vernaculaires?.[0] ?? row.cd_ref,
      nomScientifique: row.noms_scientifiques?.[0] ?? row.cd_ref,
      especeCNPN: row.espece_cnpn ?? false,
      especeMinisterielle: row.espece_ministerielle ?? false,
    },
    typeImpact: row.identifiant_pitchou
      ? {
          identifiantPitchou: row.identifiant_pitchou,
          libelle: row.type_impact_libelle ?? row.identifiant_pitchou,
          criteriaAllowed: criteriaAllowedOf(row),
        }
      : null,
    methode: row.methode_libelle,
    moyenDePoursuite: row.moyen_de_poursuite_libelle,
    nombreIndividus: row.nombre_individus,
    nids: row.nids,
    oeufs: row.oeufs,
    surfaceHabitatDetruit: row.surface_habitat_detruit,
  };
}

export function getImpactOnEspeces(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FrontEndImpactEspece[]> {
  return (
    databaseConnection("impact_espece")
      .select([
        "impact_espece.cd_ref as cd_ref",
        "espece_protegee.noms_vernaculaires as noms_vernaculaires",
        "espece_protegee.noms_scientifiques as noms_scientifiques",
        "espece_protegee.espece_cnpn as espece_cnpn",
        "espece_protegee.espece_ministerielle as espece_ministerielle",
        "impact_type.identifiant_pitchou as identifiant_pitchou",
        "impact_type.libelle_pitchou as type_impact_libelle",
        "impact_type.critere_nombre_individus as critere_nombre_individus",
        "impact_type.critere_nids as critere_nids",
        "impact_type.critere_oeufs as critere_oeufs",
        "impact_type.critere_surface_habitat_detruit as critere_surface_habitat_detruit",
        "impact_methode.libelle_pitchou as methode_libelle",
        "impact_moyen_de_poursuite.libelle_pitchou as moyen_de_poursuite_libelle",
        "impact_espece.nombre_individus as nombre_individus",
        "impact_espece.nids as nids",
        "impact_espece.oeufs as oeufs",
        "impact_espece.surface_habitat_detruit as surface_habitat_detruit",
      ])
      // `espece_protegee` is a view, so there is no foreign key behind this join.
      .leftJoin("espece_protegee", { "espece_protegee.cd_ref": "impact_espece.cd_ref" })
      .leftJoin("impact_type", { "impact_type.identifiant_pitchou": "impact_espece.impact_type" })
      .leftJoin("impact_methode", { "impact_methode.code": "impact_espece.impact_methode" })
      // Composite key: the same code means one thing under each directive, the classification tells
      // them apart.
      .leftJoin("impact_moyen_de_poursuite", {
        "impact_moyen_de_poursuite.code": "impact_espece.impact_moyen_de_poursuite",
        "impact_moyen_de_poursuite.classification": "impact_espece.classification",
      })
      .where({ "impact_espece.dossier": dossierId })
      .orderBy("impact_espece.id")
      .then((rows: JoinedRow[]) => rows.map(toImpactEspece))
  );
}
