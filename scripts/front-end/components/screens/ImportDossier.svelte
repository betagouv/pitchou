<script>
  //@ts-check
  
  import Squelette from '../Squelette.svelte'
  import { getODSTableRawContent,  sheetRawContentToObjects, isRowNotEmpty } from '@odfjs/odfjs'
  /** @import { ComponentProps } from 'svelte' */

  /** @type {ComponentProps<Squelette>['email']} */
  export let email = undefined

  /** @type {any[] | undefined} */
  let dossiersACréer = undefined

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
      dossiersACréer = lignes

      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`)
      }
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

  {#if dossiersACréer}
  <h2>Toutes les lignes du tableau</h2>
    <div class="fr-table" id="table-0-component">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table id="table-0">
              <caption> Lignes du tableau </caption>
              <thead>
                <tr>
                  <th> Nom du projet (OBJET) </th>
                  <th> Commentaires sur les enjeux et la procédure </th>
                </tr>
              </thead>
              <tbody>
                {#each dossiersACréer as dossier}
                  <tr id="table-0-row-key-1" data-row-key="1">
                    <td>{dossier['OBJET']}</td>
                    <td>{dossier['Description avancement dossier avec dates']}</td>
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