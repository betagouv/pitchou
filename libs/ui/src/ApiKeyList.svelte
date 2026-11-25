<script lang="ts">
  import { apiScopeLabels, type ApiKeySummary } from "@pitchou/types/externalApi.ts";

  let {
    keys,
    busy,
    onRevoke,
  }: {
    keys: ApiKeySummary[];
    busy: boolean;
    onRevoke: (id: string) => Promise<boolean>;
  } = $props();

  const dateTime = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  let confirmation = $state<string>();

  function formatDate(date: string) {
    return dateTime.format(new Date(date));
  }

  async function confirmRevocation(id: string) {
    if (await onRevoke(id)) confirmation = undefined;
  }
</script>

{#if keys.length}
  <ul class="m-0! list-none space-y-2 p-0!">
    {#each keys as key (key.id)}
      {@const expired = Date.parse(key.expiresAt) <= Date.now()}
      <li
        class="rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-4!"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="m-0! font-bold break-words">{key.label}</p>
            <p class="fr-text--sm m-0!">
              {key.scopes.map((scope) => apiScopeLabels[scope] ?? scope).join(", ")}
            </p>
          </div>
          <span
            class="fr-badge fr-badge--sm fr-badge--no-icon {key.revokedAt || expired
              ? ''
              : 'fr-badge--success'}"
          >
            {key.revokedAt ? "Révoquée" : expired ? "Expirée" : "Active"}
          </span>
        </div>
        <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
          <dl class="fr-text--sm m-0! flex flex-wrap gap-x-5 gap-y-1">
            <div>
              <dt class="inline">Expiration</dt>
              <dd class="m-0! inline">
                <time datetime={key.expiresAt}>{formatDate(key.expiresAt)}</time>
              </dd>
            </div>
            <div>
              <dt class="inline">Dernière utilisation</dt>
              <dd class="m-0! inline">
                {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Jamais utilisée"}
              </dd>
            </div>
          </dl>
          {#if confirmation === key.id}
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="fr-btn fr-btn--sm"
                disabled={busy}
                onclick={() => confirmRevocation(key.id)}>Confirmer la révocation</button
              >
              <button
                type="button"
                class="fr-btn fr-btn--secondary fr-btn--sm"
                disabled={busy}
                onclick={() => (confirmation = undefined)}>Annuler</button
              >
            </div>
          {:else if !key.revokedAt && !expired}
            <button
              type="button"
              class="fr-btn fr-btn--secondary fr-btn--sm"
              disabled={busy}
              onclick={() => (confirmation = key.id)}
              aria-label={`Révoquer la clé ${key.label}`}>Révoquer</button
            >
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p class="fr-text--sm m-0!">Aucune clé créée.</p>
{/if}
