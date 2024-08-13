<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    
    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types.js' */

    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

    export let email
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Dossier {dossier.nom_dossier || "sans nom"}</h1>

            <nav class="dossier-nav fr-mb-2w">
                <ul class="fr-btns-group fr-btns-group--inline-lg">
                    <li> 
                        <a class="fr-btn fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`}>Messagerie</a>
                    </li>
                </ul>
            </nav>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2 class="fr-h5">Prochaine action attendue</h2>
                    <ul class="fr-mb-3w">
                        <li>
                            <strong>Phase </strong>: {dossier.phase || " non renseigné"}
                        </li>
                        <li>
                            <strong>Acteur(s) concerné(s)</strong> : {dossier.prochaine_action_attendue_par || " non renseigné"}
                        </li>
                        <li>
                            <strong>Action</strong> : {dossier.prochaine_action_attendue || " non renseigné"}
                        </li>
                    </ul> 
                    <p>
                        <a 
                            class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-edit-line fr-mb-2w"
                            href="/dossier/{dossier.id}/modifier"
                        >
                            Mettre à jour la prochaine action
                        </a>
                    </p>
                </section>
                <section>
                    <h2 class="fr-h5">Informations</h2>
                    <ul>
                        <li>
                            <strong>Porteur de projet</strong> : {formatDéposant(dossier)}<br />
                        </li>
                        <li>
                            <strong>Localisation</strong> : {formatLocalisation(dossier)}
                        </li>

                        {#if dossier.enjeu_politique || dossier.enjeu_ecologique}
                            <li>
                                <strong>Enjeux</strong> : 
                                {#if dossier.enjeu_politique}
                                    <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">
                                        Enjeu politique
                                    </span>
                                {/if}

                                {#if dossier.enjeu_écologique}
                                <span class="fr-badge fr-badge--sm fr-badge--green-emeraude">
                                    Enjeu écologique
                                </span>
                                {/if}
                            </li>
                        {/if}
                    </ul>
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

    select {
        max-width: 90%;
    }

    nav.dossier-nav {
        display: flex;
        justify-content: flex-end;
    }

    nav.fr-breadcrumb {
        margin-bottom: .5rem;
        margin-top: 0;
    }
</style>
