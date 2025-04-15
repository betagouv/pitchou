<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'

    import DossierMessagerie from '../Dossier/DossierMessagerie.svelte'
    import DossierInstruction from '../Dossier/DossierInstruction.svelte'
    import DossierProjet from '../Dossier/DossierProjet.svelte'
    import DossierAvis from '../Dossier/DossierAvis.svelte'
    import DossierGénérationDocuments from '../Dossier/DossierGénérationDocuments.svelte'

    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    export let messages

    /** @type {NonNullable<ComponentProps<Squelette>['email']>} */
    export let email;

    /** @type {ComponentProps<Squelette>['résultatsSynchronisationDS88444']} */
    export let résultatsSynchronisationDS88444;
    
</script>

<Squelette {email} {résultatsSynchronisationDS88444}>
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
                    <li role="presentation">
                        <button id="tabpanel-génération-documents" aria-controls="tabpanel-génération-documents-panel" class="fr-tabs__tab" tabindex="-1" role="tab" aria-selected="false" >
                            Génération document
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
                    <DossierAvis {dossier}></DossierAvis>
                </div>
                <div id="tabpanel-génération-documents-panel" aria-labelledby="tabpanel-génération-documents" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierGénérationDocuments {dossier}></DossierGénérationDocuments>
                </div>
            </div>
        </div>
    </div>
</Squelette>

<style lang="scss">

</style>
