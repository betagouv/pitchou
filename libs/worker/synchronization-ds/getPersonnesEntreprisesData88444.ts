import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type {
  IdentiteDossierData,
  PersonnesEntreprisesDataInitializer,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type {
  DemarchesSimplifeesAddress,
  DossierDS88444,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import { inseeHeadcountRangeLabel } from "./inseeHeadcountRange.ts";

function formatPostalAddress(
  address: DemarchesSimplifeesAddress | null | undefined,
): string | undefined {
  if (!address) return undefined;
  const secondLine = [address.postalCode, address.cityName].filter(Boolean).join(" ");
  return [address.streetAddress, secondLine].filter(Boolean).join("\n") || undefined;
}

export function getPersonnesEntreprisesData88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): PersonnesEntreprisesDataInitializer {
  const { demandeur, champs, nomMandataire = "", prenomMandataire = "", usager } = dossierDS;
  const champById = new Map<string | undefined, any>();
  for (const champ of champs) champById.set(champ.id, champ);

  const personneMoraleOuPhysique = champById.get(
    pitchouKeyToChampDS.get("Le demandeur est…"),
  )?.stringValue;
  const phoneContact = champById.get(
    pitchouKeyToChampDS.get("Numéro de téléphone de contact"),
  )?.stringValue;
  const emailContact = champById.get(
    pitchouKeyToChampDS.get("Adresse mail de contact"),
  )?.stringValue;
  const hasMandataire = Boolean(nomMandataire || prenomMandataire);
  const demandeurIdentityEmail = demandeur.email || (hasMandataire ? undefined : usager.email);
  const deposant = {
    first_names: demandeur.prenom,
    last_name: demandeur.nom,
    email: demandeurIdentityEmail ? normalizeEmail(demandeurIdentityEmail) : undefined,
  };
  const identites: IdentiteDossierData[] = [
    {
      type: "demandeur",
      last_name: demandeur.nom || null,
      first_names: demandeur.prenom || null,
      email: demandeurIdentityEmail ? normalizeEmail(demandeurIdentityEmail) : null,
      phone: null,
      role: null,
    },
  ];

  if (hasMandataire) {
    identites.push({
      type: "mandataire",
      last_name: nomMandataire || null,
      first_names: prenomMandataire || null,
      email: usager.email ? normalizeEmail(usager.email) : null,
      phone: null,
      role: null,
    });
  }

  let demandeurPersonnePhysique;
  if (personneMoraleOuPhysique === "une personne physique") {
    const email = emailContact || demandeur.email || deposant.email;
    const addressChamp = champById.get(pitchouKeyToChampDS.get("Adresse"));
    const role = champById.get(pitchouKeyToChampDS.get("Qualification"))?.stringValue;
    demandeurPersonnePhysique = {
      first_names: demandeur.prenom,
      last_name: demandeur.nom,
      email: email ? normalizeEmail(email) : undefined,
      address: formatPostalAddress(addressChamp?.address),
      phone: phoneContact || undefined,
      role: role || undefined,
    };
  }

  let demandeurPersonneMorale;
  const etablissement = champById.get(pitchouKeyToChampDS.get("Numéro de SIRET"))?.etablissement;
  if (etablissement) {
    const { siret, address, entreprise, libelleNaf, naf } = etablissement;
    const {
      raisonSociale,
      siren,
      formeJuridique,
      dateCreation,
      etatAdministratif,
      capitalSocial,
      codeEffectifEntreprise,
    } = entreprise ?? {};
    demandeurPersonneMorale = {
      siret,
      legal_name: raisonSociale,
      address: formatPostalAddress(address),
      siren: siren || undefined,
      legal_form: formeJuridique || undefined,
      naf_code: naf || undefined,
      naf_label: libelleNaf || undefined,
      creation_date: dateCreation || undefined,
      admin_status: etatAdministratif || undefined,
      headcount: inseeHeadcountRangeLabel(codeEffectifEntreprise),
      share_capital: capitalSocial && capitalSocial !== "-1" ? capitalSocial : undefined,
      insee_code: address?.cityCode || undefined,
      postal_code: address?.postalCode || undefined,
      department: address?.departmentName || undefined,
      region: address?.regionName || undefined,
    };
  }

  if (personneMoraleOuPhysique === "une personne morale") {
    const lastName = champById.get(pitchouKeyToChampDS.get("Nom du représentant"))?.stringValue;
    const firstNames = champById.get(
      pitchouKeyToChampDS.get("Prénom du représentant"),
    )?.stringValue;
    const role = champById.get(pitchouKeyToChampDS.get("Qualité du représentant"))?.stringValue;
    if (lastName || firstNames || role || emailContact || phoneContact) {
      identites.push({
        type: "representant",
        last_name: lastName || null,
        first_names: firstNames || null,
        email: emailContact ? normalizeEmail(emailContact) : null,
        phone: phoneContact || null,
        role: role || null,
      });
    }
  }

  return {
    deposant,
    demandeur_personne_morale: demandeurPersonneMorale,
    demandeur_personne_physique: demandeurPersonnePhysique,
    identites,
  };
}
