<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import ApiKeySettings from "@pitchou/ui/ApiKeySettings.svelte";
  import { personalAccountScopes, personalDossierScopes } from "@pitchou/types/externalApi.ts";
  import type { PageProps } from "./$types";
  let { data }: PageProps = $props();
</script>

<svelte:head><title>API - Paramètres - Pitchou</title></svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
    <p class="fr-text--sm m-0! text-[var(--text-mention-grey)]">
      Utilisez une clé personnelle pour appeler l’API avec vos droits Pitchou.
    </p>
    <a class="fr-link fr-link--sm" href="/api/v1/docs">Consulter la documentation de l’API</a>
  </div>
  <div
    class="rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6"
  >
    <ApiKeySettings
      endpoint="/parametres/api/keys"
      keys={data.keys}
      title="Clés personnelles"
      availableScopes={data.canReadDossiers
        ? [...personalDossierScopes, ...personalAccountScopes]
        : personalAccountScopes}
      onChange={invalidateAll}
    />
  </div>
</div>
