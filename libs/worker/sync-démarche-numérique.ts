import parseArgs from "minimist";
import { sub, format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import {
  dumpEntreprises,
  closeDatabaseConnection,
  créerTransaction,
  addRésultatSynchronisationDS88444,
} from "@pitchou/server/database.ts";
import {
  dumpDossiers,
  getDossierIdsFromDS_Ids,
  dumpDossierMessages,
  deleteDossierByDSNumber,
  synchroniserDossierDansGroupeInstructeur,
} from "@pitchou/server/database/dossier.ts";
import { listAllPersonnes, créerPersonnes } from "@pitchou/server/database/personne.ts";
import { synchroniserGroupesInstructeurs } from "@pitchou/server/database/groupe_instructeurs.ts";
import { synchroniserFichiersEspècesImpactéesDepuisDS88444 } from "@pitchou/server/database/espèces_impactées.ts";

import { recupérerDossiersRécemmentModifiés } from "@pitchou/server/démarche-numérique/recupérerDossiersRécemmentModifiés.ts";
import { recupérerGroupesInstructeurs } from "@pitchou/server/démarche-numérique/recupérerGroupesInstructeurs.ts";
import récupérerTousLesDossiersSupprimés from "@pitchou/server/démarche-numérique/recupérerListeDossiersSupprimés.ts";

import { isValidDate } from "@pitchou/common/typeFormat.ts";

import { téléchargerNouveauxFichiersMotivation } from "./synchronisation-ds/téléchargerNouveauxFichiersParType.ts";
import {
  récupérerFichiersEspècesImpactées88444,
  récupérerPiècesJointesPétitionnaire88444,
} from "./synchronisation-ds/synchronisation-dossier-88444.ts";

import {
  getDonnéesPersonnesEntreprises88444,
  makeDossiersPourSynchronisation,
} from "./synchronisation-ds/makeDossiersPourSynchronisation.ts";
import { makeColonnesCommunesDossierPourSynchro88444 } from "./synchronisation-ds/makeColonnesCommunesDossierPourSynchro88444.ts";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444 } from "@pitchou/server/database/arête_dossier__fichier_pièces_jointes_pétitionnaire.ts";
import { mettreÀjourNotification } from "./synchronisation-ds/synchronisation-notification.ts";

import type { default as DatabaseDossier } from "@pitchou/types/database/public/Dossier.ts";
import type {
  default as Personne,
  PersonneInitializer,
} from "@pitchou/types/database/public/Personne.ts";
import type { default as Entreprise } from "@pitchou/types/database/public/Entreprise.ts";
import type { default as RésultatSynchronisationDS88444 } from "@pitchou/types/database/public/RésultatSynchronisationDS88444.ts";
import type { default as Fichier } from "@pitchou/types/database/public/Fichier.ts";
import type { Message, DossierDS88444 } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type {
  SchemaDémarcheSimplifiée,
  ChampDescriptor,
} from "@pitchou/types/démarche-numérique/schema.ts";
import type {
  DossierEntreprisesPersonneInitializersPourInsert,
  DossierEntreprisesPersonneInitializersPourUpdate,
  DossierPourInsert,
  DossierPourUpdate,
} from "@pitchou/types/démarche-numérique/DossierPourSynchronisation.ts";
import type {
  DossierDemarcheNumerique88444,
  AnnotationsPriveesDemarcheNumerique88444,
} from "@pitchou/types/démarche-numérique/Démarche88444.ts";
import type {
  GetDonnéesPersonnesEntreprises,
  MakeColonnesCommunesDossierPourSynchro,
} from "./synchronisation-ds/makeDossiersPourSynchronisation.ts";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";

