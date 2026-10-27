<script lang="ts">
  let { isTestEnvironment, recipient }: { isTestEnvironment: boolean; recipient: string } =
    $props();
</script>

<div class="fr-alert fr-alert--success" role="status">
  <h3 class="fr-alert__title">
    {isTestEnvironment ? `Mail envoyé à ${recipient}` : "Mail envoyé au secrétariat du CNPN"}
  </h3>
  <p>Brevo a pris en charge l'envoi. Sa distribution au destinataire reste à confirmer.</p>
  <p>
    Consultez le suivi dans l'historique du dossier. Un échec de livraison signalé par Brevo vous
    sera communiqué par mail.
  </p>
</div>
