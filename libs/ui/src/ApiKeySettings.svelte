<script lang="ts">
  import { untrack } from "svelte";
  import {
    apiKeyLifetimes,
    apiScopeLabels,
    dossierReadScope,
    type ApiKeyInput,
    type ApiKeySummary,
    type ApiScope,
  } from "@pitchou/types/externalApi.ts";
  import { apiSettingsRequest } from "./apiSettingsRequest.ts";
  import ApiKeyList from "./ApiKeyList.svelte";
  import Select from "./Select.svelte";

  let {
    endpoint,
    keys,
    title,
    onChange,
    availableScopes,
  }: {
    endpoint: string;
    keys: ApiKeySummary[];
    title: string;
    onChange: () => Promise<void>;
    availableScopes: readonly ApiScope[];
  } = $props();

  const formId = $props.id();
  const lifetimeOptions = apiKeyLifetimes.map((value) => ({ value, label: `${value} jours` }));
  let label = $state("");
  let days = $state<ApiKeyInput["days"]>(30);
  let scopes = $state<ApiScope[]>(
    untrack(() => (availableScopes.includes(dossierReadScope) ? [dossierReadScope] : [])),
  );
  const selectedScopes = $derived(scopes.filter((scope) => availableScopes.includes(scope)));
  let busy = $state(false);
  let failure = $state("");
  let notice = $state("");
  let issued = $state<{ key: ApiKeySummary; secret: string }>();

  async function refresh() {
    await onChange().catch(() => {
      failure = "Rechargez la page pour actualiser vos clés.";
    });
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (busy || selectedScopes.length === 0) return;
    busy = true;
    failure = "";
    notice = "";
    try {
      const response = await apiSettingsRequest(endpoint, "POST", {
        label,
        scopes: selectedScopes,
        days,
      });
      issued = await response.json();
      label = "";
      await refresh();
    } catch (error) {
      failure = error instanceof Error ? error.message : "Création de la clé impossible.";
    } finally {
      busy = false;
    }
  }

  async function revoke(id: string) {
    if (busy) return false;
    busy = true;
    failure = "";
    notice = "";
    try {
      await apiSettingsRequest(endpoint, "DELETE", { id });
      if (issued?.key.id === id) issued = undefined;
      notice = "Clé révoquée.";
      await refresh();
      return true;
    } catch (error) {
      failure = error instanceof Error ? error.message : "Révocation de la clé impossible.";
      return false;
    } finally {
      busy = false;
    }
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.secret);
      notice = "Clé copiée.";
    } catch {
      notice = "Sélectionnez le jeton pour le copier.";
    }
  }
</script>

<section aria-labelledby={`${formId}-title`} class="flex flex-col gap-4">
  <h3 id={`${formId}-title`} class="m-0! text-base! font-bold">{title}</h3>
  <form onsubmit={create} autocomplete="off" class="flex flex-col items-start gap-4">
    <div class="grid w-full gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.6fr)]">
      <div class="fr-input-group m-0!">
        <label class="fr-label" for={`${formId}-label`}>Nom de la clé</label>
        <input
          id={`${formId}-label`}
          class="fr-input"
          type="text"
          autocomplete="off"
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
          <input type="checkbox" id={`${formId}-${scope}`} value={scope} bind:group={scopes} />
          <label class="fr-label" for={`${formId}-${scope}`}>{apiScopeLabels[scope]}</label>
        </div>
      {/each}
    </fieldset>
    <button
      type="submit"
      class="fr-btn fr-btn--icon-left fr-icon-add-line"
      disabled={busy || !label.trim() || selectedScopes.length === 0}
    >
      Créer la clé
    </button>
  </form>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  {#if notice}<p class="fr-valid-text m-0!" role="status">{notice}</p>{/if}
  {#if issued}
    <div class="fr-alert fr-alert--info min-w-0" role="status">
      <p class="mb-3! [overflow-wrap:anywhere]">
        Copiez la clé « {issued.key.label} ». Elle est affichée une seule fois.
      </p>
      <label class="fr-label" for={`${formId}-secret`}>Jeton d’accès</label>
      <input
        id={`${formId}-secret`}
        class="fr-input font-mono"
        value={issued.secret}
        autocomplete="off"
        spellcheck={false}
        readonly
      />
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="fr-btn fr-btn--sm" onclick={copy}>Copier la clé</button>
        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm"
          onclick={() => (issued = undefined)}>Masquer</button
        >
      </div>
    </div>
  {/if}
  <ApiKeyList {keys} {busy} onRevoke={revoke} />
</section>
