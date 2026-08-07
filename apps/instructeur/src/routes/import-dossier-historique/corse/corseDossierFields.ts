import {
  formatDepartementFromValue,
  extractCommunes,
  getCommuneData,
} from "../importDossierUtils.ts";
import type { Alert } from "../importDossierUtils.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierCorseRow } from "./DossierCorseRow.ts";

const sirets = new Map([
  ["ADIMAT", "33358398700032"],
  ["AÉROPORT DE CALVI", "30638506300038"],
  ["AKUO ENERGIE CORSE", "50518633800057"],
  ["ALTA PISCIA", "80130439500024"],
  ["AVENIR AGRICOLE", "30483961600014"],
  ["BETAG", "42228223600047"],
  ["BRANZIZI IMMOBILIER", "43941568800043"],
  ["CAPA", "24201005600073"],
  ["CCSC", "20004076400041"],
  ["CD2A", "20007695800012"],
  ["CDC PATRIMOINE", "20007695800012"],
  ["CDC ROUTES", "20007695800012"],
  ["CG2A", "20007695800012"],
  ["CLOS DES AMANDIERS", "91095159900018"],
  ["COMMUNAUTÉ DE COMMUNES DU SUD CORSE", "20004076400041"],
  ["CONSERVATOIRE DU LITTORAL", "18000501900435"],
  ["CONSTRUCTION DU CAP", "49722037600022"],
  ["CORSE TRAVAUX", "33046450400043"],
  ["CORSEA PROMOTION", "82329102600016"],
  ["CORSICA ENERGIA", "88097833300016"],
  ["CORSICA SOLE", "88802711700017"],
  ["COSICA SOLE", "88802711700017"],
  ["DGAC", "13000577000081"],
  ["EDF", "55208131722061"],
  ["EDF PEI", "48996768700083"],
  ["EDF SEI", "55208131722061"],
  ["ERILIA", "5881167000064"],
  ["ISONI – DELTA BOIS", "48181865600011"],
  ["LANFRANCHI ENVIRONNEMENT", "50060870800037"],
  ["LE LOGIS CORSE", "31028856800051"],
  ["MAIRIE D'AMBIEGNA", "21200014500012"],
  ["MAIRIE DE BIGUGLIA", "21200037600013"],
  ["MAIRIE DE BORGO", "21200042600016"],
  ["MAIRIE DE CARGÈSE", "21200065700016"],
  ["MAIRIE DE PROPRIANO", "21200249700015"],
  ["MAIRIE GHISONACCIA", "21200123400013"],
  ["MINISTÈRE DES ARMÉES", "11009001600046"],
  ["OEHC", "33043264200016"],
  ["PROBAT", "42987846500021"],
  ["ROCCA FORTIMMO", "82334498100019"],
  ["ROCH LEANDRI", "45063550300037"],
  ["SACOI 3", "94471240500025"],
  ["SARL LANFRANCHI", "80815975000013"],
  ["SAS CAP SUD", "89229827400028"],
  ["SAS LDP IMMOBILIER", "79806317800015"],
  ["SAS ORIENTE ENVIRONNEMENT", "80970465300017"],
  ["SAS U FURNELLU", "51065127600014"],
  ["SAS VICTORIA CORP", "79960399800011"],
  ["SASU CANALE", "90182617200016"],
  ["SCCV DE L’ÉTANG D’ARASU", "81963241500017"],
  ["SCCV FORTIMMO (ROCCA)", "82334498100019"],
  ["SCCV LES RÉSIDENCES DE LA CRUCIATA", "82408014700013"],
  ["SCI COLOMBA - JEAN PERALDI", "50375429300010"],
  ["SCI RIVA BELLA", "80092305400012"],
  ["SCI RIVA BIANCA", "89338924700014"],
  ["SCVV RÉSIDENCE DU STILETTO (ROCCA)", "81320821200015"],
  ["SGBC", "33966853500059"],
  ["SNC MULINU D’ORZU", "82149158600011"],
  ["SSCB", "60675001600028"],
  ["SSCV DOMAINE DES OLIVIERS", "88036615800025"],
  ["STANECO", "39991981000024"],
  ["STOC (GROUPE PETRONI)", "39849006000025"],
  ["SUN’R", "50142867600305"],
  ["SYNDICAT RÉSIDENCE PANCRAZI", "84944461700013"],
  ["SYVADEC", "20000982700037"],
  ["TS PROMOTION", "82966042200017"],
  ["UNIVERSITÉ DE CORSE", "19202664900264"],
]);

