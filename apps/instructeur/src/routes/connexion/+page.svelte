<script lang="ts">
  import ProConnectButton from "@pitchou/ui/ProConnectButton.svelte";
  import { store } from "$lib/state/store.svelte.ts";
</script>

<h1>Connexion à Pitchou</h1>
{#if store.identité && !store.capabilities.listerDossiers}
  <p>
    Votre compte est enregistré. Un administrateur doit vous attribuer des droits et vous ajouter à
    un groupe pour accéder aux dossiers.
  </p>
{:else}
  <p>Utilisez votre compte professionnel pour accéder à Pitchou.</p>
  <ProConnectButton href="/auth/proconnect" />
{/if}
