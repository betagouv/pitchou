<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
</script>

<PageHelp title="Utilisateurs">
  <p>
    Les comptes apparaissent à leur première connexion ProConnect. Vous pouvez aussi préparer leurs
    accès à l'avance avec le bouton +, en renseignant l'adresse de leur futur compte.
  </p>
  <h3>Profils et permissions</h3>
  <p>
    Les profils regroupent plusieurs permissions. Le profil Instructeur permet de consulter les
    dossiers et d'instruire ceux de ses groupes. Le profil Administrateur donne toutes les
    permissions.
  </p>
  <p>
    Les droits personnalisés permettent d'ajouter ou de refuser une permission. Un refus est
    prioritaire, même si le droit est inclus dans un profil. Les permissions d'administration
    nécessitent aussi l'accès à l'administration.
  </p>
  <h3>Groupes et comptes actifs</h3>
  <p>
    L'accès aux dossiers dans l'application instructeurs nécessite au moins un groupe actif. Les
    appartenances se modifient dans la fiche de l'utilisateur ou sur la page Groupes instructeurs,
    avec le droit de gérer les groupes.
  </p>
  <p>
    Désactiver un compte coupe ses sessions et bloque ses accès. Ses profils et ses groupes sont
    conservés pour une réactivation.
  </p>
  <h3>Rechercher et modifier</h3>
  <p>
    Recherchez par nom, e-mail ou groupe, filtrez par profil et choisissez un ordre de tri. Cliquez
    sur une ligne pour modifier les accès du compte.
  </p>
</PageHelp>
