<script lang="ts">
  import type {
    DuplicateReview,
    DuplicateDecision,
    DuplicateRevision,
  } from "@pitchou/types/onagreDuplicates.ts";
  import Facts from "../DuplicateFacts.svelte";
  import InstructeurLink from "../InstructeurLink.svelte";
  import ReviewDetailTabs from "../ReviewDetailTabs.svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  import DecisionEditor from "./DecisionEditor.svelte";
  let {
    project,
    decisions,
    revisions,
    writable,
  }: {
    project: DuplicateReview;
    decisions: Map<string, DuplicateDecision>;
    revisions: DuplicateRevision[];
    writable: boolean;
  } = $props();
  let tab = $state(0),
    demandePage = $state(1),
    candidatePage = $state(1);
  const size = 5;
</script>

<h3>{project.payload.name}</h3>
<ReviewDetailTabs
  id="duplicate-detail"
  bind:active={tab}
  tabs={[
    "Pourquoi examiner",
    `Demandes (${project.payload.demandes.length})`,
    `Dossiers DN (${project.payload.candidates.length})`,
  ]}
/>
<div
  id="duplicate-detail-panel-0"
  role="tabpanel"
  aria-labelledby="duplicate-detail-tab-0"
  hidden={tab !== 0}
>
  <h4>Pourquoi l’import est bloqué</h4>
  <p class="reason">{project.payload.reason}</p>
  <h4>À décider</h4>
  <p>{project.payload.question}</p>
  {#if project.payload.omittedDemandeIds.length}<p>
      Demandes déjà écartées de la préparation : {project.payload.omittedDemandeIds.join(", ")}.
    </p>{/if}
</div>
<div
  id="duplicate-detail-panel-1"
  role="tabpanel"
  aria-labelledby="duplicate-detail-tab-1"
  hidden={tab !== 1}
>
  <div class="page-controls">
    <p>{project.payload.demandes.length} demandes</p>
    <Pagination
      current={demandePage}
      total={Math.max(1, Math.ceil(project.payload.demandes.length / size))}
      label="Pages des demandes du projet"
      onChange={(value) => (demandePage = value)}
    />
  </div>
  <!-- Keep draft forms mounted when switching tabs or pages. -->
  {#each project.payload.demandes as demande, index (demande.key)}
    <article class="detail-entry" hidden={Math.floor(index / size) + 1 !== demandePage}>
      <h4>Demande {demande.reference || demande.id}</h4>
      <Facts facts={demande} />
      {#if demande.linkedDossierId !== null}
        <p>
          <span class="fr-icon-checkbox-circle-line" aria-hidden="true"></span> Lien confirmé avec <InstructeurLink
            dossierId={demande.linkedDossierId}>DN {demande.linkedDossierId}</InstructeurLink
          >
        </p>
        <p>{demande.linkReason}</p>
      {:else}
        <p><strong>À décider :</strong> {demande.question}</p>
        {#key decisions.get(demande.key)?.version ?? 0}
          <DecisionEditor
            {project}
            {demande}
            decision={decisions.get(demande.key)}
            revisions={revisions.filter((r) => r.demande_key === demande.key)}
            {writable}
          />
        {/key}
      {/if}
    </article>
  {/each}
</div>
<div
  id="duplicate-detail-panel-2"
  role="tabpanel"
  aria-labelledby="duplicate-detail-tab-2"
  hidden={tab !== 2}
>
  <div class="page-controls">
    <p>{project.payload.candidates.length} dossiers DN à comparer</p>
    <Pagination
      current={candidatePage}
      total={Math.max(1, Math.ceil(project.payload.candidates.length / size))}
      label="Pages des dossiers DN à comparer"
      onChange={(value) => (candidatePage = value)}
    />
  </div>
  {#each project.payload.candidates.slice((candidatePage - 1) * size, candidatePage * size) as candidate (candidate.id)}
    <article class="detail-entry">
      <h4>
        <InstructeurLink dossierId={candidate.id}
          >DN {candidate.id} — {candidate.name}</InstructeurLink
        >
      </h4>
      <p>{candidate.relationship}</p>
      <Facts facts={candidate} />
    </article>
  {:else}<p>Aucun candidat DN restant à comparer. Le motif décrit la réserve à résoudre.</p>{/each}
</div>
