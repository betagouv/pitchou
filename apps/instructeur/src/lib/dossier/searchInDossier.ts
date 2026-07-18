import lunr from "lunr";
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
import lunrfr from "lunr-languages/lunr.fr";

import { removeAccents } from "@pitchou/common/stringManipulation.ts";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

stemmerSupport(lunr);
lunrfr(lunr);

const createIndexableDossier = (dossier: DossierSummary): StringValues<Partial<DossierSummary>> => {
  const {
    id,
    name,
    demarche_numerique_number,
    communes,
    deposant_last_name,
    deposant_first_names,
    demandeur_personne_physique_first_names,
    demandeur_personne_physique_last_name,
    demandeur_personne_morale_legal_name,
  } = dossier;

  return {
    id: id.toString(),
    demarche_numerique_number: demarche_numerique_number?.toString(),
    name: removeAccents(name || ""),
    communes: communes?.map(({ name }) => removeAccents(name || "")).join(" ") || "",
    deposant_last_name: removeAccents(deposant_last_name || ""),
    deposant_first_names: removeAccents(deposant_first_names || ""),
    demandeur_personne_physique_first_names: removeAccents(
      demandeur_personne_physique_first_names || "",
    ),
    demandeur_personne_physique_last_name: removeAccents(
      demandeur_personne_physique_last_name || "",
    ),
    demandeur_personne_morale_legal_name: removeAccents(demandeur_personne_morale_legal_name || ""),
  };
};

const indexCache: Map<DossierSummary[], lunr.Index> = new Map();

const createDossiersIndex = (dossiers: DossierSummary[]): lunr.Index => {
  if (indexCache.has(dossiers))
    // @ts-expect-error TS does not understand that .get returns a lunr.Index after a positive .has
    return indexCache.get(dossiers);
  else {
    const index = lunr(function () {
      // @ts-ignore TS does not understand that we added lunrfr
      this.use(lunr.fr);

      this.ref("id");
      this.field("demarche_numerique_number");
      this.field("communes");
      this.field("name");
      this.field("deposant_last_name");
      this.field("deposant_first_names");
      this.field("demandeur_personne_physique_first_names");
      this.field("demandeur_personne_physique_last_name");
      this.field("demandeur_personne_morale_legal_name");

      for (const dossier of dossiers) {
        this.add(createIndexableDossier(dossier));
      }
    });

    indexCache.set(dossiers, index);
    return index;
  }
};

export const findDossierIdsMatchingText = (
  textToSearch: string,
  dossiers: DossierSummary[],
): Set<DossierSummary["id"]> => {
  const index = createDossiersIndex(dossiers);
  const lunrResults = index.search(textToSearch);

  // @ts-expect-error TS does not know that the `ref` corresponds to the dossier's `id`
  return new Set(lunrResults.map(({ ref }) => Number(ref)));
};
