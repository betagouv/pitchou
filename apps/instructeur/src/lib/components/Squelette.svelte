<script lang="ts">
  import type { Snippet } from "svelte";

  import { store } from "$lib/state/store.svelte.ts";

  import Header from "$lib/components/Header/Header.svelte";
  import Footer from "./Footer.svelte";

  import type { PitchouState } from "$lib/state/store.svelte.ts";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
    title?: string | undefined;
    erreurs?: PitchouState["erreurs"];
    résultatsSynchronisationDS88444?: PitchouState["résultatsSynchronisationDS88444"];
    children?: Snippet;
  };

  let {
    nav = true,
    email = undefined,
    erreurs = new Set(),
    résultatsSynchronisationDS88444 = undefined,
    title = undefined,
    children,
  }: Props = $props();
</script>

<svelte:head>
  <title>{title ? `${title} — ` : ""}Pitchou</title>
</svelte:head>

<Header {nav} {email} />

<main tabindex="-1" id="main">
  <div class="fr-container">
    {#if erreurs.size >= 1}
      <section class="erreurs fr-grid-row fr-grid-row--center">
        <div class="fr-col">
          {#each [...erreurs] as erreur}
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

    {@render children?.()}
  </div>
</main>

<Footer {résultatsSynchronisationDS88444} />

<style lang="scss">
  // Pied de page collé en bas quand le contenu est plus court que la fenêtre
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
