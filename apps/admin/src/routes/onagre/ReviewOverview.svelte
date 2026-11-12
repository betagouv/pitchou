<script lang="ts">
  import type { PageData } from "./$types";
  let { summary }: { summary: PageData["summary"] } = $props();
  const number = (n: number) => n.toLocaleString("fr-FR");
</script>

<section aria-label="Revues en attente">
  <div class="review-cards">
    <article class="review-card">
      <div class="review-card-heading">
        <span class="fr-icon-edit-line" aria-hidden="true"></span>
        <h3>Textes à reprendre</h3>
      </div>
      <div class="review-metric">
        <strong>{number(summary.texts.pending)}</strong><span>groupes de textes à discuter</span>
      </div>
      <a class="fr-btn" href="?tab=textes&outcome=pending"
        >Examiner les textes <span aria-hidden="true">→</span></a
      >
    </article>
    <article class="review-card">
      <div class="review-card-heading">
        <span class="fr-icon-folder-2-line" aria-hidden="true"></span>
        <h3>Doublons à examiner</h3>
      </div>
      <div class="review-metric">
        <strong>{number(summary.duplicates.pendingDemandes)}</strong><span
          >demandes à décider dans {number(summary.duplicates.pendingProjects)} projets</span
        >
      </div>
      <a class="fr-btn" href="?tab=doublons"
        >Examiner les doublons <span aria-hidden="true">→</span></a
      >
    </article>
  </div>
</section>
<div class="review-followup">
  <p>
    <span class="fr-icon-checkbox-circle-line" aria-hidden="true"></span><strong
      >{number(summary.confirmed)} doublons évités</strong
    >
  </p>
  <a href="?tab=doublons-evites">Consulter →</a>
</div>
