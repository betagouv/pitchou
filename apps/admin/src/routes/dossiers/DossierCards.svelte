<script lang="ts">
  import type { AdminDossierSummary } from "$lib/actions/adminDossiers.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import PhaseProgress from "./PhaseProgress.svelte";

  type Props = {
    rows: AdminDossierSummary[];
  };

  let { rows }: Props = $props();

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  function formatDemandeur(dossier: AdminDossierSummary): string {
    if (dossier.demandeur_entreprise) return dossier.demandeur_entreprise;
    const name = [dossier.demandeur_last_name, dossier.demandeur_first_names]
      .filter(Boolean)
      .join(" ");
    return name || "—";
  }
</script>

<ul class="mx-0 mt-2 mb-0 flex list-none flex-col gap-2 p-0">
  {#each rows as dossier (dossier.id)}
    <li
      class="group relative rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-sm transition hover:border-[color:var(--border-default-blue-france)] hover:shadow-md"
    >
      <a href="/dossiers/{dossier.id}" class="fr-raw-link block p-4 pr-12 no-underline">
        <div class="flex items-center gap-4">
          <ActiviteIcon
            activiteCode={dossier.activite_code}
            activiteLabel={dossier.activite_label}
          />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-3">
              <span class="truncate font-semibold">
                {dossier.name || `Dossier ${dossier.id}`}
              </span>
              {#if dossier.source === "demarche_numerique"}
                <span class="fr-badge fr-badge--info fr-badge--sm fr-badge--no-icon">
                  {dossier.demarche_numerique_number
                    ? `DN nº${dossier.demarche_numerique_number}`
                    : "Démarches Numériques"}
                </span>
              {:else if dossier.source === "pitchou"}
                <span class="fr-badge fr-badge--green-emeraude fr-badge--sm">Pitchou</span>
              {:else}
                <span class="fr-badge fr-badge--grey fr-badge--sm">Source inconnue</span>
              {/if}
            </div>
            <p class="fr-mb-0 mt-1 truncate text-sm text-[color:var(--text-default-grey)]">
              {formatDemandeur(dossier)}
            </p>
            <p class="fr-mb-0 mt-1 text-sm text-[color:var(--text-mention-grey)]">
              Déposé le {formatDate(dossier.depot_date)}
              {#if dossier.groupe_name}
                · {dossier.groupe_name}
              {:else if dossier.source === "pitchou"}
                · <span class="text-[color:var(--text-default-warning)]">Groupe à réattribuer</span>
              {/if}
            </p>
          </div>

          <div class="hidden w-52 shrink-0 text-sm sm:block">
            <PhaseProgress phase={dossier.phase} />
          </div>
        </div>
      </a>
      <span
        class="fr-icon-arrow-right-s-line absolute top-1/2 right-3 -translate-y-1/2 text-[color:var(--text-mention-grey)] transition group-hover:text-[color:var(--text-action-high-blue-france)]"
        aria-hidden="true"
      ></span>
    </li>
  {/each}
</ul>
