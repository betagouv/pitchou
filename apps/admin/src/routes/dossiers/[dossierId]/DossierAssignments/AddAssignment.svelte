<script lang="ts">
  import type { AccessLevel, GroupAssignment } from "@pitchou/types/groupRouting.ts";
  import AccessLevelChoice from "../DossierAccess/AccessLevelChoice.svelte";
  import SearchableSelect from "../../SearchableSelect.svelte";

  let {
    groups,
    saving,
    open = $bindable(false),
    onSave,
  }: {
    groups: GroupAssignment[];
    saving: boolean;
    open: boolean;
    onSave: (id: string, level: AccessLevel) => Promise<void>;
  } = $props();
  const id = $props.id();
  let selected = $state("");
  let level = $state<AccessLevel>("instruct");
  let error = $state("");
  const options = $derived(
    groups.map((group) => ({
      value: group.id,
      label: `${group.name}${group.active ? "" : " · Archivé"}`,
    })),
  );
  function close() {
    open = false;
    selected = "";
    level = "instruct";
    error = "";
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving || !selected) return;
    error = "";
    try {
      await onSave(selected, level);
      close();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Affectation impossible";
    }
  }
</script>

{#if open}
  <form class="access-editor" aria-label="Ajouter un groupe" onsubmit={submit}>
    <label class="fr-label" id={`${id}-label`} for={`${id}-group`}>Groupe instructeur</label>
    <SearchableSelect
      id={`${id}-group`}
      labelledBy={`${id}-label`}
      {options}
      value={selected}
      onChange={(value) => (selected = value)}
      disabled={saving}
      required
    />
    <p class="access-description">
      Recherchez un groupe par son nom. L'ajout manuel persiste après le recalcul des règles.
    </p>
    {#if groups.find((group) => group.id === selected)?.active === false}
      <p class="access-meta" role="status">
        Ce groupe est archivé. Il ne donnera accès au dossier qu'après sa réactivation.
      </p>
    {/if}
    <AccessLevelChoice
      name={`${id}-level`}
      label="Niveau d'accès du groupe ajouté"
      bind:value={level}
      disabled={saving}
    />
    {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
    <div class="access-actions">
      <button type="submit" class="fr-btn fr-btn--sm" disabled={saving || !selected}>
        Ajouter le groupe
      </button>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        disabled={saving}
        onclick={close}>Annuler</button
      >
    </div>
  </form>
{/if}
