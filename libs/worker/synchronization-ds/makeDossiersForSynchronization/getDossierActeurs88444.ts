import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierActeurData } from "@pitchou/types/dossierActeur.ts";
import type { PersonnePhysiqueInitializer } from "@pitchou/types/database/public/PersonnePhysique.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

type Personne = Omit<PersonnePhysiqueInitializer, "id">;

function personne({ first_names, last_name, email, phone, role }: Partial<Personne>): Personne {
  return {
    first_names: first_names || null,
    last_name: last_name || null,
    email: email ? normalizeEmail(email) : null,
    address: null,
    phone: phone || null,
    role: role || null,
  };
}

/**
 * The people involved in a Démarche Numérique dossier, other than its porteur de projet.
 * The déposant is the mandataire when there is one, otherwise the bénéficiaire.
 */
export function getDossierActeurs88444(
  { demandeur, nomMandataire = "", prenomMandataire = "", usager }: DossierDS88444,
  champValue: (key: keyof DossierDemarcheNumerique88444) => string | undefined,
): DossierActeurData[] {
  const hasMandataire = Boolean(nomMandataire || prenomMandataire);

  const beneficiaire =
    champValue("Le demandeur est…") === "une personne physique"
      ? { porteur: true as const }
      : {
          personne: personne({
            first_names: demandeur.prenom,
            last_name: demandeur.nom,
            email: demandeur.email || (hasMandataire ? undefined : usager.email),
          }),
        };
  const acteurs: DossierActeurData[] = [
    {
      involvements: hasMandataire
        ? ["beneficiaire_demarche_numerique"]
        : ["beneficiaire_demarche_numerique", "deposant"],
      ...beneficiaire,
    },
  ];

  if (hasMandataire) {
    acteurs.push({
      involvements: ["mandataire", "deposant"],
      personne: personne({
        first_names: prenomMandataire,
        last_name: nomMandataire,
        email: usager.email,
      }),
    });
  }

  const contact = personne({
    last_name: champValue("Nom du représentant"),
    first_names: champValue("Prénom du représentant"),
    role: champValue("Qualité du représentant"),
    phone: champValue("Numéro de téléphone de contact"),
    email: champValue("Adresse mail de contact"),
  });
  if (Object.values(contact).some(Boolean)) {
    acteurs.push({ involvements: ["personne_contact"], personne: contact });
  }

  return acteurs;
}
