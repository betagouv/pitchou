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
    nom,
    number_demarches_simplifiées,
    communes,
    déposant_nom: deposant_nom,
    déposant_prénoms: deposant_prenoms,
    demandeur_personne_physique_prénoms: demandeur_personne_physique_prenoms,
    demandeur_personne_physique_nom,
    demandeur_personne_morale_raison_sociale,
  } = dossier;

  return {
    id: id.toString(),
    number_demarches_simplifiées: number_demarches_simplifiées?.toString(),
    nom: removeAccents(nom || ""),
    communes: communes?.map(({ name }) => removeAccents(name || "")).join(" ") || "",
    déposant_nom: removeAccents(deposant_nom || ""),
    déposant_prénoms: removeAccents(deposant_prenoms || ""),
    demandeur_personne_physique_prénoms: removeAccents(demandeur_personne_physique_prenoms || ""),
    demandeur_personne_physique_nom: removeAccents(demandeur_personne_physique_nom || ""),
    demandeur_personne_morale_raison_sociale: removeAccents(
      demandeur_personne_morale_raison_sociale || "",
    ),
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
      this.field("number_demarches_simplifiées");
      this.field("communes");
      this.field("nom");
      this.field("déposant_nom");
      this.field("déposant_prénoms");
      this.field("demandeur_personne_physique_prénoms");
      this.field("demandeur_personne_physique_nom");
      this.field("demandeur_personne_morale_raison_sociale");

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