// récups les données de DS

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN;
if (!DEMARCHE_SIMPLIFIEE_API_TOKEN) {
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`);
}

const args = parseArgs(process.argv);

const ID_SCHEMA_DS = args.IdSchemaDS;

if (!ID_SCHEMA_DS) {
  const liste_fichiers = await readdir(
    join(import.meta.dirname, `../../data/démarche-numérique/schema-DS`),
  );
  console.error(`
Aucun argument --IdSchemaDS n'a été fourni.
Voici la liste des ids des schémas DS disponibles :
  - ${liste_fichiers.map((fichier) => fichier.slice(0, -".json".length)).join("\n  - ")}
`);
  process.exit(1);
}

let lastModified: Date;

if (typeof args.lastModified === "string" && isValidDate(new Date(args.lastModified))) {
  lastModified = new Date(args.lastModified);
} else {
  lastModified = sub(new Date(), { hours: 12 });
}
const schema: SchemaDémarcheSimplifiée = (
  await import(`../../data/démarche-numérique/schema-DS/${ID_SCHEMA_DS}.json`, {
    with: { type: "json" },
  })
).default;

const DEMARCHE_NUMBER = schema.number;

console.info(
  `Synchronisation des dossiers de la démarche`,
  DEMARCHE_NUMBER,
  "modifiés depuis le",
  format(lastModified, "d MMMM yyyy (HH:mm O) ", { locale: fr }),
  `(${formatDistanceToNow(lastModified, { locale: fr })})`,
);

const laTransactionDeSynchronisationDS = await créerTransaction();

const dossSuppP = récupérerTousLesDossiersSupprimés(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER);

const groupesInstructeursSynchronisés = recupérerGroupesInstructeurs(
  DEMARCHE_SIMPLIFIEE_API_TOKEN,
  DEMARCHE_NUMBER,
).then((groupesInstructeurs) =>
  synchroniserGroupesInstructeurs(
    groupesInstructeurs,
    DEMARCHE_NUMBER,
    laTransactionDeSynchronisationDS,
  ),
);

const dossiersDS: DossierDS88444[] = await recupérerDossiersRécemmentModifiés(
  DEMARCHE_SIMPLIFIEE_API_TOKEN,
  DEMARCHE_NUMBER,
  lastModified,
);

console.info("Nombre de dossiers", dossiersDS.length);

//console.log('3 dossiers', dossiersDS.slice(0, 3))
// console.log('dossier', dossiersDS.find(d => d.number === 26544801))

// stocker les dossiers en BDD

const pitchouKeyToChampDS = new Map(
  schema.revision.champDescriptors.map(({ label, id }: ChampDescriptor) => [label, id] as const),
) as Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>;

export const pitchouKeyToAnnotationDS = new Map(
  schema.revision.annotationDescriptors.map(
    ({ label, id }: ChampDescriptor) => [label, id] as const,
  ),
) as Map<keyof AnnotationsPriveesDemarcheNumerique88444, ChampDescriptor["id"]>;

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes(laTransactionDeSynchronisationDS);
// const allEntreprisesCurrentlyInDatabase = listAllEntreprises();

const dossiersDéjàExistantsEnBDD = await getDossierIdsFromDS_Ids(
  dossiersDS.map((d: DossierDS88444) => d.id),
  laTransactionDeSynchronisationDS,
);
const dossierNumberToDossierId = new Map(
  dossiersDéjàExistantsEnBDD.map((d) => [d.number_demarches_simplifiées, d.id]),
);

/** Télécharger les nouveaux fichiers 'motivation' */
const fichiersMotivationTéléchargésP: Promise<
  Map<DossierDS88444["number"], Fichier["id"]> | undefined
> = téléchargerNouveauxFichiersMotivation(dossiersDS, laTransactionDeSynchronisationDS);

const fichiersMotivationTéléchargés = await fichiersMotivationTéléchargésP;

const { getDonnéesPersonnesEntreprises, makeColonnesCommunesDossierPourSynchro } = (() => {
  if (DEMARCHE_NUMBER === 88444) {
    return {
      // On ne peut pas créer des types qui dépendent d'un paramètre — ici on voudrait que
      // GetDonnéesPersonnesEntreprises soit fonction de keyof DossierDemarcheNumerique88444
      getDonnéesPersonnesEntreprises:
        getDonnéesPersonnesEntreprises88444 as unknown as GetDonnéesPersonnesEntreprises,
      makeColonnesCommunesDossierPourSynchro:
        makeColonnesCommunesDossierPourSynchro88444 as unknown as MakeColonnesCommunesDossierPourSynchro,
    };
  } else {
    throw new Error(
      `Les fonctions nécessaires pour asssocier les questions du formulaire de la démarche aux données Pitchou n'ont pas été trouvées pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
    );
  }
})();

const { dossiersAInitialiserPourSynchro, dossiersAModifierPourSynchro } =
  await makeDossiersPourSynchronisation(
    dossiersDS,
    DEMARCHE_NUMBER,
    dossierNumberToDossierId,
    fichiersMotivationTéléchargés,
    pitchouKeyToChampDS,
    pitchouKeyToAnnotationDS,
    getDonnéesPersonnesEntreprises,
    makeColonnesCommunesDossierPourSynchro,
  );

/*
    Créer toutes les personnes manquantes en BDD pour qu'elles aient toutes un id
*/

