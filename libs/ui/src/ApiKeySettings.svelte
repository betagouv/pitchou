<script lang="ts">
  import {
    apiKeyLifetimes,
    apiScopeLabels,
    dossierStatusScope,
    type ApiKeyInput,
    type ApiKeySummary,
    type ApiScope,
  } from "@pitchou/types/externalApi.ts";
  import { apiSettingsRequest } from "./apiSettingsRequest.ts";
  import ApiKeyList from "./ApiKeyList.svelte";

  let {
    endpoint,
    keys,
    title,
    onChange,
    canCreate = true,
  }: {
    endpoint: string;
    keys: ApiKeySummary[];
    title: string;
    onChange: () => Promise<void>;
    canCreate?: boolean;
  } = $props();

  const formId = $props.id();
  const scopeChoices = Object.entries(apiScopeLabels) as [ApiScope, string][];
  let label = $state("");
  let days = $state<ApiKeyInput["days"]>(30);
  let scopes = $state<ApiScope[]>([dossierStatusScope]);
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
    if (busy || !canCreate || scopes.length === 0) return;
    busy = true;
    failure = "";
    notice = "";
    try {
      const response = await apiSettingsRequest(endpoint, "POST", { label, scopes, days });
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

<section aria-labelledby={`${formId}-title`} class="space-y-4">
  <h3 id={`${formId}-title`} class="fr-h6 m-0!">{title}</h3>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  {#if notice}<p class="fr-valid-text m-0!" role="status">{notice}</p>{/if}
  {#if issued}
    <div class="fr-alert fr-alert--info" role="status">
      <p>Copiez la clé « {issued.key.label} ». Elle est affichée une seule fois.</p>
      <label class="fr-label" for={`${formId}-secret`}>Jeton d’accès</label>
      <input id={`${formId}-secret`} class="fr-input font-mono" value={issued.secret} readonly />
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
  {#if canCreate}
    <form onsubmit={create} class="space-y-4 border-t border-[var(--border-default-grey)] pt-4">
      <h4 class="fr-text--bold m-0!">Créer une clé</h4>
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(9rem,0.6fr)]">
        <div class="fr-input-group m-0!">
          <label class="fr-label" for={`${formId}-label`}>Nom de la clé</label>
          <input
            id={`${formId}-label`}
            class="fr-input"
            bind:value={label}
            maxlength="80"
            required
            disabled={busy}
          />
        </div>
        <div class="fr-select-group m-0!">
          <label class="fr-label" for={`${formId}-days`}>Durée de validité</label>
          <select id={`${formId}-days`} class="fr-select" bind:value={days} disabled={busy}>
            {#each apiKeyLifetimes as lifetime (lifetime)}<option value={lifetime}
                >{lifetime} jours</option
              >{/each}
          </select>
        </div>
      </div>
      <fieldset class="m-0 border-0 p-0" disabled={busy}>
        <legend class="fr-label mb-1">Permissions de la clé</legend>
        {#each scopeChoices as [scope, name] (scope)}
          <div class="fr-checkbox-group fr-checkbox-group--sm">
            <input type="checkbox" id={`${formId}-${scope}`} value={scope} bind:group={scopes} />
            <label class="fr-label" for={`${formId}-${scope}`}>{name}</label>
          </div>
        {/each}
      </fieldset>
      <button type="submit" class="fr-btn" disabled={busy || !label.trim() || scopes.length === 0}
        >Créer la clé</button
      >
    </form>
  {:else}
    <p class="fr-text--sm m-0!">
      La création d’une clé nécessite la permission de consulter les dossiers.
    </p>
  {/if}
</section>
