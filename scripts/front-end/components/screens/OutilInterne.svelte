<script>
	import { normalisationEmail } from "../../../commun/manipulationStrings.js"
	import { téléchargerDonnéesPourPersonne } from "../../actions/outilInterne.js"
	import DownloadButton from "../DownloadButton.svelte"
    import Squelette from "../Squelette.svelte"
	import { formatDateAbsolue } from "../../affichageDossier.js"
    /** @import { PitchouState } from '../../store.js' */
	/** @import { ComponentProps } from "svelte" */

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

    /** @type {string | undefined} */
    let emailInput = $state()

</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Outil interne">
    <h1>Outil interne</h1>

    <p>Je veux récupérer la liste des évènements enregistrés pour une personne.</p>
    <div class="fr-input-group">
        <label 
            class="fr-label" 
            for="input-email"
        > 
            Email de la personne (Champ obligatoire)
        </label>
        <input 
            required 
            id="input-email" 
            name="input-email" 
            class="fr-input" 
            type="email"
            bind:value="{emailInput}"
        />
    </div>
    <DownloadButton 
        classname="fr-btn fr-btn-primary" 
        label="Télécharger le fichier"
        makeFileContentBlob={() => téléchargerDonnéesPourPersonne(emailInput ?? '')}
        makeFilename={() => `donnees evenements pour ${normalisationEmail(emailInput ?? '')} ${formatDateAbsolue(new Date())}.ods`}
    />
</Squelette>

