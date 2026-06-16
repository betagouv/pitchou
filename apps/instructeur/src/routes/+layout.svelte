<script lang="ts">
  // MUST be the first import
  // cf scripts/front-end/before-ses-lockdown.ts
  import "./before-ses-lockdown.ts";

  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";

  import { store } from "$lib/state/store.svelte.ts";

  import BandeauEnvironnement from "$lib/components/BandeauEnvironnement.svelte";
  import Header from "$lib/components/Header/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";

  let { children } = $props();

  const email = $derived(store.identité?.email);
  // nav follows whether an email is present, unless a page opts out (page.data.hideNav)
  const nav = $derived(!page.data.hideNav && Boolean(email));

  afterNavigate(({ to }) => {
    if (!to) return;
    const urlHasSecret = to.url.searchParams.has("secret");
    if (!urlHasSecret) return;
    const cleaned = new URL(to.url);
    cleaned.searchParams.delete("secret");
    void goto(cleaned, { replaceState: true, invalidateAll: false, noScroll: true });
  });
</script>

<svelte:head>
  <title>Pitchou</title>
</svelte:head>

<BandeauEnvironnement />

<Header {nav} {email} />

<main tabindex="-1" id="main">
  <div class="fr-container">
    {#if store.erreurs.size >= 1}
      <section class="erreurs fr-grid-row fr-grid-row--center">
        <div class="fr-col">
          {#each [...store.erreurs] as erreur}
            <div class="fr-alert-background fr-mb-1w">
              <div class="fr-alert fr-alert--error fr-alert--sm">
                <p><strong>Erreur&nbsp;:&nbsp;</strong>{erreur.message}</p>
                <button onclick={() => store.erreurs.delete(erreur)} class="fr-link--close fr-link"
                  >Masquer le message</button
                >
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {@render children()}
  </div>
</main>

<Footer résultatsSynchronisationDS88444={store.résultatsSynchronisationDS88444} />

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

  section.erreurs {
    position: relative;
    height: 0;

    .fr-col {
      width: 100%;

      .fr-alert-background {
        background: var(--background-default-grey);
      }
    }
  }
</style>
