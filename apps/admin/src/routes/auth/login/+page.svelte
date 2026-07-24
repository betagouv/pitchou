<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const loginHref = $derived(`/auth/proconnect?redirectTo=${encodeURIComponent(data.redirectTo)}`);
</script>

<svelte:head>
  <title>Connexion — Pitchou Admin</title>
</svelte:head>

<div class="flex flex-col items-center justify-center text-center min-h-[60vh]">
  <h1 class="fr-mb-1w">Administration Pitchou</h1>
  <p class="fr-text--lead fr-mb-4w">Cet espace est réservé aux administrateurices Pitchou.</p>

  <div class="fr-connect-group">
    <a class="fr-connect" href={loginHref}>
      <span class="fr-connect__login">S'identifier avec</span>
      <span class="fr-connect__brand">ProConnect</span>
    </a>
    <p>
      <a
        href="https://www.proconnect.gouv.fr/"
        target="_blank"
        rel="noopener"
        title="Qu'est-ce que ProConnect ? - nouvelle fenêtre">Qu'est-ce que ProConnect ?</a
      >
    </p>
  </div>
</div>
