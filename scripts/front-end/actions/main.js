//@ts-check

import { json } from "d3-fetch";
import remember, { forget } from "remember";
import { goto } from "$app/navigation";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { store } from "../store.svelte.ts";
import { SCHEMA_DS_88444 } from "../dataPaths.ts";

import créerObjetCapDepuisURLs from "./créerObjetCapDepuisURLs.js";
import { envoyerÉvènement } from "./aarri.js";

/** @import {default as RésultatSynchronisationDS88444} from '../../types/database/public/RésultatSynchronisationDS88444.js' */

const PITCHOU_SECRET_STORAGE_KEY = "secret-pitchou";

export function chargerRelationSuivi() {
  if (store.capabilities?.listerRelationSuivi) {
    store.capabilities?.listerRelationSuivi().then((relationSuivisBDD) => {
      if (!relationSuivisBDD || !Array.isArray(relationSuivisBDD)) {
        throw new TypeError("On attendait un tableau de relation suivis ici !");
      }

      const relationSuivis = new SvelteMap();

      for (const { personneEmail, dossiersSuivisIds } of relationSuivisBDD) {
        relationSuivis.set(personneEmail, new SvelteSet(dossiersSuivisIds));
      }

      store.relationSuivis = relationSuivis;
    });
  }
}

export function chargerNotificationParDossierPourInstructeurActuel() {
  if (store.capabilities?.listerNotifications) {
    store.capabilities?.listerNotifications().then((notificationsBDD) => {
      if (!notificationsBDD || !Array.isArray(notificationsBDD)) {
        throw new TypeError("On attendait un tableau de notifications ici !");
      }

      const notificationParDossierPourInstructeurActuel = new SvelteMap();

      for (const notification of notificationsBDD) {
        notificationParDossierPourInstructeurActuel.set(notification.dossier, notification);
      }

      store.notificationParDossier = notificationParDossierPourInstructeurActuel;
    });
  }
}

export function chargerSchemaDS88444() {
  return json(SCHEMA_DS_88444).then((schema) => {
    //@ts-ignore
    store.schemaDS88444 = schema;
    return schema;
  });
}

export function chargerRésultatsSynchronisation() {
  return json("/resultats-synchronisation").then(
    // @ts-ignore
    (/** @type {RésultatSynchronisationDS88444[]} */ résultatsSync) => {
      for (const r of résultatsSync) {
        r.horodatage = new Date(r.horodatage);
      }

      store.résultatsSynchronisationDS88444 = résultatsSync;
    },
  );
}

/**
 * @param {URL} url
 */
export async function consumeSecretFromURL(url) {
  const secret = url.searchParams.get("secret");
  if (!secret) return;

  return Promise.all([
    remember(PITCHOU_SECRET_STORAGE_KEY, secret),
    initCapabilities(secret).catch(async () => {
      await logout();
      store.erreurs.add({
        message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
      });
    }),
  ]);
}

export async function logout() {
  store.capabilities = {};
  store.identité = undefined;

  store.dossiersRésumés = new SvelteMap();
  store.dossiersComplets = new SvelteMap();
  store.messagesParDossierId = new SvelteMap();
  store.relationSuivis = new SvelteMap();
  store.notificationParDossier = new SvelteMap();

  return forget(PITCHOU_SECRET_STORAGE_KEY);
}

/**
 *
 * @param {{message: string}} [erreur]
 * @returns
 */
export async function logoutEtRedirigerVersAccueil(erreur) {
  if (erreur) {
    store.erreurs.add(erreur);
  }

  return logout().then(() => goto("/"));
}

/**
 *
 * @param {string} secret
 * @returns
 */
function initCapabilities(secret) {
  return json(`/caps?secret=${secret}`).then((capsURLs) => {
    if (capsURLs && typeof capsURLs === "object") {
      //@ts-ignore
      store.capabilities = créerObjetCapDepuisURLs(capsURLs);

      // @ts-ignore
      if (capsURLs.identité) {
        // @ts-ignore
        store.identité = capsURLs.identité;
      }

      envoyerÉvènement({ type: "seConnecter" });
    } else {
      throw new TypeError(`capsURLs non-reconnu (${typeof capsURLs} - ${capsURLs})`);
    }
  });
}

export function init() {
  return Promise.all([
    remember(PITCHOU_SECRET_STORAGE_KEY)
      //@ts-ignore
      .then((secret) => (secret ? initCapabilities(secret) : undefined))
      .catch(() =>
        logoutEtRedirigerVersAccueil({
          message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        }),
      ),

    chargerSchemaDS88444(),
    chargerRésultatsSynchronisation(),
  ]);
}
