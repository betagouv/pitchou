import parseArgs from "minimist";
import { sub, format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import {
  dumpEntreprises,
  closeDatabaseConnection,
  createTransaction,
  addResultatSynchronisationDS88444,
} from "@pitchou/server/database.ts";
import {
  dumpDossiers,
  getDossierIdsFromDS_Ids,
  dumpDossierMessages,
  deleteDossierByDSNumber,
  synchronizeDossierInGroupeInstructeur,
} from "@pitchou/server/database/dossier.ts";
import { listAllPersonnes, createPersonnes } from "@pitchou/server/database/personne.ts";
import { synchronizeGroupesInstructeurs } from "@pitchou/server/database/groupe_instructeurs.ts";
import { synchroniserFichiersEspecesImpacteesDepuisDS88444 } from "@pitchou/server/database/especes_impactees.ts";

import { recupererDossiersRecemmentModifies } from "@pitchou/server/demarche-numerique/recupererDossiersRecemmentModifies.ts";
import { recupererGroupesInstructeurs } from "@pitchou/server/demarche-numerique/recupererGroupesInstructeurs.ts";
import recupererTousLesDossiersSupprimes from "@pitchou/server/demarche-numerique/recupererListeDossiersSupprimes.ts";

import { isValidDate } from "@pitchou/common/typeFormat.ts";

import { telechargerNouveauxFichiersMotivation } from "./synchronisation-ds/telechargerNouveauxFichiersParType.ts";
import {
  recupererFichiersEspecesImpactees88444,
  recupererPiecesJointesPetitionnaire88444,
} from "./synchronisation-ds/synchronisation-dossier-88444.ts";

import {
  getDonneesPersonnesEntreprises88444,
  makeDossiersPourSynchronisation,
} from "./synchronisation-ds/makeDossiersPourSynchronisation.ts";
import { makeColonnesCommunesDossierPourSynchro88444 } from "./synchronisation-ds/makeColonnesCommunesDossierPourSynchro88444.ts";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { synchroniserFichiersPiecesJointesPetitionnaireDepuisDS88444 } from "@pitchou/server/database/arete_dossier__fichier_pieces_jointes_petitionnaire.ts";
import { mettreAjourNotification } from "./synchronisation-ds/synchronisation-notification.ts";

import type { default as DatabaseDossier } from "@pitchou/types/database/public/Dossier.ts";
import type {
  default as Personne,
  PersonneInitializer,
} from "@pitchou/types/database/public/Personne.ts";
import type { default as Entreprise } from "@pitchou/types/database/public/Entreprise.ts";
import type { default as ResultatSynchronisationDS88444 } from "@pitchou/types/database/public/ResultatSynchronisationDS88444.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { Message, DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type {
  SchemaDemarcheSimplifiee,
  ChampDescriptor,
} from "@pitchou/types/demarche-numerique/schema.ts";
import type {
  DossierEntreprisesPersonneInitializersPourInsert,
  DossierEntreprisesPersonneInitializersPourUpdate,
  DossierPourInsert,
  DossierPourUpdate,
} from "@pitchou/types/demarche-numerique/DossierPourSynchronisation.ts";
import type {
  DossierDemarcheNumerique88444,
  AnnotationsPriveesDemarcheNumerique88444,
} from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type {
  GetDonneesPersonnesEntreprises,
  MakeColonnesCommunesDossierPourSynchro,
} from "./synchronisation-ds/makeDossiersPourSynchronisation.ts";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";

