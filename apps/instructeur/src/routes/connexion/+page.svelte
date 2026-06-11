<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import LoginViaEmail from "../LoginViaEmail/LoginViaEmail.svelte";
  import { envoiEmailConnexion } from "../LoginViaEmail/serveur.ts";
  import { authorizedEmailDomains } from "@pitchou/common/constantes.ts";

  onMount(() => {
    // Signed in but not a member of any instructeur group
    if (store.identité && !store.capabilities.listerDossiers) {
      store.erreurs.add({
        message: `Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs sur la procédure Démarche Numérique de Pitchou. Vous pouvez prendre contact avec vos collègues ou l'équipe Pitchou pour être ajouté.e à un groupe d'instructeurs`,
      });
    }
  });
</script>

<LoginViaEmail {authorizedEmailDomains} {envoiEmailConnexion} />
