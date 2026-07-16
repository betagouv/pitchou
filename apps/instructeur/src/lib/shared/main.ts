import { json } from "d3-fetch";
import remember, { forget } from "remember";
import { goto } from "$app/navigation";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { store } from "$lib/state/store.svelte.ts";
import { SCHEMA_DS_88444 } from "$lib/shared/dataPaths.ts";

import createCapObjectFromURLs from "$lib/shared/createCapObjectFromURLs.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";

import type { default as ResultatSynchronisationDS88444 } from "@pitchou/types/database/public/ResultatSynchronisationDS88444.ts";
import type {
  PitchouInstructeurCapabilities,
  IdentiteInstructeurPitchou,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

export const PITCHOU_SECRET_STORAGE_KEY = "secret-pitchou";

export function loadRelationSuivi() {
  if (store.capabilities?.listerRelationSuivi) {
    store.capabilities?.listerRelationSuivi().then((relationSuivisDB) => {
      if (!relationSuivisDB || !Array.isArray(relationSuivisDB)) {
        throw new TypeError("On attendait un tableau de relation suivis ici !");
      }

      const relationSuivis: NonNullable<typeof store.relationSuivis> = new SvelteMap();

      for (const { personneEmail, dossiersSuivisIds } of relationSuivisDB) {
        relationSuivis.set(personneEmail!, new SvelteSet(dossiersSuivisIds));
      }

      store.relationSuivis = relationSuivis;
    });
  }
}

export function loadNotificationByDossierForCurrentInstructeur() {
  if (store.capabilities?.listerNotifications) {
    store.capabilities?.listerNotifications().then((notificationsDB) => {
      if (!notificationsDB || !Array.isArray(notificationsDB)) {
        throw new TypeError("On attendait un tableau de notifications ici !");
      }

      const notificationByDossierForCurrentInstructeur: NonNullable<
        typeof store.notificationByDossier
      > = new SvelteMap();

      for (const notification of notificationsDB) {
        notificationByDossierForCurrentInstructeur.set(notification.dossier, notification);
      }

      store.notificationByDossier = notificationByDossierForCurrentInstructeur;
    });
  }
}

export function loadSchemaDS88444() {
  return json(SCHEMA_DS_88444).then((schema) => {
    //@ts-ignore
    store.schemaDS88444 = schema;
    return schema;
  });
}

export function loadResultatsSynchronisation() {
  return json("/resultats-synchronisation").then(
    // @ts-ignore
    (resultatsSync: ResultatSynchronisationDS88444[]) => {
      for (const r of resultatsSync) {
        r.horodatage = new Date(r.horodatage);
      }

      store.résultatsSynchronisationDS88444 = resultatsSync;
    },
  );
}

export async function consumeSecretFromURL(url: URL) {
  const secret = url.searchParams.get("secret");
  if (!secret) return;

  return Promise.all([
    remember(PITCHOU_SECRET_STORAGE_KEY, secret),
    initCapabilities(secret).catch(async () => {
      await logout();
      store.errors.add({
        message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
      });
    }),
  ]);
}

export async function logout() {
  store.capabilities = {};
  store.identité = undefined;

  store.dossierSummaries = new SvelteMap();
  store.fullDossiers = new SvelteMap();
  store.messagesByDossierId = new SvelteMap();
  store.relationSuivis = new SvelteMap();
  store.notificationByDossier = new SvelteMap();

  return forget(PITCHOU_SECRET_STORAGE_KEY);
}

export async function logoutAndRedirectToHome(erreur?: { message: string }) {
  if (erreur) {
    store.errors.add(erreur);
  }

  return logout().then(() => goto("/"));
}

type CapsResponse = StringValues<PitchouInstructeurCapabilities> & {
  identité: IdentiteInstructeurPitchou;
  maxUploadSizeBytes?: number;
};

function initCapabilities(secret: string) {
  return json(`/caps?secret=${secret}`).then((response) => {
    if (response && typeof response === "object") {
      const capsURLs = response as CapsResponse;
      store.capabilities = createCapObjectFromURLs(capsURLs);

      if (capsURLs.identité) {
        store.identité = capsURLs.identité;
      }

      if (typeof capsURLs.maxUploadSizeBytes === "number") {
        store.maxUploadSizeBytes = capsURLs.maxUploadSizeBytes;
      }

      sendEvenement({ type: "seConnecter" });
    } else {
      throw new TypeError(`capsURLs non-reconnu (${typeof response} - ${response})`);
    }
  });
}

export function init() {
  return Promise.all([
    remember(PITCHOU_SECRET_STORAGE_KEY)
      //@ts-ignore
      .then((secret) => (secret ? initCapabilities(secret) : undefined))
      .catch(() =>
        logoutAndRedirectToHome({
          message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        }),
      ),

    loadSchemaDS88444(),
    loadResultatsSynchronisation(),
  ]);
}
