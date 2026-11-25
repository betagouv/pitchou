<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import ApiKeySettings from "@pitchou/ui/ApiKeySettings.svelte";
  import type { PageProps } from "./$types";
  let { data }: PageProps = $props();
</script>

<svelte:head><title>API - Paramètres - Pitchou</title></svelte:head>

<p>Utilisez une clé personnelle pour appeler l’API avec vos droits Pitchou.</p>
<p><a class="fr-link" href="/api/v1/docs">Consulter la documentation de l’API</a></p>

<ApiKeySettings
  endpoint="/parametres/api/cles"
  keys={data.keys}
  title="Clés personnelles"
  canCreate={data.canCreate}
  onChange={invalidateAll}
/>
