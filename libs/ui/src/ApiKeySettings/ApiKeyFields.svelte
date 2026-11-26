<script lang="ts">
  import {
    apiScopeLabels,
    dossierInternalScope,
    dossierReadScope,
    type ApiKeyInput,
    type ApiScope,
  } from "@pitchou/types/externalApi.ts";
  import Select from "../Select.svelte";

  let {
    formId,
    busy,
    availableScopes,
    availableLifetimes,
    selectedScopes,
    label = $bindable(),
    days = $bindable(),
    scopes = $bindable(),
    nameInput = $bindable(),
  }: {
    formId: string;
    busy: boolean;
    availableScopes: readonly ApiScope[];
    availableLifetimes: readonly ApiKeyInput["days"][];
    selectedScopes: ApiScope[];
    label: string;
    days: ApiKeyInput["days"];
    scopes: ApiScope[];
    nameInput: HTMLInputElement | undefined;
  } = $props();

  const lifetimeOptions = $derived(
    availableLifetimes.map((value) => ({
      value,
      label: value === 365 ? "1 an (365 jours)" : `${value} jours`,
    })),
  );
</script>

<div class="grid w-full gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.6fr)]">
  <div class="fr-input-group m-0!">
    <label class="fr-label" for={`${formId}-label`}>Nom de la clé</label>
    <input
      id={`${formId}-label`}
      class="fr-input"
      type="text"
      autocomplete="off"
      bind:this={nameInput}
      bind:value={label}
      maxlength="80"
      required
      disabled={busy}
    />
  </div>
  <div class="fr-select-group m-0!">
    <label class="fr-label" for={`${formId}-days`}>Durée de validité</label>
    <Select
      id={`${formId}-days`}
      class="fr-mt-1w"
      options={lifetimeOptions}
      bind:value={days}
      disabled={busy}
    />
  </div>
</div>
<fieldset class="m-0 min-w-0 border-0 p-0" disabled={busy}>
  <legend class="fr-label mb-1">Permissions de la clé</legend>
  {#each availableScopes as scope (scope)}
    <div class="fr-checkbox-group fr-checkbox-group--sm">
      <input
        type="checkbox"
        id={`${formId}-${scope}`}
        value={scope}
        bind:group={scopes}
        disabled={(scope === dossierInternalScope && !selectedScopes.includes(dossierReadScope)) ||
          (scope === dossierReadScope && selectedScopes.includes(dossierInternalScope))}
      />
      <label class="fr-label" for={`${formId}-${scope}`}>{apiScopeLabels[scope]}</label>
    </div>
  {/each}
</fieldset>
