<script lang="ts">
  import type { CommentCategory } from "@pitchou/types/onagreComments.ts";
  let { category }: { category: CommentCategory } = $props();
  const explanations: Record<CommentCategory, string> = {
    cmtactivitesespeces:
      "Commentaires rédigés librement dans Onagre pour préciser l’activité sur les espèces, par exemple « capture manuelle à l’aide d’épuisette ». Vérifier s’ils décrivent une méthode ou un moyen à renseigner dans Pitchou, ou s’ils doivent rester en commentaire.",
    unmapped_method:
      "Libellés choisis dans la liste « Méthode » d’Onagre, par exemple « Capture » ou « Autres », dont la reprise dans les champs d’impact de Pitchou reste à vérifier. Choisir une correspondance adaptée au contexte ou conserver le libellé en commentaire.",
    unresolved_activity:
      "Activités Onagre qui n’ont pas pu être traduites en type d’impact dans Pitchou. Examiner l’activité et l’espèce concernée pour identifier la correspondance ou le référentiel à compléter.",
    unresolved_species:
      "Espèces Onagre qui n’ont pas pu être rapprochées du référentiel utilisé par Pitchou. Vérifier leur nom et leur code TAXREF : ce statut ne signifie pas que l’espèce n’est pas protégée ou qu’elle est absente de TAXREF.",
    cmtdescriptionsespeces:
      "Descriptions rédigées librement dans Onagre à propos des espèces ou des spécimens, par exemple « quelques individus » ou « imagos, exuvies, larves ». Examiner ce qui doit rester en commentaire et ce qui pourrait être repris dans un champ adapté, sans perdre les nuances.",
    precisionespeces:
      "Précisions complémentaires saisies dans Onagre sur les espèces ou le périmètre de la demande, par exemple un stade de développement ou une exclusion d’espèces. Repérer les conditions à conserver pour éviter une correspondance trop générale.",
  };
</script>

<p class="category-help" aria-live="polite">{explanations[category]}</p>

<style>
  .category-help {
    max-width: 100ch;
    line-height: 1.6;
  }
</style>
