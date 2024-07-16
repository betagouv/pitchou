<script>
    //@ts-check

    import Squelette from './Squelette.svelte'
    
    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../affichageDossier.js'

    /** @type {import('../../types/database/public/Dossier.js').default} */
    export let dossier

    const {date_dépôt, statut, déposant_nom} = dossier

    export let email

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-pt-6w fr-grid-row--center">
        <div class="fr-col">

            <article>
                <h1>Dossier {dossier.id} - {statut}</h1>

                <section>
                    <h2>Demandeur</h2>
                    <p>{formatDemandeur(dossier)}</p>

                    <h2>Localisation</h2>
                    <p>{formatLocalisation(dossier)}</p>
                </section>

                <section>
                    <h2>Chronologie</h2>
                    <ol class="chronologie">
                        <li>
                            <span class="text">Dépôt sur Démarche Simplifiée</span>
                            <span class="moment">{formatDateRelative(date_dépôt)}</span>
                        </li>
                    </ol>
                </section>

                <section>
                    <h2>Interlocueurs</h2>

                    {#if déposant_nom}
                    <h3>Déposant</h3>
                    {formatDéposant(dossier)}
                    {/if}

                    <h3>Représentant du demandeur</h3>
                    (à faire)
                </section>

            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article{

        h1{
            text-align: center;
        }

        section{
            margin-bottom: 3rem;
        }

        .chronologie{
            list-style: none;

            .text{
                display: inline-block;
                min-width: 20rem;

                font-weight: bold;
            }

            .moment{

            }
        }
    }
</style>
