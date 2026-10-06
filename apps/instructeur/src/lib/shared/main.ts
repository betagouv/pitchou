import { json } from "d3-fetch";
import { forget } from "remember";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { store } from "$lib/state/store.svelte.ts";
import { SCHEMA_DS_88444 } from "$lib/shared/dataPaths.ts";

import createCapObjectFromURLs from "$lib/shared/createCapObjectFromURLs.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import { refreshNotifications } from "$lib/dossier/notification.ts";

import type { default as DemarcheNumerique88444SynchronizationResult } from "@pitchou/types/database/public/DemarcheNumerique88444SynchronizationResult.ts";
import type {
  PitchouInstructeurCapabilities,
  IdentiteInstructeurPitchou,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

export const PITCHOU_SECRET_STORAGE_KEY = "secret-pitchou";

export function loadRelationSuivi() {
  if (store.capabilities?.listFollowRelations) {
    store.capabilities?.listFollowRelations().then((followRelationsDB) => {
      if (!followRelationsDB || !Array.isArray(followRelationsDB)) {
        throw new TypeError("On attendait un tableau de relation suivis ici !");
      }

      const followRelations: NonNullable<typeof store.followRelations> = new SvelteMap();

      for (const { personneEmail, followedDossierIds } of followRelationsDB) {
        followRelations.set(personneEmail!, new SvelteSet(followedDossierIds));
      }

      store.followRelations = followRelations;
    });
  }
}

export function loadRecentSearches() {
  store.capabilities?.listRecentSearches?.().then((recentSearches) => {
    if (!Array.isArray(recentSearches)) {
      throw new TypeError("On attendait un tableau de recherches récentes ici !");
    }

    store.recentSearches = recentSearches;
  });
}

export function loadNotificationByDossierForCurrentInstructeur() {
  return refreshNotifications();
}

export function loadSchemaDS88444() {
  return json(SCHEMA_DS_88444).then((schema) => {
    //@ts-ignore
    store.schemaDS88444 = schema;
    return schema;
  });
}

export function loadSynchronizationResults() {
  return json("/resultats-synchronisation").then(
    // @ts-ignore
    (synchronizationResults: DemarcheNumerique88444SynchronizationResult[]) => {
      for (const r of synchronizationResults) {
        r.timestamp = new Date(r.timestamp);
      }

      store.demarcheNumerique88444SynchronizationResults = synchronizationResults;
    },
  );
}

export async function logout() {
  store.capabilities = {};
  store.identité = undefined;

  store.dossierSummaries = new SvelteMap();
  store.fullDossiers = new SvelteMap();
  store.readOnlyDossiers = new SvelteMap();
  store.followRelations = new SvelteMap();
  store.notificationByDossier = new SvelteMap();
  store.recentSearches = undefined;

  await forget(PITCHOU_SECRET_STORAGE_KEY);
  window.location.href = "/auth/logout";
}

export async function logoutAndRedirectToHome(erreur?: { message: string }) {
  if (erreur) {
    store.errors.add(erreur);
  }

  return logout();
}

let authorizationVersion: string | undefined;

async function refreshAuthorization() {
  if (document.visibilityState !== "visible") return;
  try {
    const response = await fetch("/api/session");
    const current = response.ok ? await response.json() : null;
    if (
      (response.status === 401 && store.identité) ||
      (current && current.authorizationVersion !== authorizationVersion)
    )
      window.location.reload();
  } catch {
    /* A disconnected browser will retry on the next focus. */
  }
}

type CapsResponse = StringValues<PitchouInstructeurCapabilities> & {
  identité: IdentiteInstructeurPitchou;
  authorizationVersion: string;
  maxUploadSizeBytes?: number;
};

function initCapabilities() {
  return fetch("/api/session")
    .then(async (response) =>
      response.status === 401
        ? null
        : response.ok
          ? response.json()
          : Promise.reject(new Error("Impossible de charger votre compte")),
    )
    .then((response) => {
      if (response && typeof response === "object") {
        const capsURLs = response as CapsResponse;
        authorizationVersion = capsURLs.authorizationVersion;
        store.capabilities = createCapObjectFromURLs(capsURLs);

        if (capsURLs.identité) {
          store.identité = capsURLs.identité;
        }

        if (typeof capsURLs.maxUploadSizeBytes === "number") {
          store.maxUploadSizeBytes = capsURLs.maxUploadSizeBytes;
        }

        sendEvenement({ type: "seConnecter" });
      }
    });
}

export function init() {
  window.addEventListener("focus", refreshAuthorization);
  return Promise.all([
    forget(PITCHOU_SECRET_STORAGE_KEY).then(() => initCapabilities()),
    loadSchemaDS88444(),
    loadSynchronizationResults(),
  ]);
}
