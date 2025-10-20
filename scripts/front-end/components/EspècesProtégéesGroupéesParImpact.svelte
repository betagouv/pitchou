<script>
    //@ts-check
    import Loader from "./Loader.svelte";

    /**
     * @typedef {Object} Props
     * @property {Promise<Array<{activité: string, espèces: Array<{nomVernaculaire: string, nomScientifique: string, détails: any[]}>, impactsQuantifiés: string[]}>> | undefined} espècesImpactéesParActivité
     */

    /** @type {Props} */
    let { 
        espècesImpactéesParActivité,
    } = $props();
</script>



{#await espècesImpactéesParActivité}
    <Loader></Loader>
{:then espècesImpactéesParActivité}
    {#if espècesImpactéesParActivité}
        {#each espècesImpactéesParActivité as { activité, espèces, impactsQuantifiés }}
            <section class="liste-especes">
                <h3>{activité}</h3>
                <table class="fr-table">
                    <thead>
                        <tr>
                            <th>Espèce</th>
                            {#if impactsQuantifiés && impactsQuantifiés.length >= 1}
                                {#each impactsQuantifiés as nomColonne}
                                    <th>{nomColonne}</th>
                                {/each}
                            {/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each espèces as { nomVernaculaire, nomScientifique, détails }}
                            <tr>
                                <td
                                    >{nomVernaculaire} (<i
                                        >{nomScientifique}</i
                                    >)</td
                                >
                                {#each détails as détail}
                                    <td>{détail}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </section>
        {/each}
    {/if}
{:catch erreur}
    <div class="fr-alert fr-alert--error fr-mb-3w fr-mt-2w">
        {#if erreur.name === "HTTPError"}
            Erreur de réception du fichier. Veuillez réessayer en
            rafraichissant la page maintenant ou plus tard.
        {:else if erreur.name === "MediaTypeError"}
            Le fichier d'espèces impactées dans le dossier n'est pas
            d'un type qui permet de récupérer la liste des espèces.
            Un fichier <code>{erreur.attendu}</code>
            est attendu. Le fichier dans le dossier est de type
            <code>{erreur.obtenu}</code>. Vous pouvez demander au
            pétitionnaire de fournir le fichier dans le bon format à
            la place du fichier actuel.
        {:else}
            <p>Une erreur est survenue. Veuillez réessayer en
            rafraichissant la page maintenant ou plus tard.</p>

            <p><strong>Détails&nbsp;:&nbsp;</strong>{erreur.message}</p>
        {/if}
    </div>
{/await}

<style lang="scss">
    .liste-especes {
        margin-top: 2rem;
        margin-bottom: 2rem;

        h3 {
            margin-bottom: 1rem;
        }
    }
</style>

