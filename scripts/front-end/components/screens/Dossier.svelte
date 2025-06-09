<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'

    import DossierMessagerie from '../Dossier/DossierMessagerie.svelte'
    import DossierInstruction from '../Dossier/DossierInstruction.svelte'
    import DossierProjet from '../Dossier/DossierProjet.svelte'
    import DossierAvis from '../Dossier/DossierAvis.svelte'
    import DossierContrôles from '../Dossier/DossierContrôles.svelte'
    import DossierGénérationDocuments from '../Dossier/DossierGénérationDocuments.svelte'
    import {MediaTypeError} from '../../../commun/errors.js';
    import {espècesImpactéesDepuisFichierOdsArrayBuffer} from '../../actions/dossier.js';

    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import {DescriptionMenacesEspèces} from '../../../types/especes.d.ts' */

    /** @type {DossierComplet} */
    export let dossier

    console.info('Dossier complet', dossier)


    const EXTENSION_ATTENDUE = '.ods'

    /**
     * 
     * @param {DossierComplet} dossier
     * @return {ReturnType<espècesImpactéesDepuisFichierOdsArrayBuffer> | undefined}
     */
    function getEspècesImpactés(dossier){
        const espècesImpactées = dossier.espècesImpactées

        if(!espècesImpactées || !espècesImpactées.contenu){
            return undefined
        }

        const extension = '.' + espècesImpactées.nom?.split('.').pop()

        if(extension !== EXTENSION_ATTENDUE){
            return Promise.reject(new MediaTypeError({attendu: EXTENSION_ATTENDUE, obtenu: extension}))
        }

        //@ts-expect-error le mismatch ArrayBuffer/Buffer vient des histoires de génération de type et interactions avec Postgres
        return espècesImpactéesDepuisFichierOdsArrayBuffer(dossier.espècesImpactées.contenu)
    }


    /** @type {Promise<DescriptionMenacesEspèces> | undefined}*/
    $: espècesImpactées = getEspècesImpactés(dossier)
 
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
                        <button id="tabpanel-contrôles" aria-controls="tabpanel-contrôles" class="fr-tabs__tab" tabindex="-1" role="tab" aria-selected="false" >
                            Contrôles
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
                    <DossierProjet {dossier} {espècesImpactées}></DossierProjet>
                </div>
                <div id="tabpanel-échanges-panel" aria-labelledby="tabpanel-échanges" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierMessagerie {dossier} {messages}></DossierMessagerie>
                </div>
                <div id="tabpanel-avis-panel" aria-labelledby="tabpanel-avis" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierAvis {dossier}></DossierAvis>
                </div>
                <div id="tabpanel-contrôles" aria-labelledby="tabpanel-contrôles" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierContrôles {dossier}></DossierContrôles>
                </div>
                <div id="tabpanel-génération-documents-panel" aria-labelledby="tabpanel-génération-documents" class="fr-tabs__panel" role="tabpanel" tabindex="0">
                    <DossierGénérationDocuments {dossier} {espècesImpactées}></DossierGénérationDocuments>
                </div>
            </div>
        </div>
    </div>
</Squelette>

<style lang="scss">

</style>
