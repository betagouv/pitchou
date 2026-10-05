<script lang="ts">
  import ProConnectButton from "@pitchou/ui/ProConnectButton.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const loginHref = $derived(`/auth/proconnect?redirectTo=${encodeURIComponent(data.redirectTo)}`);
</script>

<svelte:head>
  <title>Connexion — Pitchou Admin</title>
</svelte:head>

<div class="admin-auth flex flex-col items-center text-center">
  <h1 class="fr-mb-1w">Administration Pitchou</h1>
  <p class="fr-text--lead fr-mb-4w">Cet espace est réservé aux administrateurices Pitchou.</p>

  <ProConnectButton href={loginHref} />
</div>
