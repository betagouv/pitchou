<script lang="ts">
  import ThSorts from "./ThSorts.svelte";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import PhaseDelayIndicator from "./PhaseDelayIndicator.svelte";
  import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
  import type { SuiviInstructionState } from "./state.svelte.ts";
  import type { TableSort } from "@pitchou/types/interfaceUtilisateur.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  type Props = {
    state: SuiviInstructionState;
    selectedSort?: TableSort;
    follow: (id: Dossier["id"]) => void;
    leave: (id: Dossier["id"]) => void;
  };
  let { state, selectedSort = $bindable(), follow, leave }: Props = $props();
</script>

<h2 class="fr-mt-2w">
  {state.selectedDossiers.length}<small class="text-[0.7em] text-[color:var(--text-mention-grey)]"
    >/{state.dossiers.length}</small
  > dossiers sélectionnés
</h2>
<div class="fr-table fr-table--bordered">
  <table class="fr-mb-2w [&_td]:align-top [&_th]:align-top [&_th]:min-w-24">
    <thead
      ><tr
        ><th>Voir le dossier</th><th
          >Localisation <ThSorts sorts={state.locationSorts} bind:selectedSort /></th
        ><th>Activité principale <ThSorts sorts={state.activitySorts} bind:selectedSort /></th><th
          >Porteur de projet <ThSorts sorts={state.ownerSorts} bind:selectedSort /></th
        ><th>Nom du projet <ThSorts sorts={state.nameSorts} bind:selectedSort /></th><th>Enjeux</th
        ><th>Rattaché au régime AE</th><th
          >Phase<br /><br />Prochaine action attendue de <ThSorts
            sorts={state.prioritySorts}
            bind:selectedSort
          /></th
        ></tr
      ></thead
    >
    <tbody
      >{#each state.displayed as dossier (dossier)}<tr>
          <td
            ><a
              class="fr-btn whitespace-pre fr-btn--sm fr-btn--icon-left fr-icon-eye-line fr-mb-1w"
              href={`/dossier/${dossier.id}`}>Voir le dossier</a
            >
            {#if dossier.free_comment?.trim()}<ModalButton id={`dsfr-modale-${dossier.id}`}
                >{#snippet openButton()}<button
                    class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line"
                    data-fr-opened="false"
                    aria-controls={`dsfr-modale-${dossier.id}`}>Commentaire</button
                  >{/snippet}{#snippet content()}<h1 class="fr-modal__title">
                    Commentaire dossier {dossier.name}
                  </h1>
                  <div class="[white-space:preserve]">
                    {dossier.free_comment}
                  </div>{/snippet}</ModalButton
              >{/if}
            <button
              onclick={() =>
                state.followedByMe.has(dossier.id) ? leave(dossier.id) : follow(dossier.id)}
              class="fr-btn fr-btn--secondary fr-btn--sm {state.followedByMe.has(dossier.id)
                ? 'fr-icon-star-fill'
                : 'fr-icon-star-line'} fr-btn--icon-left"
              >{state.followedByMe.has(dossier.id) ? "Ne plus suivre" : "Suivre"}</button
            >
          </td>
          <td>{formatLocalisation(dossier)}</td><td>{dossier.activite_label || ""}</td><td
            >{formatPorteurDeProjet(dossier)}</td
          ><td>{dossier.name || ""}</td><td
            >{#if dossier.enjeu}<p class="fr-badge fr-badge--pink-macaron fr-badge--sm">
                Dossier à enjeu
              </p>{/if}</td
          ><td
            >{dossier.linked_to_ae_regime === null
              ? "Non renseigné"
              : dossier.linked_to_ae_regime
                ? "oui"
                : "non"}</td
          ><td
            ><TagPhase phase={dossier.phase} size="SM" /><PhaseDelayIndicator
              {dossier}
            />{#if dossier.next_action_expected_from}<p class="fr-tag fr-tag--sm fr-mt-1w">
                {dossier.next_action_expected_from}
              </p>{/if}</td
          >
        </tr>{/each}</tbody
    >
  </table>
  {#if state.pageSelectors}<Pagination
      pageSelectors={state.pageSelectors}
      currentPage={state.currentPage}
    />{/if}
</div>
