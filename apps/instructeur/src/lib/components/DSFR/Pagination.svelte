<script lang="ts">
  import clsx from "clsx";

  /*
    Implementation of the DSFR pagination component
    https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/pagination/

    The pagination implementation must follow these good practices:

    The pagination is always placed at the bottom of the list
    The page the user is on must be clearly highlighted
    The last element of the pagination is the last page of the list. The user thus knows the total number of pages.
    The "previous" link must be disabled when the user is on the first page, and the "next" page when the user is on the last page.
    Always provide quick access to the first and last page when they are not active, either with the "I<" and ">I" buttons, or with the "1" page and the last page.
    It is recommended to limit the number of pages visible and displayed by default in the pagination to 5 or 7. Beyond that, the other pages are hidden by a truncation system. The truncation is represented by the "…" icon: it only appears when the number of pages in the list exceeds the fixed limit.

    By default we recommend displaying the "…" truncation: after the 5th page on large and medium resolutions
    The double truncation appears when the consulted page is separated by 5 pages or more from the first and the last page on large and medium resolutions

    */

  type SelectionneurPage = () => void;

  type Props = {
    selectionneursPage: [undefined, ...rest: SelectionneurPage[]];
    pageActuelle: SelectionneurPage | undefined;
  };

  let { selectionneursPage, pageActuelle }: Props = $props();

  let selectionnerPremierePage = $derived(selectionneursPage[1]);
  let selectionnerDernierePage = $derived(selectionneursPage.at(-1));
  let numeroDernierePage = $derived(selectionneursPage.length - 1);
  let numeroPageSelectionne = $derived(selectionneursPage.indexOf(pageActuelle));
  let selectionnerPagePrecedente = $derived(selectionneursPage[numeroPageSelectionne - 1]);
  let selectionnerPageSuivante = $derived(selectionneursPage[numeroPageSelectionne + 1]);
  // Always display the first, the last, the current page, two before and two after

  let listeNumerosPage = $derived(
    [
      ...new Set([
        1,

        numeroPageSelectionne - 2,
        numeroPageSelectionne - 1,
        numeroPageSelectionne,
        numeroPageSelectionne + 1,
        numeroPageSelectionne + 2,

        numeroDernierePage,
      ]),
    ].filter((n) => !!selectionneursPage[n]),
  );
</script>

<nav class="fr-pagination" aria-label="Pagination">
  <ul class="fr-pagination__list">
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--first"
        disabled={pageActuelle === selectionnerPremierePage}
        onclick={selectionnerPremierePage}
      >
        Première page
      </button>
    </li>
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
        disabled={pageActuelle === selectionnerPremierePage}
        onclick={selectionnerPagePrecedente}
      >
        Page précédente
      </button>
    </li>

    {#each listeNumerosPage as numeroPage, i}
      {#if numeroPage === numeroDernierePage && listeNumerosPage[i] - listeNumerosPage[i - 1] >= 2}
        <li><span aria-hidden="true" class="fr-pagination__link fr-displayed-lg"> … </span></li>
      {/if}

      <li>
        <button
          type="button"
          class={clsx(["fr-pagination__link", "fr-displayed-lg"])}
          aria-current={pageActuelle === selectionneursPage[numeroPage] ? "page" : undefined}
          title={`Page ${numeroPage}`}
          onclick={selectionneursPage[numeroPage]}
        >
          {numeroPage}
        </button>
      </li>

      {#if numeroPage === 1 && listeNumerosPage[i + 1] - listeNumerosPage[i] >= 2}
        <li><span aria-hidden="true" class="fr-pagination__link fr-displayed-lg"> … </span></li>
      {/if}
    {/each}

    <li>
      <button
        class="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
        disabled={pageActuelle === selectionnerDernierePage}
        onclick={selectionnerPageSuivante}
      >
        Page suivante
      </button>
    </li>
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--last"
        disabled={pageActuelle === selectionnerDernierePage}
        onclick={selectionnerDernierePage}
      >
        Dernière page
      </button>
    </li>
  </ul>
</nav>

<style lang="scss">
  nav ul {
    justify-content: center;
  }
</style>
