<script>
    import clsx from "clsx";

    /*
    Implémentation du composant de pagination du DSFR
    https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/pagination/

    L’implémentation de la pagination doit respecter les bonnes pratiques suivantes :

    La pagination est toujours placée en bas de liste
    La page sur laquelle se trouve l'utilisateur doit être clairement mise en avant
    Le dernier élément de la pagination est la dernière page de la liste. L’utilisateur connait ainsi le nombre total de pages.
    Le lien “précédent” doit être désactivé quand l’utilisateur est sur la première page, et la page “suivant” quand l’utilisateur est sur la dernière page.
    Toujours donner un accès rapide à la première et dernière page lorsque celles-ci ne sont pas actives, soit avec les boutons “I<“ et “>I”, soit avec la page “1” et la dernière page.
    Il est recommandé de limiter à 5 ou 7 le nombre de page visibles et affichées par défaut dans la pagination. Au-delà les autres pages sont masquées par un système de troncature. La troncature est matérialisée par l’icône “…” : il ne s’affiche que quand le nombre de pages dépasse de la liste est supérieur à la limite fixée. 

    Par défaut nous recommandons d’afficher la troncature “…” : après la 5ème page sur les grandes et moyennes résolutions
    La double troncature apparait lorsque la page consultée est séparée par 5 pages ou plus de la première et de la dernière page sur les grandes et moyennes résolutions 

    */

    /** @typedef {() => void} SelectionneurPage */

    /** @type {[undefined, ...rest: SelectionneurPage[]]} */
    export let selectionneursPage;

    $: selectionnerPremièrePage = selectionneursPage[1]
    $: selectionnerDernièrePage = selectionneursPage.at(-1)

    $: numéroDernièrePage = selectionneursPage.length - 1

    /** @type {SelectionneurPage | undefined} */
    export let pageActuelle;

    $: numéroPageSelectionné = selectionneursPage.indexOf(pageActuelle)

    $: selectionnerPagePrécédente = selectionneursPage[numéroPageSelectionné - 1]
    $: selectionnerPageSuivante = selectionneursPage[numéroPageSelectionné + 1]

    // Toujours afficher la première, la dernière, la page actuelle, deux avant et deux après

    $: listeNumérosPage = [...new Set([
        1,

        numéroPageSelectionné - 2,
        numéroPageSelectionné - 1,
        numéroPageSelectionné,
        numéroPageSelectionné + 1,
        numéroPageSelectionné + 2,

        numéroDernièrePage
    ])].filter(n => !!selectionneursPage[n])


</script>

<nav class="fr-pagination" aria-label="Pagination">
    <ul class="fr-pagination__list">
        <li>
            <button
                class="fr-pagination__link fr-pagination__link--first"
                disabled={pageActuelle === selectionnerPremièrePage}
                on:click={selectionnerPremièrePage}
                role="link"
            >
                Première page
            </button>
        </li>
        <li>
            <button
                class="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
                disabled={pageActuelle === selectionnerPremièrePage}
                on:click={selectionnerPagePrécédente}
                role="link"
            >
                Page précédente
            </button>
        </li>

        {#each listeNumérosPage as numéroPage, i}
            {#if numéroPage === numéroDernièrePage && listeNumérosPage[i] - listeNumérosPage[i-1] >= 2}
            <li><span class="fr-pagination__link fr-displayed-lg"> … </span></li>
            {/if}

            <li>
                <button 
                    type="button"
                    class={clsx(['fr-pagination__link', 'fr-displayed-lg'])} 
                    aria-current={pageActuelle === selectionneursPage[numéroPage] ? "page" : undefined}
                    title={`Page ${numéroPage}`}
                    on:click={selectionneursPage[numéroPage]}
                >
                    {numéroPage}
                </button>
            </li>

            {#if numéroPage === 1 && listeNumérosPage[i+1] - listeNumérosPage[i] >= 2}
            <li><span class="fr-pagination__link fr-displayed-lg"> … </span></li>
            {/if}
        {/each}
        
        <li>

            <button
                class="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
                disabled={pageActuelle === selectionnerDernièrePage}
                on:click={selectionnerPageSuivante}
                role="link"
            >
                Page suivante
            </button>
        </li>
        <li>
            <button
                class="fr-pagination__link fr-pagination__link--last"
                disabled={pageActuelle === selectionnerDernièrePage}
                on:click={selectionnerDernièrePage}
                role="link"
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