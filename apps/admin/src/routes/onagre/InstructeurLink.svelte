<script lang="ts">
  import * as publicEnv from "$app/env/public";
  import type { Snippet } from "svelte";
  let { dossierId, children }: { dossierId: number; children: Snippet } = $props();
  const href = $derived(
    publicEnv.PUBLIC_SITE_URL_PITCHOU
      ? new URL(`/dossier/${dossierId}`, publicEnv.PUBLIC_SITE_URL_PITCHOU).href
      : null,
  );
</script>

{#if href}
  <a {href} target="_blank" rel="noopener noreferrer"
    >{@render children()}<span class="fr-sr-only">
      — Application instructeur, nouvel onglet</span
    ></a
  >
{:else}
  <span>{@render children()} — Lien instructeur indisponible</span>
{/if}