const activities = new Map<string, DossierDemarcheNumerique88444["Activité principale"]>([
  ["ZAE", "ZAC"],
  ["Autres", "Autre"],
  ["Carrière (ICPE)", "Carrières"],
  ["Centre de tri (ICPE)", "Installations de gestion des déchets"],
  ["Centre de vacances", "Installations de loisir et de tourisme"],
  ["Électrique", "Transport énergie électrique"],
  ["Hydroélectrique", "Production énergie renouvelable - Hydroélectricité"],
  [
    "Ouvrages d’art",
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  ],
  [
    "Projet immobilier",
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  ],
  ["Routes", "Infrastructures de transport routières"],
  ["Stockage de déchets (ISDND)", "Installations de gestion des déchets"],
]);

export function corseDemandeur(row: DossierCorseRow) {
  const name = row["Nom du demandeur"].trim().toUpperCase();
  const siret = sirets.get(name);
  const alertes: Alert[] =
    !siret && name
      ? [
          {
            type: "avertissement",
            message: `La colonne "Nom du demandeur" a pour valeur "${name} mais aucun siret correspondant n'a été trouvé."`,
          },
        ]
      : [];
  return { siret, alertes };
}

export function corseActivite(
  row: DossierCorseRow,
  available: Set<DossierDemarcheNumerique88444["Activité principale"]>,
) {
  const value = row["Type de projet"].trim();
  if (available.has(value as DossierDemarcheNumerique88444["Activité principale"]))
    return { data: value as DossierDemarcheNumerique88444["Activité principale"], alertes: [] };
  const data = activities.get(value);
  if (data) return { data, alertes: [] };
  const message = `Le type de projet de ce dossier est ${value}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`;
  console.warn(message);
  return { data: "Autre" as const, alertes: [{ type: "avertissement" as const, message }] };
}

export function corseAutorisation(row: DossierCorseRow) {
  const icpe = row["Type de projet"].toLowerCase().includes("icpe");
  const sbep = row["Service Pilote"].trim().toUpperCase() === "SBEP";
  return {
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?":
      icpe || sbep ? "Oui" : "Non",
    "À quelle procédure le projet est-il soumis ?": icpe
      ? ["Autorisation ICPE"]
      : sbep
        ? ["Autorisation ICPE", "Autorisation loi sur l'eau"]
        : [],
  } as Pick<
    DossierDemarcheNumerique88444,
    | "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
    | "À quelle procédure le projet est-il soumis ?"
  >;
}

export async function corseLocalisation(row: DossierCorseRow) {
  const [departements, communeResults] = await Promise.all([
    formatDepartementFromValue(row.Département),
    Promise.all(extractCommunes(row.Commune ?? "").map(getCommuneData)),
  ]);
  const communes = communeResults
    .map((result) => result.data)
    .filter((commune) => commune !== null);
  const alertes = [
    ...communeResults.map((result) => result.alerte).filter((value) => value !== undefined),
    ...departements.alertes,
  ];
  const found = departements.data;
  const column = Array.isArray(found) ? found[0] : undefined;
  if (communes.length)
    return {
      data: {
        "Commune(s) où se situe le projet": communes,
        "Département(s) où se situe le projet": undefined,
        "Le projet se situe au niveau…": "d'une ou plusieurs communes" as const,
        "Dans quel département se localise majoritairement votre projet ?":
          column ?? communes[0].departement,
      },
      alertes,
    };
  if (communeResults.some((result) => result.alerte))
    alertes.push({
      type: "erreur",
      message:
        "Au moins une commune a été spécifiée pour cette ligne, mais aucune n'a été trouvée.",
    });
  const departments = Array.isArray(found) ? found : [{ code: "2A", nom: "Corse-du-Sud" }];
  return {
    data: {
      "Commune(s) où se situe le projet": undefined,
      "Département(s) où se situe le projet": departments,
      "Le projet se situe au niveau…": "d'un ou plusieurs départements" as const,
      "Dans quel département se localise majoritairement votre projet ?": departments[0],
    },
    alertes,
  };
}
