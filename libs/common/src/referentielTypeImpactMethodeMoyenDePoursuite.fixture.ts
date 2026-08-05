import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import type { PitchouState } from "@pitchou/types/pitchouState.ts";

/**
 * Characterization fixture for the type impact / methode / moyen de poursuite referential.
 *
 * The referential is reference data: for a given source it always holds the same value.
 * `projectReferentiel` reduces it to the fields that make up the contract, so that the
 * expected value below can be compared against any producer of that referential — today
 * the `.ods` parser, tomorrow a database loader. The assertion never changes; only the
 * producer does.
 *
 * Deliberately left out of the projection:
 *  - `Libellé activité directive européenne`: up to 508 characters of directive text.
 *    Asserted non-empty in the test rather than spelled out here, so the expected value
 *    stays reviewable.
 *  - The Onagre correspondence list: the `.ods` parser concatenates its lines without a
 *    separator, so its current value cannot be compared with the `text[]` the database
 *    will hold. It is the one field whose shape changes on purpose.
 *  - `Ce qu'il y a dans Pitchou/DS au 24/07/2025`: a dated working note, not part of the
 *    specification.
 */

type Referentiel = NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>;

const CLASSIFICATIONS = ["oiseau", "faune non-oiseau", "flore"] as const;

type CritereName =
  "methode" | "moyenDePoursuite" | "nombreIndividus" | "nids" | "oeufs" | "surfaceHabitatDetruit";

type TypeImpactProjete = {
  identifiantPitchou: string;
  codeEuropeen: string;
  classification: ClassificationEtreVivant;
  libellePitchou: string;
  criteres: Record<CritereName, boolean>;
};

type ValeurProjetee = {
  code: string;
  classification: ClassificationEtreVivant;
  libellePitchou: string;
};

type ReferentielProjete = {
  typesImpact: TypeImpactProjete[];
  methodes: ValeurProjetee[];
  moyensDePoursuite: ValeurProjetee[];
};

function byClassificationThenKey<T extends { classification: ClassificationEtreVivant }>(
  key: keyof T & string,
) {
  return (a: T, b: T): number => {
    const classificationOrder =
      CLASSIFICATIONS.indexOf(a.classification) - CLASSIFICATIONS.indexOf(b.classification);
    if (classificationOrder !== 0) {
      return classificationOrder;
    }
    return String(a[key]).localeCompare(String(b[key]));
  };
}

/**
 * Reduces the referential to plain sorted arrays holding only the contract fields.
 *
 * The rows are sorted so the expected value reads in a stable order: the source spreadsheet
 * lists them in neither code nor identifier order (the Méthodes sheet reads 0, 2, 1).
 */
export function projectReferentiel(referentiel: Referentiel): ReferentielProjete {
  const typesImpact: TypeImpactProjete[] = [];
  const methodes: ValeurProjetee[] = [];
  const moyensDePoursuite: ValeurProjetee[] = [];

  for (const classification of CLASSIFICATIONS) {
    // The classification is not a column of the row: it is implied by the sub-map the entry
    // lives in, so it is stamped here to make it explicit in the expected value.
    for (const activite of referentiel.activités[classification].values()) {
      typesImpact.push({
        identifiantPitchou: activite["Identifiant Pitchou"].trim(),
        codeEuropeen: activite["Code rapportage européen"],
        classification,
        libellePitchou: activite["Libellé Pitchou"],
        criteres: {
          methode: activite["Méthode"] === "Oui",
          moyenDePoursuite: activite["Moyen de poursuite"] === "Oui",
          nombreIndividus: activite["Nombre d'individus"] === "Oui",
          nids: activite["Nids"] === "Oui",
          oeufs: activite["Œufs"] === "Oui",
          surfaceHabitatDetruit: activite["Surface habitat détruit (m²)"] === "Oui",
        },
      });
    }

    for (const methode of referentiel.méthodes[classification].values()) {
      methodes.push({
        code: methode["Code"],
        classification,
        libellePitchou: methode["Libellé Pitchou"],
      });
    }

    for (const moyenDePoursuite of referentiel.moyensDePoursuite[classification].values()) {
      moyensDePoursuite.push({
        code: moyenDePoursuite["Code"],
        classification,
        libellePitchou: moyenDePoursuite["Libellé Pitchou"],
      });
    }
  }

  return {
    typesImpact: typesImpact.sort(byClassificationThenKey("identifiantPitchou")),
    methodes: methodes.sort(byClassificationThenKey("code")),
    moyensDePoursuite: moyensDePoursuite.sort(byClassificationThenKey("code")),
  };
}

