<script>
	import { téléchargerDonnéesPourPersonne } from "../../actions/outilInterne.js"
	/** @import { EventHandler } from "svelte/elements" */
    /** @import { PitchouState } from '../../store.js' */
	/** @import { ComponentProps } from "svelte" */

    import Squelette from "../Squelette.svelte"

    /**
    * @typedef {Object} Props
    * @property {string} [email]
    * @property {PitchouState['relationSuivis']} [relationSuivis]
    * @property {PitchouState['erreurs']} [erreurs]
    * @property {ComponentProps<typeof Squelette>['résultatsSynchronisationDS88444']} résultatsSynchronisationDS88444
    */
    /** @type {Props} */
    let { 
            email = '',
            erreurs = new Set(),
            résultatsSynchronisationDS88444,
        } = $props();

    /**
     * @type {EventHandler<SubmitEvent, HTMLFormElement>}
     */
    function handleSubmitDonnéesPourPersonnes(e) {
        e.preventDefault()

        /** @type {string} */
        // @ts-ignore
        const email = e.target?.elements['input-email'].value

        téléchargerDonnéesPourPersonne(email)

        
    }
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Outil interne">
    <h1>Outil interne</h1>

    <p>Je veux récupérer la liste des évènements enregistrés pour une personne.</p>
    <form id="donnees-pour-personne" onsubmit={handleSubmitDonnéesPourPersonnes}>
        <div class="fr-input-group" id="input-group-16">
            <label class="fr-label" for="input-email"> Email de la personne (Champ obligatoire) </label>
            <input required name="input-email" class="fr-input" aria-describedby="input-email-messages" id="input-email" type="email">
            <div class="fr-messages-group" id="input-email-messages" aria-live="polite">
            </div>
        </div>
        <button class="fr-btn fr-btn-primary" type="submit"> Télécharger le fichier </button>
    </form>
</Squelette>

