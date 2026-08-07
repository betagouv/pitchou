import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import type {
  CritereName,
  ReferentielProjete,
  TypeImpactProjete,
  ValeurProjetee,
} from "./referentielTypeImpactMethodeMoyenDePoursuite.fixture.types.ts";

const criteres = (enabled: CritereName[]): Record<CritereName, boolean> => ({
  methode: enabled.includes("methode"),
  moyenDePoursuite: enabled.includes("moyenDePoursuite"),
  nombreIndividus: enabled.includes("nombreIndividus"),
  nids: enabled.includes("nids"),
  oeufs: enabled.includes("oeufs"),
  surfaceHabitatDetruit: enabled.includes("surfaceHabitatDetruit"),
});
const impact = (
  identifiantPitchou: string,
  codeEuropeen: string,
  classification: ClassificationEtreVivant,
  libellePitchou: string,
  enabled: CritereName[],
): TypeImpactProjete => ({
  identifiantPitchou,
  codeEuropeen,
  classification,
  libellePitchou,
  criteres: criteres(enabled),
});
const valeur = (
  code: string,
  classification: ClassificationEtreVivant,
  libellePitchou: string,
): ValeurProjetee => ({ code, classification, libellePitchou });
const methodeIndividus: CritereName[] = ["methode", "moyenDePoursuite", "nombreIndividus"];

export const REFERENTIEL_ATTENDU: ReferentielProjete = {
  typesImpact: [
    impact("P-1", "1", "oiseau", "Destruction/mutilation de spécimens", methodeIndividus),
    impact("P-2-1", "2", "oiseau", "Capture pour captivité temporaire ou définitive", [
      ...methodeIndividus,
      "nids",
      "oeufs",
      "surfaceHabitatDetruit",
    ]),
    impact("P-2-2", "2", "oiseau", "Transport de spécimens vivants ou morts", [
      ...methodeIndividus,
      "nids",
      "oeufs",
      "surfaceHabitatDetruit",
    ]),
    impact("P-3", "3", "oiseau", "Capture/relâcher immédiat", methodeIndividus),
    impact("P-4-1", "4", "oiseau", "Destruction de nids/oeufs", ["nids", "oeufs"]),
    impact("P-4-2", "4", "oiseau", "Dégradation/destruction d’aires de repos/reproduction", [
      "surfaceHabitatDetruit",
    ]),
    impact("P-5", "5", "oiseau", "Enlèvement d’oeufs (même vides)", ["oeufs"]),
    impact("P-6", "6", "oiseau", "Peturbation intentionnelle, effarouchement", ["nombreIndividus"]),
    impact(
      "P-7",
      "7",
      "oiseau",
      "Détention de spécimens vivants ou morts ou de matériel biologique",
      ["nombreIndividus"],
    ),
    impact(
      "P-8",
      "8",
      "oiseau",
      "Pour l’achat ou la vente : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
      ["nombreIndividus"],
    ),
    impact(
      "P-10",
      "10",
      "faune non-oiseau",
      "Destruction/mutilation de spécimens",
      methodeIndividus,
    ),
    impact(
      "P-20",
      "20",
      "faune non-oiseau",
      "Capture pour captivité temporaire ou définitive",
      methodeIndividus,
    ),
    impact("P-30", "30", "faune non-oiseau", "Capture/relâcher immédiat", methodeIndividus),
    impact("P-40", "40", "faune non-oiseau", "Peturbation, effarouchement", ["nombreIndividus"]),
    impact("P-50", "50", "faune non-oiseau", "Destruction/enlèvement d’oeufs/pontes", [
      "nombreIndividus",
    ]),
    impact(
      "P-60",
      "60",
      "faune non-oiseau",
      "Dégradation/destruction d’aires de repos/reproduction",
      ["surfaceHabitatDetruit"],
    ),
    impact("P-70-1", "70", "faune non-oiseau", "Détention de spécimens vivants ou morts", [
      "nombreIndividus",
    ]),
    impact("P-70-2", "70", "faune non-oiseau", "Transport de spécimens vivants ou morts", [
      "nombreIndividus",
    ]),
    impact(
      "P-70-3",
      "70",
      "faune non-oiseau",
      "Pour l’achat la vente ou l’échange : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
      ["nombreIndividus"],
    ),
    impact(
      "P-80",
      "80",
      "flore",
      "Cueillette, collecte, coupe, déracinement ou destruction délibérés de spécimens dans le milieu naturel",
      ["surfaceHabitatDetruit"],
    ),
    impact(
      "P-90",
      "90",
      "flore",
      "Conservation, transport, vente, échange de spécimens vivants ou morts ou matériels biologiques",
      ["nombreIndividus"],
    ),
  ],
  methodes: [
    valeur("0", "oiseau", "Par une méthode sélective, non massive"),
    valeur(
      "1",
      "oiseau",
      "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    ),
    valeur(
      "2",
      "oiseau",
      "Par une des méthodes suivantes : Collets, gluaux, hameçons, oiseaux vivants utilisés comme appelants aveuglés ou mutilés, enregistreurs, appareils électrocutants, sources lumineuses artificielles, miroirs, dispositifs pour éclairer les cibles, dispositifs de visée comportant un convertisseur d’image ou un amplificateur d’image électronique pour tir de nuit, explosifs, filets, pièges-trappes, appâts empoisonnés ou tranquillisants, armes semi-automatiques ou automatiques dont le chargeur peut contenir plus de deux cartouches.",
    ),
    valeur("10", "faune non-oiseau", "Par une méthode sélective"),
    valeur(
      "11",
      "faune non-oiseau",
      "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    ),
    valeur(
      "12",
      "faune non-oiseau",
      "Pour les mammifères, par l’une des méthodes suivantes : Animaux aveugles ou mutilés utilisés comme leurres vivants, magnétophones, appareils électriques et électroniques capables de tuer ou d’assommer, sources lumineuses artificielles, miroirs et autres dispositifs d’éblouissement, dispositifs pour éclairer les cibles, dispositifs de visée pour le tir de nuit comprenant une loupe électronique ou un convertisseur d’image, des explosifs, des pièges ou des filets non sélectifs selon leur principe ou leurs conditions d’utilisation, des arbalètes, des poisons et des appâts empoisonnés ou anesthésiques, des gazages ou des fumées, armes semi-automatiques ou automatiques avec un chargeur capable de contenir plus de deux cartouches de munitions",
    ),
    valeur(
      "13",
      "faune non-oiseau",
      "Pour les poissons, par l’une des méthodes suivantes : Explosifs, armes à feu, poisons, anesthésiques, électricité à courant alternatif, sources lumineuses artificielles",
    ),
    valeur(
      "14",
      "faune non-oiseau",
      "Pour les écrevisses, par l’une des méthodes suivantes :  Explosifs, poisons",
    ),
  ],
  moyensDePoursuite: [
    valeur("0", "oiseau", "Autre/aucune poursuite"),
    valeur("1", "oiseau", "Avion"),
    valeur("2", "oiseau", "Véhicule automobile"),
    valeur("3", "oiseau", "Bateaux propulsés à une vitesse supérieure à 5 km/h"),
    valeur("4", "oiseau", "Bateaux propulsés à une vitesse supérieure 18 km/h en haute mer"),
    valeur("0", "faune non-oiseau", "Autre/aucune poursuite"),
    valeur("1", "faune non-oiseau", "Aéronefs"),
    valeur("2", "faune non-oiseau", "Véhicules à moteur en mouvement"),
  ],
};
