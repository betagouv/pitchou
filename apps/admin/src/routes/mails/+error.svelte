<script lang="ts">
  import { page } from "$app/state";
  import "./monitoring.css";
</script>

<div class="notification-monitor">
  <section class="notification-empty" role="alert">
    <span class="fr-icon-warning-line" aria-hidden="true"></span>
    <h2>{page.status === 400 ? "Vérifiez les filtres" : "Les envois ne sont pas disponibles"}</h2>
    <p>
      {page.status === 400
        ? page.error?.message
        : "Le chargement a échoué. Réessayez dans quelques instants."}
    </p>
    <a href="/mails" class="notification-button">Revenir aux envois sans filtre</a>
  </section>
</div>
