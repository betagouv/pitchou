<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import {formatDateRelative, formatDateAbsolue} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types.js' */
    /** @import {default as Message} from '../../../types/database/public/Message.ts' */

    /** @type {DossierComplet} */
    export let dossier
    /** @type {Partial<Message>[]}*/
    export let messages = []

    const {number_demarches_simplifiées: numdos} = dossier

    /** @type {string | undefined} */
    export let email

    $: messagesTriés = messages.toSorted(
        // @ts-ignore
        ({date: date1}, {date: date2}) => ( (new Date(date2)).getTime() - (new Date(date1)).getTime())
    )

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-6w">Messagerie dossier {dossier.nom || "sans nom"}</h1>

            <a class="fr-btn fr-mb-w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`}>
                Répondre sur Démarches Simplifiées
            </a>

            <article class="messages fr-p-3w fr-mb-4w">
            {#each messagesTriés as {contenu, date, email_expéditeur} }
                {@const accordionId = `accordion-content-${Math.random().toString(36).slice(2)}`}
                <section class="fr-accordion">
                    <h3 class="fr-accordion__title">
                        <button class="fr-accordion__btn" aria-expanded={email_expéditeur !== 'contact@demarches-simplifiees.fr'} aria-controls={accordionId}>
                            <span>{email_expéditeur}</span>
                            <span title={formatDateAbsolue(date)}>{formatDateRelative(date)}</span>
                        </button>
                    </h3>
                    <div class="contenu-message fr-collapse" id={accordionId}>
                        <!-- 
                            Avertissement : Source de problèmes de sécurité potentiels
                            Actuellement, les contenus viennent de Démarches Simplifiées et on 
                            leur fait confiance pour assainir le HTML, mais 
                        -->
                        {@html contenu}
                    </div>
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

        button.fr-accordion__btn{
            justify-content: space-between;

            span{
                flex: 1;
                display: block;
            }
        }

        .contenu-message{
            white-space: pre-line;
        }

    }
</style>
