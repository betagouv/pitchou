<script>
  //@ts-check
  
  import Squelette from '../Squelette.svelte'
  /** @import { ComponentProps } from 'svelte' */

  /** @type {ComponentProps<Squelette>['email']} */
  export let email = undefined

  /**
   * @param {Event} event
  */
  function handleFileChange(event) {
  const target = event.target;
    if (target instanceof HTMLInputElement && target.files) {
      console.log(target.files);
    } else {
      console.error('Le champ de fichier est introuvable ou ne contient aucun fichier.')
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
</Squelette>