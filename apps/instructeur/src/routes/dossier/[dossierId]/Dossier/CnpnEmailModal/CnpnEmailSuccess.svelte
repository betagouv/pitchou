<script lang="ts">
  let { isTestEnvironment, recipient }: { isTestEnvironment: boolean; recipient: string } =
    $props();
</script>

<div class="fr-alert fr-alert--success" role="status">
  <h3 class="fr-alert__title">
    {isTestEnvironment ? `Mail envoyé à ${recipient}` : "Mail envoyé au secrétariat du CNPN"}
  </h3>
  <p>L'envoi a été ajouté à l'historique du dossier.</p>
</div>
