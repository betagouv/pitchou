<script>
    import { text } from 'd3-fetch';
 

  //@ts-check

/** @typedef {{
    "Date de sollicitation": Date;
    ORIGINE: string;
    OBJET: string;
    "N° Dossier DEROG": number;
    ÉCHÉANCE: string;
    "POUR\nATTRIBUTION": string;
    OBSERVATIONS: string;
    PETITIONNAIRE: string;
    "Catégorie du demandeur": string;
    "Nom contact – mail": string;
    "Année de première sollicitation": number;
    Communes: string;
    Département: number;
    Thématique: string;
    "Procédure associée": string;
    "Etapes du projet": string;
    "Stade de l’avis": string;
    "Description avancement dossier avec dates": string;
    "Avis SBEP": string;
    "Date de rendu de l’avis/envoi réponse": Date;
    "Sollicitation OFB pour avis": string;
    DEP: string;
    "Date de dépôt DEP": string;
    "Saisine CSRPN/CNPN": string;
    "Date saisine CSRPN/CNPN": string;
    "Nom de l’expert désigné (pour le CSRPN)": string;
    "N° de l’avis Onagre ou interne": string;
    "Avis CSRPN/CNPN": string;
    "Date avis CSRPN/CNPN": string;
    "Dérogation accordée": string;
    "Date AP": string;
    "Suivis n+1": string;
    "Suivis n+3": string;
    "Suivis n+5": string;
    "A contrôler": string;
    Contrôles: string;
    "AnneeANT ?": string;
    Colonne1: string;
    Colonne2: string;
    "Délai de réponse ([U] – [A]": string;
    "Annee = annee(A)": number;
    "Column 42": string;
    "Column 43": string;
    "Column 44": string;
    "Column 45": string;
    "Column 46": string;
  }} Ligne */


  
  import Squelette from '../Squelette.svelte'
  import { getODSTableRawContent,  sheetRawContentToObjects, isRowNotEmpty } from '@odfjs/odfjs'
  /** @import { ComponentProps } from 'svelte' */
  /** @import {DossierDemarcheSimplifiee88444} from "../../../types/démarches-simplifiées/DémarcheSimplifiée88444" */

  /** @type {ComponentProps<Squelette>['email']} */
  export let email = undefined

  /** @type {any[] | undefined} */
  let lignesTableauImport = undefined

  /** @type {Map<any,string>} */
  let ligneToLienPréremplissage = new Map()



  /**
   * @param {Event} event
  */
  async function handleFileChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement && target && target.files && target.files[0])) {
      console.error('Le champ de fichier est introuvable ou ne contient aucun fichier.')
      return;
    }
    /** @type {FileList | null} */
    const files = target instanceof HTMLInputElement && target && target?.files ? target?.files : null

    const file = files && files[0]

    if (file) {
      try {
        const fichierImport = await file.arrayBuffer()
        const rawData = await getODSTableRawContent(fichierImport)

        const rawDataTableauSuivi = rawData.get('tableau_suivi')

        if (!rawDataTableauSuivi) {
          throw new TypeError(`Erreur dans la récupération de la page "tableau_suivi". Assurez-vous que cette page existe bien dans votre tableur ods.`)
        }
      const lignes = [...sheetRawContentToObjects(rawDataTableauSuivi.filter(isRowNotEmpty)).values()]

      console.log( {lignes })
      lignesTableauImport = lignes

      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`)
      }
    }

  }


  /**
  * @param {Ligne} ligne
  */
  async function handleOnClickForLigne(ligne) {

    /** @type {Partial<DossierDemarcheSimplifiee88444>} */
    const dossier = { 'Nom du projet': ligne['OBJET'], 'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify({'commentaire': ligne['Description avancement dossier avec dates'], 'date_dépôt': ligne['Date de sollicitation']}) }

    try {
      const lien = await text('/lien-preremplissage', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify(dossier),
      })

      ligneToLienPréremplissage.set(ligne,lien)
      ligneToLienPréremplissage = ligneToLienPréremplissage
    } catch (error) {
      throw new Error(`Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`)
    }
  }

</script>

<Squelette {email} nav={true} >
  <h1>Import de dossier</h1>
  <div class="fr-upload-group">
    <label class="fr-label" for="file-upload">
        Ajouter un fichier
        <span class="fr-hint-text">Formats supportés : ods.</span>
    </label>
    <input class="fr-upload" aria-describedby="file-upload-messages" type="file" id="file-upload" name="file-upload" accept=".ods" on:change={handleFileChange}>
    <div class="fr-messages-group" id="file-upload-messages" aria-live="polite"></div>
  </div>

  <h2>Correspondance Démarche Simplifiée / Fichier import</h2>
  <ul>
    <li>Nom du projet => Colonne 'OBJET'</li>
    <li>Commentaires sur les enjeux et la procédure (Annotation privée) => Description avancement dossier avec dates</li>
  </ul>

  {#if lignesTableauImport}
  <h2>Toutes les lignes du tableau</h2>
    <div class="fr-table" id="table-0-component">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table id="table-0" class="tableau-dossier-a-creer">
              <caption> Lignes du tableau </caption>
              <thead>
                <tr>
                  <th> Nom du projet (OBJET) </th>
                  <th> Commentaires sur les enjeux et la procédure </th>
                  <th> Action </th>
                </tr>
              </thead>
              <tbody>
                {#each lignesTableauImport as ligne}
                  <tr id="table-0-row-key-1" data-row-key="1">
                    <td>{ligne['OBJET']}</td>
                    <td>{ligne['Description avancement dossier avec dates']}</td>
                    <td>
                      {#if ligneToLienPréremplissage.get(ligne)}
                        <a class='fr-btn' href={ligneToLienPréremplissage.get(ligne)} target='_blank'>Créer dossier</a>
                      {:else}
                        <button type="button" class="fr-btn fr-btn--secondary" on:click={() => handleOnClickForLigne(ligne)}>Préparer préremplissage</button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Squelette>

<style lang='scss'>
  .tableau-dossier-a-creer {
    th, td:not(:last-of-type) {
      max-width: 15rem;
      max-height: 2rem;
      overflow: auto;
    }
  }
</style>