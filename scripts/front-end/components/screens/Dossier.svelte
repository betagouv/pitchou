<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'

    import DossierMessagerie from '../Dossier/DossierMessagerie.svelte'
    import DossierInstruction from '../Dossier/DossierInstruction.svelte'
    import DossierProjet from '../Dossier/DossierProjet.svelte'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    export let messages

    /** @type {string | undefined} */
    export let email = undefined
    
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-2w">
        <div class="fr-col">
            <EnteteDossier {dossier}></EnteteDossier>
            
            <div class="fr-tabs">
                <ul class="fr-tabs__list" role="tablist" aria-label="[A modifier | nom du système d'onglet]">
                    <li role="presentation">
                        <button id="tabpanel-instruction" aria-controls="tabpanel-instruction-panel" class="fr-tabs__tab" tabindex="0" role="tab" aria-selected="true">
                            Instruction
                        </button>
                    </li>
                    <li role="presentation">
                        <button id="tabpanel-projet" aria-controls="tabpanel-projet-panel" class="fr-tabs__tab" tabindex="-1" role="tab" aria-selected="false" >
                            Projet
                        </button>
                    </li>
                    <li role="presentation">
                        <button id="tabpanel-échanges" aria-controls="tabpanel-échanges-panel" class="fr-tabs__tab" tabindex="-1" role="tab" aria-selected="false" >
                            Échanges
                        </button>
                    </li>
                    <li role="presentation">
                        <button id="tabpanel-avis" aria-controls="tabpanel-avis-panel" class="fr-tabs__tab" tabindex="-1" role="tab" aria-selected="false" >
                            Avis
                        </button>
                    </li>
                </ul>
                <div id="tabpanel-instruction-panel" aria-labelledby="tabpanel-instruction" class="fr-tabs__panel fr-tabs__panel--selected" role="tabpanel" tabindex="0">
                    <DossierInstruction {dossier}></DossierInstruction>
                </div>
                <div id="tabpanel-projet-panel" aria-labelledby="tabpanel-projet" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierProjet {dossier}></DossierProjet>
                </div>
                <div id="tabpanel-échanges-panel" aria-labelledby="tabpanel-échanges" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierMessagerie {dossier} {messages}></DossierMessagerie>
                </div>
                <div id="tabpanel-avis-panel" aria-labelledby="tabpanel-avis" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <p>Avis</p>
                </div>
            </div>
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

    .liste-espèces{
        max-width: 40rem;
        overflow: hidden;
        white-space: nowrap;
    }

    nav.dossier-nav {
        display: flex;
        flex-direction: column;
    }
</style>
