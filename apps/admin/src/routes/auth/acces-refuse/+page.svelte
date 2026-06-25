<svelte:head>
  <title>Accès refusé — Pitchou Admin</title>
</svelte:head>

<div class="fr-alert fr-alert--error fr-mb-4w" role="alert">
  <h1 class="fr-alert__title">Accès refusé</h1>
  <p>
    Votre compte ProConnect a bien été authentifié, mais il n'est pas autorisé à accéder à
    l'administration Pitchou.
  </p>
</div>

<a class="fr-btn fr-btn--secondary fr-icon-logout-box-r-line fr-btn--icon-left" href="/auth/logout">
  Se déconnecter de ProConnect
</a>
