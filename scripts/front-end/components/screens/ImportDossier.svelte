<script>
  //@ts-check
  import Squelette from '../Squelette.svelte'
  /** @import {ComponentProps} from 'svelte' */

  /** @type {ComponentProps<Squelette>['email']} */
  export let email = undefined
</script>

<Squelette {email} nav={true} >
  <h1>Import de dossier</h1>
  <p>Page d'import de dossier (à compléter).</p>
</Squelette>