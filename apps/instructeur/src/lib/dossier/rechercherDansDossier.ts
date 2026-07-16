import lunr from "lunr";
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
import lunrfr from "lunr-languages/lunr.fr";

import { removeAccents } from "@pitchou/common/manipulationStrings.ts";

import type { StringValues } from "@pitchou/types/tools.d.ts";
import type { DossierResume } from "@pitchou/types/API_Pitchou.ts";

stemmerSupport(lunr);
lunrfr(lunr);

const creerDossierIndexable = (dossier: DossierResume): StringValues<Partial<DossierResume>> => {
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

const indexCache: Map<DossierResume[], lunr.Index> = new Map();

const creerIndexDossiers = (dossiers: DossierResume[]): lunr.Index => {
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
        this.add(creerDossierIndexable(dossier));
      }
    });

    indexCache.set(dossiers, index);
    return index;
  }
};

export const trouverDossiersIdCorrespondantsATexte = (
  texteAChercher: string,
  dossiers: DossierResume[],
): Set<DossierResume["id"]> => {
  const index = creerIndexDossiers(dossiers);
  const lunrResultats = index.search(texteAChercher);

  // @ts-expect-error TS does not know that the `ref` corresponds to the dossier's `id`
  return new Set(lunrResultats.map(({ ref }) => Number(ref)));
};
