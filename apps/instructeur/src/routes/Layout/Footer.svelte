<script lang="ts">
  import { differenceInMinutes, format } from "date-fns";
  import { fr } from "date-fns/locale";

  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import UiFooter from "@pitchou/ui/Footer.svelte";

  const BUDGET_URL =
    "https://docs.google.com/spreadsheets/d/1E1z_SMXquqVnKvJXy7yKdGk1YPdV58_oaoLxBtf_k7s/edit?gid=0#gid=0";

  type Props = {
    résultatsSynchronisationDS88444?: PitchouState["résultatsSynchronisationDS88444"];
  };

  let { résultatsSynchronisationDS88444: resultatsSynchronisationDS88444 = undefined }: Props =
    $props();

  let derniereSynchronisationReussie = $derived(
    resultatsSynchronisationDS88444 && resultatsSynchronisationDS88444.find((r) => r.succès),
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
>
  {#snippet top()}
    <div class="fr-col-12 fr-col-sm-4 fr-col-md-3">
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
    <div class="fr-col-12 fr-col-sm-4 fr-col-md-3">
      <h3 class="fr-footer__top-cat">Ressources</h3>
      <ul class="fr-footer__top-list">
        <li>
          <a class="fr-footer__top-link" href="/especes-protegees">Liste des espèces protégées</a>
        </li>
        <li>
          <a class="fr-footer__top-link" href="/taxref">TAXREF</a>
        </li>
        <li>
          <a class="fr-footer__top-link" href="/bdc-statuts">BDC-Statuts</a>
        </li>
      </ul>
    </div>
  {/snippet}

  {#snippet bottomExtra()}
    {#if derniereSynchronisationReussie}
      <li class="fr-footer__bottom-item">
        <span class="fr-footer__bottom-link">
          Dernière synchronisation avec DS&nbsp;:&nbsp;
          <span>{formatDate(derniereSynchronisationReussie.horodatage)}</span>
        </span>
      </li>
    {/if}
  {/snippet}
</UiFooter>
