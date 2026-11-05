<script lang="ts">
  import { untrack } from "svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import type { DossiersListScope } from "@pitchou/types/dossierList.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { ListDossiersProps } from "./props.ts";
  import { store } from "#lib/state/store.svelte.ts";
  import { loadRecentSearches } from "#lib/shared/main.ts";
  import { queueDossierFollowUpdate } from "#lib/dossier/suiviDossier.ts";
  import { sendEvenement } from "#lib/shared/aarri.ts";
  import { createServerDossiers } from "./requests.svelte.ts";
  import { buildDossiersSearchParams, readDossiersQuery } from "./query.ts";
  import ListDossiers from "./ListDossiers.svelte";

  let {
    scope,
    ...props
  }: Omit<ListDossiersProps, "dossiers" | "notificationByDossier" | "followRelations"> & {
    scope: DossiersListScope;
  } = $props();
  const list = createServerDossiers();
  let revision = $state(0);
  let refreshOptions = false;
  const query = $derived.by(() => {
    const next = readDossiersQuery(new URLSearchParams(page.url.searchParams.toString()));
    if (scope === "followed") next.localisation = "assigned";
    return next;
  });
  const serialized = $derived(buildDossiersSearchParams(query).toString());
  const followRelations = $derived(
    new SvelteMap(list.result?.followRelations.map(([email, ids]) => [email, new SvelteSet(ids)])),
  );
  const notificationByDossier = $derived(
    new SvelteMap(
      list.result?.notifications.map(({ dossier, ...notification }) => [dossier, notification]),
    ),
  );

  $effect(() => {
    const currentScope = scope;
    const currentQuery = serialized;
    void revision;
    const needsOptions = refreshOptions;
    refreshOptions = false;
    untrack(
      () =>
        void list.load(currentScope, currentQuery, needsOptions).then((result) => {
          if (!result) return;
          // The shared editors need only the current page's summaries and follow relations.
          store.dossierSummaries = new SvelteMap(
            result.items.map((dossier) => [dossier.id, dossier]),
          );
          store.followRelations = new SvelteMap(
            result.followRelations.map(([email, ids]) => [email, new SvelteSet(ids)]),
          );
          for (const dossier of result.items) store.notificationByDossier.delete(dossier.id);
          for (const { dossier, ...notification } of result.notifications)
            store.notificationByDossier.set(dossier, notification);
          if (result.page !== query.page) {
            const params = buildDossiersSearchParams({ ...query, page: result.page });
            void goto(params.size > 0 ? `?${params}` : page.url.pathname, {
              replace: true,
              reset: false,
            });
          }
        }),
    );
    return list.cancel;
  });
  $effect(() => {
    loadRecentSearches()?.catch(() => {});
    if (scope === "followed") sendEvenement({ type: "afficherLesDossiersSuivis" });
  });

  function refresh() {
    refreshOptions = true;
    revision++;
  }

  async function updateFollow(action: "suivre" | "laisser", id: DossierSummary["id"]) {
    const update = store.capabilities.updateFollowRelation;
    if (!update || !store.identité?.email)
      throw new Error("Impossible de modifier le suivi du dossier");
    const email = store.identité.email;
    await queueDossierFollowUpdate(id, () => update(action, email, id));
    refresh();
  }
</script>

<ListDossiers
  {...props}
  email={store.identité?.email}
  recentSearches={store.recentSearches ?? []}
  dossiers={list.result?.items ?? []}
  {followRelations}
  {notificationByDossier}
  loading={!list.result && list.busy}
  loadError={list.error}
  onRetry={refresh}
  server={{
    result: list.result,
    options: list.options,
    busy: list.busy,
    refresh,
    follow: (id) => updateFollow("suivre", id),
    leave: (id) => updateFollow("laisser", id),
  }}
/>