/**
 * The referential as it stands today, read from `data/activites-methodes-moyens-de-poursuite.ods`.
 *
 * 21 types impact (10 oiseau, 9 faune non-oiseau, 2 flore), 8 methodes and 8 moyens de poursuite.
 * `nids` and `oeufs` are false for every faune non-oiseau and flore row because those sheets have
 * no such column: the critere does not apply to them.
 */
export const REFERENTIEL_ATTENDU: ReferentielProjete = {
  typesImpact: [
    {
      identifiantPitchou: "P-1",
      codeEuropeen: "1",
      classification: "oiseau",
      libellePitchou: "Destruction/mutilation de spécimens",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-2-1",
      codeEuropeen: "2",
      classification: "oiseau",
      libellePitchou: "Capture pour captivité temporaire ou définitive",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: true,
        oeufs: true,
        surfaceHabitatDetruit: true,
      },
    },
    {
      identifiantPitchou: "P-2-2",
      codeEuropeen: "2",
      classification: "oiseau",
      libellePitchou: "Transport de spécimens vivants ou morts",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: true,
        oeufs: true,
        surfaceHabitatDetruit: true,
      },
    },
    {
      identifiantPitchou: "P-3",
      codeEuropeen: "3",
      classification: "oiseau",
      libellePitchou: "Capture/relâcher immédiat",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-4-1",
      codeEuropeen: "4",
      classification: "oiseau",
      libellePitchou: "Destruction de nids/oeufs",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: false,
        nids: true,
        oeufs: true,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-4-2",
      codeEuropeen: "4",
      classification: "oiseau",
      libellePitchou: "Dégradation/destruction d’aires de repos/reproduction",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: false,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: true,
      },
    },
    {
      identifiantPitchou: "P-5",
      codeEuropeen: "5",
      classification: "oiseau",
      libellePitchou: "Enlèvement d’oeufs (même vides)",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: false,
        nids: false,
        oeufs: true,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-6",
      codeEuropeen: "6",
      classification: "oiseau",
      libellePitchou: "Peturbation intentionnelle, effarouchement",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-7",
      codeEuropeen: "7",
      classification: "oiseau",
      libellePitchou: "Détention de spécimens vivants ou morts ou de matériel biologique",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-8",
      codeEuropeen: "8",
      classification: "oiseau",
      libellePitchou:
        "Pour l’achat ou la vente : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-10",
      codeEuropeen: "10",
      classification: "faune non-oiseau",
      libellePitchou: "Destruction/mutilation de spécimens",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-20",
      codeEuropeen: "20",
      classification: "faune non-oiseau",
      libellePitchou: "Capture pour captivité temporaire ou définitive",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-30",
      codeEuropeen: "30",
      classification: "faune non-oiseau",
      libellePitchou: "Capture/relâcher immédiat",
      criteres: {
        methode: true,
        moyenDePoursuite: true,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-40",
      codeEuropeen: "40",
      classification: "faune non-oiseau",
      libellePitchou: "Peturbation, effarouchement",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-50",
      codeEuropeen: "50",
      classification: "faune non-oiseau",
      libellePitchou: "Destruction/enlèvement d’oeufs/pontes",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-60",
      codeEuropeen: "60",
      classification: "faune non-oiseau",
      libellePitchou: "Dégradation/destruction d’aires de repos/reproduction",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: false,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: true,
      },
    },
    {
      identifiantPitchou: "P-70-1",
      codeEuropeen: "70",
      classification: "faune non-oiseau",
      libellePitchou: "Détention de spécimens vivants ou morts",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-70-2",
      codeEuropeen: "70",
      classification: "faune non-oiseau",
      libellePitchou: "Transport de spécimens vivants ou morts",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-70-3",
      codeEuropeen: "70",
      classification: "faune non-oiseau",
      libellePitchou:
        "Pour l’achat la vente ou l’échange : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
    {
      identifiantPitchou: "P-80",
      codeEuropeen: "80",
      classification: "flore",
      libellePitchou:
        "Cueillette, collecte, coupe, déracinement ou destruction délibérés de spécimens dans le milieu naturel",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: false,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: true,
      },
    },
    {
      identifiantPitchou: "P-90",
      codeEuropeen: "90",
      classification: "flore",
      libellePitchou:
        "Conservation, transport, vente, échange de spécimens vivants ou morts ou matériels biologiques",
      criteres: {
        methode: false,
        moyenDePoursuite: false,
        nombreIndividus: true,
        nids: false,
        oeufs: false,
        surfaceHabitatDetruit: false,
      },
    },
  ],
  methodes: [
    {
      code: "0",
      classification: "oiseau",
      libellePitchou: "Par une méthode sélective, non massive",
    },
    {
      code: "1",
      classification: "oiseau",
      libellePitchou:
        "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    },
    {
      code: "2",
      classification: "oiseau",
      libellePitchou:
        "Par une des méthodes suivantes : Collets, gluaux, hameçons, oiseaux vivants utilisés comme appelants aveuglés ou mutilés, enregistreurs, appareils électrocutants, sources lumineuses artificielles, miroirs, dispositifs pour éclairer les cibles, dispositifs de visée comportant un convertisseur d’image ou un amplificateur d’image électronique pour tir de nuit, explosifs, filets, pièges-trappes, appâts empoisonnés ou tranquillisants, armes semi-automatiques ou automatiques dont le chargeur peut contenir plus de deux cartouches.",
    },
    {
      code: "10",
      classification: "faune non-oiseau",
      libellePitchou: "Par une méthode sélective",
    },
    {
      code: "11",
      classification: "faune non-oiseau",
      libellePitchou:
        "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    },
    {
      code: "12",
      classification: "faune non-oiseau",
      libellePitchou:
        "Pour les mammifères, par l’une des méthodes suivantes : Animaux aveugles ou mutilés utilisés comme leurres vivants, magnétophones, appareils électriques et électroniques capables de tuer ou d’assommer, sources lumineuses artificielles, miroirs et autres dispositifs d’éblouissement, dispositifs pour éclairer les cibles, dispositifs de visée pour le tir de nuit comprenant une loupe électronique ou un convertisseur d’image, des explosifs, des pièges ou des filets non sélectifs selon leur principe ou leurs conditions d’utilisation, des arbalètes, des poisons et des appâts empoisonnés ou anesthésiques, des gazages ou des fumées, armes semi-automatiques ou automatiques avec un chargeur capable de contenir plus de deux cartouches de munitions",
    },
    {
      code: "13",
      classification: "faune non-oiseau",
      libellePitchou:
        "Pour les poissons, par l’une des méthodes suivantes : Explosifs, armes à feu, poisons, anesthésiques, électricité à courant alternatif, sources lumineuses artificielles",
    },
    {
      code: "14",
      classification: "faune non-oiseau",
      libellePitchou: "Pour les écrevisses, par l’une des méthodes suivantes :  Explosifs, poisons",
    },
  ],
  moyensDePoursuite: [
    {
      code: "0",
      classification: "oiseau",
      libellePitchou: "Autre/aucune poursuite",
    },
    {
      code: "1",
      classification: "oiseau",
      libellePitchou: "Avion",
    },
    {
      code: "2",
      classification: "oiseau",
      libellePitchou: "Véhicule automobile",
    },
    {
      code: "3",
      classification: "oiseau",
      libellePitchou: "Bateaux propulsés à une vitesse supérieure à 5 km/h",
    },
    {
      code: "4",
      classification: "oiseau",
      libellePitchou: "Bateaux propulsés à une vitesse supérieure 18 km/h en haute mer",
    },
    {
      code: "0",
      classification: "faune non-oiseau",
      libellePitchou: "Autre/aucune poursuite",
    },
    {
      code: "1",
      classification: "faune non-oiseau",
      libellePitchou: "Aéronefs",
    },
    {
      code: "2",
      classification: "faune non-oiseau",
      libellePitchou: "Véhicules à moteur en mouvement",
    },
  ],
};
