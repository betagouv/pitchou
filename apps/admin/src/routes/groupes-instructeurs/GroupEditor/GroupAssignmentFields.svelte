<script lang="ts">
  import { departementName } from "@pitchou/common/departements.ts";
  import type { PageData } from "../$types";
  import GroupMemberPicker from "./GroupMemberPicker.svelte";
  let {
    data,
    formId,
    departments = $bindable<string[]>([]),
    members = $bindable<number[]>([]),
  }: { data: PageData; formId: string; departments: string[]; members: number[] } = $props();
  let tab = $state<"departments" | "members">("departments");
  let search = $state("");
  let memberPage = $state(1);
  function normalized(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
  const visibleDepartments = $derived(
    data.departments.filter((code) =>
      normalized(code + " " + departementName(code)).includes(normalized(search)),
    ),
  );
  const visibleUsers = $derived(
    data.users.filter((user) =>
      normalized(user.email ?? `Compte ${user.id}`).includes(normalized(search)),
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
        ? "departments"
        : event.key === "End"
          ? "members"
          : tab === "departments"
            ? "members"
            : "departments",
    );
    document.getElementById(formId + "-" + tab)?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label="Paramètres du groupe">
  <button
    type="button"
    id={formId + "-departments"}
    role="tab"
    aria-selected={tab === "departments"}
    aria-controls={formId + "-panel"}
    tabindex={tab === "departments" ? 0 : -1}
    onclick={() => changeTab("departments")}
    onkeydown={moveTab}
  >
    Départements <span class="count">{departments.length}</span>
  </button>
  <button
    type="button"
    id={formId + "-members"}
    role="tab"
    aria-selected={tab === "members"}
    aria-controls={formId + "-panel"}
    tabindex={tab === "members" ? 0 : -1}
    onclick={() => changeTab("members")}
    onkeydown={moveTab}
  >
    Membres <span class="count">{members.length}</span>
  </button>
</div>
<div
  class="selection-panel"
  id={formId + "-panel"}
  role="tabpanel"
  aria-labelledby={formId + "-" + tab}
  tabindex="0"
>
  <p class="hint panel-description">
    {tab === "departments"
      ? "Les dossiers de ces départements sont automatiquement affectés au groupe."
      : "Les membres peuvent instruire les dossiers du groupe selon leurs permissions."}
  </p>
  <div class="search-field">
    <span class="fr-icon-search-line" aria-hidden="true"></span>
    <input
      type="search"
      aria-label={tab === "departments" ? "Rechercher un département" : "Rechercher un membre"}
      placeholder={tab === "departments"
        ? "Rechercher par nom ou code…"
        : "Rechercher par adresse e-mail…"}
      bind:value={search}
      oninput={() => (memberPage = 1)}
      onkeydown={(event) => {
        if (event.key === "Enter") event.preventDefault();
      }}
    />
  </div>
  {#if tab === "departments"}
    <div class="selection-toolbar">
      <span>{departments.length} / {data.departments.length} sélectionnés</span>
      <div>
        <button
          type="button"
          onclick={() => (departments = [...new Set([...departments, ...visibleDepartments])])}
          >{search ? "Sélectionner les résultats" : "Tout sélectionner"}</button
        >
        <button type="button" onclick={() => (departments = [])}>Effacer</button>
      </div>
    </div>
    <div class="department-grid">
      {#each visibleDepartments as department}
        <label class="choice" class:selected={departments.includes(department)}>
          <input
            type="checkbox"
            value={department}
            checked={departments.includes(department)}
            onchange={(event) => {
              departments = event.currentTarget.checked
                ? [...new Set([...departments, department])]
                : departments.filter((code) => code !== department);
            }}
            aria-label={department + " · " + departementName(department)}
          />
          <span class="department-code">{department}</span>
          <span>{departementName(department)}</span>
        </label>
      {:else}<p class="empty">Aucun département trouvé.</p>{/each}
    </div>
  {:else}
    <GroupMemberPicker {visibleUsers} bind:members bind:memberPage />
  {/if}
</div>
