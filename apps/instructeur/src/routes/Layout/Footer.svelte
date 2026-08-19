<script lang="ts">
  import { differenceInMinutes, format } from "date-fns";
  import { fr } from "date-fns/locale";

  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import UiFooter from "@pitchou/ui/Footer.svelte";

  import FooterSupportBlocks from "./FooterSupportBlocks.svelte";

  const BUDGET_URL =
    "https://docs.google.com/spreadsheets/d/1E1z_SMXquqVnKvJXy7yKdGk1YPdV58_oaoLxBtf_k7s/edit?gid=0#gid=0";

  type Props = {
    /** Internal pages drop the Marianne block and gain the support/orientation blocks. */
    compact?: boolean;
    demarcheNumerique88444SynchronizationResults?: PitchouState["demarcheNumerique88444SynchronizationResults"];
  };

  let { compact = false, demarcheNumerique88444SynchronizationResults = undefined }: Props =
    $props();

  // Narrower link columns when the support blocks share the row with them.
  const columnClass = $derived(
    compact ? "fr-col-12 fr-col-sm-4 fr-col-md-2" : "fr-col-12 fr-col-sm-4 fr-col-md-3",
  );

  let derniereSynchronisationReussie = $derived(
    demarcheNumerique88444SynchronizationResults &&
      demarcheNumerique88444SynchronizationResults.find((r) => r.success),
  );

  function formatDate(date: Date): string {
    const diff = differenceInMinutes(new Date(), date);

    if (diff <= 1) {
      return `à l'instant`;
    }

    if (diff <= 30) {
      return `Il y a ${diff} minutes`;
    }

    return format(date, `d MMMM yyyy HH'h'mm`, { locale: fr });
  }
</script>

<UiFooter
  description="Pitchou accompagne l'instruction des demandes de dérogation à la protection des espèces."
  brand={!compact}
  fluid={compact}
>
  {#snippet top()}
    <div class={columnClass}>
      <h3 class="fr-footer__top-cat">À propos</h3>
      <ul class="fr-footer__top-list">
        <li>
          <a class="fr-footer__top-link" href="/stats">Statistiques</a>
        </li>
        <li>
          <a
            class="fr-footer__top-link fr-icon-external-link-line fr-link--icon-right"
            href={BUDGET_URL}
            target="_blank"
            rel="noopener external"
            title="Budget - nouvelle fenêtre">Budget</a
          >
        </li>
        <li>
          <a
            class="fr-footer__top-link fr-icon-external-link-line fr-link--icon-right"
            href="https://github.com/betagouv/pitchou"
            target="_blank"
            rel="noopener external"
            title="Code source - nouvelle fenêtre">Code source</a
          >
        </li>
      </ul>
    </div>
    <div class={columnClass}>
      <h3 class="fr-footer__top-cat">Ressources</h3>
      <ul class="fr-footer__top-list">
        <li>
          <a class="fr-footer__top-link" href="/especes-protegees">Liste des espèces protégées</a>
        </li>
        <li>
          <a class="fr-footer__top-link" href="/referentiel-type-impact"
            >Référentiel des types d’impact</a
          >
        </li>
        <li>
          <a class="fr-footer__top-link" href="/taxref">TAXREF</a>
        </li>
        <li>
          <a class="fr-footer__top-link" href="/bdc-statuts">BDC-Statuts</a>
        </li>
      </ul>
    </div>
    {#if compact}
      <div class="fr-col-12 fr-col-md-8">
        <FooterSupportBlocks />
      </div>
    {:else}
      <!-- Public visitors are pétitionnaires: no need for the DREAL/DDT orientation block. -->
      <div class="fr-col-12 fr-col-md-6">
        <FooterSupportBlocks withOrientationBlock={false} />
      </div>
    {/if}
  {/snippet}

  {#snippet bottomExtra()}
    {#if derniereSynchronisationReussie}
      <li class="fr-footer__bottom-item">
        <span class="fr-footer__bottom-link">
          Dernière synchronisation avec DS&nbsp;:&nbsp;
          <span>{formatDate(derniereSynchronisationReussie.timestamp)}</span>
        </span>
      </li>
    {/if}
  {/snippet}
</UiFooter>
