<script lang="ts">
  import UsersHelp from "./UsersHelp.svelte";
  import UsersControls from "./UsersControls.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import UsersTable from "./UsersTable.svelte";
  import { compareUsers, filterUsers, groupFilterOptions, parseQuery } from "./list.ts";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const groupeOptions = $derived(
    groupFilterOptions(data.groups ?? data.users.flatMap((user) => user.groupes)),
  );
  const query = $derived(parseQuery(page.url.searchParams));
  function updateQuery(values: Record<string, string>, resetPages = true) {
    const url = new URL(page.url.href);
    if (resetPages) {
      url.searchParams.delete("actifs");
      url.searchParams.delete("desactives");
    }
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    void goto(url, { replace: true, reset: false });
  }
  function select(id: number | null) {
    void goto(`/utilisateurs/${id ?? "nouveau"}${page.url.search}`);
  }
  $effect(() => {
    pageHeader.setAction({ label: "Préparer un compte", onClick: () => select(null) });
    return () => pageHeader.clearAction();
  });
  const users = $derived(
    filterUsers(data.users, query).sort((a, b) => compareUsers(a, b, query.sort, query.order)),
  );
  const sections = $derived([
    {
      title: "Actifs",
      active: true,
      users: users.filter((user) => user.active),
      page: query.activePage,
      pageKey: "actifs",
    },
    {
      title: "Désactivés",
      active: false,
      users: users.filter((user) => !user.active),
      page: query.inactivePage,
      pageKey: "desactives",
    },
  ]);
</script>

<UsersHelp />
{#if form?.message}<p class="fr-alert fr-alert--error" role="alert">{form.message}</p>{/if}
<UsersControls {query} {groupeOptions} {updateQuery} />
{#each sections as section}
  <UsersTable
    {...section}
    filtered={!!query.search || !!query.profile || !!query.groupe}
    onSelect={select}
    onPageChange={(next) =>
      updateQuery({ [section.pageKey]: next === 1 ? "" : String(next) }, false)}
  />
{/each}
