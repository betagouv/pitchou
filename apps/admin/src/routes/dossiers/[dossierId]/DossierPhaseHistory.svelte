<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectEntry } from "@pitchou/ui/Select/options.ts";
  import { phases } from "@pitchou/common/phases.ts";

  import { updateDossier, type AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

  type Props = {
    detail: AdminDossierDetail;
    onChanged: (detail: AdminDossierDetail) => void;
    readOnly?: boolean;
  };

  let { detail, onChanged, readOnly = false }: Props = $props();

  const phaseOptions: SelectEntry<string>[] = [...phases].map((phase) => ({
    value: phase,
    label: phase,
  }));

  // Initial selection only; the select then belongs to the user.
  // svelte-ignore state_referenced_locally
  let newPhase = $state(detail.phase);
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  async function addPhaseEvent(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    saveError = null;
    try {
      const updated = await updateDossier(detail.dossier.id, {
        evenementsPhase: [{ phase: newPhase, timestamp: new Date().toISOString() }],
      });
      onChanged(updated);
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }
</script>

<section class="fr-mt-6w fr-pt-3w border-t border-[color:var(--border-default-grey)]">
  <h2 class="fr-h4">Phases</h2>

  {#if !readOnly}
    <form class="flex flex-row items-end gap-4 flex-wrap fr-mb-3w" onsubmit={addPhaseEvent}>
      <div class="fr-select-group fr-mb-0">
        <label class="fr-label" for="nouvelle-phase">Passer le dossier en phase</label>
        <Select id="nouvelle-phase" options={phaseOptions} bind:value={newPhase} />
      </div>
      <button
        class="fr-btn fr-btn--secondary"
        type="submit"
        disabled={saving || newPhase === detail.phase}
      >
        {saving ? "Changement…" : "Changer la phase"}
      </button>
    </form>
  {/if}

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <p>{saveError}</p>
    </div>
  {/if}

  {#if detail.evenementsPhase.length >= 1}
    <div class="fr-table fr-table--bordered">
      <table>
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col">Date</th>
            <th scope="col">Par</th>
          </tr>
        </thead>
        <tbody>
          {#each detail.evenementsPhase as evenement (evenement.timestamp + evenement.phase)}
            <tr>
              <td>{evenement.phase}</td>
              <td>{formatDate(evenement.timestamp)}</td>
              <td>
                {evenement.caused_by_email ?? evenement.demarche_numerique_agent_email ?? "—"}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p>Aucun évènement de phase pour ce dossier.</p>
  {/if}
</section>
