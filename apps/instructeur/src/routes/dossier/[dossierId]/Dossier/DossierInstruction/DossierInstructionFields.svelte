<script lang="ts">
  import { phases, prochaineActionAttenduePar } from "$lib/dossier/displayDossier.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  type Props = {
    enjeu: boolean | null;
    comment?: string | null;
    ddepValue: string;
    ddep?: boolean | null;
    erSufficient?: boolean | null;
    phase: string;
    nextAction?: DossierFull["next_action_expected_from"];
    onagre?: string | null;
    dismiss: () => void;
  };
  let {
    enjeu = $bindable(),
    comment = $bindable(),
    ddepValue = $bindable(),
    ddep = $bindable(),
    erSufficient = $bindable(),
    phase = $bindable(),
    nextAction = $bindable(),
    onagre = $bindable(),
    dismiss,
  }: Props = $props();
  function setDdep(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "oui") {
      ddep = true;
      erSufficient = false;
    } else if (value === "non_sans_objet") {
      ddep = false;
      erSufficient = false;
    } else if (value === "non_er_mesures_sufficient") {
      ddep = false;
      erSufficient = true;
    } else {
      ddep = null;
      erSufficient = null;
    }
  }
</script>

<section class="fr-mb-4w flex-[2]">
  <div class="fr-toggle">
    <input
      type="checkbox"
      class="fr-toggle__input"
      id="toggle-enjeu"
      bind:checked={enjeu}
      onfocus={dismiss}
    /><label class="fr-toggle__label" for="toggle-enjeu">Dossier à enjeu</label>
  </div>
  <div class="fr-input-group">
    <strong><label class="fr-label" for="input-commentaire-libre">Commentaire libre</label></strong
    ><textarea
      onfocus={dismiss}
      class="fr-input resize-y"
      id="input-commentaire-libre"
      bind:value={comment}
      rows={8}></textarea>
  </div>
  <div class="fr-input-group">
    <label class="fr-label" for="ddep-nécessaire"
      ><strong>Une DDEP est-elle nécessaire ?</strong></label
    ><select
      onfocus={dismiss}
      bind:value={ddepValue}
      onchange={setDdep}
      class="fr-select"
      id="ddep-nécessaire"
      ><option value="oui">Oui</option><option value="non_er_mesures_sufficient"
        >Non, mesures Éviter, Réduire (ER) suffisantes</option
      ><option value="non_sans_objet">Non, sans objet</option><option value="a_determiner"
        >À déterminer</option
      ></select
    >
  </div>
  <div class="fr-input-group">
    <label class="fr-label" for="phase"><strong>Phase du dossier</strong></label><select
      onfocus={dismiss}
      bind:value={phase}
      class="fr-select"
      id="phase"
      >{#each phases as value}<option {value}>{value}</option>{/each}</select
    >
  </div>
  <div class="fr-input-group">
    <label class="fr-label" for="next_action_expected_from"
      ><strong>Prochaine action attendue de</strong></label
    ><select
      onfocus={dismiss}
      bind:value={nextAction}
      class="fr-select"
      id="next_action_expected_from"
      >{#each prochaineActionAttenduePar as actor}<option value={actor}>{actor}</option
        >{/each}</select
    >
  </div>
  <div class="fr-input-group">
    <label class="fr-label" for="onagre_demande_identifier"
      ><strong>N° Demande ONAGRE</strong></label
    ><input
      onfocus={dismiss}
      class="fr-input"
      id="onagre_demande_identifier"
      type="text"
      bind:value={onagre}
    />
  </div>
</section>
