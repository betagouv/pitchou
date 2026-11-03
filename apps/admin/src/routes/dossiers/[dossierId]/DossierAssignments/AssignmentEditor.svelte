<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type {
    AccessLevel,
    AssignmentMode,
    GroupAssignment,
  } from "@pitchou/types/groupRouting.ts";
  import AccessLevelChoice from "../DossierAccess/AccessLevelChoice.svelte";

  let {
    group,
    saving,
    onSave,
    onCancel,
  }: {
    group: GroupAssignment;
    saving: boolean;
    onSave: (mode: AssignmentMode, level: AccessLevel) => Promise<void>;
    onCancel: () => void;
  } = $props();
  const id = $props.id();
  let mode = $state<AssignmentMode>(untrack(() => group.mode));
  let level = $state<AccessLevel>(
    untrack(() =>
      group.mode === "auto"
        ? (group.accessLevel ?? group.manualAccessLevel)
        : group.manualAccessLevel,
    ),
  );
  let error = $state("");
  const modes: { value: AssignmentMode; label: string }[] = [
    { value: "auto", label: "Suivre les règles automatiques" },
    { value: "include", label: "Inclure manuellement" },
    { value: "exclude", label: "Exclure durablement" },
  ];
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    error = "";
    try {
      await onSave(mode, level);
      onCancel();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Affectation impossible";
    }
  }
</script>

<form
  class="access-editor"
  aria-label={`Modifier l'affectation de ${group.name}`}
  onsubmit={submit}
>
  <label class="fr-label" for={`${id}-mode`}>Mode d'affectation de {group.name}</label>
  <Select id={`${id}-mode`} options={modes} bind:value={mode} disabled={saving} />
  <p class="access-description">
    {#if mode === "auto"}
      L'accès et son niveau sont recalculés selon les règles du groupe.
    {:else if mode === "include"}
      Le niveau manuel remplace celui des règles de ce groupe et persiste après leur recalcul.
    {:else}
      L'exclusion retire uniquement l'accès apporté par ce groupe, même si une règle correspond.
    {/if}
  </p>
  {#if mode === "include"}
    <AccessLevelChoice
      name={`${id}-level`}
      label={`Niveau d'accès manuel de ${group.name}`}
      bind:value={level}
      disabled={saving}
    />
  {/if}
  {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
  <div class="access-actions">
    <button type="submit" class="fr-btn fr-btn--sm" disabled={saving}>Enregistrer</button>
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
      disabled={saving}
      onclick={onCancel}>Annuler</button
    >
  </div>
</form>
