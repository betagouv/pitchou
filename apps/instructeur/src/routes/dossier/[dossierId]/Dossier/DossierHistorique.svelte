<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { historiqueEntries, type HistoriqueEntry } from "./DossierHistorique/display.ts";
  import type { DossierAction } from "@pitchou/types/capabilities.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
  };
  let { dossier }: Props = $props();

  let actions: DossierAction[] | undefined = $state();
  let errorMessage = $state("");

  $effect(() => {
    void store.capabilities
      .listerActionsDossier?.(dossier.id)
      .then((list) => (actions = list))
      .catch(() => (errorMessage = "L'historique n'a pas pu être chargé."));
  });

  const entries = $derived(historiqueEntries(actions ?? [], dossier));

  const bubbleByTone: Record<HistoriqueEntry["tone"], string> = {
    instructeur: "bg-[#E3E3FD] text-[#6A6AF4]",
    petitionnaire: "bg-[#FEECC2] text-[#716043]",
    system: "bg-[var(--background-contrast-grey)] text-[color:var(--text-mention-grey)]",
  };
</script>

<section class="fr-mb-4w max-w-[56rem]">
  <h2 class="fr-mb-3w fr-text--lg">Historique</h2>

  {#if errorMessage}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w"><p>{errorMessage}</p></div>
  {:else if actions === undefined}
    <p class="text-[color:var(--text-mention-grey)]">Chargement de l'historique…</p>
  {:else if entries.length === 0}
    <p class="text-[color:var(--text-mention-grey)]">
      Aucune action n'a encore été enregistrée sur ce dossier.
    </p>
  {:else}
    <ol class="fr-p-0 fr-m-0 flex list-none flex-col gap-4">
      {#each entries as entry (entry.id)}
        <li class="flex items-start gap-4">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full {bubbleByTone[
              entry.tone
            ]}"
            aria-hidden="true"
          >
            <span class={entry.icon} aria-hidden="true"></span>
          </span>
          <div class="min-w-0">
            <p class="fr-mb-0 [word-break:break-word]">
              {entry.label}
              {#if entry.value}<strong>{entry.value}</strong>{/if}
            </p>
            <p class="fr-mb-0 fr-text--xs text-[color:var(--text-mention-grey)]">
              Le {formatDateAbsolute(
                entry.date,
                entry.timeKnown ? "dd/MM/yyyy 'à' HH:mm" : "dd/MM/yyyy",
              )}
              {entry.author ?? ""}
            </p>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</section>
