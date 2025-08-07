<script>
    import { run } from 'svelte/legacy';

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
    /** @import {Onglet} from '../../routes/Dossier.js' */

    


    

    



    /**
     * @param {Onglet} nouvelOnglet 
     */
    function changerOnglet(nouvelOnglet) {
        ongletActif = nouvelOnglet;
        // Mettre à jour l'URL sans recharger la page
        window.history.replaceState(null, '', `#${nouvelOnglet}`);
    }

    /**
     * @param {Onglet} onglet 
     */
    function handleTabClick(onglet) {
        changerOnglet(onglet);
    }


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


 

    

    
    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     * @property {PitchouState['relationSuivis']} relationSuivis
     * @property {Onglet} ongletActifInitial
     * @property {any} messages
     * @property {NonNullable<ComponentProps<Squelette>['email']>} email
     * @property {ComponentProps<Squelette>['résultatsSynchronisationDS88444']} résultatsSynchronisationDS88444
     */

    /** @type {Props} */
    let {
        dossier,
        relationSuivis,
        ongletActifInitial,
        messages,
        email,
        résultatsSynchronisationDS88444
    } = $props();


    run(() => {
        console.info('Dossier complet', dossier)
    });
    let ongletActif = $derived(ongletActifInitial)
    run(() => {
        console.log(ongletActif, "yeah")
    });
    /** @type {Promise<DescriptionMenacesEspèces> | undefined}*/
    let espècesImpactées = $derived(getEspècesImpactés(dossier))
</script>

<Squelette {email} {résultatsSynchronisationDS88444}>
    <div class="fr-grid-row fr-mt-2w">
        <div class="fr-col">
            <EnteteDossier {dossier} {relationSuivis} {email}></EnteteDossier>
            
            <div class="fr-tabs">
                <ul class="fr-tabs__list" role="tablist" aria-label="Navigation des onglets du dossier">
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-instruction" 
                        aria-controls="tabpanel-instruction-panel" 
                        class="fr-tabs__tab {ongletActif === 'instruction' ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'instruction'  ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'instruction' }
                        onclick={() => handleTabClick('instruction')}
                    >
                        Instruction
                    </button>
                    </li>
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-projet" 
                        aria-controls="tabpanel-projet-panel" 
                        class="fr-tabs__tab {ongletActif === 'projet'  ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'projet'  ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'projet' }
                        onclick={() => handleTabClick('projet')}
                    >
                        Projet
                    </button>
                    </li>
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-echanges" 
                        aria-controls="tabpanel-echanges-panel" 
                        class="fr-tabs__tab {ongletActif === 'echanges' ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'echanges' ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'echanges'}
                        onclick={() => handleTabClick('echanges')}
                    >
                        Échanges
                    </button>
                    </li>
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-avis" 
                        aria-controls="tabpanel-avis-panel" 
                        class="fr-tabs__tab {ongletActif === 'avis' ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'avis' ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'avis'}
                        onclick={() => handleTabClick('avis')}
                    >
                        Avis
                    </button>
                    </li>
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-controles" 
                        aria-controls="tabpanel-controles-panel" 
                        class="fr-tabs__tab {ongletActif === 'controles' ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'controles' ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'controles'}
                        onclick={() => handleTabClick('controles')}
                    >
                        Contrôles
                    </button>
                    </li>
                    <li role="presentation">
                    <button 
                        type="button"
                        id="tabpanel-generation-document" 
                        aria-controls="tabpanel-generation-document-panel" 
                        class="fr-tabs__tab {ongletActif === 'generation-document' ? 'fr-tabs__tab--selected' : ''}" 
                        tabindex={ongletActif === 'generation-document' ? 0 : -1} 
                        role="tab" 
                        aria-selected={ongletActif === 'generation-document'}
                        onclick={() => handleTabClick('generation-document')}
                    >
                        Génération document
                    </button>
                    </li>
                </ul>
                <div 
                    id="tabpanel-instruction-panel" 
                    aria-labelledby="tabpanel-instruction" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'instruction' }
                    role="tabpanel" 
                    tabindex="0"
                    
                >
                    <DossierInstruction {dossier}></DossierInstruction>
                </div>
                <div 
                    id="tabpanel-projet-panel" 
                    aria-labelledby="tabpanel-projet" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'projet' }
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierProjet {dossier} {espècesImpactées}></DossierProjet>
                </div>
                <div 
                    id="tabpanel-echanges-panel" 
                    aria-labelledby="tabpanel-echanges" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'echanges'}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierMessagerie {dossier} {messages}></DossierMessagerie>
                </div>
                <div 
                    id="tabpanel-avis-panel" 
                    aria-labelledby="tabpanel-avis" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'avis'}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierAvis {dossier}></DossierAvis>
                </div>
                <div 
                    id="tabpanel-controles-panel" 
                    aria-labelledby="tabpanel-controles" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'controles'}
                    role="tabpanel" 
                    tabindex="0"
                >
                    <DossierContrôles {dossier}></DossierContrôles>
                </div>
                <div 
                    id="tabpanel-generation-document-panel" 
                    aria-labelledby="tabpanel-generation-document" 
                    class="fr-tabs__panel" 
                    class:fr-tabs__panel--selected={ongletActif === 'generation-document'}
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
