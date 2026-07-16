import { store, setDossierFull } from "$lib/state/store.svelte.ts";

import { importDescriptionMenacesEspecesFromOdsArrayBuffer } from "@pitchou/common/especesUtils.ts";
import {
  loadActivitesMethodesMoyensDePoursuite,
  loadEspecesProtegeesList,
} from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
import { isDossierSummaryArray } from "@pitchou/common/typeguards.ts";
import { sendEvenementModifierCommentaire, sendEvenement } from "$lib/shared/aarri.ts";
import { loadRelationSuivi } from "$lib/shared/main.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { default as Message } from "@pitchou/types/database/public/Message.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

export function updateDossier(
  dossier: DossierFull,
  updates: Partial<DossierFull>,
): Promise<void> {
  if (!store.capabilities.modifierDossier)
    throw new TypeError(`Capability modifierDossier manquante`);

  // optimistically modify the dossier in the store
  const updatedDossier: DossierFull = Object.assign({}, dossier, updates);
  if (updates.évènementsPhase) {
    updatedDossier.évènementsPhase = [...updates.évènementsPhase, ...dossier.évènementsPhase];

    sendEvenement({ type: "changerPhase" });
  }

  if (updates.commentaire_libre) {
    sendEvenementModifierCommentaire();
  }
  if (updates.prochaine_action_attendue_par) {
    sendEvenement({ type: "changerProchaineActionAttendueDe" });
  }

  setDossierFull(updatedDossier);

  return store.capabilities.modifierDossier(dossier.id, updates).catch((err) => {
    // on error, restore the previous dossier in the store as it was before the copy
    setDossierFull(dossier);
    throw err;
  });
}

export async function loadDossierMessages(id: DossierFull["id"]): Promise<Message[]> {
  if (!store.capabilities?.listerMessages)
    throw new TypeError(`Capability listerMessages manquante`);

  const messagesP = store.capabilities?.listerMessages(id).then((messages: Message[]) => {
    store.messagesByDossierId.set(id, messages);
    return messages;
  });

  return store.messagesByDossierId.get(id) || messagesP;
}

export async function getDossierFull(id: DossierFull["id"]): Promise<DossierFull> {
  const dossierFullInStore = store.fullDossiers.get(id);

  if (dossierFullInStore) {
    return dossierFullInStore;
  }

  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const dossierFull = await store.capabilities.recupérerDossierComplet(id);
  setDossierFull(dossierFull);

  return dossierFull;
}

export async function refreshDossierFull(id: DossierFull["id"]): Promise<DossierFull> {
  if (!store.capabilities.recupérerDossierComplet)
    throw new TypeError(`Capability recupérerDossierComplet manquante`);

  const dossierFull = await store.capabilities.recupérerDossierComplet(id);
  setDossierFull(dossierFull);

  return dossierFull;
}

export async function especesImpacteesFromFichierOdsArrayBuffer(
  fichierArrayBuffer: ArrayBuffer,
): Promise<DescriptionMenacesEspeces> {
  const especesProtegees = loadEspecesProtegeesList();
  const actMetTrans = loadActivitesMethodesMoyensDePoursuite();

  const { espèceByCD_REF: especeByCD_REF } = await especesProtegees;
  const { activités: activites, méthodes: methodes, moyensDePoursuite } = await actMetTrans;

  return importDescriptionMenacesEspecesFromOdsArrayBuffer(
    fichierArrayBuffer,
    especeByCD_REF,
    activites,
    methodes,
    moyensDePoursuite,
  );
}

export function loadDossiers() {
  loadRelationSuivi();

  if (store.capabilities?.listerDossiers) {
    return store.capabilities?.listerDossiers().then((dossiers) => {
      if (!isDossierSummaryArray(dossiers)) {
        throw new TypeError("On attendait un tableau de dossiers ici !");
      }

      /* Format the dossiers */
      for (const dossier of dossiers) {
        dossier.date_dépôt = new Date(dossier.date_dépôt);
        dossier.date_début_phase = new Date(dossier.date_début_phase);
      }

      const dossiersById: PitchouState["dossierSummaries"] = new Map();

      for (const dossier of dossiers) {
        Object.freeze(dossier);
        dossiersById.set(dossier.id, dossier);
      }

      store.dossierSummaries = dossiersById;

      return dossiersById;
    });
  } else {
    return Promise.reject(
      new TypeError("Impossible de charger les dossiers, capability manquante"),
    );
  }
}
