<script lang="ts">
  import ProConnectButton from "@pitchou/ui/ProConnectButton.svelte";

  let { href }: { href: string } = $props();
</script>

<svelte:head>
  <title>Connexion — Pitchou</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
  <h1 class="fr-mb-1w">Connexion à Pitchou</h1>
  <p class="fr-text--lead fr-mb-4w">Connectez-vous avec votre compte professionnel.</p>

  <ProConnectButton {href} />
</div>