const personneByEmail = new Map<Personne["email"], Personne>();
const allPersonnesCurrentlyInDatabase = await allPersonnesCurrentlyInDatabaseP;

for (const personne of allPersonnesCurrentlyInDatabase) {
  if (personne.email) {
    personneByEmail.set(personne.email, personne);
  }
}

const dossiersPourSynchronisation: readonly (
  | DossierEntreprisesPersonneInitializersPourInsert
  | DossierEntreprisesPersonneInitializersPourUpdate
)[] = Object.freeze([...dossiersAInitialiserPourSynchro, ...dossiersAModifierPourSynchro]);

const personnesInDossiersAvecEmail = new Map<PersonneInitializer["email"], PersonneInitializer>();
const personnesInDossiersSansEmail = new Map<string, PersonneInitializer>();

for (const {
  dossier: { déposant, demandeur_personne_physique },
} of dossiersPourSynchronisation) {
  if (déposant) {
    if (déposant.email) {
      personnesInDossiersAvecEmail.set(déposant.email, déposant);
    } else {
      personnesInDossiersSansEmail.set(`${déposant.prénoms}|${déposant.nom}`, déposant);
    }
  }

  if (demandeur_personne_physique) {
    if (demandeur_personne_physique.email) {
      personnesInDossiersAvecEmail.set(
        demandeur_personne_physique.email,
        demandeur_personne_physique,
      );
    } else {
      personnesInDossiersSansEmail.set(
        `${demandeur_personne_physique.prénoms}|${demandeur_personne_physique.nom}`,
        demandeur_personne_physique,
      );
    }
  }
}

function getPersonneId(
  descriptionPersonne: Personne | PersonneInitializer | undefined,
): Personne["id"] | undefined {
  if (!descriptionPersonne) {
    return undefined;
  }

  if (descriptionPersonne.id) {
    return descriptionPersonne.id;
  }

  if (descriptionPersonne.email) {
    const personne = personneByEmail.get(descriptionPersonne.email);
    return personne && personne.id;
  }

  const personneParNomPrénom = allPersonnesCurrentlyInDatabase.find(
    ({ email, nom, prénoms }) =>
      !email && descriptionPersonne.nom === nom && descriptionPersonne.prénoms === prénoms,
  );

  return personneParNomPrénom && personneParNomPrénom.id;
}

const personnesInDossiersWithoutId = [
  ...personnesInDossiersAvecEmail.values(),
  ...personnesInDossiersSansEmail.values(),
].filter((p) => !getPersonneId(p));

// console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if (personnesInDossiersWithoutId.length >= 1) {
  await créerPersonnes(personnesInDossiersWithoutId, laTransactionDeSynchronisationDS).then(
    (personneIds) => {
      personnesInDossiersWithoutId.forEach((p, i) => {
        p.id = personneIds[i].id;
      });
    },
  );
}

//console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

/*
    Rajouter les entreprises demandeuses qui ne sont pas déjà en BDD
*/

const entreprisesInDossiersBySiret = new Map<Entreprise["siret"], Entreprise>();

for (const {
  dossier: { demandeur_personne_morale, id_demarches_simplifiées },
} of dossiersPourSynchronisation) {
  if (demandeur_personne_morale) {
    const { siret } = demandeur_personne_morale;
    if (demandeur_personne_morale && !siret) {
      throw new TypeError(
        `Siret manquant pour l'entreprise ${JSON.stringify(demandeur_personne_morale)} (id_DS: ${id_demarches_simplifiées})`,
      );
    }

    entreprisesInDossiersBySiret.set(siret, demandeur_personne_morale as Entreprise);
  }
}

if (entreprisesInDossiersBySiret.size >= 1) {
  await dumpEntreprises(
    [...entreprisesInDossiersBySiret.values()],
    laTransactionDeSynchronisationDS,
  );
}

/*
 * Après avoir créé les entreprises et les personnes,
 * remplacer les objets Entreprise par leur siret
 * et les objets Personne par leur id
 */

