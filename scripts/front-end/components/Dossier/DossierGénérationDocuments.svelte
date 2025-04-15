<script>
    import {fillOdtTemplate} from '@odfjs/odfjs'
    import {formatLocalisation, formatPorteurDeProjet} from '../../affichageDossier.js'
    import {espècesImpactéesDepuisFichierOdsArrayBuffer} from '../../actions/dossier.js'
    import {créerEspècesGroupéesParImpact} from '../../actions/créerEspècesGroupéesParImpact.js'

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */  

    /** @type {FileList | undefined} */
    let templateFiles;
    $: template = templateFiles && templateFiles[0]



    /** @type {DossierComplet} */
    export let dossier

    /** @type {ReturnType<espècesImpactéesDepuisFichierOdsArrayBuffer> | undefined} */
    let espècesImpactées;

    $: espècesImpactées = (
        dossier.espècesImpactées && dossier.espècesImpactées.contenu && 
        // @ts-ignore
        espècesImpactéesDepuisFichierOdsArrayBuffer(dossier.espècesImpactées.contenu)
    ) || undefined

    /** @type {ReturnType<créerEspècesGroupéesParImpact> | undefined} */
    let espècesImpactéesParActivité

    $: espècesImpactéesParActivité = espècesImpactées && espècesImpactées.then(créerEspècesGroupéesParImpact)
    //.catch(err => console.error('err', err))


    /**
     * 
     * @param {SubmitEvent} e
     */
    async function generateDoc(e){
		e.preventDefault()

        if(!template){
            throw new Error(`Missing template`)
        }

		const data = {
            dossier:{
                nom: dossier.nom,
                identifiant_onagre: dossier.historique_identifiant_demande_onagre,
                activité_principale: dossier.activité_principale,
                demandeur: formatPorteurDeProjet(dossier),
                localisation: formatLocalisation(dossier),
                régime_autorisation_environnementale: dossier.rattaché_au_régime_ae === null ? '' :
                    (dossier.rattaché_au_régime_ae ? 'Oui' : 'Non'),
                espèces_impacts: await espècesImpactéesParActivité
            }
        }

        console.log('data', data)

		const templateAB = await template.arrayBuffer()
		const documentArrayBuffer = await fillOdtTemplate(templateAB, data)
        const blob = new Blob([documentArrayBuffer], {type: template.type});

		download(blob, template.name)
	}

    /**
     * 
     * @param {Blob} blob
     * @param {string} filename
     */
    async function download(blob, filename){
        const link = document.createElement("a");
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<div class="row">
    <h2>Génération de documents</h2>

    <p>Générer des documents à partir d'un document-type et des données de ce dossier</p>

    <form on:submit={generateDoc}>
        <div class="fr-upload-group">
            <label class="fr-label" for="file-upload">Ajouter un document-type
                <!--
                    <span class="fr-hint-text">Taille maximale : 500 Mo. Formats supportés : jpg, png, pdf. Plusieurs fichiers possibles. Lorem ipsum dolor sit amet, consectetur adipiscing.</span>
                -->
            </label>
            <input bind:files={templateFiles} class="fr-upload" type="file" accept=".odt" id="file-upload">
        </div>

        <button class="fr-btn" type="submit" disabled={!template}>Générer le document !</button>
    </form>
</div>


<style lang="scss">
    .fr-upload-group{
        margin-bottom: 1rem;
    }
</style>
