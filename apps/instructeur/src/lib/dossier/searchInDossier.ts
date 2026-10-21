import lunr from "lunr";
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
import lunrfr from "lunr-languages/lunr.fr";

import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { acteursSearchTerms, porteurDeProjetSearchTerms } from "#lib/dossier/displayDossier.ts";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

stemmerSupport(lunr);
lunrfr(lunr);

const createIndexableDossier = (dossier: DossierSummary): StringValues<Partial<DossierSummary>> => {
  const { id, name, demarche_numerique_number, communes, acteurs, porteur_de_projet } = dossier;

  return {
    id: id.toString(),
    demarche_numerique_number: demarche_numerique_number?.toString(),
    name: removeAccents(name || ""),
    communes: communes?.map(({ name }) => removeAccents(name || "")).join(" ") || "",
    acteurs: removeAccents(acteursSearchTerms(acteurs).join(" ")),
    porteur_de_projet: removeAccents(porteurDeProjetSearchTerms(porteur_de_projet).join(" ")),
  };
};

const indexCache: Map<DossierSummary[], lunr.Index> = new Map();

const createDossiersIndex = (dossiers: DossierSummary[]): lunr.Index => {
  const cachedIndex = indexCache.get(dossiers);
  if (cachedIndex !== undefined) return cachedIndex;
  const index = lunr(function () {
    this.use(lunr.fr);

    this.ref("id");
    this.field("demarche_numerique_number");
    this.field("communes");
    this.field("name");
    this.field("acteurs");
    this.field("porteur_de_projet");

    for (const dossier of dossiers) {
      this.add(createIndexableDossier(dossier));
    }
  });

  indexCache.set(dossiers, index);
  return index;
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
