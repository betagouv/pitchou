import {
  sortDossiersByColumnAlphabetically,
  sortDossiersByPhaseProchaineAction,
} from "./sortDossiers.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { TableSort } from "@pitchou/types/interfaceUtilisateur.ts";

export function createSuiviInstructionSorts(
  getDossiers: () => DossierSummary[],
  setDossiers: (dossiers: DossierSummary[]) => void,
) {
  const alphabetical = (field: any, prefix: string) =>
    [
      {
        nom: "Trier de A à Z",
        id: `${prefix}-AZ`,
        sort: () => setDossiers(sortDossiersByColumnAlphabetically(getDossiers(), field)),
      },
      {
        nom: "Trier de Z à A",
        id: `${prefix}-ZA`,
        sort: () => setDossiers(sortDossiersByColumnAlphabetically(getDossiers(), field).reverse()),
      },
    ] as TableSort[];
  const activity = alphabetical("main_activite", "ActivitéPrincipale");
  const name = alphabetical("name", "NomProjet");
  const location = alphabetical("localisation", "Localisation");
  const owner = alphabetical("porteur de projet", "PorteurDeProjet");
  const priority: TableSort[] = [
    {
      nom: "Prioriser",
      id: "Priorisation-PhaseAction",
      sort: () => setDossiers(sortDossiersByPhaseProchaineAction(getDossiers())),
    },
  ];
  return {
    activity,
    name,
    location,
    owner,
    priority,
    all: [...activity, ...name, ...location, ...owner, ...priority],
  };
}
