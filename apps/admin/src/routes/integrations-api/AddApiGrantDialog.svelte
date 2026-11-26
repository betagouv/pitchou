<script lang="ts">
  import {
    dossierGrantScopeLabels,
    dossierReadScope,
    type ApiGrantTarget,
    type DossierGrantScope,
  } from "@pitchou/types/externalApi.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectOption } from "@pitchou/ui/Select/options.ts";
  import ApiIntegrationDialog from "./ApiIntegrationDialog.svelte";

  let {
    groupes,
    onClose,
    onAdd,
  }: {
    groupes: { id: string; name: string }[];
    onClose: () => void;
    onAdd: (target: ApiGrantTarget, scope: DossierGrantScope) => Promise<void>;
  } = $props();
  const formId = $props.id();
  const title = "Ajouter une habilitation";

  const targetOptions: SelectOption<"dossier" | "groupe" | "all">[] = [
    { value: "dossier", label: "Un dossier" },
    { value: "groupe", label: "Un groupe instructeur" },
    { value: "all", label: "Tous les dossiers" },
  ];
  const scopeOptions: SelectOption<DossierGrantScope>[] = (
    Object.keys(dossierGrantScopeLabels) as DossierGrantScope[]
  ).map((value) => ({ value, label: dossierGrantScopeLabels[value] }));
  const groupeOptions = $derived(groupes.map(({ id, name }) => ({ value: id, label: name })));

  let targetSelect: { focus: () => void };
  let kind = $state<(typeof targetOptions)[number]["value"]>("dossier");
  let dossierId = $state<number>();
  let groupeId = $state("");
  let scope: DossierGrantScope = $state(dossierReadScope);
  let saving = $state(false);
  let failure = $state("");

  const target = $derived.by<ApiGrantTarget | undefined>(() => {
    if (kind === "all") return { allDossiers: true };
    if (kind === "groupe" && groupeId) return { groupeId };
    if (kind === "dossier" && dossierId) return { dossierId };
  });

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (saving || !target) return;
    saving = true;
    failure = "";
    try {
      await onAdd(target, scope);
      onClose();
    } catch (error) {
      failure = error instanceof Error ? error.message : "Ajout de l’habilitation impossible.";
    } finally {
      saving = false;
    }
  }
</script>

<ApiIntegrationDialog {title} {onClose} busy={saving} initialFocus={() => targetSelect.focus()}>
  <form id={formId} onsubmit={add} autocomplete="off" class="fr-p-3w flex flex-col gap-4">
    <div class="fr-select-group m-0!">
      <label class="fr-label" for={`${formId}-target`}>Périmètre</label>
      <Select
        id={`${formId}-target`}
        class="fr-mt-1w"
        options={targetOptions}
        bind:this={targetSelect}
        bind:value={kind}
        disabled={saving}
      />
    </div>

    {#if kind === "dossier"}
      <div class="fr-input-group m-0!">
        <label class="fr-label" for={`${formId}-dossier`}>Numéro de dossier Pitchou</label>
        <input
          class="fr-input"
          id={`${formId}-dossier`}
          type="number"
          autocomplete="off"
          min="1"
          max="2147483647"
          required
          bind:value={dossierId}
          disabled={saving}
        />
      </div>
    {:else if kind === "groupe"}
      <div class="fr-select-group m-0!">
        <label class="fr-label" for={`${formId}-groupe`}>Groupe instructeur</label>
        <Select
          id={`${formId}-groupe`}
          class="fr-mt-1w"
          options={groupeOptions}
          placeholder="Sélectionner un groupe"
          bind:value={groupeId}
          required
          disabled={saving}
        />
        <p class="fr-hint-text fr-mt-1w mb-0!">
          L’accès suit les affectations de dossiers de ce groupe.
        </p>
      </div>
    {:else}
      <p class="fr-alert fr-alert--info fr-alert--sm m-0!">
        L’habilitation s’applique à tous les dossiers existants et futurs, avec ou sans groupe.
      </p>
    {/if}

    <div class="fr-select-group m-0!">
      <label class="fr-label" for={`${formId}-scope`}>Permission</label>
      <Select
        id={`${formId}-scope`}
        class="fr-mt-1w"
        options={scopeOptions}
        bind:value={scope}
        disabled={saving}
      />
      <p class="fr-hint-text fr-mt-1w mb-0!">
        {#if scope === dossierReadScope}
          Permet de consulter le dossier et son état d’instruction en lecture restreinte.
        {:else}
          Inclut les informations internes. Ce niveau exige aussi une habilitation en lecture
          restreinte et une clé possédant les deux permissions.
        {/if}
      </p>
    </div>
    {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  </form>

  {#snippet footer()}
    <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={onClose}>
      Annuler
    </button>
    <button type="submit" form={formId} class="fr-btn" disabled={saving || !target}>
      {saving ? "Ajout…" : "Ajouter l’habilitation"}
    </button>
  {/snippet}
</ApiIntegrationDialog>