// retrieve the data from DS

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
    join(import.meta.dirname, `../../data/demarche-numerique/schema-DS`),
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
const schema: SchemaDemarcheSimplifiee = (
  await import(`../../data/demarche-numerique/schema-DS/${ID_SCHEMA_DS}.json`, {
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

const laTransactionDeSynchronisationDS = await createTransaction();

const dossSuppP = recupererTousLesDossiersSupprimes(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER);

const groupesInstructeursSynchronises = recupererGroupesInstructeurs(
  DEMARCHE_SIMPLIFIEE_API_TOKEN,
  DEMARCHE_NUMBER,
).then((groupesInstructeurs) =>
  synchronizeGroupesInstructeurs(
    groupesInstructeurs,
    DEMARCHE_NUMBER,
    laTransactionDeSynchronisationDS,
  ),
);

const dossiersDS: DossierDS88444[] = await recupererDossiersRecemmentModifies(
  DEMARCHE_SIMPLIFIEE_API_TOKEN,
  DEMARCHE_NUMBER,
  lastModified,
);

console.info("Nombre de dossiers", dossiersDS.length);

//console.log('3 dossiers', dossiersDS.slice(0, 3))
// console.log('dossier', dossiersDS.find(d => d.number === 26544801))

// store the dossiers in the database

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

const dossiersDejaExistantsEnBDD = await getDossierIdsFromDS_Ids(
  dossiersDS.map((d: DossierDS88444) => d.id),
  laTransactionDeSynchronisationDS,
);
const dossierNumberToDossierId = new Map(
  dossiersDejaExistantsEnBDD.map((d) => [d.number_demarches_simplifiées, d.id]),
);

/** Download the new 'motivation' files */
const fichiersMotivationTelechargesP: Promise<Map<DossierDS88444["number"], FileId> | undefined> =
  telechargerNouveauxFichiersMotivation(dossiersDS, laTransactionDeSynchronisationDS);

const fichiersMotivationTelecharges = await fichiersMotivationTelechargesP;

const {
  getDonnéesPersonnesEntreprises: getDonneesPersonnesEntreprises,
  makeColonnesCommunesDossierPourSynchro,
} = (() => {
  if (DEMARCHE_NUMBER === 88444) {
    return {
      // We can't create types that depend on a parameter — here we'd want
      // GetDonnéesPersonnesEntreprises to be a function of keyof DossierDemarcheNumerique88444
      getDonnéesPersonnesEntreprises:
        getDonneesPersonnesEntreprises88444 as unknown as GetDonneesPersonnesEntreprises,
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
    fichiersMotivationTelecharges,
    pitchouKeyToChampDS,
    pitchouKeyToAnnotationDS,
    getDonneesPersonnesEntreprises,
    makeColonnesCommunesDossierPourSynchro,
  );

/*
    Create all the missing personnes in the database so that they all have an id
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

function collectPersonne(personne: PersonneInitializer | undefined) {
  if (!personne) {
    return;
  }
  if (personne.email) {
    personnesInDossiersAvecEmail.set(personne.email, personne);
  } else {
    personnesInDossiersSansEmail.set(`${personne.prénoms}|${personne.nom}`, personne);
  }
}

for (const {
  dossier: { déposant, demandeur_personne_physique, representative },
} of dossiersPourSynchronisation) {
  collectPersonne(déposant);
  collectPersonne(demandeur_personne_physique);
  collectPersonne(representative);
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

  const personneParNomPrenom = allPersonnesCurrentlyInDatabase.find(
    ({ email, nom, prénoms }) =>
      !email && descriptionPersonne.nom === nom && descriptionPersonne.prénoms === prénoms,
  );

  return personneParNomPrenom && personneParNomPrenom.id;
}

const personnesInDossiersWithoutId = [
  ...personnesInDossiersAvecEmail.values(),
  ...personnesInDossiersSansEmail.values(),
].filter((p) => !getPersonneId(p));

// console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if (personnesInDossiersWithoutId.length >= 1) {
  await createPersonnes(personnesInDossiersWithoutId, laTransactionDeSynchronisationDS).then(
    (personneIds) => {
      personnesInDossiersWithoutId.forEach((p, i) => {
        p.id = personneIds[i].id;
      });
    },
  );
}

//console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

/*
    Add the demandeur entreprises that are not already in the database
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
 * After creating the entreprises and the personnes,
 * replace the Entreprise objects with their siret
 * and the Personne objects with their id
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
      representative,
      ...autresProprietesDossiers
    },
    ...autresDonneesTables
  } = dossierPourSynchronisation;

  return {
    dossier: {
      déposant: getPersonneId(déposant) || null,
      demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
      demandeur_personne_morale:
        (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
      representative: getPersonneId(representative) || null,
      ...autresProprietesDossiers,
    },
    ...autresDonneesTables,
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

/** Download the new impacted-espece files */
const fichiersEspecesImpacteesTelechargesP: Promise<
  Map<DossierDS88444["number"], FileId> | undefined
> = (async () => {
  if (DEMARCHE_NUMBER === 88444) {
    return recupererFichiersEspecesImpactees88444(
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

const champsAvecPiecesJointes88444: ChampFormulaire88444[] = [
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

/** Download the pièces jointes attached to the dossier by the pétitionnaire */
const fichiersPiecesJointesPetitionnaireTelechargesP = (async () => {
  if (DEMARCHE_NUMBER === 88444) {
    return recupererPiecesJointesPetitionnaire88444(
      dossiersDS,
      pitchouKeyToChampDS,
      champsAvecPiecesJointes88444,
      laTransactionDeSynchronisationDS,
    );
  } else {
    throw new Error(
      `La fonction pour récupérer les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
    );
  }
})();

/**
 * Synchronization of the dossiers
 */
let dossiersSynchronises;
if (dossiersAInitialiser.length >= 1 || dossiersAModifierPourSynchro.length >= 1) {
  dossiersSynchronises = dumpDossiers(
    dossiersAInitialiser,
    dossiersAModifier,
    laTransactionDeSynchronisationDS,
  );
}

const dossiersSupprimes = dossSuppP.then((dossiersSupp) =>
  deleteDossierByDSNumber(dossiersSupp.map(({ number }) => number)),
);

await Promise.all([dossiersSynchronises, dossiersSupprimes]);

/**
 * After synchronizing the dossiers
 *
 * From now on, each dossier in the 'dossiers' variable with a DS dossier number
 * also has a pitchou dossier id
 */

/**
 * Synchronization of everything that needs a Dossier['id']
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

/** Synchronization of the messaging */

const messagesAMettreEnBDDAvecDossierId_DS = new Map<
  NonNullable<DatabaseDossier["id_demarches_simplifiées"]>,
  Message[]
>(dossiersDS.map(({ id: id_DS, messages }: DossierDS88444) => [id_DS, messages]));

let messagesSynchronises;

const messagesAMettreEnBDDAvecDossierId = new Map<DatabaseDossier["id"], Message[]>();
for (const [id_DS, messages] of messagesAMettreEnBDDAvecDossierId_DS) {
  const dossierId = dossierIdByDS_id.get(id_DS);

  messagesAMettreEnBDDAvecDossierId.set(dossierId!, messages);
}

if (messagesAMettreEnBDDAvecDossierId.size >= 1) {
  messagesSynchronises = dumpDossierMessages(
    messagesAMettreEnBDDAvecDossierId,
    laTransactionDeSynchronisationDS,
  );
}

/** Synchronization of dossier within groupeInstructeur */

let synchronisationDossierDansGroupeInstructeur;

if (dossiersDS.length >= 1) {
  /** Synchronization of the information about which dossier belongs to which groupe_instructeurs */
  synchronisationDossierDansGroupeInstructeur = synchronizeDossierInGroupeInstructeur(
    dossiersDS,
    DEMARCHE_NUMBER,
    laTransactionDeSynchronisationDS,
  );
}

/** Synchronization of the downloaded impacted-espece files */
const fichiersEspecesImpacteesSynchronises = fichiersEspecesImpacteesTelechargesP.then(
  (fichiersEspecesImpacteesTelecharges) => {
    if (fichiersEspecesImpacteesTelecharges && fichiersEspecesImpacteesTelecharges.size >= 1) {
      return synchroniserFichiersEspecesImpacteesDepuisDS88444(
        fichiersEspecesImpacteesTelecharges,
        laTransactionDeSynchronisationDS,
      );
    }
  },
);

/** Synchronization of the downloaded pétitionnaire pièces jointes files */
const fichiersPiecesJointesPetitionnaireSynchronises =
  fichiersPiecesJointesPetitionnaireTelechargesP.then(
    (fichiersPiecesJointesPetitionnaireTelecharges) => {
      if (DEMARCHE_NUMBER !== 88444) {
        throw new Error(
          `La fonction pour synchroniser les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`,
        );
      }

      const fichiersPiecesJointesPetitionnaireTelechargesParDossierId = new Map(
        [...fichiersPiecesJointesPetitionnaireTelecharges].map(([number, fichiers]) => {
          const id = dossierIdByDS_number.get(number);
          if (!id) {
            console.log("dossierIdByDS_number", dossierIdByDS_number);
            throw `Id de dossier manquant pour dossier DS ${number}`;
          }

          return [id, fichiers];
        }),
      );
      return synchroniserFichiersPiecesJointesPetitionnaireDepuisDS88444(
        fichiersPiecesJointesPetitionnaireTelechargesParDossierId,
        dossiersDS,
        dossierIdByDS_number,
        pitchouKeyToChampDS,
        champsAvecPiecesJointes88444,
        laTransactionDeSynchronisationDS,
      );
    },
  );

/*
    Update the notifications
*/
const mettreAjourNotificationP = mettreAjourNotification(
  dossiersDS,
  dossierIdByDS_number,
  laTransactionDeSynchronisationDS,
);

/** End of the synchronization tool - shutdown */

Promise.all([
  groupesInstructeursSynchronises,
  messagesSynchronises,
  synchronisationDossierDansGroupeInstructeur,
  fichiersEspecesImpacteesSynchronises,
  fichiersPiecesJointesPetitionnaireSynchronises,
  mettreAjourNotificationP,
])
  .then(() => {
    console.log("Sync terminé avec succès, commit de la transaction");
    const resultatSynchro: ResultatSynchronisationDS88444 = {
      succès: true,
      horodatage: new Date(),
      erreur: null,
    };

    return Promise.allSettled([
      addResultatSynchronisationDS88444(resultatSynchro),
      laTransactionDeSynchronisationDS.commit(),
    ]);
  })
  .catch((err) => {
    console.error("Sync échoué", err, "rollback de la transaction");

    const resultatSynchro: ResultatSynchronisationDS88444 = {
      succès: false,
      horodatage: new Date(),
      erreur: err.toString(),
    };

    return Promise.allSettled([
      addResultatSynchronisationDS88444(resultatSynchro),
      laTransactionDeSynchronisationDS.rollback(),
    ]);
  })
  .then(() => {
    console.log("Fin de la synchronisation, cloture de la connexion avec la base de données");
    return closeDatabaseConnection();
  });
