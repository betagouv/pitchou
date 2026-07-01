import { normalisationEmail } from "@pitchou/common/manipulationStrings.ts";

import type { DossierDS88444 } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/démarche-numérique/Démarche88444.ts";
import type { ChampDescriptor } from "@pitchou/types/démarche-numérique/schema.ts";
import type { PorteurDeProjet } from "@pitchou/types/PorteurDeProjet.ts";

export function getPorteurDeProjet88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): PorteurDeProjet {
  const { demandeur, champs, usager, deposeParUnTiers } = dossierDS;

  const champById = new Map<string | undefined, any>();
  for (const champ of champs) {
    champById.set(champ.id, champ);
  }

  const valeurChamp = (label: keyof DossierDemarcheNumerique88444): string | null =>
    champById.get(pitchouKeyToChampDS.get(label))?.stringValue || null;

  const normaliser = (email: string | null | undefined): string | null =>
    email ? normalisationEmail(email) : null;

  const adresse = valeurChamp("Adresse");
  const telephone = valeurChamp("Numéro de téléphone de contact");
  const emailDeContact = valeurChamp("Adresse mail de contact");

  const personneMoraleOuPhysique = valeurChamp("Le demandeur est…");

  if (personneMoraleOuPhysique === "une personne morale") {
    let siret: string | null = null;
    const SIRETChamp = champById.get(pitchouKeyToChampDS.get("Numéro de SIRET"));
    if (SIRETChamp && SIRETChamp.etablissement) {
      siret = SIRETChamp.etablissement.siret;
    }
    return {
      type: "personne morale",
      siret: siret,
      adresse,
      nom_representant: valeurChamp("Nom du représentant"),
      prenom_representant: valeurChamp("Prénom du représentant"),
      qualite_representant: valeurChamp("Qualité du représentant"),
      telephone,
      email: normaliser(emailDeContact),
    };
  }

  const email = emailDeContact || demandeur.email || (deposeParUnTiers ? null : usager.email);

  return {
    type: "personne physique",
    nom: demandeur.nom ?? null,
    prenom: demandeur.prenom ?? null,
    qualification: valeurChamp("Qualification"),
    adresse,
    telephone,
    email: normaliser(email),
  };
}
