import { actMetTransArraysToMapBundle, isClassif } from "./especesUtils.ts";

import type {
  ActiviteMenancante,
  ByClassification,
  MethodeMenancante,
  QuantifiedImpact,
} from "@pitchou/types/especes.d.ts";
import type { ActivitesMethodesMoyensDePoursuiteBundle } from "@pitchou/types/pitchouState.ts";
import type { default as TypeImpact } from "@pitchou/types/database/public/TypeImpact.ts";
import type { default as Methode } from "@pitchou/types/database/public/Methode.ts";
import type { default as MoyenDePoursuite } from "@pitchou/types/database/public/MoyenDePoursuite.ts";

/**
 * The generated table types with their key columns widened back to `string`.
 *
 * Kanel brands key columns (`TypeImpactIdentifiantPitchou` and friends), which a row read from
 * the database satisfies but a row written by hand — in a migration or a test — does not. Since
 * this module only ever reads those columns, widening them keeps the column list tied to the
 * generated types while accepting both.
 */
export type TypeImpactRow = Omit<TypeImpact, "identifiant_pitchou"> & {
  identifiant_pitchou: string;
};
export type MethodeRow = Omit<Methode, "code"> & { code: string };
export type MoyenDePoursuiteRow = Omit<MoyenDePoursuite, "code" | "classification"> & {
  code: string;
  classification: string;
};

/** The referential as it comes out of the database, and as the API serves it. */
export type ReferentielRows = {
  typesImpact: TypeImpactRow[];
  methodes: MethodeRow[];
  moyensDePoursuite: MoyenDePoursuiteRow[];
};

const CRITERES_QUANTIFIES: [keyof TypeImpactRow, QuantifiedImpact][] = [
  ["critere_nombre_individus", "Nombre d'individus"],
  ["critere_nids", "Nids"],
  ["critere_oeufs", "Œufs"],
  ["critere_surface_habitat_detruit", "Surface habitat détruit (m²)"],
];

function oui(critereApplicable: boolean): "Oui" | "Non" {
  return critereApplicable ? "Oui" : "Non";
}

/**
 * The classification is validated rather than trusted: it is free text in the database, and it is
 * what the row gets filed under.
 */
function classificationOf(row: { classification: string }) {
  if (!isClassif(row.classification)) {
    throw new TypeError(`Classification d'espèce non reconnue : ${row.classification}`);
  }

  return row.classification;
}

function typeImpactRowToActivite(row: TypeImpactRow): ActiviteMenancante {
  return {
    "Code rapportage européen": row.code_europeen,
    "Identifiant Pitchou": row.identifiant_pitchou,
    "Libellé activité directive européenne": row.libelle_europeen,
    "Libellé Pitchou": row.libelle_pitchou,
    Méthode: oui(row.critere_methode),
    "Moyen de poursuite": oui(row.critere_moyen_de_poursuite),
    "Nombre d'individus": oui(row.critere_nombre_individus),
    Nids: oui(row.critere_nids),
    Œufs: oui(row.critere_oeufs),
    "Surface habitat détruit (m²)": oui(row.critere_surface_habitat_detruit),
  };
}

/** `MethodeMenancante` and `MoyenDePoursuiteMenacant` have the same shape, so one converter does both. */
function valeurCritereRowToMenacant(row: MethodeRow | MoyenDePoursuiteRow): MethodeMenancante {
  return {
    Code: row.code,
    Espèces: classificationOf(row),
    "Libellé activité directive européenne": row.libelle_europeen,
    "Libellé Pitchou": row.libelle_pitchou,
  };
}

/**
 * Turns the three referential tables into the bundle the app works with.
 *
 * This is the database-backed replacement for `buildActivitesMethodesMoyensDePoursuite`, which
 * built the very same bundle out of `data/activites-methodes-moyens-de-poursuite.ods`. The output
 * shape is deliberately unchanged: only the producer moved to the database.
 *
 * The rows arrive flat; the bundle indexes them the way the saisie form reads them — by
 * classification first, since an espèce only ever gets offered the types d'impact, méthodes and
 * moyens de poursuite of its own classification, then by identifiant Pitchou or code. Which
 * critères a type d'impact accepts travels with it, as the `"Oui"` / `"Non"` fields the form
 * still tests.
 *
 * It also carries `identifiantPitchouVersActivitéEtImpactsQuantifiés`, a flat index over the
 * three classifications used by the document generation. Flattening is only safe because an
 * identifiant Pitchou belongs to a single classification — a duplicate would silently drop an
 * entry, which is what the referential test guards against.
 */
export function referentielRowsToBundle({
  typesImpact,
  methodes,
  moyensDePoursuite,
}: ReferentielRows): ActivitesMethodesMoyensDePoursuiteBundle {
  const activitesParClassification: ByClassification<ActiviteMenancante[]> = {
    oiseau: [],
    "faune non-oiseau": [],
    flore: [],
  };

  const identifiantPitchouVersActiviteEtImpactsQuantifies: ActivitesMethodesMoyensDePoursuiteBundle["identifiantPitchouVersActivitéEtImpactsQuantifiés"] =
    new Map();

  for (const row of typesImpact) {
    const activite = typeImpactRowToActivite(row);

    activitesParClassification[classificationOf(row)].push(activite);

    identifiantPitchouVersActiviteEtImpactsQuantifies.set(row.identifiant_pitchou, {
      ...activite,
      impactsQuantifiés: CRITERES_QUANTIFIES.filter(([critere]) => row[critere]).map(
        ([, impact]) => impact,
      ),
    });
  }

  return {
    identifiantPitchouVersActivitéEtImpactsQuantifiés:
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    ...actMetTransArraysToMapBundle(
      activitesParClassification,
      methodes.map(valeurCritereRowToMenacant),
      moyensDePoursuite.map(valeurCritereRowToMenacant),
    ),
  };
}
