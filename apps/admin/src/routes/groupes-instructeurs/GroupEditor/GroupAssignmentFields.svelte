<script lang="ts">
  import { tick } from "svelte";
  import type { GroupRule } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "../$types";
  import GroupMemberPicker from "./GroupMemberPicker.svelte";
  import GroupRules from "./GroupRules.svelte";
  import GroupIdentityFields from "./GroupIdentityFields.svelte";
  let {
    data,
    formId,
    name = $bindable(""),
    active = $bindable(true),
    rules = $bindable<GroupRule[]>([]),
    members = $bindable<number[]>([]),
    rulesValid = $bindable(true),
  }: {
    data: PageData;
    formId: string;
    name: string;
    active: boolean;
    rules: GroupRule[];
    members: number[];
    rulesValid?: boolean;
  } = $props();
  const tabs = [
    { key: "identity", label: "Groupe" },
    { key: "rules", label: "Règles" },
    { key: "members", label: "Membres" },
  ] as const;
  let tab = $state<(typeof tabs)[number]["key"]>("identity");
  let search = $state("");
  let memberPage = $state(1);
  function changeTab(next: typeof tab) {
    tab = next;
    search = "";
    memberPage = 1;
  }
  function moveTab(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex(({ key }) => key === tab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    changeTab(tabs[next].key);
    document.querySelector<HTMLElement>(`#${CSS.escape(formId + "-" + tab)}`)?.focus();
  }
  async function showInvalidField(event: Event) {
    if (tab === "identity") return;
    event.preventDefault();
    changeTab("identity");
    await tick();
    (event.target as HTMLInputElement).reportValidity();
  }
</script>

<div class="tabs admin-page-tabs" role="tablist" aria-label="Paramètres du groupe">
  {#each tabs as { key, label }}
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
      {label}
      {#if key !== "identity"}<span class="count"
          >{key === "rules" ? rules.length : members.length}</span
        >{/if}
    </button>
  {/each}
</div>
<div
  class="selection-panel"
  id={formId + "-panel"}
  role="tabpanel"
  aria-labelledby={formId + "-" + tab}
  tabindex="0"
  oninvalidcapture={showInvalidField}
>
  <div hidden={tab !== "identity"}>
    <GroupIdentityFields {formId} bind:name bind:active />
  </div>
  <div hidden={tab !== "rules"}>
    <GroupRules bind:rules bind:valid={rulesValid} activites={data.activites} />
  </div>
  {#if tab === "members"}
    <GroupMemberPicker users={data.users} bind:search bind:members bind:memberPage />
  {/if}
</div>
