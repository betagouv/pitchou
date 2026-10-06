<script lang="ts">
  import ProConnectButton from "@pitchou/ui/ProConnectButton.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const loginHref = $derived(`/auth/proconnect?redirectTo=${encodeURIComponent(data.redirectTo)}`);
</script>

<svelte:head>
  <title>Connexion — Pitchou</title>
</svelte:head>

<div class="flex flex-col items-center justify-center text-center min-h-[60vh]">
  <h1 class="fr-mb-1w">Connexion à Pitchou</h1>
  <p class="fr-text--lead fr-mb-4w">Connectez-vous avec votre compte professionnel.</p>

  <ProConnectButton href={loginHref} />
</div>
