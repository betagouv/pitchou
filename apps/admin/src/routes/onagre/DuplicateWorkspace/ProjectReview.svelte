<script lang="ts">
  import type {
    DuplicateReview,
    DuplicateDecision,
    DuplicateRevision,
  } from "@pitchou/types/onagreDuplicates.ts";
  import Facts from "../DuplicateFacts.svelte";
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
</script>

<section class="admin-stack" aria-label={`Revue du projet ${project.project_id}`}>
  <div class="admin-panel">
    <p>Projet Onagre n°{project.project_id}</p>
    <h2>{project.payload.name}</h2>
    <h3>Pourquoi l’import est bloqué</h3>
    <p class="reason">{project.payload.reason}</p>
    <h3>Ce que l’équipe doit décider</h3>
    <p>{project.payload.question}</p>
    <p>
      Si la demande est déjà couverte par DN, choisissez « Ne pas importer cette demande » en
      précisant le dossier concerné. Si elle est distincte, choisissez « Importer comme nouvelle
      demande ». Si la preuve manque, conservez « À examiner ». Un choix « Ne pas importer » ne crée
      pas automatiquement de lien vers DN.
    </p>
    {#if project.payload.omittedDemandeIds.length}
      <p>
        Demandes déjà écartées de la préparation, hors de cette revue : {project.payload.omittedDemandeIds.join(
          ", ",
        )}.
      </p>
    {/if}
  </div>
  <section class="admin-panel">
    <h3>Dossiers DN à comparer</h3>
    <p>
      Les références et dates ci-dessous sont celles conservées lors de la revue. Ouvrez les
      dossiers pour consulter leurs pièces et leur historique.
    </p>
    {#each project.payload.candidates as candidate (candidate.id)}
      <article class="candidate">
        <h4>
          <a href={`/dossiers/${candidate.id}`} target="_blank" rel="noreferrer"
            >DN {candidate.id} — {candidate.name} (nouvel onglet)</a
          >
        </h4>
        <p>{candidate.relationship}</p>
        <Facts facts={candidate} />
      </article>
    {:else}
      <p>Aucun candidat DN encore à comparer. Le motif ci-dessus décrit la réserve restante.</p>
    {/each}
  </section>
  {#each project.payload.demandes as demande (demande.key)}
    <article class="admin-panel">
      <h3>Demande {demande.reference || demande.id}</h3>
      <Facts facts={demande} />
      {#if demande.linkedDossierId !== null}
        <p class="fr-alert fr-alert--success">
          Lien confirmé avec <a
            href={`/dossiers/${demande.linkedDossierId}`}
            target="_blank"
            rel="noreferrer">DN {demande.linkedDossierId} (nouvel onglet)</a
          > — lecture seule.
        </p>
        <p>{demande.linkReason}</p>
      {:else}
        <p><strong>Décision attendue :</strong> {demande.question}</p>
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
</section>

<style>
  .reason {
    white-space: pre-line;
  }
  .candidate + .candidate {
    border-top: 1px solid var(--border-default-grey);
    padding-top: 1rem;
    margin-top: 1rem;
  }
  h4 {
    font-size: 1rem;
  }
</style>
