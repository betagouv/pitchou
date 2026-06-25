<script lang="ts">
  import Header from "@pitchou/ui/Header.svelte";
  import Footer from "@pitchou/ui/Footer.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import type { LayoutData } from "./$types";

  let { children, data }: { children: import("svelte").Snippet; data: LayoutData } = $props();

  function logout() {
    window.location.href = "/auth/logout";
  }
</script>

<svelte:head>
  <title>Pitchou — Admin</title>
</svelte:head>

<Header
  serviceTitle="Pitchou"
  serviceTagline="Administration"
  tools={data.user ? tools : undefined}
  menuLinks={data.user ? menuLinks : undefined}
  nav={data.user ? mainNav : undefined}
/>

<main tabindex="-1" id="main">
  <div class="fr-container fr-py-6w">
    {@render children()}
  </div>
</main>

<Footer description="Administration de Pitchou." />

{#snippet tools()}
  <AccountMenu email={data.user?.email} onLogout={logout} />
{/snippet}

{#snippet menuLinks()}
  <AccountMenu align="start" email={data.user?.email} onLogout={logout} />
{/snippet}

{#snippet mainNav()}
  <nav class="fr-nav" aria-label="Menu principal">
    <ul class="fr-nav__list">
      <li class="fr-nav__item">
        <a class="fr-nav__link" href="/">Accueil</a>
      </li>
    </ul>
  </nav>
{/snippet}

<style lang="scss">
  // Sticky footer: keep the footer at the bottom when the content is shorter than the viewport
  :global(body) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1 0 auto;
  }
</style>
