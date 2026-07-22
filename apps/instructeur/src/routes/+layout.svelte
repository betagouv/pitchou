<script lang="ts">
  // MUST be the first import
  // cf scripts/front-end/before-ses-lockdown.ts
  import "./Layout/before-ses-lockdown.ts";

  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import { env } from "$env/dynamic/public";

  import { store } from "$lib/state/store.svelte.ts";

  import BandeauEnvironnement from "./Layout/BandeauEnvironnement.svelte";
  import Header from "./Layout/Header/Header.svelte";
  import Footer from "./Layout/Footer.svelte";

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

  // Send a Matomo page view on every navigation, including client-side (SPA)
  // navigations. The app.html snippet only bootstraps the tracker.
  const matomoEnabled = Boolean(env.PUBLIC_MATOMO_SITE_ID);
  let lastTrackedUrl: string | undefined;
  afterNavigate(({ to }) => {
    if (!matomoEnabled || !to) return;
    const paq = (window as Window & { _paq?: unknown[][] })._paq;
    if (!paq) return;
    // Never send the magic-link secret to Matomo.
    const url = new URL(to.url);
    url.searchParams.delete("secret");
    const trackedUrl = url.toString();
    // Skip duplicates (the secret-stripping redirect above re-navigates to the same URL).
    if (trackedUrl === lastTrackedUrl) return;
    if (lastTrackedUrl) paq.push(["setReferrerUrl", lastTrackedUrl]);
    paq.push(["setCustomUrl", trackedUrl]);
    paq.push(["setDocumentTitle", document.title]);
    paq.push(["trackPageView"]);
    lastTrackedUrl = trackedUrl;
  });
</script>

<svelte:head>
  <title>Pitchou</title>
</svelte:head>

<BandeauEnvironnement />

<Header {nav} {email} />

<main tabindex="-1" id="main">
  <div class="fr-container">
    {#if store.errors.size >= 1}
      <section class="errors fr-grid-row fr-grid-row--center">
        <div class="fr-col">
          {#each [...store.errors] as error}
            <div class="fr-alert-background fr-mb-1w">
              <div class="fr-alert fr-alert--error fr-alert--sm">
                <p><strong>Erreur&nbsp;:&nbsp;</strong>{error.message}</p>
                <button onclick={() => store.errors.delete(error)} class="fr-link--close fr-link"
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

<Footer
  demarcheNumerique88444SynchronizationResults={store.demarcheNumerique88444SynchronizationResults}
/>

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

  section.errors {
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
