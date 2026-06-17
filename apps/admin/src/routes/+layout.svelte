<script lang="ts">
  import Header from "@pitchou/ui/Header.svelte";
  import Footer from "@pitchou/ui/Footer.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <title>Pitchou — Admin</title>
</svelte:head>

<Header serviceTitle="Pitchou" serviceTagline="Administration" {tools} {menuLinks} {nav} />

<main tabindex="-1" id="main">
  <div class="fr-container">
    {@render children()}
  </div>
</main>

<Footer description="Administration de Pitchou." />

{#snippet tools()}
  <AccountMenu />
{/snippet}

{#snippet menuLinks()}
  <AccountMenu align="start" />
{/snippet}

{#snippet nav()}
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
