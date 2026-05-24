//@ts-check
/** @import {PitchouState} from '../store.svelte.ts' */
import { store, setDossierComplet } from "../store.svelte.ts";

import { importDescriptionMenacesEspècesFromOdsArrayBuffer } from "../../commun/outils-espèces.js";
import {
  chargerActivitésMéthodesMoyensDePoursuite,
  chargerListeEspècesProtégées,
} from "./activitésMéthodesMoyensDePoursuite.js";
import { isDossierRésuméArray } from "../../types/typeguards.js";
import { envoyerÉvènementModifierCommentaire, envoyerÉvènement } from "./aarri.js";
import { chargerRelationSuivi } from "./main.js";

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierComplet, DossierPhase} from '../../types/API_Pitchou.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */
//@ts-ignore
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, MoyenDePoursuiteMenaçant, DescriptionMenacesEspèces, CodeActivitéStandard, CodeActivitéPitchou} from '../../types/especes.d.ts' */

/**
 * @param {DossierComplet} dossier
 * @param {Partial<DossierComplet>} modifs
 * @returns {Promise<void>}
 */
export function modifierDossier(dossier, modifs) {
  if (!store.capabilities.modifierDossier)
    throw new TypeError(`Capability modifierDossier manquante`);

  // modifier le dossier dans le store de manière optimiste
  /** @type {DossierComplet} */
  const dossierModifié = Object.assign({}, dossier, modifs);
  if (modifs.évènementsPhase) {
    dossierModifié.évènementsPhase = [...modifs.évènementsPhase, ...dossier.évènementsPhase];

    envoyerÉvènement({ type: "changerPhase" });
  }

  if (modifs.commentaire_libre) {
    envoyerÉvènementModifierCommentaire();
  }
  if (modifs.prochaine_action_attendue_par) {
    envoyerÉvènement({ type: "changerProchaineActionAttendueDe" });
  }

  setDossierComplet(dossierModifié);

  return store.capabilities.modifierDossier(dossier.id, modifs).catch((err) => {
    // en cas d'erreur, remettre le dossier précédent dans le store comme avant la copie
    setDossierComplet(dossier);
    throw err;
  });
}

/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<Message[]>}
 */
export async function chargerMessagesDossier(id) {
  if (!store.capabilities?.listerMessages)
    throw new TypeError(`Capability listerMessages manquante`);

  const messagesP = store.capabilities
    ?.listerMessages(id)
    .then((/** @type {Message[]} */ messages) => {
      store.messagesParDossierId.set(id, messages);
      return messages;
    });

  return store.messagesParDossierId.get(id) || messagesP;
}

/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<DossierComplet>}
 */
export async function getDossierComplet(id) {
  const dossierCompletInStore = store.dossiersComplets.get(id);

  if (dossierCompletInStore) {
    return dossierCompletInStore;
  }

  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const dossierComplet = await store.capabilities.recupérerDossierComplet(id);
  setDossierComplet(dossierComplet);

  return dossierComplet;
}

/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<DossierComplet>}
 */
export async function refreshDossierComplet(id) {
  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const dossierComplet = await store.capabilities.recupérerDossierComplet(id);
  setDossierComplet(dossierComplet);

  return dossierComplet;
}

/**
 * @param {ArrayBuffer} fichierArrayBuffer
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
export async function espècesImpactéesDepuisFichierOdsArrayBuffer(fichierArrayBuffer) {
  const espècesProtégées = chargerListeEspècesProtégées();
  const actMétTrans = chargerActivitésMéthodesMoyensDePoursuite();

  const { espèceByCD_REF } = await espècesProtégées;
  const { activités, méthodes, moyensDePoursuite } = await actMétTrans;

  return importDescriptionMenacesEspècesFromOdsArrayBuffer(
    fichierArrayBuffer,
    espèceByCD_REF,
    activités,
    méthodes,
    moyensDePoursuite,
  );
}

export function chargerDossiers() {
  chargerRelationSuivi();

  if (store.capabilities?.listerDossiers) {
    return store.capabilities?.listerDossiers().then((dossiers) => {
      if (!isDossierRésuméArray(dossiers)) {
        throw new TypeError("On attendait un tableau de dossiers ici !");
      }

      /* Formatter les dossiers */
      for (const dossier of dossiers) {
        dossier.date_dépôt = new Date(dossier.date_dépôt);
        dossier.date_début_phase = new Date(dossier.date_début_phase);
      }

      /** @type {PitchouState['dossiersRésumés']} */
      const dossiersById = new Map();

      for (const dossier of dossiers) {
        Object.freeze(dossier);
        dossiersById.set(dossier.id, dossier);
      }

      store.dossiersRésumés = dossiersById;

      return dossiersById;
    });
  } else {
    return Promise.reject(
      new TypeError("Impossible de charger les dossiers, capability manquante"),
    );
  }
}
