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

  type PageSelector = () => void;

  type Props = {
    pageSelectors: [undefined, ...rest: PageSelector[]];
    currentPage: PageSelector | undefined;
  };

  let { pageSelectors, currentPage }: Props = $props();

  let selectFirstPage = $derived(pageSelectors[1]);
  let selectLastPage = $derived(pageSelectors.at(-1));
  let lastPageNumber = $derived(pageSelectors.length - 1);
  let selectedPageNumber = $derived(pageSelectors.indexOf(currentPage));
  let selectPreviousPage = $derived(pageSelectors[selectedPageNumber - 1]);
  let selectNextPage = $derived(pageSelectors[selectedPageNumber + 1]);
  // Always display the first, the last, the current page, two before and two after

  let pageNumbersList = $derived(
    [
      ...new Set([
        1,

        selectedPageNumber - 2,
        selectedPageNumber - 1,
        selectedPageNumber,
        selectedPageNumber + 1,
        selectedPageNumber + 2,

        lastPageNumber,
      ]),
    ].filter((n) => !!pageSelectors[n]),
  );
</script>

<nav class="fr-pagination" aria-label="Pagination">
  <ul class="fr-pagination__list">
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--first"
        disabled={currentPage === selectFirstPage}
        onclick={selectFirstPage}
      >
        Première page
      </button>
    </li>
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
        disabled={currentPage === selectFirstPage}
        onclick={selectPreviousPage}
      >
        Page précédente
      </button>
    </li>

    {#each pageNumbersList as pageNumber, i}
      {#if pageNumber === lastPageNumber && pageNumbersList[i] - pageNumbersList[i - 1] >= 2}
        <li><span aria-hidden="true" class="fr-pagination__link fr-displayed-lg"> … </span></li>
      {/if}

      <li>
        <button
          type="button"
          class={clsx(["fr-pagination__link", "fr-displayed-lg"])}
          aria-current={currentPage === pageSelectors[pageNumber] ? "page" : undefined}
          title={`Page ${pageNumber}`}
          onclick={pageSelectors[pageNumber]}
        >
          {pageNumber}
        </button>
      </li>

      {#if pageNumber === 1 && pageNumbersList[i + 1] - pageNumbersList[i] >= 2}
        <li><span aria-hidden="true" class="fr-pagination__link fr-displayed-lg"> … </span></li>
      {/if}
    {/each}

    <li>
      <button
        class="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
        disabled={currentPage === selectLastPage}
        onclick={selectNextPage}
      >
        Page suivante
      </button>
    </li>
    <li>
      <button
        class="fr-pagination__link fr-pagination__link--last"
        disabled={currentPage === selectLastPage}
        onclick={selectLastPage}
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
