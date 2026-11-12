<script lang="ts">
  import {
    confirmationLabels,
    confirmationExplanations,
    type ConfirmedDuplicate,
  } from "@pitchou/types/onagreConfirmedDuplicates.ts";
  import Facts from "../DuplicateFacts.svelte";
  let { link }: { link: ConfirmedDuplicate } = $props();
</script>

<article class="admin-panel">
  <p>Projet Onagre {link.projectId} · demande {link.source.id}</p>
  <h3>{link.projectName}</h3>
  <p class="match">
    <strong>{link.source.reference || `Demande ${link.source.id}`}</strong><span
      aria-label="reliée à">→</span
    ><a href={`/dossiers/${link.target.id}`} target="_blank" rel="noreferrer"
      >DN {link.target.id} — {link.target.name} (nouvel onglet)</a
    >
  </p>
  <p><strong>{confirmationLabels[link.profile]}</strong></p>
  <p>{confirmationExplanations[link.profile]}</p>
  <h4>Ce qui a permis de trancher pour cette demande</h4>
  <p class="reason">{link.reason}</p>
  <details>
    <summary>Comparer les références, dates et lieux</summary>
    <div class="comparison">
      <section aria-label="Données Onagre">
        <h4>Demande Onagre</h4>
        <Facts facts={link.source} />
      </section>
      <section aria-label="Données DN">
        <h4>Dossier DN conservé</h4>
        <Facts facts={link.target} />
      </section>
    </div>
    <p>
      Éléments retenus lors du rapprochement confirmé le {new Date(
        link.confirmedAt,
      ).toLocaleDateString("fr-FR")}. Les écarts de dates ou de codes sont conservés ; le motif
      explique ceux qui ont été examinés.
    </p>
  </details>
  {#if link.relatedExisting.length}
    <details>
      <summary>Autres entrées DN conservées ({link.relatedExisting.length})</summary>
      {#each link.relatedExisting as related (related.dossierId)}
        <p>
          <a href={`/dossiers/${related.dossierId}`} target="_blank" rel="noreferrer"
            >DN {related.dossierId} (nouvel onglet)</a
          >
          — {related.reason}
        </p>
      {/each}
    </details>
  {/if}
  {#if link.otherDemandesToReview}
    <p class="remaining">
      Ce lien ne résout pas les {link.otherDemandesToReview} autre{link.otherDemandesToReview > 1
        ? "s"
        : ""} demande{link.otherDemandesToReview > 1 ? "s" : ""} de ce projet encore réservée{link.otherDemandesToReview >
      1
        ? "s"
        : ""} dans la revue.
      <a href={`?tab=doublons&project=${link.projectId}`}>Examiner ce projet</a>.
    </p>
  {/if}
</article>

<style>
  h3 {
    font-size: 1.15rem;
  }
  h4 {
    font-size: 1rem;
  }
  .match {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: baseline;
  }
  .reason {
    white-space: pre-line;
  }
  .comparison {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  details {
    margin-top: 1rem;
  }
  .remaining {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--background-alt-grey);
  }
</style>