function _remplacerPersonneEntreprise(
  dossierPourSynchronisation:
    | DossierEntreprisesPersonneInitializersPourInsert
    | DossierEntreprisesPersonneInitializersPourUpdate,
) {
  const {
    dossier: {
      déposant,
      demandeur_personne_physique,
      demandeur_personne_morale,
      ...autresPropriétésDossiers
    },
    ...autresDonnéesTables
  } = dossierPourSynchronisation;

  return {
    dossier: {
      déposant: getPersonneId(déposant) || null,
      demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
      demandeur_personne_morale:
        (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
      ...autresPropriétésDossiers,
    },
    ...autresDonnéesTables,
  };
}

function remplacerPourInsert(
  d: DossierEntreprisesPersonneInitializersPourInsert,
): DossierPourInsert {
  return _remplacerPersonneEntreprise(d) as DossierPourInsert;
}

function remplacerPourUpdate(
  d: DossierEntreprisesPersonneInitializersPourUpdate,
): DossierPourUpdate {
  return _remplacerPersonneEntreprise(d) as DossierPourUpdate;
}

const dossiersAInitialiser = dossiersAInitialiserPourSynchro.map(remplacerPourInsert);
const dossiersAModifier = dossiersAModifierPourSynchro.map(remplacerPourUpdate);

/** Télécharger les nouveaux fichiers espèces impactées */
const fichiersEspècesImpactéesTéléchargésP: Promise<
  Map<DossierDS88444["number"], Fichier["id"]> | undefined
> = (async () => {
  if (DEMARCHE_NUMBER === 88444) {
    return récupérerFichiersEspècesImpactées88444(
      dossiersDS,
      pitchouKeyToChampDS,
      laTransactionDeSynchronisationDS,
    );
  } else {
    throw new Error(
      `La fonction pour récupérer les fichiers espèces impactées n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
    );
  }
})();

const champsAvecPiècesJointes88444: ChampFormulaire88444[] = [
  "Dépot du dossier complet de demande de dérogation",
  "Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande",
  "Diagnostic écologique",
  "Déposez ici l'argumentaire précis vous ayant permis de conclure à l'absence de risque suffisament caractérisé pour les espèces protégées et leurs habitats.",
  "Joindre les pièces justifiant de la finalité de la demande",
  "Joindre le bilan des opérations antérieures",
  "Ajoutez un fichier décrivant ces mesures complémentaires :",
  "Plan des installations",
  `Joindre une carte du périmètre d'intervention si besoin`,
  "Pièces jointes décrivant précisément le protocole qui sera mis en place",
];

/** Télécharger les pièces jointes au dossier par le pétitionnaire*/
const fichiersPiècesJointesPétitionnaireTéléchargésP = (async () => {
  if (DEMARCHE_NUMBER === 88444) {
    return récupérerPiècesJointesPétitionnaire88444(
      dossiersDS,
      pitchouKeyToChampDS,
      champsAvecPiècesJointes88444,
      laTransactionDeSynchronisationDS,
    );
  } else {
    throw new Error(
      `La fonction pour récupérer les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
    );
  }
})();

/**
 * Synchronisation des dossiers
 */
let dossiersSynchronisés;
if (dossiersAInitialiser.length >= 1 || dossiersAModifierPourSynchro.length >= 1) {
  dossiersSynchronisés = dumpDossiers(
    dossiersAInitialiser,
    dossiersAModifier,
    laTransactionDeSynchronisationDS,
  );
}

const dossiersSupprimés = dossSuppP.then((dossiersSupp) =>
  deleteDossierByDSNumber(dossiersSupp.map(({ number }) => number)),
);

await Promise.all([dossiersSynchronisés, dossiersSupprimés]);

/**
 * Après synchronisation des dossiers
 *
 * Désormais, chaque dossier de la variable 'dossiers' avec un numéro de dossier DS
 * a aussi un identifiant de dossier pitchou
 */

/**
 * Synchronisation de toutes les choses qui ont besoin d'un Dossier['id']
 */

const dossierIds = await getDossierIdsFromDS_Ids(
  dossiersDS.map((d: DossierDS88444) => d.id),
  laTransactionDeSynchronisationDS,
);
const dossierIdByDS_id = new Map<NonNullable<DossierDS88444["id"]>, DatabaseDossier["id"]>();
const dossierIdByDS_number = new Map<DossierDS88444["number"], DatabaseDossier["id"]>();

for (const { id, id_demarches_simplifiées, number_demarches_simplifiées } of dossierIds) {
  dossierIdByDS_id.set(id_demarches_simplifiées, id);
  dossierIdByDS_number.set(Number(number_demarches_simplifiées), id);
}

/** Synchronisation de la messagerie */

const messagesÀMettreEnBDDAvecDossierId_DS = new Map<
  NonNullable<DatabaseDossier["id_demarches_simplifiées"]>,
  Message[]
>(dossiersDS.map(({ id: id_DS, messages }: DossierDS88444) => [id_DS, messages]));

let messagesSynchronisés;

const messagesÀMettreEnBDDAvecDossierId = new Map<DatabaseDossier["id"], Message[]>();
for (const [id_DS, messages] of messagesÀMettreEnBDDAvecDossierId_DS) {
  const dossierId = dossierIdByDS_id.get(id_DS);

  messagesÀMettreEnBDDAvecDossierId.set(dossierId!, messages);
}

if (messagesÀMettreEnBDDAvecDossierId.size >= 1) {
  messagesSynchronisés = dumpDossierMessages(
    messagesÀMettreEnBDDAvecDossierId,
    laTransactionDeSynchronisationDS,
  );
}

/** Synchronisation dossier dans groupeInstructeur */

let synchronisationDossierDansGroupeInstructeur;

if (dossiersDS.length >= 1) {
  /** Synchronisation de l'information de quel dossier appartient à quel groupe_instructeurs */
  synchronisationDossierDansGroupeInstructeur = synchroniserDossierDansGroupeInstructeur(
    dossiersDS,
    DEMARCHE_NUMBER,
    laTransactionDeSynchronisationDS,
  );
}

/** Synchronisation des fichiers espèces impactées téléchargés */
const fichiersEspècesImpactéesSynchronisés = fichiersEspècesImpactéesTéléchargésP.then(
  (fichiersEspècesImpactéesTéléchargés) => {
    if (fichiersEspècesImpactéesTéléchargés && fichiersEspècesImpactéesTéléchargés.size >= 1) {
      return synchroniserFichiersEspècesImpactéesDepuisDS88444(
        fichiersEspècesImpactéesTéléchargés,
        laTransactionDeSynchronisationDS,
      );
    }
  },
);

/** Synchronisation des fichiers pièces jointes pétitionnaire téléchargés */
const fichiersPiècesJointesPétitionnaireSynchronisés =
  fichiersPiècesJointesPétitionnaireTéléchargésP.then(
    (fichiersPiècesJointesPétitionnaireTéléchargés) => {
      if (DEMARCHE_NUMBER !== 88444) {
        throw new Error(
          `La fonction pour synchroniser les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
        );
      }

      const fichiersPiècesJointesPétitionnaireTéléchargésParDossierId = new Map(
        [...fichiersPiècesJointesPétitionnaireTéléchargés].map(([number, fichiers]) => {
          const id = dossierIdByDS_number.get(number);
          if (!id) {
            console.log("dossierIdByDS_number", dossierIdByDS_number);
            throw `Id de dossier manquant pour dossier DS ${number}`;
          }

          return [id, fichiers];
        }),
      );
      return synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(
        fichiersPiècesJointesPétitionnaireTéléchargésParDossierId,
        dossiersDS,
        dossierIdByDS_number,
        pitchouKeyToChampDS,
        champsAvecPiècesJointes88444,
        laTransactionDeSynchronisationDS,
      );
    },
  );

/*
    Mise à jour des notifications
*/
const mettreÀjourNotificationP = mettreÀjourNotification(
  dossiersDS,
  dossierIdByDS_number,
  laTransactionDeSynchronisationDS,
);

/** Fin de l'outil de synchronisation - fermeture */

Promise.all([
  groupesInstructeursSynchronisés,
  messagesSynchronisés,
  synchronisationDossierDansGroupeInstructeur,
  fichiersEspècesImpactéesSynchronisés,
  fichiersPiècesJointesPétitionnaireSynchronisés,
  mettreÀjourNotificationP,
])
  .then(() => {
    console.log("Sync terminé avec succès, commit de la transaction");
    const résultatSynchro: RésultatSynchronisationDS88444 = {
      succès: true,
      horodatage: new Date(),
      erreur: null,
    };

    return Promise.allSettled([
      addRésultatSynchronisationDS88444(résultatSynchro),
      laTransactionDeSynchronisationDS.commit(),
    ]);
  })
  .catch((err) => {
    console.error("Sync échoué", err, "rollback de la transaction");

    const résultatSynchro: RésultatSynchronisationDS88444 = {
      succès: false,
      horodatage: new Date(),
      erreur: err.toString(),
    };

    return Promise.allSettled([
      addRésultatSynchronisationDS88444(résultatSynchro),
      laTransactionDeSynchronisationDS.rollback(),
    ]);
  })
  .then(() => {
    console.log("Fin de la synchronisation, cloture de la connexion avec la base de données");
    return closeDatabaseConnection();
  });
