import { json } from "d3-fetch";
import remember, { forget } from "remember";
import { goto } from "$app/navigation";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { store } from "$lib/state/store.svelte.ts";
import { SCHEMA_DS_88444 } from "$lib/shared/dataPaths.ts";

import créerObjetCapDepuisURLs from "$lib/shared/créerObjetCapDepuisURLs.ts";
import { envoyerÉvènement } from "$lib/shared/aarri.ts";

import type { default as RésultatSynchronisationDS88444 } from "@pitchou/types/database/public/RésultatSynchronisationDS88444.ts";
import type {
  PitchouInstructeurCapabilities,
  IdentitéInstructeurPitchou,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

export const PITCHOU_SECRET_STORAGE_KEY = "secret-pitchou";

export function chargerRelationSuivi() {
  if (store.capabilities?.listerRelationSuivi) {
    store.capabilities?.listerRelationSuivi().then((relationSuivisBDD) => {
      if (!relationSuivisBDD || !Array.isArray(relationSuivisBDD)) {
        throw new TypeError("On attendait un tableau de relation suivis ici !");
      }

      const relationSuivis: NonNullable<typeof store.relationSuivis> = new SvelteMap();

      for (const { personneEmail, dossiersSuivisIds } of relationSuivisBDD) {
        relationSuivis.set(personneEmail!, new SvelteSet(dossiersSuivisIds));
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

      const notificationParDossierPourInstructeurActuel: NonNullable<
        typeof store.notificationParDossier
      > = new SvelteMap();

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
    (résultatsSync: RésultatSynchronisationDS88444[]) => {
      for (const r of résultatsSync) {
        r.horodatage = new Date(r.horodatage);
      }

      store.résultatsSynchronisationDS88444 = résultatsSync;
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

export async function logoutEtRedirigerVersAccueil(erreur?: { message: string }) {
  if (erreur) {
    store.erreurs.add(erreur);
  }

  return logout().then(() => goto("/"));
}

type CapsResponse = StringValues<PitchouInstructeurCapabilities> & {
  identité: IdentitéInstructeurPitchou;
  maxUploadSizeBytes?: number;
};

function initCapabilities(secret: string) {
  return json(`/caps?secret=${secret}`).then((response) => {
    if (response && typeof response === "object") {
      const capsURLs = response as CapsResponse;
      store.capabilities = créerObjetCapDepuisURLs(capsURLs);

      if (capsURLs.identité) {
        store.identité = capsURLs.identité;
      }

      if (typeof capsURLs.maxUploadSizeBytes === "number") {
        store.maxUploadSizeBytes = capsURLs.maxUploadSizeBytes;
      }

      envoyerÉvènement({ type: "seConnecter" });
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
        logoutEtRedirigerVersAccueil({
          message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`,
        }),
      ),

    chargerSchemaDS88444(),
    chargerRésultatsSynchronisation(),
  ]);
}
