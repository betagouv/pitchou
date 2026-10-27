<script lang="ts">
  import type { GroupRule } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import GroupMemberPicker from "./GroupMemberPicker.svelte";
  import GroupRules from "./GroupRules.svelte";
  let {
    data,
    formId,
    rules = $bindable<GroupRule[]>([]),
    members = $bindable<number[]>([]),
  }: { data: PageData; formId: string; rules: GroupRule[]; members: number[] } = $props();
  let tab = $state<"rules" | "members">("rules");
  let search = $state("");
  let memberPage = $state(1);
  const visibleUsers = $derived(
    data.users.filter((user) =>
      (user.email ?? `Compte ${user.id}`).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  function changeTab(next: typeof tab) {
    tab = next;
    search = "";
    memberPage = 1;
  }
  function moveTab(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    changeTab(
      event.key === "Home"
        ? "rules"
        : event.key === "End"
          ? "members"
          : tab === "rules"
            ? "members"
            : "rules",
    );
    document.querySelector<HTMLElement>(`#${CSS.escape(formId + "-" + tab)}`)?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label="Paramètres du groupe">
  {#each ["rules", "members"] as key}
    <button
      type="button"
      id={formId + "-" + key}
      role="tab"
      aria-selected={tab === key}
      aria-controls={formId + "-panel"}
      tabindex={tab === key ? 0 : -1}
      onclick={() => changeTab(key as typeof tab)}
      onkeydown={moveTab}
    >
      {key === "rules" ? "Règles" : "Membres"}
      <span class="count">{key === "rules" ? rules.length : members.length}</span>
    </button>
  {/each}
</div>
<div
  class="selection-panel p-4"
  id={formId + "-panel"}
  role="tabpanel"
  aria-labelledby={formId + "-" + tab}
  tabindex="0"
>
  {#if tab === "rules"}
    <GroupRules bind:rules activites={data.activites} />
  {:else}
    <label class="fr-label" for={formId + "-member-search"}>Rechercher un membre</label>
    <input
      id={formId + "-member-search"}
      class="fr-input"
      type="search"
      bind:value={search}
      oninput={() => (memberPage = 1)}
    />
    <GroupMemberPicker {visibleUsers} bind:members bind:memberPage />
  {/if}
</div>
