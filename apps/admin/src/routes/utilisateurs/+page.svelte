<script lang="ts">
  import UsersHelp from "./UsersHelp.svelte";
  import UsersControls from "./UsersControls.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import UserEditor from "./UserEditor.svelte";
  import UsersTable from "./UsersTable.svelte";
  import { normalize, userName, type User } from "./model.ts";
  import { compareUsers, parseQuery } from "./list.ts";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let selected = $state<number | null>(null);
  const query = $derived(parseQuery(page.url.searchParams));
  let editorOpen = $state(false);
  function updateQuery(values: Record<string, string>, resetPages = true) {
    const url = new URL(page.url);
    if (resetPages) {
      url.searchParams.delete("actifs");
      url.searchParams.delete("desactives");
    }
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }
  function select(id: number | null) {
    selected = id;
    editorOpen = true;
  }
  $effect(() => {
    pageHeader.setAction({ label: "Préparer un compte", onClick: () => select(null) });
    return () => pageHeader.clearAction();
  });
  const allUsers: User[] = $derived(data.users);
  const users = $derived(
    allUsers
      .filter(
        (user) =>
          (!query.profile || user.bundles.includes(query.profile)) &&
          normalize(
            `${userName(user)} ${user.email ?? ""} ${user.groupes.map((group) => group.name).join(" ")}`,
          ).includes(normalize(query.search)),
      )
      .sort((a, b) => compareUsers(a, b, query.sort, query.order)),
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
<UsersControls {query} {updateQuery} />
{#each sections as section}
  <UsersTable
    {...section}
    filtered={!!query.search || !!query.profile}
    onSelect={select}
    onPageChange={(next) =>
      updateQuery({ [section.pageKey]: next === 1 ? "" : String(next) }, false)}
  />
{/each}
{#if editorOpen}
  <UserEditor
    groups={data.groups}
    current={data.users.find((user) => user.id === selected)}
    onClose={() => (editorOpen = false)}
  />
{/if}
