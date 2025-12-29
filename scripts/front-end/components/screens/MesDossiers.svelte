<script>
    /** @import { DossierRésumé } from '../../../types/API_Pitchou.ts' */
    /** @import { PitchouState } from '../../store.js' */
	/** @import { ComponentProps } from "svelte" */
    import Squelette from "../Squelette.svelte"
    import ListeDossiers from "../ListeDossiers.svelte"

    /**
    * @typedef {Object} Props
    * @property {string} [email]
    * @property {DossierRésumé[]} dossiers
    * @property {PitchouState['relationSuivis']} [relationSuivis]
    * @property {PitchouState['erreurs']} [erreurs]
    * @property {ComponentProps<typeof Squelette>['résultatsSynchronisationDS88444']} résultatsSynchronisationDS88444
    */
    /** @type {Props} */
    let { 
            email = '',
            dossiers = [],
            relationSuivis,
            erreurs = new Set(),
            résultatsSynchronisationDS88444
        } = $props();
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Mes dossiers">
    <ListeDossiers titre="Mes dossiers" {email} {dossiers} {relationSuivis} afficherFiltreActionInstructeur={true} />
</Squelette>

