<script>
    /** @import { PitchouState } from '../../store.js' */
	/** @import { ComponentProps } from "svelte" */
    import Squelette from "../Squelette.svelte"

    /**
    * @typedef {Object} Props
    * @property {string} [email]
    * @property {PitchouState['erreurs']} [erreurs]
    * @property {ComponentProps<typeof Squelette>['résultatsSynchronisationDS88444']} résultatsSynchronisationDS88444
    */
    /** @type {Props} */
    let { 
            email = '',
            erreurs = new Set(),
            résultatsSynchronisationDS88444
        } = $props();
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Mes dossiers">
    <div>
        <div class="titre-et-barre-de-recherche">
            <h1>Mes dossiers</h1>
        </div>
    </div>
</Squelette>

<style>
    h1 {
        margin-bottom: 0;
    }
</style>

