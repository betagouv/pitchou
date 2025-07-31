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
    /** @import {PitchouState} from '../../store.js' */

    /** @type {DossierComplet} */
    export let dossier

    $: console.info('Dossier complet', dossier)

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {string} */
    export let ongletActif

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

    /**
     * @param {string} onglet 
     */
    function naviguerVersOnglet(onglet) {
        const url = `/dossier/${dossier.id}/${onglet}`
        // Changer l'URL sans recharger la page
        history.pushState(null, '', url)
    }

    /**
     * @param {string} onglet 
     * @returns {boolean}
     */
    function estOngletActif(onglet) {
        return ongletActif === onglet
    }
</script>

<Squelette {email} {résultatsSynchronisationDS88444}>
    <div class="fr-grid-row fr-mt-2w">
        <div class="fr-col">
            <EnteteDossier {dossier} {relationSuivis} {email}></EnteteDossier>
            
            <div class="fr-tabs">
                <ul class="fr-tabs__list" role="tablist" aria-label="[A modifier | nom du système d'onglet]">
                    <li role="presentation">
                        <button 
                            id="tabpanel-instruction" 
                            aria-controls="tabpanel-instruction-panel" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('instruction')}
                            tabindex={estOngletActif('instruction') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('instruction')}
                            on:click={() => naviguerVersOnglet('instruction')}
                        >
                            Instruction
                        </button>
                    </li>
                    <li role="presentation">
                        <button 
                            id="tabpanel-projet" 
                            aria-controls="tabpanel-projet-panel" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('projet')}
                            tabindex={estOngletActif('projet') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('projet')}
                            on:click={() => naviguerVersOnglet('projet')}
                        >
                            Projet
                        </button>
                    </li>
                    <li role="presentation">
                        <button 
                            id="tabpanel-echanges" 
                            aria-controls="tabpanel-echanges-panel" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('echanges')}
                            tabindex={estOngletActif('echanges') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('echanges')}
                            on:click={() => naviguerVersOnglet('echanges')}
                        >
                            Échanges
                        </button>
                    </li>
                    <li role="presentation">
                        <button 
                            id="tabpanel-avis" 
                            aria-controls="tabpanel-avis-panel" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('avis')}
                            tabindex={estOngletActif('avis') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('avis')}
                            on:click={() => naviguerVersOnglet('avis')}
                        >
                            Avis
                        </button>
                    </li>
                    <li role="presentation">
                        <button 
                            id="tabpanel-controles" 
                            aria-controls="tabpanel-controles" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('controles')}
                            tabindex={estOngletActif('controles') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('controles')}
                            on:click={() => naviguerVersOnglet('controles')}
                        >
                            Contrôles
                        </button>
                    </li>
                    <li role="presentation">
                        <button 
                            id="tabpanel-generation-document" 
                            aria-controls="tabpanel-generation-document-panel" 
                            class="fr-tabs__tab" 
                            class:fr-tabs__tab--selected={estOngletActif('generation-document')}
                            tabindex={estOngletActif('generation-document') ? 0 : -1} 
                            role="tab" 
                            aria-selected={estOngletActif('generation-document')}
                            on:click={() => naviguerVersOnglet('generation-document')}
                        >
                            Génération document
                        </button>
                    </li>
                </ul>
                <div 
                    id="tabpanel-instruction-panel" 
                    aria-labelledby="tabpanel-instruction" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('instruction')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierInstruction {dossier}></DossierInstruction>
                </div>
                <div 
                    id="tabpanel-projet-panel" 
                    aria-labelledby="tabpanel-projet" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('projet')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierProjet {dossier} {espècesImpactées}></DossierProjet>
                </div>
                <div 
                    id="tabpanel-echanges-panel" 
                    aria-labelledby="tabpanel-echanges" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('echanges')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierMessagerie {dossier} {messages}></DossierMessagerie>
                </div>
                <div 
                    id="tabpanel-avis-panel" 
                    aria-labelledby="tabpanel-avis" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('avis')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierAvis {dossier}></DossierAvis>
                </div>
                <div 
                    id="tabpanel-controles" 
                    aria-labelledby="tabpanel-controles" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('controles')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierContrôles {dossier}></DossierContrôles>
                </div>
                <div 
                    id="tabpanel-generation-document-panel" 
                    aria-labelledby="tabpanel-generation-document" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={estOngletActif('generation-document')}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierGénérationDocuments {dossier} {espècesImpactées}></DossierGénérationDocuments>
                </div>
            </div>
        </div>
    </div>
</Squelette>

<style lang="scss">

</style>
