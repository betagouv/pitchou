<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'

    /** @import {DossierComplet} from '../../../types.js' */
    /** @import {default as Message} from '../../../types/database/public/Message.js' */

    /** @type {DossierComplet} */
    export let dossier
    /** @type {Partial<Message>[]}*/
    export let messages = []

    const {number_demarches_simplifiées: numdos} = dossier

    /** @type {string | undefined} */
    export let email

    $: messagesTriés = messages.toSorted(
        ({date: date1}, {date: date2}) => ( (new Date(date2)).getTime() - (new Date(date1)).getTime())
    )

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Messagerie dossier {dossier.nom_dossier || "sans nom"}</h1>

            <article class="messages fr-p-3w fr-mb-4w">
            {#each messagesTriés as {contenu, date, email_expéditeur} }
                <section>
                    <details open={email_expéditeur !== 'contact@demarches-simplifiees.fr'}>
                        <summary>
                            <header>
                                <span>{email_expéditeur}</span>
                                <span>{date}</span>
                            </header>
                        </summary>
                        <main>
                            {@html contenu}
                        </main>
                    </details>
                </section>
            {/each}
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);
    }

    section {
        margin-bottom: 3rem;
    }

    article.messages{
        list-style: none;
        margin: 0;
        padding: 0;

        details {
            cursor: auto;

            &> summary{
                &> h2 {
                    display: inline-block;
                }

                &::marker{
                    content: '';
                }

                &::after{
                    font-size: 0.9em;
                    display: inline-block;
                    vertical-align: middle;
                    
                    border-radius: 5px;

                    padding: 2px 0.5rem;
                    margin: 0 1em;

                    border: 1px solid var(--text-action-high-blue-france);
                    color: var(--text-action-high-blue-france);
                }
            }

            &:not([open]) > summary::after{
                content: 'Déplier ▼'
            }
            

            &[open] > summary::after{
                content: 'Replier ▲'
            }

        }

    }
</style>
