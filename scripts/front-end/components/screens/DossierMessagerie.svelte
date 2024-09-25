<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'

    /** @import {DossierComplet} from '../../../types.js' */

    /** @type {DossierComplet} */
    export let dossier
    export let messages = []

    const {number_demarches_simplifiées: numdos} = dossier

    /** @type {string | undefined} */
    export let email

    let messageErreur = "" 

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Messagerie dossier {dossier.nom_dossier || "sans nom"}</h1>

            <nav class="dossier-nav fr-mb-2w">
                <ul class="fr-btns-group fr-btns-group--inline-lg">
                    <li> 
                        <a class="fr-btn fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" href={`/dossier/${dossier.id}/messagerie`}>Messagerie</a>
                    </li>
                </ul>
            </nav>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    
                </section>
                <section>
                    
                </section>
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

    nav.dossier-nav {
        display: flex;
        justify-content: flex-end;
    }
</style>
