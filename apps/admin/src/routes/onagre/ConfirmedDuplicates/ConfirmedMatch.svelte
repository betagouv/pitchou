<script lang="ts">
  import {
    confirmationLabels,
    confirmationExplanations,
    type ConfirmedDuplicate,
  } from "@pitchou/types/onagreConfirmedDuplicates.ts";
  import Facts from "../DuplicateFacts.svelte";
  import InstructeurLink from "../InstructeurLink.svelte";
  import WorkspaceDialog from "../WorkspaceDialog.svelte";
  import ReviewDetailTabs from "../ReviewDetailTabs.svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  let { link, onClose }: { link: ConfirmedDuplicate; onClose: () => void } = $props();
  let tab = $state(0),
    current = $state(1);
  const size = 10;
</script>

<WorkspaceDialog title="Doublon évité" size="xlarge" {onClose}>
  <div class="duplicate-detail">
    <p>Projet Onagre {link.projectId} · Demande {link.source.reference || link.source.id}</p>
    <h3>{link.projectName}</h3>
    <ReviewDetailTabs
      id="confirmed-detail"
      bind:active={tab}
      tabs={[
        "Pourquoi ce rapprochement",
        "Comparaison Onagre / DN",
        `Autres entrées DN (${link.relatedExisting.length})`,
      ]}
    />
    <div
      id="confirmed-detail-panel-0"
      role="tabpanel"
      aria-labelledby="confirmed-detail-tab-0"
      hidden={tab !== 0}
    >
      <p>
        <InstructeurLink dossierId={link.target.id}
          >DN {link.target.id} — {link.target.name}</InstructeurLink
        >
      </p>
      <h4>{confirmationLabels[link.profile]}</h4>
      <p>{confirmationExplanations[link.profile]}</p>
      <h4>Ce qui a permis de trancher</h4>
      <p class="reason">{link.reason}</p>
      <p>Rapprochement confirmé le {new Date(link.confirmedAt).toLocaleDateString("fr-FR")}.</p>
      {#if link.otherDemandesToReview}<p>
          {link.otherDemandesToReview} autre(s) demande(s) de ce projet restent à examiner.
          <a href={`?tab=doublons&project=${link.projectId}`}>Examiner le projet</a>
        </p>{/if}
    </div>
    <div
      id="confirmed-detail-panel-1"
      role="tabpanel"
      aria-labelledby="confirmed-detail-tab-1"
      hidden={tab !== 1}
    >
      <div class="comparison">
        <section aria-label="Données Onagre">
          <h4>Demande Onagre {link.source.id}</h4>
          <Facts facts={link.source} />
        </section>
        <section aria-label="Données DN">
          <h4>
            <InstructeurLink dossierId={link.target.id}>Dossier DN {link.target.id}</InstructeurLink
            >
          </h4>
          <Facts facts={link.target} />
        </section>
      </div>
      <p>Références, dates et lieux conservés lors du rapprochement.</p>
    </div>
    <div
      id="confirmed-detail-panel-2"
      role="tabpanel"
      aria-labelledby="confirmed-detail-tab-2"
      hidden={tab !== 2}
    >
      {#if link.relatedExisting.length > size}<Pagination
          {current}
          total={Math.ceil(link.relatedExisting.length / size)}
          label="Pages des entrées DN conservées"
          onChange={(value) => (current = value)}
        />{/if}
      {#each link.relatedExisting.slice((current - 1) * size, current * size) as related (related.dossierId)}
        <article class="detail-entry">
          <InstructeurLink dossierId={related.dossierId}>DN {related.dossierId}</InstructeurLink>
          <p>{related.reason}</p>
        </article>
      {:else}<p>Aucune autre entrée DN associée à ce rapprochement.</p>{/each}
    </div>
  </div>
  {#snippet footer()}<button class="fr-btn fr-btn--secondary" onclick={onClose}>Fermer</button
    >{/snippet}
</WorkspaceDialog>

<style>
  .comparison {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1.5rem;
  }
</style>
